import React from 'react';
import AppShell from '../../components/AppShell';
import ContactsView from '../../components/ContactsView';

export default function ContactsPage() {
  return (
    <AppShell activeView="contacts">
      <ContactsView />
    </AppShell>
  );
}
