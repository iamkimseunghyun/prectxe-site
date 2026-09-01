'use client';

import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { formatKstDateTime } from '@/lib/utils';
import { getEmailCampaign, resendFailedRecipients } from '../../server/actions';

/** 액션 반환형이 성공/실패 유니온이라 Extract로 성공 분기의 data만 뽑는다 */
type Detail = Extract<
  Awaited<ReturnType<typeof getEmailCampaign>>,
  { success: true }
>['data'];

interface CampaignDetailDialogProps {
  campaignId: string | null;
  onClose: () => void;
  /** 재발송으로 집계가 바뀌면 목록을 갱신한다 */
  onChanged: () => void;
}

export function CampaignDetailDialog({
  campaignId,
  onClose,
  onChanged,
}: CampaignDetailDialogProps) {
  const { toast } = useToast();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [page, setPage] = useState(1);
  const [onlyFailed, setOnlyFailed] = useState(false);

  // 페이지·필터를 빠르게 바꾸면 늦게 도착한 이전 응답이 최신 결과를 덮어쓴다.
  // 요청마다 번호를 매겨 마지막 요청의 응답만 반영한다.
  const requestSeq = useRef(0);

  const load = useCallback(
    async (id: string, nextPage: number, failedOnly: boolean) => {
      const seq = ++requestSeq.current;
      setIsLoading(true);
      try {
        const result = await getEmailCampaign(id, {
          page: nextPage,
          onlyFailed: failedOnly,
        });
        if (seq !== requestSeq.current) return; // 더 새 요청이 있다 — 버린다

        if (!result.success) {
          toast({
            title: '불러오기 실패',
            description: result.error,
            variant: 'destructive',
          });
          return;
        }
        setDetail(result.data);
      } catch (err) {
        if (seq !== requestSeq.current) return;
        toast({
          title: '불러오기 실패',
          description:
            err instanceof Error ? err.message : '알 수 없는 오류입니다',
          variant: 'destructive',
        });
      } finally {
        // finally에서 내려야 한다. await가 reject하면 뒤 코드에 도달하지 못해
        // 스피너가 영영 돌고 버튼이 잠긴 채로 굳는다.
        if (seq === requestSeq.current) setIsLoading(false);
      }
    },
    [toast]
  );

  // 다이얼로그가 열릴 때마다 1페이지·전체 필터로 초기화한다
  useEffect(() => {
    if (!campaignId) {
      setDetail(null);
      return;
    }
    setPage(1);
    setOnlyFailed(false);
    void load(campaignId, 1, false);
  }, [campaignId, load]);

  const changeView = (nextPage: number, failedOnly: boolean) => {
    if (!campaignId) return;
    setPage(nextPage);
    setOnlyFailed(failedOnly);
    void load(campaignId, nextPage, failedOnly);
  };

  const handleResend = async () => {
    if (!campaignId) return;
    setIsResending(true);
    try {
      const result = await resendFailedRecipients(campaignId);

      if (!result.success) {
        toast({
          title: '재발송 실패',
          description: result.error,
          variant: 'destructive',
        });
        return;
      }

      const { retried, recovered, stillFailed, remaining } = result.data;
      toast({
        title: '재발송 완료',
        description:
          `${retried}건 재시도 → ${recovered}건 성공, ${stillFailed}건 여전히 실패` +
          (remaining > 0
            ? ` · 남은 실패 ${remaining}건은 다시 눌러 처리하세요`
            : ''),
      });
      onChanged();
      setPage(1);
      void load(campaignId, 1, onlyFailed);
    } catch (err) {
      toast({
        title: '재발송 실패',
        description:
          err instanceof Error ? err.message : '알 수 없는 오류입니다',
        variant: 'destructive',
      });
    } finally {
      setIsResending(false);
    }
  };

  const campaign = detail?.campaign;

  return (
    <Dialog open={!!campaignId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{campaign?.title ?? '캠페인 상세'}</DialogTitle>
          <DialogDescription>
            {campaign
              ? `${campaign.subject} · ${campaign.sentAt ? formatKstDateTime(new Date(campaign.sentAt)) : '-'}`
              : '불러오는 중...'}
          </DialogDescription>
        </DialogHeader>

        {isLoading && !detail ? (
          <div className="flex justify-center py-12">
            <Loader2
              className="h-6 w-6 motion-safe:animate-spin text-muted-foreground"
              role="status"
              aria-label="불러오는 중"
            />
          </div>
        ) : detail && campaign ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="default">성공 {campaign.sentCount}</Badge>
              {campaign.failedCount > 0 && (
                <Badge variant="destructive">실패 {campaign.failedCount}</Badge>
              )}
              {campaign.form && (
                <span className="text-muted-foreground">
                  Form: {campaign.form.title}
                </span>
              )}
            </div>

            <section>
              <h3 className="mb-2 text-sm font-medium">본문 미리보기</h3>
              {/*
                이메일 HTML은 iframe에 격리해 렌더한다.
                어드민 DOM에 직접 주입하면 본문의 전역 스타일이 관리 화면을
                덮어쓰고, 스크립트가 섞였을 때 그대로 실행된다.
                sandbox(allow 없음)로 스크립트·폼·내비게이션을 전부 막는다.
              */}
              <iframe
                title="이메일 본문 미리보기"
                sandbox=""
                srcDoc={campaign.body}
                className="h-80 w-full rounded-md border bg-white"
              />
            </section>

            <section>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-medium">
                  수신자 {detail.recipientTotal}명
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={onlyFailed ? 'default' : 'outline'}
                    onClick={() => changeView(1, !onlyFailed)}
                    disabled={isLoading}
                    aria-pressed={onlyFailed}
                  >
                    실패만 ({detail.failedTotal})
                  </Button>
                  {detail.failedTotal > 0 && !campaign.broadcastId && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleResend}
                      disabled={isResending || isLoading}
                    >
                      {isResending ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 motion-safe:animate-spin" />
                      ) : (
                        <RefreshCw className="mr-1 h-3.5 w-3.5" />
                      )}
                      실패분 재발송
                    </Button>
                  )}
                </div>
              </div>

              <ul className="divide-y rounded-md border" aria-live="polite">
                {detail.recipients.length === 0 ? (
                  <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                    표시할 수신자가 없습니다
                  </li>
                ) : (
                  detail.recipients.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-start gap-2 px-3 py-2 text-sm"
                    >
                      {r.success ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                      ) : (
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-mono text-xs">
                          {r.email}
                        </div>
                        {r.error && (
                          <div className="mt-0.5 text-xs text-destructive">
                            {r.error}
                          </div>
                        )}
                      </div>
                    </li>
                  ))
                )}
              </ul>

              {(page > 1 || detail.hasMore) && (
                <div className="mt-3 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => changeView(page - 1, onlyFailed)}
                    disabled={page === 1 || isLoading}
                  >
                    이전
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {page} 페이지
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => changeView(page + 1, onlyFailed)}
                    disabled={!detail.hasMore || isLoading}
                  >
                    다음
                  </Button>
                </div>
              )}
            </section>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
