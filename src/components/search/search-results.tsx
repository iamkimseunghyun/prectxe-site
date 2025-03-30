'use client';

// Define the structure of search results
import { Calendar, Folder, MapPin, Paintbrush, User } from 'lucide-react';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getImageUrl } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';

interface SearchResult {
  id: string;
  title: string;
  type: 'artist' | 'artwork' | 'event' | 'project' | 'venue';
  subtype?: string;
  imageUrl?: string | null;
  description?: string | null;
  url: string;
}

// Helper function to get entity icon
const getEntityIcon = (type: string) => {
  switch (type) {
    case 'artist':
      return <User className="h-4 w-4" />;
    case 'artwork':
      return <Paintbrush className="h-4 w-4" />;
    case 'event':
      return <Calendar className="h-4 w-4" />;
    case 'project':
      return <Folder className="h-4 w-4" />;
    case 'venue':
      return <MapPin className="h-4 w-4" />;
    default:
      return null;
  }
};

// Helper function to translate entity types to Korean
const getEntityTypeLabel = (type: string, subtype?: string) => {
  const typeLabels: Record<string, string> = {
    artist: '아티스트',
    artwork: '작품',
    event: '이벤트',
    project: '프로젝트',
    venue: '공간',
  };

  const subtypeLabels: Record<string, string> = {
    exhibition: '전시',
    performance: '공연',
    festival: '페스티벌',
    workshop: '워크샵',
    talk: '토크',
    screening: '상영',
    other: '기타',
  };

  return subtype && subtypeLabels[subtype]
    ? `${typeLabels[type]} - ${subtypeLabels[subtype]}`
    : typeLabels[type];
};

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
}

const SearchResults = ({ results, query }: SearchResultsProps) => {
  const [activeTab, setActiveTab] = useState<string>('all');

  const filteredResults =
    activeTab === 'all'
      ? results
      : results.filter((result) => result.type == activeTab);

  // Count results by type for tab labels
  const counts = results.reduce(
    (acc, result) => {
      acc[result.type] = (acc[result.type] || 0) + 1;
      return acc;
    },
    { all: results.length } as Record<string, number>
  );

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="mb-2 text-lg font-medium">
          "{query}"에 대한 검색 결과가 없습니다.
        </p>
        <p className="text-muted-foreground">
          다른 검색어로 다시 시도해 보세요.
        </p>
      </div>
    );
  }
  return (
    <div>
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="all">전체 ({counts.all || 0})</TabsTrigger>
          {counts.artist && (
            <TabsTrigger value="artist">아티스트 ({counts.artist})</TabsTrigger>
          )}
          {counts.artwork && (
            <TabsTrigger value="artwork">작품 ({counts.artwork})</TabsTrigger>
          )}
          {counts.event && (
            <TabsTrigger value="event">이벤트 ({counts.event})</TabsTrigger>
          )}
          {counts.project && (
            <TabsTrigger value="project">
              프로젝트 ({counts.project})
            </TabsTrigger>
          )}
          {counts.venue && (
            <TabsTrigger value="venue">공간 ({counts.venue})</TabsTrigger>
          )}
        </TabsList>
        <TabsContent value={activeTab} className="mt-0">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredResults.map((result) => (
              <Link href={result.url} key={`${result.type}-${result.id}`}>
                <Card className="h-full overflow-hidden transition-all hover:shadow-md">
                  <CardContent className="flex p-0">
                    {result.imageUrl && (
                      <div className="relative h-32 w-32 flex-shrink-0 overflow-hidden bg-muted">
                        <Image
                          src={getImageUrl(result.imageUrl, 'thumbnail')}
                          alt={result.title}
                          fill
                          className="object-cover"
                          sizes="128px"
                        />
                      </div>
                    )}
                    <div className="flex flex-col justify-between p-4">
                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            {getEntityIcon(result.type)}
                            {getEntityTypeLabel(result.type, result.subtype)}
                          </Badge>
                        </div>
                        <h3 className="mb-1 line-clamp-1 font-medium">
                          {result.title}
                        </h3>
                        {result.description && (
                          <p className="line-clamp-2 text-sm text-muted-foreground">
                            {result.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SearchResults;
