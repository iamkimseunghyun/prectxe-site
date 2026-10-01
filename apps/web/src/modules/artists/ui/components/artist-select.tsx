'use client';

import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import Spinner from '@/components/icons/spinner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import { PAGINATION } from '@/lib/constants/constants';
import { formatArtistName, getImageUrl } from '@/lib/utils';
import { getMoreArtists } from '@/modules/artists/server/actions';

type Artist = {
  id: string;
  name: string;
  nameKr?: string | null;
  mainImageUrl: string | null;
  city?: string | null;
  country?: string | null;
};

type ProjectArtist = {
  artistId: string;
  artist: Artist;
};

interface ArtistSelectProps {
  artists?: Artist[];
  value: ProjectArtist[];
  onChange: (artists: ProjectArtist[]) => void;
}

function ArtistAvatar({
  artist,
  size = 'sm',
}: {
  artist: Artist;
  size?: 'sm' | 'md';
}) {
  const name = formatArtistName(artist.nameKr ?? null, artist.name ?? null);
  const initials = (artist.name || '')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const cls = size === 'sm' ? 'h-6 w-6' : 'h-10 w-10';

  return (
    <Avatar className={cls}>
      {artist.mainImageUrl ? (
        <AvatarImage
          src={getImageUrl(artist.mainImageUrl, 'public')}
          alt={name}
        />
      ) : (
        <AvatarFallback className={size === 'sm' ? 'text-[10px]' : ''}>
          {initials}
        </AvatarFallback>
      )}
    </Avatar>
  );
}

export function ArtistSelect({
  artists,
  value: selectedArtists = [],
  onChange,
}: ArtistSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Artist[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const stableInitial = useMemo(() => artists ?? [], [artists]);
  const selectedIds = useMemo(
    () => new Set(selectedArtists.map((pa) => pa.artistId)),
    [selectedArtists]
  );

  // 검색 디바운스 (300ms)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      const results = await getMoreArtists(0, searchQuery.trim());
      setSearchResults(results as Artist[]);
      setIsSearching(false);
    }, 300);
    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery]);

  // 다이얼로그 닫힐 때 검색 초기화
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setSearchResults(null);
    }
  }, [open]);

  const {
    items: allArtists,
    isLoading,
    isLastPage,
    trigger,
    loadMoreItems,
  } = useInfiniteScroll({
    fetchFunction: getMoreArtists,
    initialData: stableInitial,
    pageSize: PAGINATION.ARTISTS_PAGE_SIZE,
  });

  const displayArtists = searchResults ?? allArtists;
  const availableArtists = displayArtists.filter((a) => !selectedIds.has(a.id));
  const isSearchMode = searchQuery.trim().length > 0;

  function handleAdd(artist: Artist) {
    onChange([...selectedArtists, { artistId: artist.id, artist }]);
    setOpen(false);
  }

  function handleRemove(artistId: string) {
    onChange(selectedArtists.filter((pa) => pa.artistId !== artistId));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 rounded-md border p-4">
        {selectedArtists.map(({ artist }) => {
          const name = formatArtistName(
            artist.nameKr ?? null,
            artist.name ?? null
          );
          return (
            <div
              key={artist.id}
              className="flex items-center gap-2 rounded-lg border bg-background p-2"
            >
              <ArtistAvatar artist={artist} size="sm" />
              <span className="text-sm">{name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleRemove(artist.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        })}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              아티스트 추가
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>아티스트 추가</DialogTitle>
            </DialogHeader>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="이름으로 검색"
                className="pl-9"
              />
            </div>

            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-2">
                {isSearching && (
                  <div className="flex justify-center py-4">
                    <Spinner />
                  </div>
                )}

                {!isSearching &&
                  availableArtists.map((artist) => {
                    const name = formatArtistName(
                      artist.nameKr ?? null,
                      artist.name ?? null
                    );
                    return (
                      <div
                        key={artist.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <ArtistAvatar artist={artist} size="md" />
                          <span className="text-sm font-medium">{name}</span>
                        </div>
                        <Button size="sm" onClick={() => handleAdd(artist)}>
                          추가
                        </Button>
                      </div>
                    );
                  })}

                {/* 무한 스크롤 (검색 모드가 아닐 때만) */}
                {!isSearchMode && !isLastPage && (
                  <span
                    ref={trigger}
                    className="mt-2 flex items-center justify-center"
                  >
                    {isLoading ? (
                      <Spinner />
                    ) : (
                      <Button
                        variant="ghost"
                        onClick={() => loadMoreItems()}
                        className="text-muted-foreground"
                      >
                        더 보기
                      </Button>
                    )}
                  </span>
                )}

                {/* 빈 상태 */}
                {!isSearching && availableArtists.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    {isSearchMode
                      ? `"${searchQuery}"에 해당하는 아티스트가 없습니다`
                      : '추가할 수 있는 아티스트가 없습니다'}
                  </p>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default ArtistSelect;
