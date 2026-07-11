import React from 'react';
import AppShell from '../components/AppShell';
import PipelineView from '../components/PipelineView';

export default function PipelinePage() {
  return (
    <AppShell activeView="pipeline">
      <PipelineView />
    </AppShell>
  );
}
