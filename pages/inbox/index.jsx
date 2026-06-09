import React from 'react';
import AppShell from '../../components/AppShell';
import EmailInbox from '../../components/EmailInbox';

export default function InboxPage() {
  return (
    <AppShell activeView="inbox">
      <EmailInbox />
    </AppShell>
  );
}
