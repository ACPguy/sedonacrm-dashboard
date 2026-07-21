import { useRouter } from 'next/router';
import AppShell from '../../components/AppShell';
import { TaskDetail, NewTaskForm } from '../../components/TasksView';

export default function TaskDetailPage() {
  const router = useRouter();
  const { id, type, prop_code, tenant_id, vendor_id } = router.query;
  if (!id) return null;

  if (id === 'new') {
    return (
      <AppShell activeView="tasks">
        <NewTaskForm
          initType={type || 'task'}
          initPropCode={prop_code || null}
          initTenantId={tenant_id || null}
          initVendorId={vendor_id || null}
        />
      </AppShell>
    );
  }

  return (
    <AppShell activeView="tasks">
      <TaskDetail
        prefixedId={id}
        onBack={() => {
          if (typeof window !== 'undefined' && window.innerWidth <= 639) {
            router.back();
            return;
          }
          const back = typeof sessionStorage !== 'undefined'
            ? sessionStorage.getItem('tasksBackUrl')
            : null;
          router.push(back || '/tasks');
        }}
      />
    </AppShell>
  );
}
