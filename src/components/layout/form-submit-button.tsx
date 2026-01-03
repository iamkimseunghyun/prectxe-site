import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

export interface FormSubmitButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  children: ReactNode;
}

const FormSubmitButton = ({
  loading = false,
  loadingText = '처리중...',
  children,
  disabled,
  className = '',
  ...props
}: FormSubmitButtonProps) => {
  return (
    <Button
      disabled={loading || disabled}
      className={`relative ${className}`}
      {...props}
    >
      {loading && <Loader2 className="absolute left-4 h-4 w-4 animate-spin" />}
      <span className={loading ? 'pl-6' : ''}>
        {loading ? loadingText : children}
      </span>
    </Button>
  );
};

export default FormSubmitButton;
