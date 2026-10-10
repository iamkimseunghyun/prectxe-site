'use client';

import { ChevronDown, Loader2 } from 'lucide-react';
import { useRef } from 'react';
import FormSubmitButton from '@/components/layout/form-submit-button';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { SubmitIntent } from '@/hooks/use-form-submit';
import { cn } from '@/lib/utils';

export interface ExtraIntent {
  intent: Exclude<SubmitIntent, 'default'>;
  label: string;
}

/** 저장 후 이동을 고르는 표준 메뉴 항목. 필요한 폼만 골라 쓴다. */
export const SAVE_AND_CONTINUE: ExtraIntent = {
  intent: 'continue',
  label: '저장 후 계속 편집',
};
export const SAVE_AND_NEW: ExtraIntent = {
  intent: 'new',
  label: '저장 후 새로 작성',
};

interface FormActionBarProps {
  /** useFormSubmit().isSubmitting — 저장·이동 중에는 모든 버튼이 비활성화된다. */
  isSubmitting: boolean;
  /** useFormSubmit().activeIntent — 눌린 버튼에만 스피너를 보여 준다. */
  activeIntent: SubmitIntent | null;
  /** 주 버튼 문구. 기본 '저장' */
  submitLabel?: string;
  /** 저장 중 문구. 기본 '저장 중…' */
  loadingLabel?: string;
  /** 저장 외 조건으로 막을 때(예: 슬러그 중복 확인 결과). 진행 중 비활성화와는 별개. */
  disabled?: boolean;
  /** 저장 후 동작 메뉴. 주면 주 버튼 옆에 ▾ 메뉴가 붙는다. */
  extraIntents?: ExtraIntent[];
  /** extraIntents를 쓸 때 필수 — useFormSubmit().selectIntent */
  onSelectIntent?: (intent: SubmitIntent) => void;
  onPreview?: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
  className?: string;
}

/**
 * 어드민 폼 하단 버튼 막대 — `[취소] [미리보기] [저장 ▾]`.
 * 반드시 <form> 안에 둔다(주 버튼이 type="submit", 메뉴 항목은 form.requestSubmit()).
 * 진행 중 동작은 CLAUDE.md "어드민 폼 규칙" 참고.
 */
export function FormActionBar({
  isSubmitting,
  activeIntent,
  submitLabel = '저장',
  loadingLabel = '저장 중…',
  disabled = false,
  extraIntents,
  onSelectIntent,
  onPreview,
  onCancel,
  cancelLabel = '취소',
  className,
}: FormActionBarProps) {
  const groupRef = useRef<HTMLDivElement>(null);
  const hasMenu = !!extraIntents?.length;
  // 메뉴에서 고른 동작이 진행 중이면 ▾ 자리에 스피너를 보여 준다.
  const menuBusy = activeIntent !== null && activeIntent !== 'default';
  const blocked = isSubmitting || disabled;

  return (
    <div className={cn('flex flex-wrap justify-end gap-3', className)}>
      {onCancel && (
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {cancelLabel}
        </Button>
      )}
      {onPreview && (
        <Button
          type="button"
          variant="outline"
          onClick={onPreview}
          disabled={isSubmitting}
        >
          미리보기
        </Button>
      )}

      <div ref={groupRef} className="flex">
        <FormSubmitButton
          type="submit"
          loading={activeIntent === 'default'}
          loadingText={loadingLabel}
          disabled={blocked}
          aria-busy={isSubmitting}
          // 주 버튼(엔터 제출 포함)은 항상 기본 의도 — 메뉴에서 고른 의도가 검증 실패로
          // 남아 있어도 이 클릭이 먼저 되돌린다.
          onClick={() => onSelectIntent?.('default')}
          className={hasMenu ? 'rounded-r-none' : undefined}
        >
          {submitLabel}
        </FormSubmitButton>

        {hasMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                disabled={blocked}
                aria-label="저장 옵션 더 보기"
                className="rounded-l-none border-l border-primary-foreground/20 px-2"
              >
                {menuBusy ? (
                  <Loader2 className="motion-safe:animate-spin" />
                ) : (
                  <ChevronDown />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {extraIntents.map(({ intent, label }) => (
                <DropdownMenuItem
                  key={intent}
                  onSelect={() => {
                    onSelectIntent?.(intent);
                    groupRef.current?.closest('form')?.requestSubmit();
                  }}
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
