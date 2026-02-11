'use client';

import { Copy, Loader2, RotateCcw, Send } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  createAndSendSMSCampaign,
  listSMSCampaigns,
  sendPersonalizedSMS,
} from '../../server/actions';

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
    name: string | null;
    value: string | null;
    success: boolean;
  }>;
};

export function SMSCampaignList({ userId, isAdmin }: SMSCampaignListProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(
    null
  );
  const [resendCampaign, setResendCampaign] = useState<Campaign | null>(null);
  const [resendMessage, setResendMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function loadCampaigns() {
      setIsLoading(true);
      console.log(
        '[SMSCampaignList] Loading campaigns for userId:',
        userId,
        'isAdmin:',
        isAdmin
      );
      const result = await listSMSCampaigns(userId, isAdmin);
      console.log('[SMSCampaignList] Result:', result);
      if (result.success && result.data) {
        console.log('[SMSCampaignList] Campaigns count:', result.data.length);
        setCampaigns(result.data as Campaign[]);
      } else {
        console.error(
          '[SMSCampaignList] Failed to load campaigns:',
          result.error
        );
      }
      setIsLoading(false);
    }
    loadCampaigns();
  }, [userId, isAdmin]);

  const hasPersonalizedRecipients = (campaign: Campaign) => {
    return campaign.recipients.some((r) => r.name || r.value);
  };

  const handleOpenResend = (campaign: Campaign) => {
    setResendCampaign(campaign);
    setResendMessage(campaign.message);
    setSelectedCampaign(null);
  };

  const handleResend = async () => {
    if (!resendCampaign) return;

    const successPhones = resendCampaign.recipients
      .filter((r) => r.success)
      .map((r) => r.phone);

    if (successPhones.length === 0) {
      toast({
        title: '발송 가능한 수신자가 없습니다',
        description: '이전 캠페인에서 성공한 수신자가 없습니다',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);

    try {
      const isPersonalized = hasPersonalizedRecipients(resendCampaign);

      let result: {
        success: boolean;
        data?: { sentCount: number; failedCount: number };
        error?: string;
      };
      if (isPersonalized) {
        const recipients = resendCampaign.recipients
          .filter((r) => r.success)
          .map((r) => ({
            phone: r.phone,
            name: r.name || undefined,
            value: r.value || undefined,
          }));
        result = await sendPersonalizedSMS({
          recipients,
          template: resendMessage,
          title: `[재발송] ${resendCampaign.title}`,
          userId,
        });
      } else {
        result = await createAndSendSMSCampaign({
          title: `[재발송] ${resendCampaign.title}`,
          message: resendMessage,
          phones: successPhones,
          formId: undefined,
          userId,
        });
      }

      if (result.success) {
        toast({
          title: 'SMS 재발송 완료',
          description: `${result.data?.sentCount}건 발송 성공${result.data?.failedCount ? `, ${result.data.failedCount}건 실패` : ''}`,
        });
        setResendCampaign(null);
        // 목록 새로고침
        const refreshed = await listSMSCampaigns(userId, isAdmin);
        if (refreshed.success && refreshed.data) {
          setCampaigns(refreshed.data as Campaign[]);
        }
      } else {
        toast({
          title: '재발송 실패',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (_error) {
      toast({
        title: '재발송 실패',
        description: '알 수 없는 오류가 발생했습니다',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

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
            <div className="flex items-center justify-between pr-6">
              <div>
                <DialogTitle>발송 내용 상세</DialogTitle>
                <DialogDescription>
                  SMS 캠페인의 전체 내용입니다
                </DialogDescription>
              </div>
              {selectedCampaign &&
                selectedCampaign.status === 'sent' &&
                selectedCampaign.recipients.some((r) => r.success) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenResend(selectedCampaign)}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    재발송
                  </Button>
                )}
            </div>
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
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    메시지 내용
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedCampaign.message);
                      toast({ title: '메시지가 복사되었습니다' });
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
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
                <div className="rounded-lg border max-h-60 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>전화번호</TableHead>
                        <TableHead>이름</TableHead>
                        <TableHead>개별 내용</TableHead>
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
                            {recipient.name || (
                              <span className="text-muted-foreground text-xs">
                                -
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {recipient.value || (
                              <span className="text-muted-foreground text-xs">
                                -
                              </span>
                            )}
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

      {/* 재발송 모달 */}
      <Dialog
        open={!!resendCampaign}
        onOpenChange={(open) => !open && setResendCampaign(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>SMS 재발송</DialogTitle>
            <DialogDescription>
              이전 발송 성공 수신자에게 메시지를 다시 보냅니다
            </DialogDescription>
          </DialogHeader>

          {resendCampaign && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  원본 캠페인
                </Label>
                <p className="text-sm mt-1">{resendCampaign.title}</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  수신자
                </Label>
                <p className="text-sm mt-1">
                  {resendCampaign.recipients.filter((r) => r.success).length}명
                  (이전 발송 성공자)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resend-message">메시지 내용</Label>
                <Textarea
                  id="resend-message"
                  value={resendMessage}
                  onChange={(e) => setResendMessage(e.target.value)}
                  rows={6}
                  maxLength={2000}
                  placeholder="발송할 메시지를 입력하세요"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {resendMessage.length > 90 ? 'LMS (29원)' : 'SMS (13원)'}
                  </span>
                  <span>{resendMessage.length}/2000자</span>
                </div>
                {hasPersonalizedRecipients(resendCampaign) && (
                  <p className="text-xs text-muted-foreground">
                    사용 가능한 변수: {'{name}'} (이름), {'{value}'} (개별 내용)
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setResendCampaign(null)}
                  disabled={isSending}
                >
                  취소
                </Button>
                <Button
                  onClick={handleResend}
                  disabled={isSending || resendMessage.trim().length === 0}
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      발송 중...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-1" />
                      재발송
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
