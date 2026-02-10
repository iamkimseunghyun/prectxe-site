'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmailCampaignList } from '../components/email-campaign-list';
import { FormRecipientsEmailSender } from '../components/form-recipients-email-sender';
import { IndependentEmailSender } from '../components/independent-email-sender';

interface EmailDashboardProps {
  userId: string;
  isAdmin: boolean;
}

export function EmailDashboard({ userId, isAdmin }: EmailDashboardProps) {
  const [activeTab, setActiveTab] = useState('form');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="form">Form 응답자 발송</TabsTrigger>
        <TabsTrigger value="independent">독립 발송</TabsTrigger>
        <TabsTrigger value="history">발송 이력</TabsTrigger>
      </TabsList>

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
