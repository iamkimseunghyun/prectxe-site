'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  FileText,
  FolderOpen,
  Loader2,
  MapPin,
  Search,
  User,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogOverlay,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, getImageUrl } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { globalSearch } from '@/app/actions';
import Image from 'next/image';
import Link from 'next/link';

type SearchResult = {
  id: string;
  title: string;
  type: 'artist' | 'artwork' | 'event' | 'project' | 'venue';
  subtype?: string;
  imageUrl?: string | null;
  description?: string | null;
  url: string;
};

const searchCategories = [
  { label: '작품', value: 'artwork', icon: FileText },
  { label: '아티스트', value: 'artist', icon: User },
  { label: '이벤트', value: 'event', icon: Calendar },
  { label: '프로젝트', value: 'project', icon: FolderOpen },
];

const GlobalSearch = () => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // 로컬 스토리지에서 최근 검색어 불러오기
  useEffect(() => {
    const savedSearches = localStorage.getItem('recentSearches');
    if (savedSearches) {
      try {
        setRecentSearches(JSON.parse(savedSearches).slice(0, 5));
      } catch (e) {
        console.error('Failed to parse recent searches', e);
      }
    }
  }, []);

  // 최근 검색어 저장
  const saveRecentSearch = (result: SearchResult) => {
    const updatedRecentSearches = [
      result,
      ...recentSearches.filter((item) => item.id !== result.id),
    ].slice(0, 5);

    setRecentSearches(updatedRecentSearches);
    localStorage.setItem(
      'recentSearches',
      JSON.stringify(updatedRecentSearches)
    );
  };

  // 실시간 검색 결과 가져오기
  useEffect(() => {
    const fetchResults = async () => {
      if (!debouncedSearchTerm || debouncedSearchTerm.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const results = await globalSearch(debouncedSearchTerm, 10);
        const filteredResults =
          selectedCategories.length > 0
            ? results.filter((result) =>
                selectedCategories.includes(result.type)
              )
            : results;
        setSearchResults(filteredResults);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    };

    fetchResults();
  }, [debouncedSearchTerm, selectedCategories]);

  // Reset search term when dialog opens
  useEffect(() => {
    if (open) {
      // Focus the input when dialog opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      // Clear search when dialog closes
      setSearchTerm('');
      setSearchResults([]);
    }
  }, [open]);

  // Handle ESC key properly
  const handleEscKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && open) {
      e.preventDefault();
      setOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [open]);

  // handleSearch 함수 수정
  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setIsPending(true);
    setIsSearching(true);

    try {
      // 외부 경로로 이동하지 않고 내부에서 결과 처리
      const results = await globalSearch(searchTerm, 20); // 더 많은 결과 가져오기
      setSearchResults(results);
      // 필요하다면 UI 상태 변경 (예: 결과 보기 모드로 전환)
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
      setIsPending(false);
    }
  };
  // Handle keyboard shortcut for search (Ctrl+K or Command+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle Enter key in search input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Toggle category filter
  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  // Get icon for result type
  const getResultIcon = (type: string) => {
    switch (type) {
      case 'artist':
        return <User className="h-4 w-4 text-blue-500" />;
      case 'artwork':
        return <FileText className="h-4 w-4 text-green-500" />;
      case 'event':
        return <Calendar className="h-4 w-4 text-purple-500" />;
      case 'project':
        return <FolderOpen className="h-4 w-4 text-orange-500" />;
      case 'venue':
        return <MapPin className="h-4 w-4 text-red-500" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  // Get translated type name
  const getTypeName = (type: string) => {
    switch (type) {
      case 'artist':
        return '아티스트';
      case 'artwork':
        return '작품';
      case 'event':
        return '이벤트';
      case 'project':
        return '프로젝트';
      case 'venue':
        return '장소';
      default:
        return type;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex h-9 w-9 items-center justify-center gap-x-4 rounded-2xl p-0 sm:h-9 sm:w-auto sm:px-3 sm:py-2"
        >
          <Search className="h-4 w-4 text-black/40" />
          <span className="sr-only text-black/40 sm:not-sr-only">Search</span>
        </Button>
      </DialogTrigger>

      {/* Fixed backdrop opacity */}
      <DialogOverlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity data-[state=closed]:opacity-0 data-[state=open]:opacity-100" />

      {/* Fixed dialog content width with close button hidden */}
      <DialogContent
        className="fixed left-[50%] top-[50%] z-50 flex max-h-[85vh] w-[90%] max-w-2xl translate-x-[-50%] translate-y-[-50%] flex-col overflow-hidden rounded-lg border bg-background p-0 shadow-lg md:w-full"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between">
          <DialogTitle className="sr-only">사이트 검색</DialogTitle>
          <DialogDescription className="sr-only">
            아티스트, 작품, 이벤트, 프로젝트 등을 검색할 수 있습니다.
          </DialogDescription>
        </div>
        <div className="flex min-h-0 flex-col">
          <div className="relative flex-shrink-0">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="아티스트, 작품, 이벤트, 프로젝트 등 검색..."
              className={cn(
                'h-14 border-0 pl-12 pr-12 text-lg focus-visible:ring-0 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden',
                isPending && 'opacity-50'
              )}
              disabled={isPending}
              type="text"
              autoComplete="off"
              spellCheck="false"
            />
            {/* X 버튼은 검색어가 있을 때만 표시 */}
            {searchTerm && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2 h-10 w-10 rounded-full p-0 hover:bg-transparent"
                onClick={() => setSearchTerm('')}
                disabled={isPending}
                aria-label="Clear search"
              >
                {isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <X className="h-5 w-5" />
                )}
              </Button>
            )}
          </div>

          {/* 카테고리 필터 */}
          <div className="flex-shrink-0 px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {searchCategories.map((category) => (
                <Button
                  key={category.value}
                  variant={
                    selectedCategories.includes(category.value)
                      ? 'default'
                      : 'outline'
                  }
                  size="sm"
                  onClick={() => toggleCategory(category.value)}
                  className="flex items-center gap-1.5"
                >
                  <category.icon className="h-4 w-4" />
                  {category.label}
                </Button>
              ))}
            </div>
          </div>

          {/* 검색 결과 또는 최근 검색어 컨테이너 */}
          <div
            ref={resultsContainerRef}
            className="flex-1 overflow-y-auto overflow-x-hidden p-2"
            style={{
              maxHeight: 'calc(50vh - 130px)', // vh 기반 동적 높이 설정
              minHeight: '200px',
            }}
          >
            {/* 검색 중 로딩 표시 */}
            {isSearching && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* 검색 결과 표시 */}
            {!isSearching && searchResults.length > 0 && (
              <div className="space-y-1 px-2 py-2">
                <h3 className="px-2 pb-2 text-sm font-medium text-muted-foreground">
                  검색 결과
                </h3>
                <div className="grid gap-1 overflow-visible">
                  {searchResults.map((result) => (
                    <Link
                      href={result.url}
                      key={`${result.type}-${result.id}`}
                      className="h-auto w-full justify-start overflow-hidden text-ellipsis px-2 py-3 text-left"
                      onClick={() => {
                        saveRecentSearch(result);
                        setOpen(false);
                        router.push(result.url);
                      }}
                    >
                      <div className="flex w-full items-center gap-3">
                        {/* 여기서 이미지 표시 로직 변경 */}
                        {result.imageUrl ? (
                          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                            <Image
                              src={getImageUrl(result.imageUrl, 'thumbnail')}
                              alt={result.title}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-muted">
                            {/* 이미지가 없을 때만 Clock 아이콘 표시 */}
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <p className="truncate font-medium">{result.title}</p>
                          {result.description && (
                            <p className="truncate text-sm text-muted-foreground">
                              {result.description}
                            </p>
                          )}
                        </div>
                        <span className="ml-auto flex h-5 flex-shrink-0 items-center rounded-full bg-muted px-2 text-xs">
                          {getTypeName(result.type)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 검색 결과 없음 */}
            {!isSearching && searchTerm && searchResults.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="mb-1 text-lg font-medium">검색 결과가 없습니다</p>
                <p className="text-sm text-muted-foreground">
                  다른 검색어로 시도해보세요
                </p>
              </div>
            )}

            {/* 최근 검색 표시 (검색어가 없을 때) */}

            {!searchTerm && recentSearches.length > 0 && (
              <div className="space-y-1 px-2 py-2">
                <div className="flex items-center justify-between px-2 pb-2">
                  <h3 className="px-2 pb-2 text-sm font-medium text-muted-foreground">
                    최근 검색
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => {
                      setRecentSearches([]);
                      localStorage.removeItem('recentSearches');
                    }}
                  >
                    모두 지우기
                  </Button>
                </div>
                <div className="grid gap-1 overflow-visible">
                  {recentSearches.map((result) => (
                    <Link
                      href={result.url}
                      key={`recent-${result.type}-${result.id}`}
                      className="h-auto w-full justify-start overflow-hidden text-ellipsis px-2 py-2 text-left"
                      onClick={() => {
                        setOpen(false);
                      }}
                    >
                      <div className="flex w-full items-center gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-muted">
                          {getResultIcon(result.type)}
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <p className="truncate font-medium">{result.title}</p>
                          {result.description && (
                            <p className="truncate text-sm text-muted-foreground">
                              {result.description}
                            </p>
                          )}
                        </div>
                        <span className="ml-auto flex h-5 flex-shrink-0 items-center rounded-full bg-muted px-2 text-xs">
                          {getTypeName(result.type)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 푸터 */}
          <DialogFooter className="mt-auto flex items-center justify-between border-t p-4 text-sm text-muted-foreground">
            <DialogClose asChild>
              <Button
                variant="default"
                size="default"
                className="h-8 w-14 rounded-md"
                aria-label="검색창 닫기"
              >
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GlobalSearch;
