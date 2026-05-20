import React from 'react';
import AppShell from '../../components/AppShell';
import PropertiesView from '../../components/PropertiesDetail';

export default function PropertiesPage() {
  return (
    <AppShell activeView="properties">
      <PropertiesView />
    </AppShell>
  );
}
