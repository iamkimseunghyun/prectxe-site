'use client';

import { Loader2 } from 'lucide-react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

export function SMSCampaignList({ userId, isAdmin }: SMSCampaignListProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

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
    <>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow
                    key={campaign.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedCampaign(campaign)}
                  >
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
                          onClick={(e) => e.stopPropagation()}
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 발송 내용 상세 모달 */}
      <Dialog
        open={!!selectedCampaign}
        onOpenChange={(open) => !open && setSelectedCampaign(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>발송 내용 상세</DialogTitle>
            <DialogDescription>
              SMS 캠페인의 전체 내용입니다
            </DialogDescription>
          </DialogHeader>

          {selectedCampaign && (
            <div className="space-y-6">
              {/* 캠페인 정보 */}
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    캠페인 제목
                  </span>
                  <p className="text-base font-semibold mt-1">
                    {selectedCampaign.title}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">
                      상태
                    </span>
                    <div className="mt-1">
                      {getStatusBadge(selectedCampaign.status)}
                    </div>
                  </div>

                  <div>
                    <span className="text-sm font-medium text-muted-foreground">
                      발송 통계
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="font-mono">
                        성공: {selectedCampaign.sentCount}
                      </Badge>
                      {selectedCampaign.failedCount > 0 && (
                        <Badge variant="destructive" className="font-mono">
                          실패: {selectedCampaign.failedCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {selectedCampaign.form && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">
                      연결된 Form
                    </span>
                    <p className="text-sm mt-1">
                      <Link
                        href={`/admin/forms/${selectedCampaign.form.slug}`}
                        className="text-primary hover:underline"
                      >
                        {selectedCampaign.form.title}
                      </Link>
                    </p>
                  </div>
                )}

                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    발송 일시
                  </span>
                  <p className="text-sm mt-1">
                    {selectedCampaign.sentAt
                      ? new Date(selectedCampaign.sentAt).toLocaleString(
                          'ko-KR',
                          {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          }
                        )
                      : '발송 전'}
                  </p>
                </div>
              </div>

              {/* 메시지 내용 */}
              <div>
                <span className="text-sm font-medium text-muted-foreground mb-2 block">
                  메시지 내용
                </span>
                <div className="rounded-lg border bg-muted/50 p-4">
                  <div className="whitespace-pre-wrap text-sm">
                    {selectedCampaign.message}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground text-right mt-2">
                  {selectedCampaign.message.length}자 (
                  {selectedCampaign.message.length > 90 ? 'LMS' : 'SMS'})
                </div>
              </div>

              {/* 수신자 목록 */}
              <div>
                <span className="text-sm font-medium text-muted-foreground mb-2 block">
                  수신자 목록 ({selectedCampaign.recipients.length}명)
                </span>
                <div className="rounded-lg border max-h-40 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>전화번호</TableHead>
                        <TableHead>상태</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedCampaign.recipients.map((recipient) => (
                        <TableRow key={recipient.id}>
                          <TableCell className="font-mono text-sm">
                            {recipient.phone}
                          </TableCell>
                          <TableCell>
                            {recipient.success ? (
                              <Badge variant="outline">성공</Badge>
                            ) : (
                              <Badge variant="destructive">실패</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
