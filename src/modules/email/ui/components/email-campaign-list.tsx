'use client';

import { ExternalLink, Loader2 } from 'lucide-react';
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
import { listEmailCampaigns } from '../../server/actions';

interface EmailCampaignListProps {
  userId: string;
  isAdmin: boolean;
}

type Campaign = {
  id: string;
  title: string;
  subject: string;
  body: string;
  template: string | null;
  sentCount: number;
  failedCount: number;
  status: string;
  sentAt: Date | null;
  createdAt: Date;
  form: {
    title: string;
    slug: string;
  } | null;
  recipients: Array<{
    id: string;
    email: string;
    success: boolean;
  }>;
};

export function EmailCampaignList({ userId, isAdmin }: EmailCampaignListProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCampaigns() {
      setIsLoading(true);
      const result = await listEmailCampaigns(userId, isAdmin);
      if (result.success && result.data) {
        setCampaigns(result.data as Campaign[]);
      }
      setIsLoading(false);
    }
    loadCampaigns();
  }, [userId, isAdmin]);

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

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (campaigns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>발송 이력</CardTitle>
          <CardDescription>이메일 발송 내역을 확인할 수 있습니다</CardDescription>
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
        <CardDescription>
          총 {campaigns.length}개의 캠페인이 있습니다
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>캠페인 제목</TableHead>
                <TableHead>이메일 제목</TableHead>
                <TableHead>템플릿</TableHead>
                <TableHead>발송/실패</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>발송일시</TableHead>
                <TableHead>연결된 Form</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">
                    {campaign.title}
                  </TableCell>
                  <TableCell>{campaign.subject}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {campaign.template === 'newsletter'
                        ? '뉴스레터'
                        : '알림'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Badge variant="default">{campaign.sentCount}</Badge>
                      {campaign.failedCount > 0 && (
                        <Badge variant="destructive">
                          {campaign.failedCount}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(campaign.sentAt)}
                  </TableCell>
                  <TableCell>
                    {campaign.form ? (
                      <Button variant="link" size="sm" asChild>
                        <Link href={`/forms/${campaign.form.slug}`}>
                          {campaign.form.title}
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </Link>
                      </Button>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
