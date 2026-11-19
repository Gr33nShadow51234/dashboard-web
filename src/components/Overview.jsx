import React, { useEffect, useRef, useState } from 'react';
import {
  Plus, Play, Pause, RotateCcw, Trash2, CalendarDays, Sun, CloudSun, Cloud, CloudFog, CloudDrizzle,
  CloudRain, CloudSnow, CloudLightning, RefreshCw, MapPin, Timer, ListTodo, StickyNote, Link as LinkIcon, Star,
  GripVertical, ChevronUp, ChevronDown, Save, Palette, Eye, EyeOff,
} from 'lucide-react';
import Widget from './Widget.jsx';
import { BarChart, Sparkline } from './Charts.jsx';
import { Stat, TaskForm, TaskRow } from './Views.jsx';
import { fetchWeather, describeWeather } from '../lib/weather.js';
import { load, save } from '../lib/storage.js';
import {
  todayKey, dayKey, lastDays, sumByDay, shortDay, completedEntries, sortTasks, isOverdue, daysUntil,
  countdownLabel, hostOf, formatStamp, formatFullDate,
} from '../lib/model.js';

export const PRESETS = [15, 25, 50];

const DASHBOARD_WIDGETS = ['summary', 'tasks', 'completed', 'focus', 'weather', 'countdowns', 'notes', 'links'];
const DASHBOARD_SPANS = [4, 6, 8, 12];
const DASHBOARD_ACCENTS = ['violet', 'blue', 'teal', 'rose', 'amber'];
const DEFAULT_DASHBOARD = {
  order: ['summary', 'tasks', 'completed', 'focus', 'weather', 'countdowns', 'notes', 'links'],
  hidden: [],
  sizes: { summary: 12, tasks: 6, completed: 6, focus: 4, weather: 4, countdowns: 4, notes: 6, links: 6 },
  accent: 'violet',
  density: 'comfortable',
};

function normalizeDashboardLayout(value) {
  const source = value && typeof value === 'object' ? value : {};
  const suppliedOrder = Array.isArray(source.order)
    ? [...new Set(source.order.filter((id) => DASHBOARD_WIDGETS.includes(id)))]
    : [];
  const sizes = {};
  for (const id of DASHBOARD_WIDGETS) {
    const size = Number(source.sizes?.[id]);
    sizes[id] = DASHBOARD_SPANS.includes(size) ? size : DEFAULT_DASHBOARD.sizes[id];
  }
  return {
    order: [...suppliedOrder, ...DASHBOARD_WIDGETS.filter((id) => !suppliedOrder.includes(id))],
    hidden: Array.isArray(source.hidden) ? [...new Set(source.hidden.filter((id) => DASHBOARD_WIDGETS.includes(id)))] : [],
    sizes,
    accent: DASHBOARD_ACCENTS.includes(source.accent) ? source.accent : 'violet',
    density: source.density === 'compact' ? 'compact' : 'comfortable',
  };
}

function normalizeSavedLayouts(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item.name === 'string' && item.name.trim())
    .slice(0, 12)
    .map((item, index) => ({
      id: String(item.id || `layout-${index}`),
      name: item.name.trim().slice(0, 40),
      config: normalizeDashboardLayout(item.config),
    }));
}

const clock = (secs) => `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;

// The timer lives in App so it keeps running while the user changes pages.
export function useFocusTimer(onComplete) {
  const [minutes, setMinutes] = useState(25);
  const [status, setStatus] = useState('idle'); // idle | running | paused | done
  const [remaining, setRemaining] = useState(25 * 60);
  const endsAt = useRef(0);
  const sessionMinutes = useRef(25);
  const completeRef = useRef(onComplete);

  useEffect(() => {
    completeRef.current = onComplete;
  });

  useEffect(() => {
    if (status !== 'running') return undefined;
    const tick = () => {
      const left = Math.max(0, Math.ceil((endsAt.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        setStatus('done');
        completeRef.current(sessionMinutes.current);
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [status]);

  const start = () => {
    const secs = status === 'paused' ? remaining : minutes * 60;
    sessionMinutes.current = minutes;
    endsAt.current = Date.now() + secs * 1000;
    setRemaining(secs);
    setStatus('running');
  };

  const pause = () => {
    setRemaining(Math.max(0, Math.ceil((endsAt.current - Date.now()) / 1000)));
    setStatus('paused');
  };

  const reset = () => {
    setStatus('idle');
    setRemaining(minutes * 60);
  };

  const changeMinutes = (m) => {
    if (status === 'running' || status === 'paused') return;
    setMinutes(m);
    setRemaining(m * 60);
    setStatus('idle');
  };

  return { minutes, status, remaining, start, pause, reset, changeMinutes };
}

function FocusCard({ timer, minutesToday, sessionsToday }) {
  const { minutes, status, remaining, start, pause, reset, changeMinutes } = timer;
  const busy = status === 'running' || status === 'paused';
  const statusText = {
    idle: 'Ready when you are',
    running: 'Focus session in progress',
    paused: 'Paused',
    done: 'Session complete',
  }[status];

  return (
    <Widget className="g-4" title="Focus timer" icon={<Timer size={16} />} extra={<span className="count">{minutesToday} min today</span>}>
      <div className="timer">
        <div className="timer-clock" aria-label={`${clock(remaining)} left`}>{clock(remaining)}</div>
        <p className="muted-line" role="status">{statusText}</p>
        <div className="timer-actions">
          {status === 'running' ? (
            <button type="button" className="btn primary" onClick={pause}>
              <Pause size={15} aria-hidden="true" />
              Pause
            </button>
          ) : (
            <button type="button" className="btn primary" onClick={start}>
              <Play size={15} aria-hidden="true" />
              {status === 'paused' ? 'Resume' : 'Start'}
            </button>
          )}
          <button type="button" className="btn outline icon-only" onClick={reset} disabled={status === 'idle'} aria-label="Reset timer">
            <RotateCcw size={15} aria-hidden="true" />
          </button>
          <select value={minutes} disabled={busy} onChange={(e) => changeMinutes(Number(e.target.value))} aria-label="Session length">
            {PRESETS.map((m) => (
              <option key={m} value={m}>{`${m} min`}</option>
            ))}
          </select>
        </div>
        <p className="muted-line">{`${sessionsToday} ${sessionsToday === 1 ? 'session' : 'sessions'} completed today`}</p>
      </div>
    </Widget>
  );
}

const ICONS = {
  sun: Sun,
  'cloud-sun': CloudSun,
  cloud: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
};

function WeatherBody({ city, data }) {
  const info = describeWeather(data.code);
  const Icon = ICONS[info.icon] ?? Cloud;
  return (
    <div className="weather">
      <div className="weather-now">
        <Icon size={40} aria-hidden="true" className="weather-icon" />
        <div>
          <div className="weather-temp tabular">{`${data.temp}\u00b0C`}</div>
          <div className="muted-line">{`${info.label} \u00b7 Wind ${data.wind} km/h`}</div>
        </div>
      </div>
      <p className="weather-city">{`${city.name}${city.country ? `, ${city.country}` : ''}`}</p>
      <ol className="forecast" aria-label="Five day forecast">
        {data.days.map((d) => {
          const DayIcon = ICONS[describeWeather(d.code).icon] ?? Cloud;
          return (
            <li key={d.date}>
              <span className="forecast-day">{shortDay(d.date)}</span>
              <DayIcon size={16} aria-hidden="true" />
              <span className="tabular">
                {`${d.max}\u00b0`} <span className="muted-inline">{`${d.min}\u00b0`}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function WeatherCard({ city, onSettings }) {
  const [state, setState] = useState({ status: 'idle', data: null });
  const [attempt, setAttempt] = useState(0);
  const lat = city?.lat;
  const lon = city?.lon;

  useEffect(() => {
    if (lat === undefined || lon === undefined) return undefined;
    let active = true;
    setState({ status: 'loading', data: null });
    fetchWeather(lat, lon)
      .then((data) => {
        if (active) setState({ status: 'ready', data });
      })
      .catch(() => {
        if (active) setState({ status: 'error', data: null });
      });
    return () => {
      active = false;
    };
  }, [lat, lon, attempt]);

  let body;
  if (!city) {
    body = (
      <div className="weather-empty">
        <p className="muted-line">No city set.</p>
        <button type="button" className="btn outline" onClick={onSettings}>
          <MapPin size={15} aria-hidden="true" />
          Choose a city
        </button>
      </div>
    );
  } else if (state.status === 'error') {
    body = (
      <div className="weather-empty">
        <p className="error-text" role="alert">Weather is unavailable right now.</p>
        <button type="button" className="btn outline" onClick={() => setAttempt((a) => a + 1)}>Try again</button>
      </div>
    );
  } else if (!state.data) {
    body = (
      <div className="skeleton-stack" role="status" aria-label="Loading weather">
        <span className="skeleton skeleton-lg" />
        <span className="skeleton" />
        <span className="skeleton" />
      </div>
    );
  } else {
    body = <WeatherBody city={city} data={state.data} />;
  }

  return (
    <Widget
      className="g-4"
      title="Weather"
      icon={<CloudSun size={16} />}
      extra={
        city ? (
          <button type="button" className="icon-btn" onClick={() => setAttempt((a) => a + 1)} aria-label="Refresh weather">
            <RefreshCw size={14} aria-hidden="true" />
          </button>
        ) : null
      }
    >
      {body}
    </Widget>
  );
}

function CountdownsWidget({ events, onAdd, onRemove }) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const list = events.map((e) => ({ ...e, days: daysUntil(e.date) })).sort((a, b) => a.days - b.days);

  const submit = (e) => {
    e.preventDefault();
    const title = name.trim();
    if (!title || !date) return;
    onAdd({ title, date });
    setName('');
    setDate('');
  };

  return (
    <Widget className="g-4" title="Countdowns" icon={<CalendarDays size={16} />} extra={<span className="count">{events.length}</span>}>
      <form className="inline-form" onSubmit={submit}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Event name" aria-label="Event name" />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Event date" />
        <button className="btn primary icon-only" type="submit" disabled={!name.trim() || !date} aria-label="Add countdown">
          <Plus size={15} aria-hidden="true" />
        </button>
      </form>
      {list.length === 0 ? (
        <p className="empty">No countdowns yet.</p>
      ) : (
        <ul className="plain-list">
          {list.map((ev) => (
            <li key={ev.id} className={`countdown ${ev.days < 0 ? 'is-past' : ''}`}>
              <div className="countdown-main">
                <span className="countdown-title">{ev.title}</span>
                <span className="muted-line">{formatFullDate(ev.date)}</span>
              </div>
              <span className="countdown-days tabular">{countdownLabel(ev.days)}</span>
              <button type="button" className="icon-btn" onClick={() => onRemove(ev.id)} aria-label={`Delete ${ev.title}`}>
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Widget>
  );
}

export function Overview({ store, timer, onNavigate }) {
  const { tasks, notes, links, events, focus, city, addTask, toggleTask, updateTask, removeTask, addEvent, removeEvent } = store;
  const today = todayKey();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const dateLabel = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const [dashboard, setDashboard] = useState(() => normalizeDashboardLayout(load('dashboard-layout', DEFAULT_DASHBOARD)));
  const [savedLayouts, setSavedLayouts] = useState(() => normalizeSavedLayouts(load('dashboard-layouts', [])));
  const [editing, setEditing] = useState(false);
  const [draggedId, setDraggedId] = useState('');
  const [dragOverId, setDragOverId] = useState('');
  const [layoutName, setLayoutName] = useState('');
  const [activeLayoutId, setActiveLayoutId] = useState('');
  const [layoutMessage, setLayoutMessage] = useState('');

  useEffect(() => save('dashboard-layout', dashboard), [dashboard]);
  useEffect(() => save('dashboard-layouts', savedLayouts), [savedLayouts]);
  useEffect(() => {
    const root = document.documentElement;
    for (const accent of DASHBOARD_ACCENTS) root.classList.toggle(`accent-${accent}`, dashboard.accent === accent);
    root.classList.toggle('density-compact', dashboard.density === 'compact');
  }, [dashboard.accent, dashboard.density]);

  const open = sortTasks(tasks.filter((t) => !t.done));
  const overdue = tasks.filter(isOverdue).length;
  const dueToday = open.filter((t) => t.due === today).length;
  const last14 = sumByDay(completedEntries(tasks), lastDays(14));
  const doneToday = last14[last14.length - 1].value;
  const doneWeek = last14.slice(-7).reduce((s, d) => s + d.value, 0);
  const chartData = last14.map((d) => ({ key: d.key, value: d.value, label: shortDay(d.key) }));
  const focusToday = focus.filter((f) => dayKey(f.at) === today);
  const minutesToday = focusToday.reduce((s, f) => s + f.minutes, 0);
  const nextEvent = events
    .map((e) => ({ ...e, days: daysUntil(e.date) }))
    .filter((e) => e.days >= 0)
    .sort((a, b) => a.days - b.days)[0];
  const recentNotes = [...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt - a.createdAt).slice(0, 4);
  const tiles = [...links].sort((a, b) => Number(b.favorite) - Number(a.favorite)).slice(0, 8);

  const widgetInfo = [
    { id: 'summary', label: 'Summary cards' },
    { id: 'tasks', label: 'Open tasks' },
    { id: 'completed', label: 'Completed chart' },
    { id: 'focus', label: 'Focus timer' },
    { id: 'weather', label: 'Weather' },
    { id: 'countdowns', label: 'Countdowns' },
    { id: 'notes', label: 'Recent notes' },
    { id: 'links', label: 'Quick links' },
  ];
  const patchDashboard = (patch) => setDashboard((previous) => ({ ...previous, ...patch }));
  const toggleWidget = (id) => setDashboard((previous) => ({
    ...previous,
    hidden: previous.hidden.includes(id) ? previous.hidden.filter((item) => item !== id) : [...previous.hidden, id],
  }));
  const setWidgetSize = (id, size) => setDashboard((previous) => ({
    ...previous,
    sizes: { ...previous.sizes, [id]: Number(size) },
  }));
  const moveWidget = (id, direction) => setDashboard((previous) => {
    const order = [...previous.order];
    const current = order.indexOf(id);
    const target = current + direction;
    if (current < 0 || target < 0 || target >= order.length) return previous;
    [order[current], order[target]] = [order[target], order[current]];
    return { ...previous, order };
  });
  const reorderWidget = (from, to) => setDashboard((previous) => {
    const order = [...previous.order];
    const fromIndex = order.indexOf(from);
    const toIndex = order.indexOf(to);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return previous;
    order.splice(fromIndex, 1);
    order.splice(toIndex, 0, from);
    return { ...previous, order };
  });
  const saveLayout = () => {
    const name = layoutName.trim();
    if (!name) return;
    const existing = savedLayouts.find((item) => item.name.toLowerCase() === name.toLowerCase());
    const entry = {
      id: existing?.id || `layout-${Date.now()}`,
      name: name.slice(0, 40),
      config: { ...dashboard, order: [...dashboard.order], hidden: [...dashboard.hidden], sizes: { ...dashboard.sizes } },
    };
    setSavedLayouts((previous) => [entry, ...previous.filter((item) => item.id !== entry.id)].slice(0, 12));
    setActiveLayoutId(entry.id);
    setLayoutName('');
    setLayoutMessage(`Saved layout: ${entry.name}`);
  };
  const loadLayout = (id) => {
    setActiveLayoutId(id);
    const selected = savedLayouts.find((item) => item.id === id);
    if (!selected) return;
    setDashboard({
      ...selected.config,
      order: [...selected.config.order],
      hidden: [...selected.config.hidden],
      sizes: { ...selected.config.sizes },
    });
    setLayoutMessage(`Loaded layout: ${selected.name}`);
  };
  const deleteLayout = () => {
    const selected = savedLayouts.find((item) => item.id === activeLayoutId);
    if (!selected || !window.confirm(`Delete the saved layout "${selected.name}"?`)) return;
    setSavedLayouts((previous) => previous.filter((item) => item.id !== activeLayoutId));
    setActiveLayoutId('');
    setLayoutMessage('Saved layout deleted.');
  };

  const widgetNodes = {
    summary: (
      <section className="stats" aria-label="Summary">
        <Stat label="Open tasks" value={open.length} sub={overdue ? `${overdue} overdue` : dueToday ? `${dueToday} due today` : 'Nothing overdue'} />
        <Stat label="Done today" value={doneToday} sub={`${doneWeek} in the last 7 days`}>
          <Sparkline values={last14.map((d) => d.value)} />
        </Stat>
        <Stat label="Focus today" value={`${minutesToday} min`} sub={`${focusToday.length} ${focusToday.length === 1 ? 'session' : 'sessions'}`} />
        <Stat label="Next countdown" value={nextEvent ? nextEvent.title : 'None'} sub={nextEvent ? countdownLabel(nextEvent.days) : 'Add one below'} />
      </section>
    ),
    tasks: (
      <Widget className="g-7" title="Open tasks" icon={<ListTodo size={16} />} extra={<button type="button" className="link-btn" onClick={() => onNavigate('tasks')}>View all</button>}>
        <TaskForm compact onAdd={addTask} />
        {open.length === 0 ? <p className="empty">No open tasks. Add one above.</p> : (
          <ul className="task-list">
            {open.slice(0, 6).map((task) => <TaskRow key={task.id} task={task} onToggle={toggleTask} onUpdate={updateTask} onRemove={removeTask} />)}
          </ul>
        )}
        {open.length > 6 && <p className="muted-line">{`+${open.length - 6} more on the Tasks page`}</p>}
      </Widget>
    ),
    completed: (
      <Widget className="g-5" title="Completed, last 14 days" icon={<ListTodo size={16} />}>
        <BarChart data={chartData} height={220} ariaLabel="Tasks completed per day over the last 14 days" />
      </Widget>
    ),
    focus: <FocusCard timer={timer} minutesToday={minutesToday} sessionsToday={focusToday.length} />,
    weather: <WeatherCard city={city} onSettings={() => onNavigate('settings')} />,
    countdowns: <CountdownsWidget events={events} onAdd={addEvent} onRemove={removeEvent} />,
    notes: (
      <Widget className="g-6" title="Recent notes" icon={<StickyNote size={16} />} extra={<button type="button" className="link-btn" onClick={() => onNavigate('notes')}>View all</button>}>
        {recentNotes.length === 0 ? <p className="empty">Your notes will appear here.</p> : (
          <ul className="plain-list">
            {recentNotes.map((note) => (
              <li key={note.id}>
                <button type="button" className="result-btn" onClick={() => onNavigate('notes')}>
                  <span className="result-title">{note.text}</span>
                  <span className="muted-line">{`${formatStamp(note.createdAt)}${note.pinned ? ' \u00b7 Pinned' : ''}`}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Widget>
    ),
    links: (
      <Widget className="g-6" title="Quick links" icon={<LinkIcon size={16} />} extra={<button type="button" className="link-btn" onClick={() => onNavigate('links')}>All links</button>}>
        {tiles.length === 0 ? <p className="empty">No links yet.</p> : (
          <ul className="tile-grid">
            {tiles.map((link) => (
              <li key={link.id}>
                <a className="tile" href={link.url} target="_blank" rel="noreferrer">
                  <span className="favicon" aria-hidden="true">{link.title.charAt(0).toUpperCase()}</span>
                  <span className="tile-text">
                    <span className="tile-title">{link.title}</span>
                    <span className="muted-line">{hostOf(link.url)}</span>
                  </span>
                  {link.favorite && <><Star size={13} aria-hidden="true" className="fav-mark" /><span className="sr-only">Favorite</span></>}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Widget>
    ),
  };

  const content = (
    <div className="stack">
      <header className="page-head">
        <div className="page-title">
          <h1>{`${greeting}, Nico`}</h1>
          <p className="muted-line">{dateLabel}</p>
        </div>
        <div className="page-actions">
          {!editing ? (
            <button type="button" className="btn outline" onClick={() => setEditing(true)}>
              <Palette size={15} aria-hidden="true" />
              Customize
            </button>
          ) : (
            <button type="button" className="btn primary" onClick={() => { setEditing(false); setDraggedId(''); setDragOverId(''); }}>
              Done
            </button>
          )}
        </div>
      </header>

      {editing && (
        <section className="customize-panel" aria-label="Dashboard customization">
          <div className="customize-panel-head">
            <div>
              <h2>Customize dashboard</h2>
              <p className="muted-line">Changes are saved on this device. Drag widgets or use the arrows to reorder them.</p>
            </div>
            <button type="button" className="icon-btn bordered" onClick={() => setDashboard(DEFAULT_DASHBOARD)} title="Reset dashboard" aria-label="Reset dashboard">
              <RotateCcw size={15} aria-hidden="true" />
            </button>
          </div>

          <div className="customize-grid">
            <div className="customize-group">
              <span className="customize-label">Accent color</span>
              <div className="customize-swatches" role="group" aria-label="Accent color">
                {[
                  { id: 'violet', label: 'Violet' },
                  { id: 'blue', label: 'Blue' },
                  { id: 'teal', label: 'Teal' },
                  { id: 'rose', label: 'Rose' },
                  { id: 'amber', label: 'Amber' },
                ].map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    className={`color-swatch swatch-${color.id} ${dashboard.accent === color.id ? 'is-active' : ''}`}
                    onClick={() => patchDashboard({ accent: color.id })}
                    aria-label={`${color.label} accent color`}
                    aria-pressed={dashboard.accent === color.id}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            <div className="customize-group">
              <span className="customize-label">Spacing</span>
              <div className="segmented" role="group" aria-label="Widget spacing">
                <button type="button" aria-pressed={dashboard.density === 'comfortable'} onClick={() => patchDashboard({ density: 'comfortable' })}>Comfortable</button>
                <button type="button" aria-pressed={dashboard.density === 'compact'} onClick={() => patchDashboard({ density: 'compact' })}>Compact</button>
              </div>
            </div>

            <div className="customize-group customize-layouts">
              <span className="customize-label">Saved layouts</span>
              <div className="customize-saved-controls">
                <select value={activeLayoutId} onChange={(event) => loadLayout(event.target.value)} aria-label="Load a saved layout">
                  <option value="">Choose a layout</option>
                  {savedLayouts.map((layout) => <option key={layout.id} value={layout.id}>{layout.name}</option>)}
                </select>
                <button type="button" className="btn outline" onClick={deleteLayout} disabled={!activeLayoutId}>Delete</button>
                <input value={layoutName} onChange={(event) => setLayoutName(event.target.value)} maxLength={40} placeholder="Name this layout" aria-label="Layout name" />
                <button type="button" className="btn primary" onClick={saveLayout} disabled={!layoutName.trim()}>
                  <Save size={14} aria-hidden="true" />
                  Save layout
                </button>
              </div>
              {layoutMessage && <p className="muted-line" role="status">{layoutMessage}</p>}
            </div>
          </div>

          <div className="customize-group">
            <span className="customize-label">Show or hide widgets</span>
            <div className="dashboard-widget-toggles">
              {widgetInfo.map((item) => {
                const visible = !dashboard.hidden.includes(item.id);
                return (
                  <button key={item.id} type="button" className={`dashboard-toggle ${visible ? 'is-visible' : 'is-hidden'}`} aria-pressed={visible} onClick={() => toggleWidget(item.id)}>
                    {visible ? <Eye size={14} aria-hidden="true" /> : <EyeOff size={14} aria-hidden="true" />}
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <div className="grid dashboard-grid">
        {dashboard.order.filter((id) => !dashboard.hidden.includes(id)).map((id, index, visibleItems) => {
          const info = widgetInfo.find((item) => item.id === id);
          if (!info || !widgetNodes[id]) return null;
          const span = dashboard.sizes[id] || 6;
          const dragProps = editing ? {
            onDragOver: (event) => { event.preventDefault(); setDragOverId(id); },
            onDragLeave: (event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragOverId(''); },
            onDrop: (event) => {
              event.preventDefault();
              const source = event.dataTransfer.getData('text/plain') || draggedId;
              if (source && source !== id) reorderWidget(source, id);
              setDraggedId('');
              setDragOverId('');
            },
          } : {};
          return (
            <div
              key={id}
              className={`dashboard-slot ${editing ? 'is-editing' : ''} ${dragOverId === id ? 'is-drag-over' : ''} ${draggedId === id ? 'is-dragging' : ''}`}
              style={{ '--widget-span': String(span) }}
              {...dragProps}
            >
              {editing && (
                <div className="dashboard-widget-tools">
                  <button
                    type="button"
                    className="dashboard-drag-handle"
                    draggable="true"
                    onDragStart={(event) => {
                      setDraggedId(id);
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', id);
                    }}
                    onDragEnd={() => { setDraggedId(''); setDragOverId(''); }}
                    aria-label={`Drag to move ${info.label}`}
                    title="Drag to move"
                  >
                    <GripVertical size={15} aria-hidden="true" />
                    <span>{info.label}</span>
                  </button>
                  <div className="dashboard-slot-actions">
                    <button type="button" className="icon-btn" onClick={() => moveWidget(id, -1)} disabled={index === 0} aria-label={`Move ${info.label} up`} title="Move up"><ChevronUp size={16} aria-hidden="true" /></button>
                    <button type="button" className="icon-btn" onClick={() => moveWidget(id, 1)} disabled={index === visibleItems.length - 1} aria-label={`Move ${info.label} down`} title="Move down"><ChevronDown size={16} aria-hidden="true" /></button>
                    <select value={span} onChange={(event) => setWidgetSize(id, event.target.value)} aria-label={`Width of ${info.label}`}>
                      <option value="4">One third</option>
                      <option value="6">Half width</option>
                      <option value="8">Two thirds</option>
                      <option value="12">Full width</option>
                    </select>
                    <button type="button" className="btn ghost dashboard-hide" onClick={() => toggleWidget(id)} aria-label={`Hide ${info.label}`}>Hide</button>
                  </div>
                </div>
              )}
              {widgetNodes[id]}
            </div>
          );
        })}
      </div>
    </div>
  );

  return content;
}
