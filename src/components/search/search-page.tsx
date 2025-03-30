import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  Calendar,
  FileText,
  FolderOpen,
  MapPin,
  Search,
  User,
} from 'lucide-react';
import { globalSearch } from '@/app/actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getImageUrl } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// 동적 메타데이터 생성
export async function generateMetadata({
  searchParams,
}: {
  searchParams: { q?: string };
}): Promise<Metadata> {
  const query = searchParams.q || '';

  return {
    title: `"${query}" 검색 결과 | PRECTXE`,
    description: `PRECTXE에서 "${query}"에 대한 검색 결과입니다.`,
  };
}

// 결과 타입별 아이콘 컴포넌트
const TypeIcon = ({ type }: { type: string }) => {
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

// 결과 아이템 컴포넌트
const ResultItem = ({ result }: { result: any }) => (
  <Link href={result.url} className="block">
    <div className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-accent/10">
      {result.imageUrl ? (
        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-muted">
          <Image
            src={getImageUrl(result.imageUrl, 'thumbnail')}
            alt={result.title}
            fill
            sizes="64px"
            className="object-cover"
          />
        </div>
      ) : (
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-md bg-muted">
          <TypeIcon type={result.type} />
        </div>
      )}
      <div className="flex-1">
        <div className="mb-1 flex items-center gap-2">
          <h3 className="font-medium">{result.title}</h3>
          <Badge variant="outline" className="text-xs">
            {result.type === 'artist' && '아티스트'}
            {result.type === 'artwork' && '작품'}
            {result.type === 'event' && '이벤트'}
            {result.type === 'project' && '프로젝트'}
            {result.type === 'venue' && '장소'}
          </Badge>
        </div>
        {result.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {result.description}
          </p>
        )}
      </div>
    </div>
  </Link>
);

// 결과가 없을 때 컴포넌트
const NoResults = ({ query }: { query: string }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <Search className="mb-4 h-12 w-12 text-muted-foreground" />
    <h2 className="mb-2 text-2xl font-semibold">검색 결과가 없습니다</h2>
    <p className="text-muted-foreground">
      "{query}"에 대한 검색 결과를 찾을 수 없습니다. 다른 검색어로 시도해보세요.
    </p>
  </div>
);

// 메인 페이지 컴포넌트
export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const query = searchParams.q || '';

  // 검색어가 없으면 404 페이지 반환
  if (!query || query.length < 2) {
    notFound();
  }

  // 검색 실행
  const searchResults = await globalSearch(query, 50);

  // 타입별 결과 필터링
  const artistResults = searchResults.filter((r) => r.type === 'artist');
  const artworkResults = searchResults.filter((r) => r.type === 'artwork');
  const eventResults = searchResults.filter((r) => r.type === 'event');
  const projectResults = searchResults.filter((r) => r.type === 'project');
  const venueResults = searchResults.filter((r) => r.type === 'venue');

  // 탭 기본값 설정 (결과가 있는 첫 번째 탭으로)
  const defaultTab =
    artistResults.length > 0
      ? 'artists'
      : artworkResults.length > 0
        ? 'artworks'
        : eventResults.length > 0
          ? 'events'
          : projectResults.length > 0
            ? 'projects'
            : venueResults.length > 0
              ? 'venues'
              : 'all';

  return (
    <div className="container mx-auto max-w-4xl py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">검색 결과</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          "{query}"에 대한 검색 결과 {searchResults.length}개를 찾았습니다.
        </p>
      </div>

      {searchResults.length > 0 ? (
        <Tabs defaultValue={defaultTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="all">전체 ({searchResults.length})</TabsTrigger>
            {artistResults.length > 0 && (
              <TabsTrigger value="artists">
                아티스트 ({artistResults.length})
              </TabsTrigger>
            )}
            {artworkResults.length > 0 && (
              <TabsTrigger value="artworks">
                작품 ({artworkResults.length})
              </TabsTrigger>
            )}
            {eventResults.length > 0 && (
              <TabsTrigger value="events">
                이벤트 ({eventResults.length})
              </TabsTrigger>
            )}
            {projectResults.length > 0 && (
              <TabsTrigger value="projects">
                프로젝트 ({projectResults.length})
              </TabsTrigger>
            )}
            {venueResults.length > 0 && (
              <TabsTrigger value="venues">
                장소 ({venueResults.length})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {searchResults.map((result) => (
              <ResultItem key={`${result.type}-${result.id}`} result={result} />
            ))}
          </TabsContent>

          <TabsContent value="artists" className="space-y-4">
            {artistResults.map((result) => (
              <ResultItem key={`${result.type}-${result.id}`} result={result} />
            ))}
          </TabsContent>

          <TabsContent value="artworks" className="space-y-4">
            {artworkResults.map((result) => (
              <ResultItem key={`${result.type}-${result.id}`} result={result} />
            ))}
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            {eventResults.map((result) => (
              <ResultItem key={`${result.type}-${result.id}`} result={result} />
            ))}
          </TabsContent>

          <TabsContent value="projects" className="space-y-4">
            {projectResults.map((result) => (
              <ResultItem key={`${result.type}-${result.id}`} result={result} />
            ))}
          </TabsContent>

          <TabsContent value="venues" className="space-y-4">
            {venueResults.map((result) => (
              <ResultItem key={`${result.type}-${result.id}`} result={result} />
            ))}
          </TabsContent>
        </Tabs>
      ) : (
        <NoResults query={query} />
      )}
    </div>
  );
}
