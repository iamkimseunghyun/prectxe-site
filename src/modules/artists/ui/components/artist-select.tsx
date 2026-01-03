'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatArtistName, getImageUrl } from '@/lib/utils';
import { X } from 'lucide-react';
import Spinner from '@/components/icons/spinner';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import { getMoreArtists } from '@/modules/artists/server/actions';
import { PAGINATION } from '@/lib/constants/constants';

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
  artists?: Artist[]; // 서버에서 전달받은 전체 아티스트 목록
  value: ProjectArtist[]; // 현재 선택된 아티스트들
  onChange: (artists: ProjectArtist[]) => void;
}

const ArtistSelect = ({
  artists,
  value: selectedArtists = [],
  onChange,
}: ArtistSelectProps) => {
  const [open, setOpen] = useState(false);
  const stableInitial = React.useMemo(() => artists ?? [], [artists]);

  // 선택된 아티스트 ID 목록
  const selectedIds = selectedArtists.map((pa) => pa.artistId);

  const handleAddArtist = (artist: Artist) => {
    const newArtist: ProjectArtist = {
      artistId: artist.id,
      artist,
    };
    onChange([...selectedArtists, newArtist]);
    setOpen(false);
  };

  const handleRemoveArtist = (artistId: string) => {
    onChange(selectedArtists.filter((pa) => pa.artistId !== artistId));
  };

  const {
    items: updatedArtists,
    isLoading,
    isLastPage,
    trigger,
    loadMoreItems,
  } = useInfiniteScroll({
    fetchFunction: getMoreArtists,
    initialData: stableInitial,
    pageSize: PAGINATION.ARTISTS_PAGE_SIZE, // 페이지 크기 명시적으로 전달
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2 rounded-md border p-4">
          {selectedArtists.map(({ artist }) => (
            <div
              key={artist.id}
              className="flex items-center gap-2 rounded-lg border bg-background p-2"
            >
              <Avatar className="h-6 w-6">
                {artist.mainImageUrl ? (
                  <AvatarImage
                    src={getImageUrl(artist.mainImageUrl, 'public')}
                    alt={formatArtistName(
                      artist.nameKr as any,
                      artist.name as any
                    )}
                  />
                ) : (
                  <AvatarFallback>
                    {(artist.name || '')
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <span className="text-sm">
                {formatArtistName(artist.nameKr as any, artist.name as any)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleRemoveArtist(artist.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                아티스트 추가
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>프로젝트 아티스트 추가</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] pr-4">
                <div className="space-y-4">
                  {(updatedArtists ?? []) // null 이나 undefined일 경우 빈 배열 사용
                    .filter((artist) => !selectedIds.includes(artist.id))
                    .map((artist) => (
                      <div
                        key={artist.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar>
                            {artist.mainImageUrl ? (
                              <AvatarImage
                                src={getImageUrl(artist.mainImageUrl, 'public')}
                                alt={formatArtistName(
                                  artist.nameKr as any,
                                  artist.name as any
                                )}
                              />
                            ) : (
                              <AvatarFallback>
                                {(artist.name || '')
                                  .split(' ')
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join('')
                                  .toUpperCase()}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <span className="font-medium">
                            {formatArtistName(
                              artist.nameKr as any,
                              artist.name as any
                            )}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAddArtist(artist)}
                        >
                          추가
                        </Button>
                      </div>
                    ))}

                  {!isLastPage && (
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
                          className="mt-2 flex items-center justify-center text-muted-foreground"
                        >
                          더 보기
                        </Button>
                      )}
                    </span>
                  )}

                  {updatedArtists.filter(
                    (artist) => !selectedIds.includes(artist.id)
                  ).length === 0 && (
                    <p className="text-center text-muted-foreground">
                      추가할 수 있는 아티스트가 없습니다.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default ArtistSelect;
