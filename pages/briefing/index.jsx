import AppShell from '../../components/AppShell';
import BriefingView from '../../components/BriefingView';

export default function BriefingPage() {
  return (
    <AppShell activeView="briefing">
      <BriefingView />
    </AppShell>
  );
}
