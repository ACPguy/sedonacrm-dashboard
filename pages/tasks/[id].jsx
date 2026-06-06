import { useRouter } from 'next/router';
import AppShell from '../../components/AppShell';
import { TaskDetail } from '../../components/TasksView';

export default function TaskDetailPage() {
  const router = useRouter();
  const { id } = router.query; // e.g. "WO-3737"
  if (!id) return null;
  return (
    <AppShell activeView="tasks">
      <TaskDetail
        prefixedId={id}
        onBack={() => {
          const back = typeof sessionStorage !== 'undefined'
            ? sessionStorage.getItem('tasksBackUrl')
            : null;
          router.push(back || '/tasks');
        }}
      />
    </AppShell>
  );
}
