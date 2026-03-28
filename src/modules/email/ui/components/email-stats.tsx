'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { CampaignStats } from '@/modules/sms/server/stats';
import { StatsView } from '@/modules/sms/ui/components/sms-stats';
import { getEmailStats } from '../../server/stats';

interface EmailStatsProps {
  userId: string;
  isAdmin: boolean;
}

export function EmailStats({ userId, isAdmin }: EmailStatsProps) {
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const result = await getEmailStats(userId, isAdmin);
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

  return <StatsView stats={stats} label="이메일" />;
}
