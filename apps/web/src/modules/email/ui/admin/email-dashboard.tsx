'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmailCampaignList } from './email-campaign-list';
import { EmailStats } from './email-stats';
import { FormRecipientsEmailSender } from './form-recipients-email-sender';
import { IndependentEmailSender } from './independent-email-sender';
import { NewsletterBroadcastSender } from './newsletter-broadcast-sender';

export function EmailDashboard() {
  const [activeTab, setActiveTab] = useState('newsletter');
  // 발송을 마치면 작성 화면에 머물지 않고 발송 이력으로 넘어간다
  // (작성 화면이 비워져 있으면 보냈는지 알 수 없어 혼란스럽다)
  const showHistory = () => setActiveTab('history');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="stats">통계</TabsTrigger>
        <TabsTrigger value="newsletter">구독자 전체</TabsTrigger>
        <TabsTrigger value="form">Form 응답자</TabsTrigger>
        <TabsTrigger value="independent">주소 직접 입력</TabsTrigger>
        <TabsTrigger value="history">발송 이력</TabsTrigger>
      </TabsList>

      <TabsContent value="stats" className="space-y-4">
        <EmailStats />
      </TabsContent>

      <TabsContent value="newsletter" className="space-y-4">
        <NewsletterBroadcastSender onSent={showHistory} />
      </TabsContent>

      <TabsContent value="form" className="space-y-4">
        <FormRecipientsEmailSender onSent={showHistory} />
      </TabsContent>

      <TabsContent value="independent" className="space-y-4">
        <IndependentEmailSender onSent={showHistory} />
      </TabsContent>

      <TabsContent value="history" className="space-y-4">
        <EmailCampaignList />
      </TabsContent>
    </Tabs>
  );
}
