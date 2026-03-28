'use client';

import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Loader2,
  Mail,
  Send,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
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
import { getSMSStats } from '../../server/stats';
import type { CampaignStats } from '../../server/stats.types';

interface SMSStatsProps {
  userId: string;
  isAdmin: boolean;
}

export function SMSStats({ userId, isAdmin }: SMSStatsProps) {
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const result = await getSMSStats(userId, isAdmin);
      if (result.success && result.data) {
        setStats(result.data);
      }
      setIsLoading(false);
    }
    load();
  }, [userId, isAdmin]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          통계 데이터를 불러올 수 없습니다
        </CardContent>
      </Card>
    );
  }

  return <StatsView stats={stats} label="SMS" />;
}

function StatsView({ stats, label }: { stats: CampaignStats; label: string }) {
  const maxMonthly = Math.max(
    ...stats.monthlyTrend.map((m) => m.sent + m.failed),
    1
  );

  return (
    <div className="space-y-6">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>총 캠페인</CardDescription>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalCampaigns.toLocaleString()}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              이번 달 {stats.thisMonthCampaigns}건
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>총 발송</CardDescription>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalSent.toLocaleString()}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              이번 달 {stats.thisMonthSent.toLocaleString()}건
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>성공률</CardDescription>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate}%</div>
            <p className="mt-1 text-xs text-muted-foreground">
              실패 {stats.totalFailed.toLocaleString()}건
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>평균 발송</CardDescription>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalCampaigns > 0
                ? Math.round(
                    stats.totalSent / stats.totalCampaigns
                  ).toLocaleString()
                : 0}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              캠페인당 평균 수신자
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 월별 추이 차트 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">월별 발송 추이</CardTitle>
          <CardDescription>최근 12개월 {label} 발송 현황</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.totalCampaigns === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              아직 발송 데이터가 없습니다
            </div>
          ) : (
            <div className="space-y-2">
              {stats.monthlyTrend.map((m) => {
                const total = m.sent + m.failed;
                const sentWidth = total > 0 ? (m.sent / maxMonthly) * 100 : 0;
                const failedWidth =
                  total > 0 ? (m.failed / maxMonthly) * 100 : 0;
                const [, month] = m.month.split('-');

                return (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="w-10 shrink-0 text-right text-xs text-muted-foreground">
                      {Number.parseInt(month, 10)}월
                    </span>
                    <div className="flex h-6 flex-1 gap-px overflow-hidden rounded">
                      {sentWidth > 0 && (
                        <div
                          className="bg-primary/80 transition-all"
                          style={{ width: `${sentWidth}%` }}
                        />
                      )}
                      {failedWidth > 0 && (
                        <div
                          className="bg-destructive/60 transition-all"
                          style={{ width: `${failedWidth}%` }}
                        />
                      )}
                    </div>
                    <span className="w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                      {total > 0 ? total.toLocaleString() : '-'}
                    </span>
                  </div>
                );
              })}
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary/80" />
                  성공
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-destructive/60" />
                  실패
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 최근 캠페인 성과 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">최근 캠페인</CardTitle>
            <CardDescription>최근 발송한 {label} 캠페인 성과</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentCampaigns.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                아직 캠페인이 없습니다
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>캠페인</TableHead>
                      <TableHead className="text-right">성공</TableHead>
                      <TableHead className="text-right">실패</TableHead>
                      <TableHead className="text-right">성공률</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recentCampaigns.map((c) => {
                      const total = c.sentCount + c.failedCount;
                      const rate =
                        total > 0 ? Math.round((c.sentCount / total) * 100) : 0;
                      return (
                        <TableRow key={c.id}>
                          <TableCell>
                            <div className="max-w-[180px] truncate text-sm font-medium">
                              {c.title}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {(c.sentAt ?? c.createdAt).toLocaleDateString(
                                'ko-KR'
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {c.sentCount}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {c.failedCount > 0 ? (
                              <span className="text-destructive">
                                {c.failedCount}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={
                                rate >= 90
                                  ? 'default'
                                  : rate >= 70
                                    ? 'secondary'
                                    : 'destructive'
                              }
                              className="font-mono"
                            >
                              {rate}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 실패 분석 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">실패 분석</CardTitle>
            <CardDescription>에러 유형별 분류</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.errorBreakdown.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
                <CheckCircle className="h-8 w-8 text-primary/40" />
                실패 기록이 없습니다
              </div>
            ) : (
              <div className="space-y-3">
                {stats.errorBreakdown.map((e) => {
                  const maxCount = stats.errorBreakdown[0].count;
                  const width = (e.count / maxCount) * 100;
                  const isTop = e === stats.errorBreakdown[0];
                  return (
                    <div key={e.error} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5 truncate max-w-[260px]">
                          {isTop ? (
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          )}
                          <span className="truncate">{e.error}</span>
                        </span>
                        <span className="ml-2 shrink-0 font-mono text-xs text-muted-foreground">
                          {e.count}건
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-destructive/50 transition-all"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export { StatsView };
