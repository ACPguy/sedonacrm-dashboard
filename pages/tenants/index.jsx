import React from 'react';
import AppShell from '../../components/AppShell';
import TenantsView from '../../components/TenantsView';

export default function TenantsPage() {
  return (
    <AppShell activeView="tenants">
      <TenantsView />
    </AppShell>
  );
}
