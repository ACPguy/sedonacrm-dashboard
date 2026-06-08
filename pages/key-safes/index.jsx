import React from 'react';
import AppShell from '../../components/AppShell';
import KeySafesView from '../../components/KeySafesView';

export default function KeySafesPage() {
  return (
    <AppShell activeView="key-safes">
      <KeySafesView />
    </AppShell>
  );
}
