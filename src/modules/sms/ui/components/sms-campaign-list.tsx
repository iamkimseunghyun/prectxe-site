'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import Link from 'next/link';
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
import { listSMSCampaigns } from '../../server/actions';

interface SMSCampaignListProps {
  userId: string;
  isAdmin: boolean;
}

type Campaign = {
  id: string;
  title: string;
  message: string;
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
    phone: string;
    success: boolean;
  }>;
};

export function SMSCampaignList({
  userId,
  isAdmin,
}: SMSCampaignListProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCampaigns() {
      setIsLoading(true);
      const result = await listSMSCampaigns(userId, isAdmin);
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
          <CardDescription>SMS 발송 내역을 확인할 수 있습니다</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            아직 발송한 SMS가 없습니다
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
                <TableHead>상태</TableHead>
                <TableHead>발송/실패</TableHead>
                <TableHead>Form</TableHead>
                <TableHead>발송일시</TableHead>
                <TableHead className="text-right">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell>
                    <div className="font-medium">{campaign.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {campaign.message}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        {campaign.sentCount}
                      </Badge>
                      {campaign.failedCount > 0 && (
                        <Badge variant="destructive" className="font-mono">
                          {campaign.failedCount}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {campaign.form ? (
                      <Link
                        href={`/admin/forms/${campaign.form.slug}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {campaign.form.title}
                      </Link>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        독립 발송
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {campaign.sentAt ? (
                      <div className="text-sm">
                        {new Date(campaign.sentAt).toLocaleString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/sms/${campaign.id}`}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
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
