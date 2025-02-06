'use client';

import React from 'react';

interface FormButtonProps {
  text: string;
  isPending?: boolean;
  action?: () => void;
  disabled?: boolean;
}

const Button = ({ text, isPending, action }: FormButtonProps) => {
  return (
    <button
      onClick={action}
      disabled={isPending}
      className={`primary-btn h-10 disabled:cursor-not-allowed disabled:bg-neutral-400 disabled:text-neutral-300`}
    >
      {isPending ? '로딩 중' : text}
    </button>
  );
};

export default Button;
