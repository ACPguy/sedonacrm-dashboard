import React from 'react';
import AppShell from '../../components/AppShell';
import IssuesView from '../../components/IssuesView';

export default function IssuesPage() {
  return (
    <AppShell activeView="issues">
      <IssuesView />
    </AppShell>
  );
}
