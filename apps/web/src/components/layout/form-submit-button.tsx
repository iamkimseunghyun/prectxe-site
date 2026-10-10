import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface FormSubmitButtonProps extends ButtonProps {
  /** true면 스피너 + loadingText를 보이고 비활성화한다. */
  loading?: boolean;
  loadingText?: string;
  children: ReactNode;
}

/** 제출 버튼 — 진행 중에는 스피너와 문구를 바꾸고 비활성화한다(스피너는 모션 감소 설정을 따른다). */
const FormSubmitButton = ({
  loading = false,
  loadingText = '저장 중…',
  children,
  disabled,
  className,
  ...props
}: FormSubmitButtonProps) => {
  return (
    <Button
      disabled={loading || disabled}
      aria-busy={loading || undefined}
      className={cn('relative', className)}
      {...props}
    >
      {loading && (
        <Loader2
          aria-hidden
          className="absolute left-4 h-4 w-4 motion-safe:animate-spin"
        />
      )}
      <span className={loading ? 'pl-6' : undefined}>
        {loading ? loadingText : children}
      </span>
    </Button>
  );
};

export default FormSubmitButton;
