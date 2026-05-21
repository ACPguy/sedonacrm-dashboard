import React from 'react';
import AppShell from '../../components/AppShell';
import { PropertiesView } from '../../components/SedonaCRM';

export default function PropertiesPage() {
  return (
    <AppShell activeView="properties">
      <PropertiesView />
    </AppShell>
  );
}
