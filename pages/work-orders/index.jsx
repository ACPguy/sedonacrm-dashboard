import React from 'react';
import AppShell from '../../components/AppShell';
import WorkOrdersView from '../../components/WorkOrdersView';

export default function WorkOrdersPage() {
  return (
    <AppShell activeView="work-orders">
      <WorkOrdersView />
    </AppShell>
  );
}
