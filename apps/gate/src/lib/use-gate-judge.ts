import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Alert } from 'react-native';
import { isUnreachable } from './api';
import { useAuth } from './auth';
import { vibrate } from './feedback';
import {
  approvePending,
  cannotJudge,
  type EntryRef,
  judge,
  type Verdict,
} from './judge';
import { useNetworkUp } from './online';
import { enqueueUndo, getDrop } from './roster';

// 판정 화면이 떠 있는 시간 (PRD: 1.5초 뒤 자동으로 다음 스캔). 빨강은 사유를
// 관객에게 안내해야 해서 조금 더 둔다. 둘 다 화면을 누르면 바로 넘어간다
const SHOW_MS = { green: 1500, red: 3000 } as const;
// 판정 화면이 닫힌 뒤에도 같은 QR이 카메라 앞에 있으면 "이미 입장"이 또 뜬다
const SAME_QR_PAUSE_MS = 3000;
// 서버에 연결되지 않으면 잠시 기기 명단으로만 판정한다 — 매 스캔마다
// 0.8초씩 기다리면 줄이 밀린다. 느린 응답에는 적용하지 않는다: 그 스캔만
// 기기로 판정하고 다음 스캔은 다시 서버에 묻는다. 서버 판정만이 다른 입구와의
// 중복 입장을 막기 때문이다
const SERVER_RETRY_MS = 5000;
const NOTICE_MS = 3000;

/** 이 화면에서 마지막으로 들여보낸 입장 — 잘못 찍었으면 취소한다 (PRD FR-5) */
export type LastEntry = EntryRef & { name: string };

type SyncState = {
  dataUpdatedAt: number;
  errorUpdatedAt: number;
  error: unknown;
  refetch: () => unknown;
};

/**
 * 스캔·명단 검색이 함께 쓰는 판정 흐름: 판정 → 진동·화면 → 자동 닫힘, 노랑의
 * 수동 승인, 직전 입장 취소, 서버 연결 상태(오프라인 배너).
 */
export function useGateJudge(args: {
  dropId: string;
  gate: string | null;
  /** 명단 동기화(useRoster) — 연결 상태를 읽고, 취소를 바로 올릴 때 다시 돌린다 */
  sync: SyncState;
  /** 기기 명단이 바뀌었다 — 집계·검색 결과를 다시 읽는다 */
  onChange: () => void;
}) {
  const { dropId, gate, sync, onChange } = args;
  const auth = useAuth();
  const staffId = auth.status === 'signedIn' ? auth.staff.id : null;
  const networkUp = useNetworkUp();

  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [judging, setJudging] = useState(false);
  const [serverReachable, setServerReachable] = useState(true);
  const [lastEntry, setLastEntry] = useState<LastEntry | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const busy = useRef(false);
  const lastFailureAt = useRef(0);
  // 마지막으로 판정한 QR — 판정 화면이 닫힌 뒤 잠시 같은 QR을 무시한다
  const recent = useRef<{ data: string; until: number } | null>(null);

  // 명단 동기화 결과로도 서버 연결 상태를 갱신한다. 실패해도 서버가 답했으면
  // (배정 해제 403 등) 연결은 된 것이다 — 오프라인 배너를 띄우면 원인을 가린다
  useEffect(() => {
    if (sync.dataUpdatedAt) setServerReachable(true);
  }, [sync.dataUpdatedAt]);
  useEffect(() => {
    if (sync.errorUpdatedAt) setServerReachable(!isUnreachable(sync.error));
  }, [sync.errorUpdatedAt, sync.error]);

  const show = useCallback((result: Verdict) => {
    vibrate(result.color);
    AccessibilityInfo.announceForAccessibility(result.title);
    setVerdict(result);
    if (result.color === 'green') {
      setLastEntry({ ...result.entry, name: result.name });
      // 직전 취소 안내가 새 입장의 취소 버튼을 가리지 않게
      setNotice(null);
    }
  }, []);

  /**
   * `manual`: 명단에서 직접 고른 입장. 카메라는 같은 QR을 계속 보내므로 판정
   * 중·직후의 같은 QR을 조용히 무시하지만, 사람이 확인까지 누른 건 무시하면
   * 안 된다.
   */
  const handle = useCallback(
    async (data: string, { manual = false }: { manual?: boolean } = {}) => {
      // 재입장 허용 같은 설정이 명단 동기화로 바뀌었을 수 있어 매번 읽는다
      const drop = getDrop(dropId);
      if (!drop || !gate || !staffId) return;
      if (busy.current) {
        if (manual) setNotice('앞 판정이 끝난 뒤 다시 눌러주세요');
        return;
      }
      const now = Date.now();
      if (
        !manual &&
        recent.current?.data === data &&
        now < recent.current.until
      )
        return;

      busy.current = true;
      setJudging(true);
      try {
        const tryServer =
          networkUp &&
          (serverReachable || now - lastFailureAt.current > SERVER_RETRY_MS);
        let result: Verdict;
        try {
          const outcome = await judge({
            request: auth.request,
            drop,
            gate,
            staffId,
            data,
            tryServer,
          });
          if (outcome.server === 'ok') setServerReachable(true);
          if (outcome.server === 'down') {
            setServerReachable(false);
            lastFailureAt.current = Date.now();
          }
          result = outcome.verdict;
          // 리허설 계측 (PRD 8장: 스캔 → 판정 1초 이내, 앱 내부 로그)
          if (__DEV__)
            console.log(
              `[gate] 판정 ${Date.now() - now}ms · 서버 ${outcome.server} · ${result.color} ${result.title}${manual ? ' · 명단' : ''}`
            );
        } catch (error) {
          // 기기 저장소 오류 등 — 아무 반응이 없으면 스태프가 판단할 수 없다
          console.warn('[gate] 판정 실패', error);
          result = cannotJudge('판정 중 문제가 생겼습니다. 다시 스캔해주세요.');
        }
        recent.current = { data, until: Number.POSITIVE_INFINITY };
        show(result);
        onChange();
      } finally {
        busy.current = false;
        setJudging(false);
      }
    },
    [
      dropId,
      gate,
      staffId,
      networkUp,
      serverReachable,
      auth.request,
      show,
      onChange,
    ]
  );

  const dismiss = useCallback(() => {
    setVerdict(null);
    if (recent.current)
      recent.current = {
        ...recent.current,
        until: Date.now() + SAME_QR_PAUSE_MS,
      };
  }, []);

  const approve = useCallback(() => {
    const drop = getDrop(dropId);
    if (!drop || !gate || !staffId) return;
    if (verdict?.color !== 'yellow' || !verdict.pending) return;
    try {
      show(approvePending({ drop, gate, staffId, pending: verdict.pending }));
    } catch (error) {
      console.warn('[gate] 수동 승인 기록 실패', error);
      setVerdict(cannotJudge('기록하지 못했습니다. 다시 스캔해주세요.'));
      return;
    }
    onChange();
  }, [dropId, gate, staffId, verdict, show, onChange]);

  const undo = useCallback(
    (entry: LastEntry) => {
      if (!gate || !staffId) return;
      try {
        enqueueUndo({
          dropId,
          staffId,
          gate,
          token: entry.token,
          undoes: entry.clientId,
          reentry: entry.reentry,
        });
      } catch (error) {
        console.warn('[gate] 입장 취소 기록 실패', error);
        setNotice('입장을 취소하지 못했습니다. 다시 시도해주세요.');
        return;
      }
      // 확인창이 떠 있던 사이 다른 사람이 입장했으면 그 사람의 취소 버튼은 남긴다
      setLastEntry((current) =>
        current?.clientId === entry.clientId ? null : current
      );
      setNotice(`${entry.name} 입장을 취소했습니다`);
      vibrate('yellow');
      AccessibilityInfo.announceForAccessibility('입장을 취소했습니다');
      onChange();
      // 온라인이면 바로 올린다 — 다음 폴링(15초)까지 두면 그 사이 다른 입구에서
      // 이 관객이 '이미 입장'으로 막힌다
      sync.refetch();
    },
    [dropId, gate, staffId, onChange, sync]
  );

  /** 직전 입장 취소 — 확인창이 떠 있는 동안은 스캔을 멈춘다(`paused`) */
  const requestUndo = useCallback(() => {
    const entry = lastEntry;
    if (!entry) return;
    setConfirming(true);
    const close = () => setConfirming(false);
    Alert.alert(
      `${entry.name} 입장을 취소할까요?`,
      entry.reentry
        ? '이번 재입장 기록만 취소됩니다. 처음 입장은 그대로입니다.'
        : '잘못 스캔했을 때만 취소하세요. 취소한 기록도 남습니다.',
      [
        { text: '닫기', style: 'cancel', onPress: close },
        {
          text: '입장 취소',
          style: 'destructive',
          onPress: () => {
            close();
            undo(entry);
          },
        },
      ],
      // Android는 바깥을 눌러 닫을 수 있다
      { cancelable: true, onDismiss: close }
    );
  }, [lastEntry, undo]);

  useEffect(() => {
    if (!verdict || verdict.color === 'yellow') return;
    const timer = setTimeout(dismiss, SHOW_MS[verdict.color]);
    return () => clearTimeout(timer);
  }, [verdict, dismiss]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  return {
    verdict,
    judging,
    offline: !networkUp || !serverReachable,
    handle,
    dismiss,
    approve,
    /** 취소 확인창이 떠 있다 — 그 사이 들어온 입장과 헷갈리지 않게 스캔을 멈춘다 */
    paused: confirming,
    lastEntry,
    notice,
    requestUndo,
  };
}
