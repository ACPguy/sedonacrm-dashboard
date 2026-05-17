import React from 'react';
import AppShell from '../../components/AppShell';
import VendorsView from '../../components/VendorsView';

export default function VendorsPage() {
  return (
    <AppShell activeView="vendors">
      <VendorsView />
    </AppShell>
  );
}
