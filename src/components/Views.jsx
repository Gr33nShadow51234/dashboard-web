import React, { useEffect, useRef, useState } from 'react';
import { Plus, Check, Pencil, Trash2, Pin, PinOff, Star, Upload, Download, MapPin, LogIn, Sun, ListTodo, StickyNote, Link as LinkIcon, X } from 'lucide-react';
import Widget from './Widget.jsx';
import { BarChart, Donut, Heatmap } from './Charts.jsx';
import { searchCities } from '../lib/weather.js';
import { signInMicrosoft, listTodoLists } from '../lib/msgraph.js';
import {
  PRIORITIES, DAY, todayKey, dayKey, lastDays, sumByDay, shortDay, formatDate, formatStamp, formatFullDate,
  dueLabel, isOverdue, sortTasks, completedEntries, focusEntries, hostOf, withProtocol, isValidUrl,
} from '../lib/model.js';

export const PRIORITY_COLOR = { high: 'var(--danger)', med: 'var(--accent)', low: 'var(--muted)' };

export function Stat({ label, value, sub, children }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <strong className="stat-value" title={String(value)}>{value}</strong>
      {sub && <span className="stat-sub">{sub}</span>}
      {children}
    </div>
  );
}

export function PageHead({ title, subtitle, children }) {
  return (
    <header className="page-head">
      <div className="page-title">
        <h1>{title}</h1>
        {subtitle && <p className="muted-line">{subtitle}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </header>
  );
}

export function PriorityPill({ priority }) {
  return <span className={`pri pri-${priority}`}>{PRIORITIES[priority].label}</span>;
}

const priorityOptions = Object.entries(PRIORITIES).map(([key, p]) => (
  <option key={key} value={key}>{`${p.label} priority`}</option>
));

export function TaskForm({ onAdd, compact = false }) {
  const [text, setText] = useState('');
  const [priority, setPriority] = useState('med');
  const [due, setDue] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    onAdd({ text: value, priority: compact ? 'med' : priority, due: compact ? null : due || null });
    setText('');
    setDue('');
  };

  return (
    <form className="task-form" onSubmit={submit}>
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a task..." aria-label="Task name" />
      {!compact && (
        <>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Priority">
            {priorityOptions}
          </select>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Due date" />
        </>
      )}
      <button className="btn primary" type="submit" disabled={!text.trim()}>
        <Plus size={15} aria-hidden="true" />
        Add task
      </button>
    </form>
  );
}

export function TaskRow({ task, onToggle, onUpdate, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ text: '', priority: 'med', due: '' });
  const overdue = isOverdue(task);
  const label = dueLabel(task);

  const startEdit = () => {
    setDraft({ text: task.text, priority: task.priority, due: task.due ?? '' });
    setEditing(true);
  };

  const save = (e) => {
    e.preventDefault();
    const text = draft.text.trim();
    if (!text) return;
    onUpdate(task.id, { text, priority: draft.priority, due: draft.due || null });
    setEditing(false);
  };

  if (editing) {
    return (
      <li className="task is-editing">
        <form className="task-edit" onSubmit={save} onKeyDown={(e) => { if (e.key === 'Escape') setEditing(false); }}>
          <input
            value={draft.text}
            onChange={(e) => setDraft({ ...draft, text: e.target.value })}
            aria-label="Task name"
            autoFocus
          />
          <select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value })} aria-label="Priority">
            {priorityOptions}
          </select>
          <input type="date" value={draft.due} onChange={(e) => setDraft({ ...draft, due: e.target.value })} aria-label="Due date" />
          <div className="task-edit-actions">
            <button className="btn ghost" type="button" onClick={() => setEditing(false)}>Cancel</button>
            <button className="btn primary" type="submit" disabled={!draft.text.trim()}>Save</button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className={`task ${task.done ? 'is-done' : ''}`}>
      <button
        type="button"
        className="check"
        onClick={() => onToggle(task.id)}
        aria-label={task.done ? `Mark "${task.text}" as open` : `Mark "${task.text}" as done`}
      >
        {task.done && <Check size={13} aria-hidden="true" />}
      </button>
      <div className="task-main">
        <span className="task-text">{task.text}</span>
        <div className="task-meta">
          <PriorityPill priority={task.priority} />
          {label && <span className={`due ${overdue ? 'is-overdue' : ''}`}>{label}</span>}
        </div>
      </div>
      <div className="row-actions">
        <button type="button" className="icon-btn" onClick={startEdit} aria-label={`Edit "${task.text}"`}>
          <Pencil size={14} aria-hidden="true" />
        </button>
        <button type="button" className="icon-btn" onClick={() => onRemove(task.id)} aria-label={`Delete "${task.text}"`}>
          <Trash2 size={14} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

export function NoteCard({ note, onUpdate, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const save = () => {
    const text = draft.trim();
    if (!text) return;
    onUpdate(note.id, { text });
    setEditing(false);
  };

  if (editing) {
    return (
      <article className="note is-editing">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') save();
            if (e.key === 'Escape') setEditing(false);
          }}
          aria-label="Edit note"
          autoFocus
        />
        <div className="note-foot">
          <button className="btn ghost" type="button" onClick={() => setEditing(false)}>Cancel</button>
          <button className="btn primary" type="button" onClick={save} disabled={!draft.trim()}>Save</button>
        </div>
      </article>
    );
  }

  return (
    <article className="note">
      {note.pinned && (
        <span className="note-pin-tag">
          <Pin size={12} aria-hidden="true" />
          Pinned
        </span>
      )}
      <p className="note-text">{note.text}</p>
      <div className="note-foot">
        <time dateTime={new Date(note.createdAt).toISOString()}>{formatStamp(note.createdAt)}</time>
        <div className="row-actions">
          <button
            type="button"
            className="icon-btn"
            onClick={() => onUpdate(note.id, { pinned: !note.pinned })}
            aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
          >
            {note.pinned ? <PinOff size={14} aria-hidden="true" /> : <Pin size={14} aria-hidden="true" />}
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => { setDraft(note.text); setEditing(true); }}
            aria-label="Edit note"
          >
            <Pencil size={14} aria-hidden="true" />
          </button>
          <button type="button" className="icon-btn" onClick={() => onRemove(note.id)} aria-label="Delete note">
            <Trash2 size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}

export function LinkRow({ link, onUpdate, onRemove }) {
  return (
    <li className="link-item">
      <span className="favicon" aria-hidden="true">{link.title.charAt(0).toUpperCase()}</span>
      <a className="link-main" href={link.url} target="_blank" rel="noreferrer">
        <span className="link-title">{link.title}</span>
        <span className="link-host">{hostOf(link.url)}</span>
      </a>
      <div className="row-actions">
        <button
          type="button"
          className={`icon-btn ${link.favorite ? 'is-fav' : ''}`}
          onClick={() => onUpdate(link.id, { favorite: !link.favorite })}
          aria-label={link.favorite ? `Remove ${link.title} from favorites` : `Add ${link.title} to favorites`}
        >
          <Star size={14} aria-hidden="true" fill={link.favorite ? 'currentColor' : 'none'} />
        </button>
        <button type="button" className="icon-btn" onClick={() => onRemove(link.id)} aria-label={`Delete ${link.title}`}>
          <Trash2 size={14} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

// Consecutive days, ending today (or yesterday while today has no completed task yet).
export function currentStreak(doneKeys) {
  const done = new Set(doneKeys);
  const cursor = new Date();
  if (!done.has(dayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (done.has(dayKey(cursor.getTime()))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

const FILTERS = [
  ['open', 'Open'],
  ['overdue', 'Overdue'],
  ['done', 'Done'],
  ['all', 'All'],
];

const EMPTY_TEXT = {
  open: 'No open tasks. Add one above.',
  overdue: 'Nothing is overdue.',
  done: 'No completed tasks yet.',
  all: 'No tasks yet.',
};

export function TasksPage({ store }) {
  const { tasks, addTask, toggleTask, updateTask, removeTask } = store;
  const [filter, setFilter] = useState('open');

  const counts = {
    open: tasks.filter((t) => !t.done).length,
    overdue: tasks.filter(isOverdue).length,
    done: tasks.filter((t) => t.done).length,
    all: tasks.length,
  };
  const visible = sortTasks(
    tasks.filter((t) => {
      if (filter === 'open') return !t.done;
      if (filter === 'overdue') return isOverdue(t);
      if (filter === 'done') return t.done;
      return true;
    }),
  );

  return (
    <div className="stack">
      <PageHead title="Tasks" subtitle={`${counts.open} open, ${counts.overdue} overdue`} />
      <section className="widget">
        <TaskForm onAdd={addTask} />
      </section>
      <div className="segmented" role="group" aria-label="Filter tasks">
        {FILTERS.map(([id, label]) => (
          <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>
            {label}
            <span className="seg-count">{counts[id]}</span>
          </button>
        ))}
      </div>
      <section className="widget">
        {visible.length === 0 ? (
          <p className="empty">{EMPTY_TEXT[filter]}</p>
        ) : (
          <ul className="task-list">
            {visible.map((t) => (
              <TaskRow key={t.id} task={t} onToggle={toggleTask} onUpdate={updateTask} onRemove={removeTask} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function NotesPage({ store }) {
  const { notes, addNote, updateNote, removeNote } = store;
  const [draft, setDraft] = useState('');

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    addNote(text);
    setDraft('');
  };

  const sorted = [...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt - a.createdAt);

  return (
    <div className="stack">
      <PageHead title="Notes" subtitle={`${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`} />
      <section className="widget">
        <form
          className="note-compose"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Write a note... (Ctrl+Enter to save)"
            aria-label="New note"
            rows={3}
          />
          <div className="note-compose-actions">
            <button className="btn primary" type="submit" disabled={!draft.trim()}>Save note</button>
          </div>
        </form>
      </section>
      {sorted.length === 0 ? (
        <p className="empty">Your notes will appear here.</p>
      ) : (
        <div className="notes-grid">
          {sorted.map((n) => (
            <NoteCard key={n.id} note={n} onUpdate={updateNote} onRemove={removeNote} />
          ))}
        </div>
      )}
    </div>
  );
}

export function LinksPage({ store }) {
  const { links, addLink, updateLink, removeLink } = store;
  const [form, setForm] = useState({ title: '', url: '', category: '' });
  const [error, setError] = useState('');

  const categories = [...new Set(links.map((l) => l.category))].sort((a, b) => a.localeCompare(b));

  const submit = (e) => {
    e.preventDefault();
    const title = form.title.trim();
    const url = form.url.trim();
    if (!title || !url) return;
    if (!isValidUrl(url)) {
      setError('Enter a valid web address, for example example.com.');
      return;
    }
    addLink({ title, url: withProtocol(url), category: form.category.trim() || 'General' });
    setForm((f) => ({ ...f, title: '', url: '' }));
    setError('');
  };

  return (
    <div className="stack">
      <PageHead title="Links" subtitle={`${links.length} saved`} />
      <section className="widget">
        <form className="link-form" onSubmit={submit} noValidate>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Name"
            aria-label="Link name"
          />
          <input
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="https://..."
            aria-label="Link address"
            inputMode="url"
          />
          <input
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            list="link-categories"
            placeholder="Category"
            aria-label="Category"
          />
          <datalist id="link-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <button className="btn primary" type="submit" disabled={!form.title.trim() || !form.url.trim()}>
            <Plus size={15} aria-hidden="true" />
            Add link
          </button>
        </form>
        {error && <p className="error-text" role="alert">{error}</p>}
      </section>

      {categories.length === 0 && <p className="empty">No links yet. Add one above.</p>}
      {categories.map((cat) => {
        const items = links
          .filter((l) => l.category === cat)
          .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.title.localeCompare(b.title));
        return (
          <section key={cat} className="widget">
            <header className="widget-head">
              <div className="widget-title">
                <h2>{cat}</h2>
              </div>
              <span className="count">{items.length}</span>
            </header>
            <ul className="link-list">
              {items.map((l) => (
                <LinkRow key={l.id} link={l} onUpdate={updateLink} onRemove={removeLink} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export function InsightsPage({ store }) {
  const { tasks, focus } = store;
  const completed = completedEntries(tasks);
  const doneKeys = completed.map((e) => dayKey(e.at));

  const weekKeys = lastDays(7);
  const doneWeek = sumByDay(completed, weekKeys).reduce((s, d) => s + d.value, 0);
  const streak = currentStreak(doneKeys);

  const cutoff = Date.now() - 30 * DAY;
  const created30 = tasks.filter((t) => t.createdAt >= cutoff);
  const done30 = created30.filter((t) => t.done).length;
  const rate = created30.length ? Math.round((done30 / created30.length) * 100) : null;

  const focusDays = sumByDay(focusEntries(focus), weekKeys);
  const focusWeek = focusDays.reduce((s, d) => s + d.value, 0);
  const sessionsWeek = focus.filter((f) => weekKeys.includes(dayKey(f.at))).length;

  const days30 = sumByDay(completed, lastDays(30));
  const bars30 = days30.map((d, i) => ({
    key: d.key,
    value: d.value,
    tip: formatDate(d.key),
    label: i % 5 === 0 || i === days30.length - 1 ? String(new Date(`${d.key}T00:00:00`).getDate()) : '',
  }));

  const openTasks = tasks.filter((t) => !t.done);
  const segments = Object.entries(PRIORITIES).map(([key, p]) => ({
    key,
    label: p.label,
    value: openTasks.filter((t) => t.priority === key).length,
    color: PRIORITY_COLOR[key],
  }));

  const focusBars = focusDays.map((d) => ({
    key: d.key,
    value: d.value,
    label: shortDay(d.key),
    tip: `${formatDate(d.key)}: ${d.value} min`,
  }));

  const heat = sumByDay([...completed, ...focus.map((f) => ({ at: f.at }))], lastDays(84));

  return (
    <div className="stack">
      <PageHead title="Insights" subtitle="Based on what you have completed and logged." />
      <section className="stats">
        <Stat label="Done this week" value={doneWeek} sub="Last 7 days" />
        <Stat label="Day streak" value={streak} sub="Days in a row with a completed task" />
        <Stat label="Completion rate" value={rate === null ? '\u2014' : `${rate}%`} sub="Tasks created in the last 30 days" />
        <Stat label="Focus this week" value={`${focusWeek} min`} sub={`${sessionsWeek} ${sessionsWeek === 1 ? 'session' : 'sessions'}`} />
      </section>
      <div className="grid">
        <Widget className="g-8" title="Completed tasks, last 30 days" icon={<ListTodo size={16} />}>
          <BarChart data={bars30} height={230} ariaLabel="Tasks completed per day over the last 30 days" />
        </Widget>
        <Widget className="g-4" title="Open tasks by priority" icon={<ListTodo size={16} />}>
          {openTasks.length === 0 ? (
            <p className="empty">No open tasks.</p>
          ) : (
            <div className="donut-row">
              <Donut segments={segments} ariaLabel="Open tasks by priority" />
              <ul className="legend">
                {segments.map((s) => (
                  <li key={s.key}>
                    <span className="swatch" style={{ background: s.color }} aria-hidden="true" />
                    <span>{s.label}</span>
                    <span className="legend-value tabular">{s.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Widget>
        <Widget className="g-6" title="Focus minutes, last 7 days" icon={<StickyNote size={16} />}>
          <BarChart data={focusBars} height={200} ariaLabel="Focus minutes per day over the last 7 days" />
        </Widget>
        <Widget className="g-6" title="Activity, last 12 weeks" icon={<LinkIcon size={16} />}>
          <Heatmap days={heat} />
          <p className="muted-line">Completed tasks and focus sessions per day.</p>
        </Widget>
      </div>
    </div>
  );
}

function ResultGroup({ title, count, children }) {
  return (
    <section className="widget">
      <header className="widget-head">
        <div className="widget-title">
          <h2>{title}</h2>
        </div>
        <span className="count">{count}</span>
      </header>
      <ul className="plain-list">{children}</ul>
    </section>
  );
}

export function SearchResults({ query, store, onOpen }) {
  const q = query.trim().toLowerCase();
  const hit = (...fields) => fields.some((f) => String(f ?? '').toLowerCase().includes(q));
  const tasks = store.tasks.filter((t) => hit(t.text));
  const notes = store.notes.filter((n) => hit(n.text));
  const links = store.links.filter((l) => hit(l.title, l.url, l.category));
  const events = store.events.filter((e) => hit(e.title));
  const total = tasks.length + notes.length + links.length + events.length;

  return (
    <div className="stack">
      <PageHead
        title="Search"
        subtitle={`${total} ${total === 1 ? 'result' : 'results'} for \u201c${query.trim()}\u201d`}
      />
      {total === 0 && <p className="empty">Nothing matches your search.</p>}
      {tasks.length > 0 && (
        <ResultGroup title="Tasks" count={tasks.length}>
          {tasks.map((t) => (
            <li key={t.id}>
              <button type="button" className="result-btn" onClick={() => onOpen('tasks')}>
                <span className="result-title">{t.text}</span>
                <span className="muted-line">{t.done ? 'Done' : dueLabel(t) || 'Open'}</span>
              </button>
            </li>
          ))}
        </ResultGroup>
      )}
      {notes.length > 0 && (
        <ResultGroup title="Notes" count={notes.length}>
          {notes.map((n) => (
            <li key={n.id}>
              <button type="button" className="result-btn" onClick={() => onOpen('notes')}>
                <span className="result-title">{n.text}</span>
                <span className="muted-line">{formatStamp(n.createdAt)}</span>
              </button>
            </li>
          ))}
        </ResultGroup>
      )}
      {links.length > 0 && (
        <ResultGroup title="Links" count={links.length}>
          {links.map((l) => (
            <li key={l.id}>
              <a className="result-btn" href={l.url} target="_blank" rel="noreferrer">
                <span className="result-title">{l.title}</span>
                <span className="muted-line">{hostOf(l.url)}</span>
              </a>
            </li>
          ))}
        </ResultGroup>
      )}
      {events.length > 0 && (
        <ResultGroup title="Countdowns" count={events.length}>
          {events.map((e) => (
            <li key={e.id}>
              <button type="button" className="result-btn" onClick={() => onOpen('overview')}>
                <span className="result-title">{e.title}</span>
                <span className="muted-line">{formatFullDate(e.date)}</span>
              </button>
            </li>
          ))}
        </ResultGroup>
      )}
    </div>
  );
}

const CALC_KEYS = ['C', '(', ')', '/', '7', '8', '9', '*', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '%', '='];
const CALC_SYMBOL = { '/': '\u00f7', '*': '\u00d7', '-': '\u2212' };
const CALC_NAME = {
  C: 'Clear', '=': 'Equals', '/': 'Divide', '*': 'Multiply', '-': 'Subtract', '+': 'Add',
  '%': 'Percent', '.': 'Decimal point', '(': 'Open bracket', ')': 'Close bracket',
};

// Only digits and arithmetic symbols reach Function, so arbitrary code cannot run.
export function evaluate(expr) {
  if (!expr) return '';
  if (!/^[0-9+\-*/().%\s]+$/.test(expr)) return null;
  try {
    const value = Function(`"use strict"; return (${expr.replace(/%/g, '/100')});`)();
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    return String(Math.round(value * 1e10) / 1e10);
  } catch {
    return null;
  }
}

export function Calculator({ onClose }) {
  const [expr, setExpr] = useState('');
  const [error, setError] = useState(false);
  const displayRef = useRef(null);

  useEffect(() => {
    displayRef.current?.focus();
  }, []);

  const press = (key) => {
    setError(false);
    if (key === 'C') {
      setExpr('');
      return;
    }
    if (key === '=') {
      const value = evaluate(expr);
      if (value === null) setError(true);
      else if (value !== '') setExpr(value);
      return;
    }
    setExpr((e) => e + key);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === '=') {
      e.preventDefault();
      press('=');
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      setExpr((x) => x.slice(0, -1));
      setError(false);
    } else if (e.key === 'Escape') {
      onClose();
    } else if (/^[0-9+\-*/().%]$/.test(e.key)) {
      e.preventDefault();
      press(e.key);
    }
  };

  return (
    <section className="calc" aria-label="Calculator" onKeyDown={onKeyDown}>
      <div className="calc-head">
        <strong>Calculator</strong>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close calculator">
          <X size={15} aria-hidden="true" />
        </button>
      </div>
      <div className="calc-display" tabIndex={0} ref={displayRef} aria-live="polite" aria-label="Expression">
        {expr || '0'}
      </div>
      {error && <p className="error-text">Check the expression</p>}
      <div className="calc-keys">
        {CALC_KEYS.map((k) => {
          const isOp = !/^[0-9.]$/.test(k);
          return (
            <button
              key={k}
              type="button"
              className={`calc-key ${isOp ? 'op' : ''} ${k === '=' ? 'eq' : ''}`}
              onClick={() => press(k)}
              aria-label={CALC_NAME[k] ?? k}
            >
              {CALC_SYMBOL[k] ?? k}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function SettingsPage({ store }) {
  const { theme, setTheme, city, setCity, tasks, notes, links, events, focus, replaceAll, resetAll } = store;
  const [cityQuery, setCityQuery] = useState('');
  const [cityStatus, setCityStatus] = useState('idle');
  const [cityResults, setCityResults] = useState([]);
  const [ms, setMs] = useState({ connected: false, text: 'Not connected' });
  const [msBusy, setMsBusy] = useState(false);
  const [importMsg, setImportMsg] = useState(null);

  const runCitySearch = async (e) => {
    e.preventDefault();
    const q = cityQuery.trim();
    if (q.length < 2) return;
    setCityStatus('loading');
    try {
      const results = await searchCities(q);
      setCityResults(results);
      setCityStatus(results.length ? 'done' : 'empty');
    } catch {
      setCityStatus('error');
    }
  };

  const chooseCity = (c) => {
    setCity(c);
    setCityResults([]);
    setCityStatus('idle');
    setCityQuery('');
  };

  const connectMicrosoft = async () => {
    setMsBusy(true);
    setMs({ connected: false, text: 'Connecting...' });
    try {
      await signInMicrosoft();
      const lists = await listTodoLists();
      setMs({ connected: true, text: `Connected \u00b7 ${lists.value?.length ?? 0} lists found` });
    } catch (err) {
      setMs({ connected: false, text: err.message });
    } finally {
      setMsBusy(false);
    }
  };

  const exportBackup = () => {
    const data = { version: 2, exportedAt: new Date().toISOString(), theme, city, tasks, notes, links, events, focus };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `khatib-dashboard-${todayKey()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importBackup = async (file) => {
    setImportMsg(null);
    let data;
    try {
      data = JSON.parse(await file.text());
    } catch {
      setImportMsg({ ok: false, text: 'This file is not a valid backup.' });
      return;
    }
    const known = ['tasks', 'notes', 'links', 'events', 'focus'].some((k) => Array.isArray(data?.[k]));
    if (!known) {
      setImportMsg({ ok: false, text: 'This file is not a dashboard backup.' });
      return;
    }
    if (!window.confirm('Replace all current data with this backup?')) return;
    replaceAll(data);
    setImportMsg({ ok: true, text: 'Backup imported.' });
  };

  const resetEverything = () => {
    if (window.confirm('Delete all tasks, notes, links, countdowns and focus sessions in this browser?')) {
      resetAll();
      setImportMsg(null);
    }
  };

  return (
    <div className="stack">
      <PageHead title="Settings" subtitle="Appearance, weather location, Microsoft To Do and your data." />
      <div className="grid">
        <Widget className="g-6" title="Appearance" icon={<Sun size={16} />}>
          <div className="setting-row">
            <div>
              <strong>Theme</strong>
              <p className="muted-line">Dark is the default.</p>
            </div>
            <div className="segmented" role="group" aria-label="Theme">
              <button type="button" aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}>Dark</button>
              <button type="button" aria-pressed={theme === 'light'} onClick={() => setTheme('light')}>Light</button>
            </div>
          </div>
        </Widget>

        <Widget className="g-6" title="Weather location" icon={<MapPin size={16} />}>
          <p className="muted-line">
            {city
              ? `Showing weather for ${city.name}${city.country ? `, ${city.country}` : ''}.`
              : 'No city set. The weather card stays empty until you choose one.'}
          </p>
          <form className="inline-form" onSubmit={runCitySearch}>
            <input
              value={cityQuery}
              onChange={(e) => setCityQuery(e.target.value)}
              placeholder="Search a city"
              aria-label="City name"
            />
            <button className="btn primary" type="submit" disabled={cityQuery.trim().length < 2 || cityStatus === 'loading'}>
              Search
            </button>
          </form>
          {cityStatus === 'loading' && <p className="muted-line" role="status">Searching...</p>}
          {cityStatus === 'error' && <p className="error-text" role="alert">Search failed. Check your connection and try again.</p>}
          {cityStatus === 'empty' && <p className="muted-line">No cities found.</p>}
          {cityResults.length > 0 && (
            <ul className="plain-list">
              {cityResults.map((c) => (
                <li key={`${c.lat},${c.lon}`}>
                  <button type="button" className="result-btn" onClick={() => chooseCity(c)}>
                    <span className="result-title">{c.name}</span>
                    <span className="muted-line">{[c.admin1, c.country].filter(Boolean).join(', ')}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {city && (
            <button type="button" className="btn ghost" onClick={() => setCity(null)}>Remove city</button>
          )}
        </Widget>

        <Widget className="g-6" title="Microsoft To Do" icon={<LogIn size={16} />}>
          <div className="status-line">
            <span className={`ms-dot ${ms.connected ? 'on' : ''}`} aria-hidden="true" />
            <span>{ms.text}</span>
          </div>
          <button type="button" className="btn outline" onClick={connectMicrosoft} disabled={msBusy}>
            <LogIn size={15} aria-hidden="true" />
            Connect Microsoft
          </button>
          <p className="muted-line">
            Set your Entra app client ID in <code>src/lib/config.js</code> first.
          </p>
        </Widget>

        <Widget className="g-6" title="Your data" icon={<Download size={16} />}>
          <p className="muted-line">Everything is stored in this browser. Export a backup to keep a copy or move it.</p>
          <div className="btn-row">
            <button type="button" className="btn outline" onClick={exportBackup}>
              <Download size={15} aria-hidden="true" />
              Export backup
            </button>
            <label className="btn outline file-btn">
              <Upload size={15} aria-hidden="true" />
              Import backup
              <input
                className="sr-only"
                type="file"
                accept="application/json,.json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) importBackup(file);
                }}
              />
            </label>
            <button type="button" className="btn danger" onClick={resetEverything}>Reset all data</button>
          </div>
          {importMsg && (
            <p className={importMsg.ok ? 'ok-text' : 'error-text'} role="status">{importMsg.text}</p>
          )}
        </Widget>
      </div>
    </div>
  );
}
