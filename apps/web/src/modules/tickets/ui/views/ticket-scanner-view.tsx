'use client';

import { Camera, CheckCircle2, RotateCcw, X, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatKstDateTime } from '@/lib/utils';
import { extractTicketToken } from '@/lib/utils/ticket-url';
import {
  checkInTicket,
  undoScannerEntry,
} from '@/modules/tickets/server/actions';
import { useCheckInStats } from '@/modules/tickets/ui/components/live-check-in-stats';

type ScanResult =
  | {
      kind: 'ok';
      /** 재입장 허용 행사에서 이미 입장한 티켓을 다시 들여보낸 경우 */
      reentry: boolean;
      buyerName: string;
      tierName: string;
      token: string;
      /** 이 입장의 clientId — 취소할 때 이 입장만 겨냥한다 */
      clientId: string;
    }
  | {
      kind: 'already';
      buyerName: string;
      tierName: string;
      checkedInAt: Date | null;
      checkedInGate: string | null;
      token: string;
      /** 이 스캐너가 들여보낸 입장이면 그 clientId — 아니면 취소할 수 없다 */
      mine: string | null;
    }
  | {
      kind: 'undone';
      buyerName: string;
      tierName: string;
      token: string;
      /** 재입장 기록만 취소했다 — 처음 입장은 그대로다 */
      reentry: boolean;
    }
  | { kind: 'error'; message: string };

const COOLDOWN_MS = 1500;

/** 이 스캐너가 들여보낸 첫 입장 — 그 입장의 clientId와 입장 시각 */
type MyEntry = { clientId: string; checkedInAt: string };

/**
 * 이 스캐너가 들여보낸 입장(토큰 → MyEntry). 페이지를 새로고침해도 취소할 수
 * 있게 탭 세션에 둔다. 다른 기기·다른 입구의 입장은 여기 없으니 취소할 수 없다.
 */
function loadMyEntries(key: string): Map<string, MyEntry> {
  try {
    const raw = sessionStorage.getItem(key);
    return new Map(raw ? (JSON.parse(raw) as [string, MyEntry][]) : []);
  } catch {
    return new Map();
  }
}

/**
 * '이미 입장됨'이 이 스캐너가 들여보낸 입장 때문인지 — 기억한 입장의 시각이
 * 지금 티켓의 입장 시각과 같아야 한다. 그 입장이 다른 곳에서 취소된 뒤 다른
 * 입구에서 다시 들어왔으면 기억만 남아 있고, 그걸로 취소하면 아무것도 안 바뀐다.
 */
function myCurrentEntry(
  entry: MyEntry | undefined,
  checkedInAt: Date | null
): string | null {
  if (!entry || !checkedInAt) return null;
  return new Date(entry.checkedInAt).getTime() ===
    new Date(checkedInAt).getTime()
    ? entry.clientId
    : null;
}

/** crypto.randomUUID는 iOS Safari 15.4 미만·http 접속에서 없다 — v4를 직접 만든다 */
function newClientId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function saveMyEntries(key: string, entries: Map<string, MyEntry>) {
  try {
    sessionStorage.setItem(key, JSON.stringify([...entries]));
  } catch {
    // 저장 실패 — 이 페이지에서는 메모리 값으로 계속 동작한다
  }
}

function playBeep(success: boolean) {
  if (typeof window === 'undefined') return;
  try {
    const ctx = new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    )();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = success ? 880 : 220;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch {
    // 사일런트 폴백
  }
}

export function TicketScannerView({
  dropId,
  dropTitle,
}: {
  dropId: string;
  dropTitle: string;
}) {
  // 다른 입구(게이트 앱 등)의 입장도 반영되게 주기적으로 다시 읽는다 (FR-7)
  const { stats, refresh: refreshStats } = useCheckInStats(dropId);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // 취소 요청 중 — 두 번 눌러 취소 기록이 두 번 남지 않게
  const [undoing, setUndoing] = useState(false);
  const lastTokenRef = useRef<{ token: string; at: number } | null>(null);
  // 입장 취소 직후 카메라에 그대로 남아 있는 같은 QR이 즉시 재체크인되는 것을
  // 막는다. '다음'을 누르거나 다른 QR이 들어올 때까지 이 토큰은 무시한다.
  const suppressedTokenRef = useRef<string | null>(null);
  const scannerRef = useRef<{
    stop: () => Promise<void>;
    clear: () => void;
  } | null>(null);
  const elementId = 'qr-scanner-region';
  const entriesKey = `scanner-entries:${dropId}`;
  const myEntriesRef = useRef<Map<string, MyEntry>>(new Map());
  useEffect(() => {
    myEntriesRef.current = loadMyEntries(entriesKey);
  }, [entriesKey]);

  const handleScan = useCallback(
    async (decodedText: string) => {
      // 동일 토큰 연속 스캔 디바운스
      const token = extractTicketToken(decodedText);
      if (!token) {
        setResult({ kind: 'error', message: '인식할 수 없는 QR입니다.' });
        playBeep(false);
        return;
      }
      if (suppressedTokenRef.current === token) return;
      // 다른 사람으로 넘어갔으면 억제 해제
      suppressedTokenRef.current = null;

      const last = lastTokenRef.current;
      if (last && last.token === token && Date.now() - last.at < COOLDOWN_MS) {
        return;
      }
      lastTokenRef.current = { token, at: Date.now() };

      const clientId = newClientId();
      let r: Awaited<ReturnType<typeof checkInTicket>>;
      try {
        r = await checkInTicket(token, dropId, clientId);
      } catch {
        // 응답이 없으면 입장됐는지 모른다 — 다시 찍으면 서버가 판정한다
        setResult({
          kind: 'error',
          message: '판정하지 못했습니다. 연결을 확인하고 다시 스캔해주세요.',
        });
        playBeep(false);
        lastTokenRef.current = null;
        return;
      }
      if (!r.success) {
        setResult({ kind: 'error', message: r.error });
        playBeep(false);
        return;
      }
      if (r.result === 'already') {
        setResult({
          kind: 'already',
          buyerName: r.data.buyerName,
          tierName: r.data.tierName,
          checkedInAt: r.data.checkedInAt,
          checkedInGate: r.data.checkedInGate ?? null,
          token,
          mine: myCurrentEntry(
            myEntriesRef.current.get(token),
            r.data.checkedInAt
          ),
        });
        playBeep(false);
        return;
      }
      // 첫 입장만 기억한다 — 재입장 기록을 덮어쓰면 첫 입장을 취소할 수 없다
      if (r.result === 'entered' && r.data.checkedInAt) {
        myEntriesRef.current.set(token, {
          clientId,
          checkedInAt: new Date(r.data.checkedInAt).toISOString(),
        });
        saveMyEntries(entriesKey, myEntriesRef.current);
      }
      setResult({
        kind: 'ok',
        reentry: r.result === 'reentered',
        buyerName: r.data.buyerName,
        tierName: r.data.tierName,
        token,
        clientId,
      });
      playBeep(true);
      refreshStats();
    },
    [dropId, entriesKey, refreshStats]
  );

  // html5-qrcode 동적 import (서버 빌드 회피)
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;

        const instance = new Html5Qrcode(elementId, { verbose: false });
        scannerRef.current = {
          stop: () => instance.stop(),
          clear: () => instance.clear(),
        };

        await instance.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 280, height: 280 },
            aspectRatio: 1.0,
          },
          (decoded) => {
            handleScan(decoded);
          },
          () => {
            // 매 프레임 미인식 → 무시
          }
        );

        if (cancelled) {
          await instance.stop();
          instance.clear();
          return;
        }

        setScanning(true);
        setErrorMsg(null);

        cleanup = () => {
          instance
            .stop()
            .then(() => instance.clear())
            .catch(() => {
              /* noop */
            });
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : '카메라를 열 수 없습니다.';
        setErrorMsg(msg);
      }
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [handleScan]);

  async function handleUndo() {
    if (undoing) return;
    if (!result || result.kind === 'error' || result.kind === 'undone') return;
    const undoes = result.kind === 'ok' ? result.clientId : result.mine;
    if (!undoes) return;
    const reentry = result.kind === 'ok' && result.reentry;
    setUndoing(true);
    try {
      const r = await undoScannerEntry(result.token, dropId, undoes);
      // 실패를 카메라 영역(errorMsg)에 띄우면 카메라 권한 안내처럼 보인다
      if (!r.success) {
        setResult({ kind: 'error', message: r.error });
        playBeep(false);
        return;
      }
      if (!reentry && !r.reverted) {
        // 취소 기록은 남았지만 그 사이 입장 상태가 바뀌어 되돌린 게 없다
        setResult({
          kind: 'error',
          message:
            '입장 상태가 그 사이 바뀌어 되돌리지 않았습니다. 입장 기록 화면에서 확인해주세요.',
        });
        playBeep(false);
        return;
      }
      if (!reentry) {
        myEntriesRef.current.delete(result.token);
        saveMyEntries(entriesKey, myEntriesRef.current);
      }
      suppressedTokenRef.current = result.token;
      lastTokenRef.current = null;
      setResult({
        kind: 'undone',
        buyerName: result.buyerName,
        tierName: result.tierName,
        token: result.token,
        reentry,
      });
      playBeep(false);
      refreshStats();
    } catch {
      setResult({
        kind: 'error',
        message: '취소하지 못했습니다. 연결을 확인하고 다시 시도해주세요.',
      });
      playBeep(false);
    } finally {
      setUndoing(false);
    }
  }

  /** 결과 패널을 닫고 억제를 푼다 — 같은 사람을 다시 찍을 수 있어야 한다. */
  function handleNext() {
    suppressedTokenRef.current = null;
    lastTokenRef.current = null;
    setResult(null);
  }

  return (
    <div className="fixed inset-0 z-100 flex flex-col bg-black text-white">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-white/40">
            Scanner
          </p>
          <p className="truncate text-sm font-semibold">{dropTitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {stats && (
            <div className="text-right">
              <p className="text-xs text-white/40">입장</p>
              <p className="font-mono text-base font-semibold">
                {stats.checkedIn} / {stats.total}
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="text-white/60 hover:bg-white/10 hover:text-white"
          >
            <Link href={`/admin/drops/${dropId}`}>
              <X className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Camera Region */}
      <div className="relative flex-1 overflow-hidden bg-black">
        <div
          id={elementId}
          className="absolute inset-0 [&>video]:h-full [&>video]:w-full [&>video]:object-cover"
        />
        {!scanning && !errorMsg && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/60">
            <Camera className="h-10 w-10" />
            <p className="text-sm">카메라 시작 중...</p>
          </div>
        )}
        {errorMsg && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <XCircle className="h-10 w-10 text-red-400" />
            <p className="text-sm text-red-300">{errorMsg}</p>
            <p className="text-xs text-white/50">
              브라우저 카메라 권한을 확인하고 페이지를 새로고침하세요.
            </p>
          </div>
        )}

        {/* 가이드 프레임 */}
        {scanning && !result && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-72 w-72 rounded-2xl border-2 border-white/40" />
          </div>
        )}
      </div>

      {/* Result Sheet */}
      <div className="border-t border-white/10 bg-black/95 backdrop-blur-sm">
        {result ? (
          <ResultPanel
            result={result}
            onUndo={handleUndo}
            onNext={handleNext}
            undoing={undoing}
          />
        ) : (
          <div className="flex items-center justify-center px-6 py-5 text-sm text-white/40">
            QR 코드를 프레임 안에 비춰주세요
          </div>
        )}
      </div>
    </div>
  );
}

function ResultPanel({
  result,
  onUndo,
  onNext,
  undoing,
}: {
  result: Exclude<ScanResult, null>;
  onUndo: () => void;
  onNext: () => void;
  undoing: boolean;
}) {
  if (result.kind === 'error') {
    return (
      <div className="flex items-center justify-between gap-4 bg-red-950/40 px-5 py-4">
        <div className="flex items-center gap-3">
          <XCircle className="h-7 w-7 shrink-0 text-red-400" />
          <div>
            <p className="text-sm font-semibold text-red-200">실패</p>
            <p className="text-xs text-red-300/80">{result.message}</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onNext}
          className="border-white/20 bg-white/5 text-white hover:bg-white/10"
        >
          다음
        </Button>
      </div>
    );
  }

  if (result.kind === 'undone') {
    return (
      <div className="flex items-center justify-between gap-4 border-t border-white/15 bg-white/5 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <RotateCcw className="h-7 w-7 shrink-0 text-white/60" />
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-white">
              {result.buyerName} · {result.tierName}
            </p>
            <p className="text-xs text-white/50">
              {result.reentry
                ? '재입장 기록만 취소됨 · 처음 입장은 그대로'
                : "입장 취소됨 · 다시 스캔하려면 '다음'"}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={onNext}
          className="shrink-0 bg-white text-black hover:bg-white/90"
        >
          다음
        </Button>
      </div>
    );
  }

  const ok = result.kind === 'ok';
  const tone = ok
    ? 'bg-emerald-950/40 text-emerald-200 border-emerald-400/30'
    : 'bg-amber-950/40 text-amber-200 border-amber-400/30';
  const Icon = ok ? CheckCircle2 : RotateCcw;
  // '이미 입장됨'은 이 스캐너가 들여보낸 입장일 때만 취소할 수 있다 — 다른
  // 입구의 정상 입장을 캡처 QR 때문에 지우면 그 QR로 또 들어올 수 있다
  const canUndo = ok || result.mine !== null;

  return (
    <div
      className={`flex items-center justify-between gap-4 border-t px-5 py-4 ${tone}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Icon className="h-7 w-7 shrink-0" />
        <div className="min-w-0">
          <p className="truncate text-base font-bold">
            {result.buyerName} · {result.tierName}
          </p>
          <p className="text-xs opacity-80">
            {ok
              ? result.reentry
                ? '재입장'
                : '입장 완료'
              : [
                  '이미 입장됨',
                  result.checkedInAt &&
                    formatKstDateTime(new Date(result.checkedInAt)),
                  result.checkedInGate && `${result.checkedInGate} 입구`,
                  result.mine && '이 스캐너에서 입장',
                ]
                  .filter(Boolean)
                  .join(' · ')}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {/*
          이 스캐너가 들여보낸 사람이면 '이미 입장됨'에도 취소를 둔다 — 잘못
          찍고 '다음'을 눌러버리면 다시 찍어도 이 패널이 뜨므로, 버튼이 없으면
          현장에서 복구할 방법이 사라진다.
        */}
        {canUndo && (
          <Button
            size="sm"
            variant="outline"
            onClick={onUndo}
            disabled={undoing}
            className="border-white/20 bg-white/5 text-white hover:bg-white/10"
          >
            {undoing ? '취소 중…' : '입장 취소'}
          </Button>
        )}
        <Button
          size="sm"
          onClick={onNext}
          className="bg-white text-black hover:bg-white/90"
        >
          다음
        </Button>
      </div>
    </div>
  );
}
