import { useRouter } from 'next/router';
import AppShell from '../../components/AppShell';
import { TaskDetail } from '../../components/TasksView';

// Map record_type → prefix so we can build a prefixed ID for parsePrefixedId
const RT_PREFIX = { work_order:'WO', task:'TSK', note:'NOTE', project:'PRJ', acp_task:'ACP', sg_task:'SG' };

export default function TaskDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  if (!id) return null;

  // Resolve record_type from navList so overlapping task_num integers open the correct record.
  // Cold URL loads (no navList or no match) fall back to bare task_num → work_order wins on conflict.
  let resolvedId = id;
  const taskNum = parseInt(id, 10);
  if (!isNaN(taskNum) && typeof sessionStorage !== 'undefined') {
    try {
      const navList = JSON.parse(sessionStorage.getItem('tasksNavList') || '[]');
      const navIdx  = parseInt(sessionStorage.getItem('tasksNavIndex') || '-1', 10);
      const entry   = navIdx >= 0 ? navList[navIdx] : null;
      if (entry && entry.task_num === taskNum && entry.record_type) {
        const prefix = RT_PREFIX[entry.record_type];
        if (prefix) resolvedId = `${prefix}-${taskNum}`;
      }
    } catch {}
  }

  return (
    <AppShell activeView="tasks">
      <TaskDetail
        prefixedId={resolvedId}
        onBack={() => {
          const origin = typeof sessionStorage !== 'undefined'
            ? sessionStorage.getItem('taskNavOrigin')
            : null;
          if (origin === 'app') router.back();
          else router.push('/tasks');
        }}
      />
    </AppShell>
  );
}
