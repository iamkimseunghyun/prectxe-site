'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PAGINATION } from '@/lib/constants/constants';

interface UseInfiniteScrollOptions<T> {
  fetchFunction: (page: number, query?: string) => Promise<T[]>;
  initialData: T[];
  pageSize?: number;
  /**
   * Optional reset key to explicitly control when the list should reset
   * (e.g., when filters change). If provided, it will be included in the
   * change signature comparison to avoid unnecessary resets.
   */
  resetKey?: string | number;
}

export function useInfiniteScroll<T extends { id: string }>({
  fetchFunction,
  initialData,
  pageSize = PAGINATION.DEFAULT_PAGE_SIZE, // 기본 페이지 크기 설정
  resetKey,
}: UseInfiniteScrollOptions<T>) {
  const [items, setItems] = useState<T[]>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [isLastPage, setIsLastPage] = useState(false);
  const trigger = useRef<HTMLSpanElement>(null);

  // 중복 방지를 위한 ID 추적
  const itemIdsRef = useRef(new Set(initialData.map((item) => item.id)));
  const prevInitSigRef = useRef<string>('');

  const makeSignature = (arr: T[]): string => {
    // join ids to build a lightweight signature
    try {
      return (
        (resetKey !== undefined ? String(resetKey) + '|' : '') +
        arr.map((i) => i.id).join('|')
      );
    } catch {
      // fallback if arr malformed
      return (
        (resetKey !== undefined ? String(resetKey) + '|' : '') +
        String(arr?.length ?? 0)
      );
    }
  };

  // 초기 데이터나 검색어 변경 시 상태 초기화
  useEffect(() => {
    const sig = makeSignature(initialData || []);
    if (sig === prevInitSigRef.current) return; // guard to prevent redundant resets
    prevInitSigRef.current = sig;
    setItems(initialData || []);
    itemIdsRef.current = new Set((initialData || []).map((item) => item.id));
    setPage(1);
    setIsLastPage(false);
  }, [initialData, resetKey]);

  // 무한 스크롤 로직
  const loadMoreItems = useCallback(async () => {
    if (isLoading || isLastPage) return;

    setIsLoading(true);

    try {
      const newItems = await fetchFunction(page);

      // 중복 아이템 필터링
      const uniqueNewItems = newItems.filter(
        (item) => !itemIdsRef.current.has(item.id)
      );

      if (uniqueNewItems.length > 0) {
        // 새 아이템 ID 추가
        uniqueNewItems.forEach((item) => itemIdsRef.current.add(item.id));

        setPage((prev) => prev + 1);
        setItems((prev) => [...prev, ...uniqueNewItems]);
      }

      // 마지막 페이지 체크 (요청된 페이지 크기보다 적은 아이템 수)
      if (newItems.length < pageSize) {
        setIsLastPage(true);
      }
    } catch (error) {
      console.error('아이템 로딩 중 오류:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, isLoading, isLastPage, fetchFunction, pageSize]);

  // Intersection Observer 설정
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const element = entries[0];
        if (
          element.isIntersecting &&
          trigger.current &&
          !isLoading &&
          !isLastPage
        ) {
          loadMoreItems();
        }
      },
      {
        threshold: 0.5,
        rootMargin: '0px 0px 200px 0px', // 부드러운 경험을 위해 미리 로드
      }
    );

    if (trigger.current && !isLastPage) {
      observer.observe(trigger.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [loadMoreItems, isLastPage, isLoading]);

  return {
    items,
    isLoading,
    isLastPage,
    trigger,
    loadMoreItems,
  };
}
