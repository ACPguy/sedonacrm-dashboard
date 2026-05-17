import React from 'react';
import AppShell from '../../components/AppShell';
import RentScheduleView from '../../components/RentScheduleView';

export default function RentSchedulePage() {
  return (
    <AppShell activeView="rent-schedule">
      <RentScheduleView />
    </AppShell>
  );
}
