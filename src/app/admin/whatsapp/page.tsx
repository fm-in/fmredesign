/**
 * WhatsApp inbox.
 *
 * The only place anyone can answer the business number: once it is registered
 * to the Cloud API it cannot be opened in the WhatsApp or WhatsApp Business
 * app, so replies have to go through us.
 */

'use client';

import { PageHeader } from '@/components/ui/page-header';
import { SectionErrorBoundary } from '@/components/admin/SectionErrorBoundary';
import { WhatsAppInbox } from '@/components/admin/whatsapp/WhatsAppInbox';

export default function WhatsAppInboxPage() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="WhatsApp"
        description="Conversations on the business number. Free replies are allowed for 24 hours after someone writes to us."
      />
      <SectionErrorBoundary section="WhatsApp Inbox">
        <WhatsAppInbox />
      </SectionErrorBoundary>
    </div>
  );
}
