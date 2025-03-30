'use client';

import React, { useEffect, useRef, useState, useTransition } from 'react';
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
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { globalSearch } from '@/app/actions';
import Image from 'next/image';

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
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const inputRef = useRef<HTMLInputElement>(null);
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

  // Execute search
  const handleSearch = () => {
    if (!searchTerm.trim()) return;

    startTransition(() => {
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
    });
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex h-9 w-9 items-center justify-center rounded-md p-0 sm:h-9 sm:w-auto sm:px-3 sm:py-2"
        >
          <Search className="h-4 w-4 sm:mr-2" />
          <span className="sr-only sm:not-sr-only">검색</span>
          <kbd className="pointer-events-none ml-auto hidden select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs text-muted-foreground sm:inline-flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </DialogTrigger>
      <DialogContent className="p-0 sm:max-w-2xl">
        <DialogTitle className="sr-only">사이트 검색</DialogTitle>
        <div className="flex flex-col">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="아티스트, 작품, 이벤트, 프로젝트 등 검색..."
              className={cn(
                'h-14 border-0 pl-12 pr-12 text-lg focus-visible:ring-0',
                isPending && 'opacity-50'
              )}
              disabled={isPending}
            />
            {searchTerm && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2 h-10 w-10 rounded-full p-0 hover:bg-transparent"
                onClick={() => setSearchTerm('')}
                disabled={isPending}
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
          <div className="border-b border-t px-4 py-3">
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

          {/* 검색 결과 또는 최근 검색어 */}
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : searchTerm && searchResults.length > 0 ? (
              <div className="space-y-1 px-2 py-2">
                <h3 className="px-2 pb-2 text-sm font-medium text-muted-foreground">
                  검색 결과
                </h3>
                <div className="grid gap-1">
                  {searchResults.map((result) => (
                    <Button
                      key={`${result.type}-${result.id}`}
                      variant="ghost"
                      className="h-auto justify-start px-2 py-3 text-left"
                      onClick={() => {
                        saveRecentSearch(result);
                        router.push(result.url);
                        setOpen(false);
                      }}
                    >
                      <div className="flex w-full items-center gap-3">
                        {result.imageUrl ? (
                          <div className="relative h-10 w-10 overflow-hidden rounded-md bg-muted">
                            <Image
                              src={result.imageUrl}
                              alt={result.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                            {getResultIcon(result.type)}
                          </div>
                        )}
                        <div className="flex-1 overflow-hidden">
                          <p className="truncate font-medium">{result.title}</p>
                          {result.description && (
                            <p className="truncate text-sm text-muted-foreground">
                              {result.description}
                            </p>
                          )}
                        </div>
                        <span className="ml-auto flex h-5 items-center rounded-full bg-muted px-2 text-xs">
                          {result.type === 'artist' && '아티스트'}
                          {result.type === 'artwork' && '작품'}
                          {result.type === 'event' && '이벤트'}
                          {result.type === 'project' && '프로젝트'}
                          {result.type === 'venue' && '장소'}
                        </span>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            ) : searchTerm && searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="mb-1 text-lg font-medium">검색 결과가 없습니다</p>
                <p className="text-sm text-muted-foreground">
                  다른 검색어로 시도해보세요
                </p>
              </div>
            ) : recentSearches.length > 0 ? (
              <div className="space-y-1 px-2 py-2">
                <div className="flex items-center justify-between px-2 pb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
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
                <div className="grid gap-1">
                  {recentSearches.map((result) => (
                    <Button
                      key={`recent-${result.type}-${result.id}`}
                      variant="ghost"
                      className="h-auto justify-start px-2 py-3 text-left"
                      onClick={() => {
                        router.push(result.url);
                        setOpen(false);
                      }}
                    >
                      <div className="flex w-full items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="truncate font-medium">{result.title}</p>
                          {result.description && (
                            <p className="truncate text-sm text-muted-foreground">
                              {result.description}
                            </p>
                          )}
                        </div>
                        <span className="ml-auto flex h-5 items-center rounded-full bg-muted px-2 text-xs">
                          {result.type === 'artist' && '아티스트'}
                          {result.type === 'artwork' && '작품'}
                          {result.type === 'event' && '이벤트'}
                          {result.type === 'project' && '프로젝트'}
                          {result.type === 'venue' && '장소'}
                        </span>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="mb-1 text-lg font-medium">
                  무엇을 찾고 계신가요?
                </p>
                <p className="text-sm text-muted-foreground">
                  검색어를 입력하여 시작하세요
                </p>
              </div>
            )}
          </div>

          {/* 검색 버튼 */}
          <div className="flex justify-end border-t p-4">
            <Button
              variant="default"
              onClick={handleSearch}
              disabled={!searchTerm.trim() || isPending}
              className="px-6"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  검색 중...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  검색
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GlobalSearch;
