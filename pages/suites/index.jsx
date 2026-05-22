import React from 'react';
import AppShell from '../../components/AppShell';
import SuitesView from '../../components/SuitesView';

export default function SuitesPage() {
  return (
    <AppShell activeView="suites">
      <SuitesView />
    </AppShell>
  );
}
