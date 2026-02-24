/**
 * Shared date utility functions to avoid duplication
 */

export function getToday() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getMaxDate() {
  const d = new Date();
  d.setDate(d.getDate() + 5);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateString(dateStr) {
  if (!dateStr) return 'N/A';
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return 'N/A';
  try {
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}
