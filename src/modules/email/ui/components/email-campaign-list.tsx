'use client';

import { ChevronLeft, ChevronRight, ExternalLink, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatKstDateTime } from '@/lib/utils';
import { listEmailCampaigns } from '../../server/actions';
import { CampaignDetailDialog } from './campaign-detail-dialog';

type Campaign = {
  id: string;
  title: string;
  subject: string;
  template: string | null;
  sentCount: number;
  failedCount: number;
  status: string;
  sentAt: Date | null;
  createdAt: Date;
  /** 값이 있으면 Resend 브로드캐스트 — 수신자를 Resend가 관리한다 */
  broadcastId: string | null;
  form: {
    title: string;
    slug: string;
  } | null;
};

export function EmailCampaignList() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  // page와 재조회 트리거를 한 객체로 묶는다.
  // 재조회 트리거를 별도 state로 두고 deps에만 넣으면, effect 본문에서 읽지 않아
  // useExhaustiveDependencies가 "불필요한 의존성"으로 잡는다.
  // nonce를 올리면 새 객체가 되어 같은 page라도 다시 조회된다.
  const [query, setQuery] = useState({ page: 1, nonce: 0 });
  const page = query.page;

  useEffect(() => {
    let cancelled = false;
    async function loadCampaigns() {
      setIsLoading(true);
      const result = await listEmailCampaigns(query.page);
      if (cancelled) return;
      if (result.success && result.data) {
        setCampaigns(result.data.campaigns as Campaign[]);
        setTotal(result.data.total);
        setHasMore(result.data.hasMore);
      }
      setIsLoading(false);
    }
    loadCampaigns();
    return () => {
      cancelled = true;
    };
  }, [query]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default">발송완료</Badge>;
      case 'sending':
        return <Badge variant="secondary">발송중</Badge>;
      case 'failed':
        return <Badge variant="destructive">실패</Badge>;
      case 'draft':
        return <Badge variant="outline">임시저장</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (date: Date | null) =>
    date ? formatKstDateTime(new Date(date)) : '-';

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 motion-safe:animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (campaigns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>발송 이력</CardTitle>
          <CardDescription>
            이메일 발송 내역을 확인할 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            아직 발송한 이메일이 없습니다
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>발송 이력</CardTitle>
        <CardDescription>총 {total}개의 캠페인이 있습니다</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>캠페인 제목</TableHead>
                <TableHead>이메일 제목</TableHead>
                <TableHead>발송 방식</TableHead>
                <TableHead>발송/실패</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>발송일시</TableHead>
                <TableHead>연결된 Form</TableHead>
                <TableHead>
                  <span className="sr-only">상세</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                // 행 클릭은 마우스 편의용일 뿐이다.
                // <tr>에 role="button"·tabIndex를 주면 테이블 시맨틱이 사라져
                // 스크린리더가 셀 구조를 잃고, 버튼 역할 안에 링크가 중첩된다.
                // 키보드·보조기술 경로는 아래 전용 "상세" 버튼이 담당한다.
                <TableRow
                  key={campaign.id}
                  onClick={() => setOpenId(campaign.id)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell className="font-medium">
                    {campaign.title}
                  </TableCell>
                  <TableCell>{campaign.subject}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {campaign.broadcastId ? '구독자 전체' : '지정 수신자'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {campaign.broadcastId ? (
                      // 브로드캐스트는 수신자를 Resend가 관리해 건수를 알 수 없다.
                      // 0을 그대로 보여주면 발송 실패로 오해하게 된다.
                      <span className="text-sm text-muted-foreground">
                        Resend 관리
                      </span>
                    ) : (
                      <div className="flex gap-1">
                        <Badge variant="default">{campaign.sentCount}</Badge>
                        {campaign.failedCount > 0 && (
                          <Badge variant="destructive">
                            {campaign.failedCount}
                          </Badge>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(campaign.sentAt)}
                  </TableCell>
                  <TableCell>
                    {campaign.form ? (
                      <Button
                        variant="link"
                        size="sm"
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Link href={`/forms/${campaign.form.slug}`}>
                          {campaign.form.title}
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </Link>
                      </Button>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenId(campaign.id);
                      }}
                      aria-label={`${campaign.title} 상세 보기`}
                    >
                      상세
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {(page > 1 || hasMore) && (
          <div className="mt-4 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setQuery((q) => ({ ...q, page: Math.max(1, q.page - 1) }))
              }
              disabled={page === 1 || isLoading}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              이전
            </Button>
            <span className="text-sm text-muted-foreground" aria-live="polite">
              {page} 페이지
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setQuery((q) => ({ ...q, page: q.page + 1 }))}
              disabled={!hasMore || isLoading}
            >
              다음
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>

      <CampaignDetailDialog
        campaignId={openId}
        onClose={() => setOpenId(null)}
        onChanged={() => setQuery((q) => ({ ...q, nonce: q.nonce + 1 }))}
      />
    </Card>
  );
}
