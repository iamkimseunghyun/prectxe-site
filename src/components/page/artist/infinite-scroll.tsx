import React from 'react';
import Spinner from '@/components/spinner';

interface InfiniteScrollProps {
  trigger: React.RefObject<HTMLSpanElement | null>;
  isLoading: boolean;
}

const InfiniteScroll = ({ trigger, isLoading }: InfiniteScrollProps) => {
  return (
    <span ref={trigger} className="mx-auto">
      {isLoading ? <Spinner /> : '더 보기'}
    </span>
  );
};

export default InfiniteScroll;
