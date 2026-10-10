'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';

/** 저장 후 어디로 갈지. 'default' = 목록 등 기본 이동, 'continue' = 계속 편집, 'new' = 새로 작성. */
export type SubmitIntent = 'default' | 'continue' | 'new';

/** 어드민 폼의 저장 액션이 돌려주는 표준 결과. redirect가 있으면 성공 후 그 주소로 이동한다. */
export interface SubmitResult {
  success: boolean;
  error?: string;
  redirect?: string;
}

interface RunOptions {
  /** 성공 토스트 제목. 대상 이름을 넣은 완결 문장으로 — 예: '프로그램을 저장했습니다.' */
  successMessage: string;
  /** 실패 토스트 제목. 기본 '저장하지 못했습니다' */
  failureTitle?: string;
}

/**
 * 어드민 폼 저장의 공통 흐름 — 중복 제출 방지, 진행 상태, 성공·실패 토스트, 이동.
 * 규칙은 CLAUDE.md "어드민 폼 규칙" 참고.
 *
 *   const { run, notifyInvalid, selectIntent, isSubmitting, activeIntent } = useFormSubmit();
 *   const onSubmit = (e) => {
 *     e.preventDefault();
 *     if (!valid) return notifyInvalid('제목을 입력하세요');
 *     return run(async (intent) => { ...업로드, 저장...; return { success, error, redirect } },
 *                { successMessage: '프로그램을 저장했습니다.' });
 *   };
 *
 * - 저장 중(이동 중 포함)에는 isSubmitting이 true — 폼의 모든 버튼을 비활성화한다.
 * - activeIntent로 어느 버튼이 눌렸는지 알 수 있어, 그 버튼에만 스피너를 보여 준다.
 * - 같은 폼의 중복 제출은 동기 가드(ref)로 막는다. state는 렌더 후에야 바뀌어서
 *   더블클릭·엔터 연타를 못 막고, 이미지 업로드 URL은 1회용이라 재사용하면 깨진다.
 * - 진행 상태는 `running || isNavigating`에서 파생한다. 이동 완료를 effect로 감지해
 *   푸는 방식은 isNavigating이 변하지 않는 경우(같은 주소로 이동 등) 버튼이 영구히
 *   잠길 수 있어 쓰지 않는다.
 */
export function useFormSubmit() {
  const router = useRouter();
  const { toast } = useToast();
  const [running, setRunning] = useState(false);
  const [intent, setIntent] = useState<SubmitIntent | null>(null);
  const [isNavigating, startNavigation] = useTransition();
  const locked = useRef(false);
  const intentRef = useRef<SubmitIntent>('default');

  /** 다음 제출의 의도를 정한다(메뉴에서 '저장 후 계속 편집'을 고를 때). run이 읽고 'default'로 되돌린다. */
  const selectIntent = useCallback((next: SubmitIntent) => {
    intentRef.current = next;
  }, []);

  /**
   * 저장 전 검증 실패 — 저장이 막혔다는 걸 실패와 같은 모양으로 알린다.
   * 메뉴에서 고른 의도가 run까지 못 가고 남아 다음 '저장'에 새지 않도록 되돌린다.
   */
  const notifyInvalid = useCallback(
    (description: string) => {
      intentRef.current = 'default';
      toast({
        title: '입력 값을 확인해주세요',
        description,
        variant: 'destructive',
      });
    },
    [toast]
  );

  const run = useCallback(
    async (
      task: (intent: SubmitIntent) => Promise<SubmitResult | undefined>,
      { successMessage, failureTitle = '저장하지 못했습니다' }: RunOptions
    ): Promise<boolean> => {
      if (locked.current) return false;
      locked.current = true;
      const current = intentRef.current;
      intentRef.current = 'default';
      setIntent(current);
      setRunning(true);

      try {
        const result = await task(current);
        if (result && !result.success) {
          toast({
            title: failureTitle,
            description: result.error ?? '잠시 후 다시 시도해주세요.',
            variant: 'destructive',
          });
          return false;
        }
        toast({ title: successMessage });
        if (result?.redirect) {
          const to = result.redirect;
          // 같은 틱의 setRunning(false)와 한 번에 반영되어, 이동 시작 전 빈틈 없이 잠금이 이어진다.
          startNavigation(() => router.push(to));
        }
        return true;
      } catch (error) {
        console.error('[form submit]', error);
        toast({
          title: failureTitle,
          description:
            error instanceof Error
              ? error.message
              : '예기치 못한 오류가 발생했습니다. 다시 시도해주세요.',
          variant: 'destructive',
        });
        return false;
      } finally {
        locked.current = false;
        setRunning(false);
      }
    },
    [router, toast]
  );

  const busy = running || isNavigating;
  return {
    run,
    notifyInvalid,
    selectIntent,
    activeIntent: busy ? intent : null,
    isSubmitting: busy,
  };
}
