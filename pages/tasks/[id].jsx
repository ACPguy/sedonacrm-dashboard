import { useRouter } from 'next/router';
import AppShell from '../../components/AppShell';
import { TaskDetail } from '../../components/TasksView';

export default function TaskDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  if (!id) return null;
  return (
    <AppShell activeView="tasks">
      <TaskDetail
        prefixedId={id}
        onBack={() => {
          const arrived = typeof sessionStorage !== 'undefined'
            && !!sessionStorage.getItem('tasksBackUrl');
          if (arrived) router.back();
          else router.push('/tasks');
        }}
      />
    </AppShell>
  );
}
