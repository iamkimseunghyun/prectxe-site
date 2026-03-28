'use server';

import { prisma } from '@/lib/db/prisma';
import type { CampaignStats } from './stats.types';

export async function getSMSStats(
  userId: string,
  isAdmin = false
): Promise<{ success: boolean; data?: CampaignStats; error?: string }> {
  try {
    const where = isAdmin ? {} : { userId };

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    // 캠페인 목록 (최근 12개월) + 에러 집계를 병렬 실행
    const [campaigns, errorGroups] = await Promise.all([
      prisma.sMSCampaign.findMany({
        where: {
          ...where,
          sentAt: { gte: twelveMonthsAgo },
        },
        select: {
          id: true,
          title: true,
          sentCount: true,
          failedCount: true,
          status: true,
          sentAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      // DB에서 직접 에러 집계 — 개별 레코드 조회 대신 groupBy 사용
      prisma.sMSRecipient.groupBy({
        by: ['error'],
        where: {
          campaign: where,
          success: false,
          error: { not: null },
        },
        _count: { error: true },
        orderBy: { _count: { error: 'desc' } },
        take: 10,
      }),
    ]);

    const totalCampaigns = campaigns.length;
    const totalSent = campaigns.reduce((sum, c) => sum + c.sentCount, 0);
    const totalFailed = campaigns.reduce((sum, c) => sum + c.failedCount, 0);
    const total = totalSent + totalFailed;
    const successRate =
      total > 0 ? Math.round((totalSent / total) * 1000) / 10 : 0;

    // 이번 달 통계는 이미 조회한 캠페인에서 필터
    const thisMonthData = campaigns.filter(
      (c) => (c.sentAt ?? c.createdAt) >= thisMonthStart
    );
    const thisMonthSent = thisMonthData.reduce(
      (sum, c) => sum + c.sentCount,
      0
    );

    // 월별 추이
    const monthlyMap = new Map<
      string,
      { sent: number; failed: number; campaigns: number }
    >();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(key, { sent: 0, failed: 0, campaigns: 0 });
    }

    for (const c of campaigns) {
      const date = c.sentAt ?? c.createdAt;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const entry = monthlyMap.get(key);
      if (entry) {
        entry.sent += c.sentCount;
        entry.failed += c.failedCount;
        entry.campaigns += 1;
      }
    }

    const monthlyTrend = Array.from(monthlyMap.entries()).map(
      ([month, data]) => ({ month, ...data })
    );

    const errorBreakdown = errorGroups.map((g) => ({
      error: g.error ?? '알 수 없는 오류',
      count: g._count.error,
    }));

    return {
      success: true,
      data: {
        totalCampaigns,
        totalSent,
        totalFailed,
        successRate,
        thisMonthSent,
        thisMonthCampaigns: thisMonthData.length,
        monthlyTrend,
        recentCampaigns: campaigns.slice(0, 5),
        errorBreakdown,
      },
    };
  } catch (error) {
    console.error('SMS 통계 조회 오류:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'SMS 통계 조회에 실패했습니다',
    };
  }
}
