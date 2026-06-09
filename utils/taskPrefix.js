export function getTaskPrefix(task) {
  if (!task?.task_num) return '—';
  if (task.prop_code) return `${task.prop_code}-${task.task_num}`;
  return String(task.task_num);
}
