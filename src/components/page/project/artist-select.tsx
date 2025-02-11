// components/project/artist-select.tsx
'use client';

import { useState } from 'react';
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
import { getImageUrl } from '@/lib/utils';
import { X } from 'lucide-react';

type Artist = {
  id: string;
  name: string;
  mainImageUrl: string | null;
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
  artists = [],
  value: selectedArtists = [],
  onChange,
}: ArtistSelectProps) => {
  const [open, setOpen] = useState(false);

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

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">참여 아티스트</label>
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
                    alt={artist.name}
                  />
                ) : (
                  <AvatarFallback>{artist.name.slice(0, 2)}</AvatarFallback>
                )}
              </Avatar>
              <span className="text-sm">{artist.name}</span>
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
                  {(artists ?? []) // null 이나 undefined일 경우 빈 배열 사용
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
                                alt={artist.name}
                              />
                            ) : (
                              <AvatarFallback>
                                {artist.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <span className="font-medium">{artist.name}</span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAddArtist(artist)}
                        >
                          추가
                        </Button>
                      </div>
                    ))}
                  {artists.filter((artist) => !selectedIds.includes(artist.id))
                    .length === 0 && (
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
