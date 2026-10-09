export function formatCurrency(value) {
  const n = Number(value);
  if (isNaN(n)) return '—';
  return `$${Math.round(n).toLocaleString()}`;
}

export function formatPercent(value) {
  const n = Number(value);
  if (isNaN(n)) return '—';
  return `${Math.round(n * 100) / 100}%`;
}

export function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return String(value);
  }
}

export function formatDateTime(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return String(value);
  }
}
