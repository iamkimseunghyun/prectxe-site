export type CampaignStats = {
  totalCampaigns: number;
  totalSent: number;
  totalFailed: number;
  successRate: number;
  thisMonthSent: number;
  thisMonthCampaigns: number;
  monthlyTrend: Array<{
    month: string;
    sent: number;
    failed: number;
    campaigns: number;
  }>;
  recentCampaigns: Array<{
    id: string;
    title: string;
    sentCount: number;
    failedCount: number;
    status: string;
    sentAt: Date | null;
    createdAt: Date;
  }>;
  errorBreakdown: Array<{
    error: string;
    count: number;
  }>;
};
