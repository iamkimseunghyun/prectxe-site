'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormRecipientsSender } from '../components/form-recipients-sender';
import { IndependentSender } from '../components/independent-sender';
import { SMSCampaignList } from '../components/sms-campaign-list';

interface SMSDashboardProps {
  userId: string;
  isAdmin: boolean;
}

export function SMSDashboard({ userId, isAdmin }: SMSDashboardProps) {
  const [activeTab, setActiveTab] = useState('form');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="form">Form 응답자 발송</TabsTrigger>
        <TabsTrigger value="independent">독립 발송</TabsTrigger>
        <TabsTrigger value="history">발송 이력</TabsTrigger>
      </TabsList>

      <TabsContent value="form" className="space-y-4">
        <FormRecipientsSender userId={userId} isAdmin={isAdmin} />
      </TabsContent>

      <TabsContent value="independent" className="space-y-4">
        <IndependentSender userId={userId} isAdmin={isAdmin} />
      </TabsContent>

      <TabsContent value="history" className="space-y-4">
        <SMSCampaignList userId={userId} isAdmin={isAdmin} />
      </TabsContent>
    </Tabs>
  );
}
