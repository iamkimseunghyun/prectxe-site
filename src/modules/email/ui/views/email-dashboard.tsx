'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmailCampaignList } from '../components/email-campaign-list';
import { EmailStats } from '../components/email-stats';
import { FormRecipientsEmailSender } from '../components/form-recipients-email-sender';
import { IndependentEmailSender } from '../components/independent-email-sender';

interface EmailDashboardProps {
  userId: string;
  isAdmin: boolean;
}

export function EmailDashboard({ userId, isAdmin }: EmailDashboardProps) {
  const [activeTab, setActiveTab] = useState('stats');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="stats">통계</TabsTrigger>
        <TabsTrigger value="form">Form 응답자 발송</TabsTrigger>
        <TabsTrigger value="independent">독립 발송</TabsTrigger>
        <TabsTrigger value="history">발송 이력</TabsTrigger>
      </TabsList>

      <TabsContent value="stats" className="space-y-4">
        <EmailStats userId={userId} isAdmin={isAdmin} />
      </TabsContent>

      <TabsContent value="form" className="space-y-4">
        <FormRecipientsEmailSender userId={userId} isAdmin={isAdmin} />
      </TabsContent>

      <TabsContent value="independent" className="space-y-4">
        <IndependentEmailSender userId={userId} isAdmin={isAdmin} />
      </TabsContent>

      <TabsContent value="history" className="space-y-4">
        <EmailCampaignList userId={userId} isAdmin={isAdmin} />
      </TabsContent>
    </Tabs>
  );
}
