import React from 'react';

interface InfiniteScrollProps {
  trigger: React.RefObject<HTMLSpanElement | null>;
  isLoading: boolean;
}

const InfiniteScroll = ({ trigger, isLoading }: InfiniteScrollProps) => {
  return (
    <span
      ref={trigger}
      className="mx-auto w-fit rounded-md bg-orange-500 px-3 py-2 text-sm font-semibold hover:opacity-90 active:scale-95"
    >
      {isLoading ? '로딩 중...' : '더 보기'}
    </span>
  );
};

export default InfiniteScroll;
