'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';

/**
 * 작성 중인 메일을 브라우저에 자동 저장한다.
 *
 * Radix Tabs는 비활성 탭을 언마운트하므로 탭을 옮기는 것만으로 폼 상태와
 * TipTap 인스턴스가 통째로 파괴된다. 새로고침·실수로 탭 닫기도 마찬가지다.
 * 되돌릴 수 없는 발송 직전까지 공들여 쓴 본문이 클릭 한 번에 사라지던 문제.
 *
 * localStorage에 두는 이유: 초안은 이 브라우저에서만 의미가 있고,
 * 서버에 저장하려면 EmailCampaign에 draft 흐름을 새로 만들어야 한다.
 * (스키마에 EmailStatus.draft가 있지만 만드는 코드가 없다 — 별도 과제)
 */

const PREFIX = 'prectxe:email-draft:';
const SAVE_DEBOUNCE_MS = 500;

function readDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    // 시크릿 모드·저장소 차단·JSON 손상 — 초안이 없는 것으로 취급한다
    return null;
  }
}

function writeDraft(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // 용량 초과(본문에 큰 이미지) 등 — 저장 실패가 작성을 막아선 안 된다
  }
}

function removeDraft(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // no-op
  }
}

interface UseEmailDraftResult {
  /** 저장돼 있던 초안을 불러왔는지 — 안내 배너 노출용 */
  restored: boolean;
  /**
   * EmailEditor에 넘길 key.
   * TipTap은 `content`를 **초기값으로만** 쓰므로, 폼 값을 되돌린 뒤
   * 에디터를 재마운트해야 화면에 반영된다.
   */
  editorKey: number;
  /** 초안을 버리고 폼을 비운다(발송 완료 후에도 사용) */
  reset: () => void;
}

export function useEmailDraft<T extends FieldValues>(
  key: string,
  form: UseFormReturn<T>,
  /** 비어 있다고 볼 값인지 — 빈 초안을 저장하지 않기 위해 */
  isEmpty: (values: T) => boolean
): UseEmailDraftResult {
  const [restored, setRestored] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  // form·isEmpty는 렌더마다 새 참조라 deps에 넣으면 effect가 매번 재실행된다.
  // (CLAUDE.md: 인라인 콜백을 hook deps에 넣으면 무한 루프)
  const formRef = useRef(form);
  formRef.current = form;
  const isEmptyRef = useRef(isEmpty);
  isEmptyRef.current = isEmpty;

  // 복원은 마운트 후에 한다. 렌더 중에 localStorage를 읽으면 서버 렌더 결과와
  // 달라져 hydration 불일치가 난다.
  useEffect(() => {
    const draft = readDraft<T>(key);
    if (draft && !isEmptyRef.current(draft)) {
      formRef.current.reset(draft);
      setEditorKey((k) => k + 1);
      setRestored(true);
    }
  }, [key]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pending: T | null = null;

    const flush = () => {
      if (pending === null) return;
      if (isEmptyRef.current(pending)) removeDraft(key);
      else writeDraft(key, pending);
      pending = null;
    };

    const subscription = formRef.current.watch((values) => {
      pending = values as T;
      clearTimeout(timer);
      timer = setTimeout(flush, SAVE_DEBOUNCE_MS);
    });

    return () => {
      clearTimeout(timer);
      // 언마운트 직전 미저장분을 반드시 기록한다.
      // 탭 전환이 곧 언마운트라, 여기서 버리면 마지막 500ms 안에 친 내용이
      // 사라진다 — 애초에 고치려던 증상이 그대로 남는다.
      flush();
      subscription.unsubscribe();
    };
  }, [key]);

  const reset = useCallback(() => {
    removeDraft(key);
    formRef.current.reset();
    setEditorKey((k) => k + 1);
    setRestored(false);
  }, [key]);

  return { restored, editorKey, reset };
}
