export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diff < 5) return "now";
  if (diff < 60) return `${diff}s ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
