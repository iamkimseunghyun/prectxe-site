'use server';

import { prisma } from '@/lib/db/prisma';
import type { CampaignStats } from '@/modules/sms/server/stats';

export type { CampaignStats };

export async function getEmailStats(
  userId: string,
  isAdmin = false
): Promise<{ success: boolean; data?: CampaignStats; error?: string }> {
  try {
    const where = isAdmin ? {} : { userId };

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const [campaigns, thisMonthCampaigns, errorRecipients] = await Promise.all([
      prisma.emailCampaign.findMany({
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
      prisma.emailCampaign.findMany({
        where: {
          ...where,
          sentAt: { gte: thisMonthStart },
        },
        select: {
          sentCount: true,
          failedCount: true,
        },
      }),
      prisma.emailRecipient.findMany({
        where: {
          campaign: where,
          success: false,
          error: { not: null },
        },
        select: { error: true },
      }),
    ]);

    const totalCampaigns = campaigns.length;
    const totalSent = campaigns.reduce((sum, c) => sum + c.sentCount, 0);
    const totalFailed = campaigns.reduce((sum, c) => sum + c.failedCount, 0);
    const total = totalSent + totalFailed;
    const successRate =
      total > 0 ? Math.round((totalSent / total) * 1000) / 10 : 0;

    const thisMonthSent = thisMonthCampaigns.reduce(
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

    // 에러 분류
    const errorMap = new Map<string, number>();
    for (const r of errorRecipients) {
      const err = r.error ?? '알 수 없는 오류';
      errorMap.set(err, (errorMap.get(err) ?? 0) + 1);
    }
    const errorBreakdown = Array.from(errorMap.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      success: true,
      data: {
        totalCampaigns,
        totalSent,
        totalFailed,
        successRate,
        thisMonthSent,
        thisMonthCampaigns: thisMonthCampaigns.length,
        monthlyTrend,
        recentCampaigns: campaigns.slice(0, 5),
        errorBreakdown,
      },
    };
  } catch (error) {
    console.error('이메일 통계 조회 오류:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : '이메일 통계 조회에 실패했습니다',
    };
  }
}
