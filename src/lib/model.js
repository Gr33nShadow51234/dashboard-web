// Shared helpers: ids, dates, normalizers and statistics.

export const PRIORITIES = {
  high: { label: 'High', rank: 0 },
  med: { label: 'Medium', rank: 1 },
  low: { label: 'Low', rank: 2 },
};

export const uid = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

// Local calendar day as YYYY-MM-DD.
export const dayKey = (ts) => {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

export const todayKey = () => dayKey(Date.now());

// The last n calendar days as keys, oldest first.
export function lastDays(n) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) =>
    dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (n - 1 - i)).getTime()),
  );
}

// entries: [{ at: timestamp, value?: number }] -> [{ key, value }] for every key.
export function sumByDay(entries, keys) {
  const totals = Object.fromEntries(keys.map((k) => [k, 0]));
  entries.forEach(({ at, value = 1 }) => {
    const k = dayKey(at);
    if (k in totals) totals[k] += value;
  });
  return keys.map((key) => ({ key, value: totals[key] }));
}

export const shortDay = (key) =>
  new Date(`${key}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short' });

export const formatDate = (key) =>
  new Date(`${key}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

// Whole days from today to a YYYY-MM-DD date (negative = in the past).
export function daysUntil(dateKey) {
  const target = new Date(`${dateKey}T00:00:00`);
  const today = new Date(new Date().toDateString());
  return Math.round((target - today) / 86400000);
}

export const countdownLabel = (days) =>
  days < 0 ? 'Passed' : days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days} days`;

export const isOverdue = (task) => !!task.due && !task.done && task.due < todayKey();

export function dueLabel(task) {
  if (!task.due) return null;
  if (task.done) return `Due ${formatDate(task.due)}`;
  const days = daysUntil(task.due);
  if (days < 0) return `Overdue by ${-days} ${-days === 1 ? 'day' : 'days'}`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due ${formatDate(task.due)}`;
}

// Open tasks first (by priority, then due date), completed tasks last (newest first).
export function sortTasks(list) {
  return [...list].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.done) return (b.completedAt ?? 0) - (a.completedAt ?? 0);
    const rank = PRIORITIES[a.priority].rank - PRIORITIES[b.priority].rank;
    if (rank !== 0) return rank;
    if (a.due && b.due) return a.due.localeCompare(b.due);
    if (a.due) return -1;
    if (b.due) return 1;
    return b.createdAt - a.createdAt;
  });
}

export const completedEntries = (tasks) =>
  tasks.filter((t) => t.completedAt).map((t) => ({ at: t.completedAt }));

export const focusEntries = (focus) => focus.map((f) => ({ at: f.at, value: f.minutes }));

// Normalizers keep older saves and imported backups usable.
export const normTask = (t) => {
  const createdAt = t.createdAt ?? Date.now();
  const done = !!t.done;
  return {
    id: t.id ?? uid(),
    text: String(t.text ?? ''),
    done,
    createdAt,
    completedAt: done ? (t.completedAt ?? createdAt) : null,
    due: t.due || null,
    priority: PRIORITIES[t.priority] ? t.priority : 'med',
  };
};

export const normNote = (n) => ({
  id: n.id ?? uid(),
  text: String(n.text ?? ''),
  createdAt: n.createdAt ?? Date.now(),
  pinned: !!n.pinned,
});

export const normLink = (l) => ({
  id: l.id ?? uid(),
  title: String(l.title ?? ''),
  url: String(l.url ?? ''),
  category: String(l.category || 'General'),
  favorite: !!l.favorite,
});

export const normEvent = (e) => ({
  id: e.id ?? uid(),
  title: String(e.title ?? ''),
  date: String(e.date ?? ''),
});

export const normFocus = (f) => ({
  id: f.id ?? uid(),
  at: f.at ?? Date.now(),
  minutes: Number(f.minutes) || 0,
});

export const normCity = (c) =>
  c && typeof c.lat === 'number' && typeof c.lon === 'number'
    ? { name: String(c.name ?? ''), country: String(c.country ?? ''), lat: c.lat, lon: c.lon }
    : null;

export const asList = (value, normalize) =>
  Array.isArray(value)
    ? value.filter((item) => item && typeof item === 'object').map((item) => normalize(item))
    : [];

export const DAY = 86400000;

export const formatStamp = (ts) =>
  new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const formatFullDate = (key) =>
  new Date(`${key}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export const hostOf = (url) => {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};

export const withProtocol = (value) => (/^https?:\/\//i.test(value) ? value : `https://${value}`);

export const isValidUrl = (value) => {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value) && !/^https?:\/\//i.test(value)) return false;
  try {
    const u = new URL(withProtocol(value));
    return /^https?:$/.test(u.protocol) && u.hostname.length > 0;
  } catch {
    return false;
  }
};
