export function formatDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d)) return '—';
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${mm}-${dd}-${yyyy}`;
}
