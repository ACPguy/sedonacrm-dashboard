import React from 'react';
import AppShell from '../../components/AppShell';
import OwnersView from '../../components/OwnersView';

export default function OwnersPage() {
  return (
    <AppShell activeView="owners">
      <OwnersView />
    </AppShell>
  );
}
