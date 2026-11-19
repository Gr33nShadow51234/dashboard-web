import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, Home, StickyNote, ListTodo, Link as LinkIcon, Settings, Sun, Moon, Plus, Trash2, Check,
  Calculator, CalendarDays, CloudSun, Pin, Menu, X, ExternalLink, LogIn,
} from 'lucide-react';
import Widget from './components/Widget.jsx';
import { load, save } from './lib/storage.js';
import { signInMicrosoft, listTodoLists } from './lib/msgraph.js';

const starterLinks = [
  { id: 1, title: 'Jellyfin', url: 'http://localhost:8096', category: 'Media' },
  { id: 2, title: 'Radarr', url: 'http://localhost:7878', category: 'Media' },
  { id: 3, title: 'Sonarr', url: 'http://localhost:8989', category: 'Media' },
];

const NAV = [
  { label: 'Home', icon: Home },
  { label: 'Notes', icon: StickyNote },
  { label: 'Tasks', icon: ListTodo },
  { label: 'Links', icon: LinkIcon },
  { label: 'Settings', icon: Settings },
];

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};
const todayLabel = () =>
  new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
const daysUntil = (date) =>
  Math.ceil((new Date(date + 'T00:00:00') - new Date(new Date().toDateString())) / 86400000);
const countdownLabel = (days) =>
  days < 0 ? 'Passed' : days === 0 ? 'Today' : `${days} ${days === 1 ? 'day' : 'days'}`;

function Stat({ label, value, sub }) {
  return (
    <div className="stat">
      <small>{label}</small>
      <strong title={String(value)}>{value}</strong>
      {sub && <span>{sub}</span>}
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState(() => load('theme', 'dark'));
  const [notes, setNotes] = useState(() => load('notes', []));
  const [tasks, setTasks] = useState(() => load('tasks', []));
  const [links, setLinks] = useState(() => load('links', starterLinks));
  const [events, setEvents] = useState(() => load('events', []));
  const [query, setQuery] = useState('');
  const [noteText, setNoteText] = useState('');
  const [taskText, setTaskText] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [eventText, setEventText] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [activeTab, setActiveTab] = useState('Home');
  const [msStatus, setMsStatus] = useState('Not connected');
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcInput, setCalcInput] = useState('');

  useEffect(() => {
    save('theme', theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => save('notes', notes), [notes]);
  useEffect(() => save('tasks', tasks), [tasks]);
  useEffect(() => save('links', links), [links]);
  useEffect(() => save('events', events), [events]);

  const filteredLinks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return links.filter((l) => `${l.title} ${l.url} ${l.category}`.toLowerCase().includes(q));
  }, [links, query]);

  const openTasks = tasks.filter((t) => !t.done).length;
  const nextEvent = useMemo(
    () =>
      events
        .map((e) => ({ ...e, days: daysUntil(e.date) }))
        .filter((e) => e.days >= 0)
        .sort((a, b) => a.days - b.days)[0],
    [events],
  );

  const addNote = () => {
    const text = noteText.trim();
    if (!text) return;
    setNotes((prev) => [{ id: crypto.randomUUID(), text, createdAt: Date.now() }, ...prev]);
    setNoteText('');
  };
  const addTask = () => {
    const text = taskText.trim();
    if (!text) return;
    setTasks((prev) => [{ id: crypto.randomUUID(), text, done: false, createdAt: Date.now() }, ...prev]);
    setTaskText('');
  };
  const addLink = () => {
    const title = linkTitle.trim();
    let url = linkUrl.trim();
    if (!title || !url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    setLinks((prev) => [{ id: crypto.randomUUID(), title, url, category: 'General' }, ...prev]);
    setLinkTitle('');
    setLinkUrl('');
  };
  const addEvent = () => {
    const title = eventText.trim();
    if (!title || !eventDate) return;
    setEvents((prev) => [{ id: crypto.randomUUID(), title, date: eventDate }, ...prev]);
    setEventText('');
    setEventDate('');
  };

  const toggleTask = (id) =>
    setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  const removeTask = (id) => setTasks((prev) => prev.filter((x) => x.id !== id));
  const removeNote = (id) => setNotes((prev) => prev.filter((x) => x.id !== id));
  const removeLink = (id) => setLinks((prev) => prev.filter((x) => x.id !== id));
  const removeEvent = (id) => setEvents((prev) => prev.filter((x) => x.id !== id));

  const runCalc = () => {
    try {
      const safe = calcInput.replace(/[^0-9+\-*/().% ]/g, '');
      setCalcInput(String(Function(`return (${safe})`)()));
    } catch {
      setCalcInput('Error');
    }
  };

  const connectMicrosoft = async () => {
    setMsStatus('Connecting…');
    try {
      await signInMicrosoft();
      const lists = await listTodoLists();
      setMsStatus(`Connected · ${lists.value?.length ?? 0} lists found`);
    } catch (e) {
      setMsStatus(e.message);
    }
  };

  const go = (label) => {
    setActiveTab(label);
    setMobileNav(false);
  };

  const taskRows = tasks.map((t) => (
    <div className={`row ${t.done ? 'done' : ''}`} key={t.id}>
      <button className="check" onClick={() => toggleTask(t.id)} aria-label={t.done ? 'Mark as open' : 'Mark as done'}>
        {t.done && <Check size={13} />}
      </button>
      <span className="row-text">{t.text}</span>
      <button className="icon-btn" onClick={() => removeTask(t.id)} aria-label="Delete task">
        <Trash2 size={14} />
      </button>
    </div>
  ));

  const noteCards = notes.map((n) => (
    <article className="note" key={n.id}>
      <p>{n.text}</p>
      <small>{new Date(n.createdAt).toLocaleString()}</small>
      <button className="icon-btn note-delete" onClick={() => removeNote(n.id)} aria-label="Delete note">
        <Trash2 size={14} />
      </button>
    </article>
  ));

  const linkRows = filteredLinks.map((l) => (
    <a className="link-row" href={l.url} target="_blank" rel="noreferrer" key={l.id}>
      <span className="link-favicon" aria-hidden="true">{l.title.charAt(0).toUpperCase()}</span>
      <span className="link-text">
        <strong>{l.title}</strong>
        <small>{l.url}</small>
      </span>
      <ExternalLink size={14} className="link-ext" aria-hidden="true" />
    </a>
  ));

  const eventRows = events.map((ev) => {
    const days = daysUntil(ev.date);
    return (
      <div className="event-row" key={ev.id}>
        <div className="event-main">
          <strong>{ev.title}</strong>
          <small>{new Date(ev.date + 'T00:00:00').toLocaleDateString()}</small>
        </div>
        <span className="days">{countdownLabel(days)}</span>
        <button className="icon-btn" onClick={() => removeEvent(ev.id)} aria-label="Delete countdown">
          <Trash2 size={14} />
        </button>
      </div>
    );
  });

  const homeView = (
    <div className="grid">
      <Widget className="w-12" title="Quick capture" icon={<Plus size={16} />}>
        <div className="input-row">
          <input
            value={taskText}
            onChange={(e) => setTaskText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder="Capture a task…"
            aria-label="New task"
          />
          <button className="primary" onClick={addTask}><Plus size={16} /> Add task</button>
        </div>
        <div className="input-row">
          <input
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addNote()}
            placeholder="Write a note…"
            aria-label="New note"
          />
          <button className="secondary" onClick={addNote}>Save note</button>
        </div>
      </Widget>

      <Widget
        className="w-5"
        tall
        title="Tasks"
        icon={<ListTodo size={16} />}
        extra={<span className="count">{openTasks} open</span>}
      >
        <div className="task-list">
          {tasks.length === 0 ? <p className="empty">No tasks yet. Add one using Quick capture.</p> : taskRows}
        </div>
      </Widget>

      <Widget
        className="w-7"
        tall
        title="Notes"
        icon={<StickyNote size={16} />}
        extra={<span className="count">{notes.length}</span>}
      >
        <div className="notes-grid">
          {notes.length === 0 ? <p className="empty">Your notes will appear here.</p> : noteCards}
        </div>
      </Widget>

      <Widget
        className="w-4"
        tall
        title="Quick links"
        icon={<LinkIcon size={16} />}
        extra={<span className="count">{filteredLinks.length}</span>}
      >
        <div className="link-list">
          {filteredLinks.length === 0 ? <p className="empty">No matching links.</p> : linkRows}
        </div>
        <AddLinkForm
          linkTitle={linkTitle}
          setLinkTitle={setLinkTitle}
          linkUrl={linkUrl}
          setLinkUrl={setLinkUrl}
          onAdd={addLink}
        />
      </Widget>

      <Widget
        className="w-4"
        tall
        title="Countdowns"
        icon={<CalendarDays size={16} />}
        extra={<span className="count">{events.length}</span>}
      >
        <div className="event-form">
          <input
            placeholder="Event name"
            value={eventText}
            onChange={(e) => setEventText(e.target.value)}
            aria-label="Event name"
          />
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            aria-label="Event date"
          />
          <button className="primary" onClick={addEvent} aria-label="Add countdown"><Plus size={15} /></button>
        </div>
        <div className="event-list">
          {events.length === 0 ? <p className="empty">No countdowns added.</p> : eventRows}
        </div>
      </Widget>

      <Widget className="w-4" tall title="Microsoft To Do" icon={<Pin size={16} />}>
        <div className="ms-status">
          <span className="ms-dot" data-connected={msStatus.startsWith('Connected')} aria-hidden="true" />
          <span>{msStatus}</span>
        </div>
        <button className="secondary full" onClick={connectMicrosoft}>
          <LogIn size={16} /> Connect Microsoft
        </button>
        <p className="hint">
          Configure your Entra app client ID in <code>src/lib/config.js</code> first.
        </p>
      </Widget>
    </div>
  );

  const pageView = (title, icon, extra, body) => (
    <div className="grid">
      <Widget className="w-12" title={title} icon={icon} extra={extra}>
        {body}
      </Widget>
    </div>
  );

  return (
    <div className="app-shell">
      <div className={`scrim ${mobileNav ? 'show' : ''}`} onClick={() => setMobileNav(false)} aria-hidden="true" />

      <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">K</div>
          <div>
            <strong>Khatib</strong>
            <small>Dashboard</small>
          </div>
          <button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <nav className="nav">
          {NAV.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${activeTab === label ? 'active' : ''}`}
              onClick={() => go(label)}
              aria-current={activeTab === label ? 'page' : undefined}
            >
              <Icon size={18} />
              <span>{label}</span>
              {label === 'Tasks' && openTasks > 0 && <span className="nav-badge">{openTasks}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="profile">
            <div className="avatar" aria-hidden="true">N</div>
            <div>
              <strong>Nico</strong>
              <small>Personal workspace</small>
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <button className="menu-btn" onClick={() => setMobileNav(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <label className="searchbox">
            <Search size={16} aria-hidden="true" />
            <input
              placeholder="Search links"
              aria-label="Search links"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button className="clear-btn" onClick={() => setQuery('')} aria-label="Clear search">
                <X size={15} />
              </button>
            )}
          </label>
          <button
            className="icon-square"
            title="Calculator"
            aria-label="Toggle calculator"
            aria-pressed={calcOpen}
            onClick={() => setCalcOpen((v) => !v)}
          >
            <Calculator size={17} />
          </button>
          <button
            className="icon-square"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>

        {calcOpen && (
          <div className="calculator">
            <input
              value={calcInput}
              onChange={(e) => setCalcInput(e.target.value)}
              placeholder="Expression"
              aria-label="Calculator expression"
            />
            <button className="primary" onClick={runCalc}>Calculate</button>
            <button className="secondary" onClick={() => setCalcInput('')}>Clear</button>
          </div>
        )}

        <section className="hero">
          <div>
            <p className="eyebrow">{todayLabel()}</p>
            <h1>
              {greeting()}, <span>Nico</span>
            </h1>
            <p className="welcome-sub">Here’s your personal overview.</p>
          </div>
          <div className="stats">
            <Stat label="Open tasks" value={openTasks} sub={`${tasks.length} total`} />
            <Stat label="Notes" value={notes.length} />
            <Stat label="Links" value={links.length} />
            <Stat
              label="Next countdown"
              value={nextEvent ? nextEvent.title : 'None'}
              sub={nextEvent ? countdownLabel(nextEvent.days) : 'Add one below'}
            />
            <Stat label="Weather" value="Not connected" sub={<CloudSun size={14} />} />
          </div>
        </section>

        {activeTab === 'Home' && homeView}

        {activeTab === 'Notes' &&
          pageView(
            'All notes',
            <StickyNote size={16} />,
            <span className="count">{notes.length}</span>,
            <>
              <div className="input-row">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Write a note…"
                  aria-label="New note"
                />
                <button className="primary" onClick={addNote}>Save</button>
              </div>
              <div className="notes-grid">
                {notes.length === 0 ? <p className="empty">No notes yet.</p> : noteCards}
              </div>
            </>,
          )}

        {activeTab === 'Tasks' &&
          pageView(
            'All tasks',
            <ListTodo size={16} />,
            <span className="count">{openTasks} open</span>,
            <>
              <div className="input-row">
                <input
                  value={taskText}
                  onChange={(e) => setTaskText(e.target.value)}
                  placeholder="New task"
                  aria-label="New task"
                  onKeyDown={(e) => e.key === 'Enter' && addTask()}
                />
                <button className="primary" onClick={addTask}>Add task</button>
              </div>
              <div className="task-list">
                {tasks.length === 0 ? <p className="empty">No tasks yet.</p> : taskRows}
              </div>
            </>,
          )}

        {activeTab === 'Links' &&
          pageView(
            'Links',
            <LinkIcon size={16} />,
            <span className="count">{links.length}</span>,
            <>
              <AddLinkForm
                linkTitle={linkTitle}
                setLinkTitle={setLinkTitle}
                linkUrl={linkUrl}
                setLinkUrl={setLinkUrl}
                onAdd={addLink}
              />
              <div className="link-list">
                {links.map((l) => (
                  <div className="row" key={l.id}>
                    <span className="link-favicon" aria-hidden="true">{l.title.charAt(0).toUpperCase()}</span>
                    <a className="row-text link-inline" href={l.url} target="_blank" rel="noreferrer">
                      <strong>{l.title}</strong> <small>{l.url}</small>
                    </a>
                    <button className="icon-btn" onClick={() => removeLink(l.id)} aria-label="Delete link">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </>,
          )}

        {activeTab === 'Settings' &&
          pageView(
            'Settings',
            <Settings size={16} />,
            null,
            <>
              <div className="settings-row">
                <div>
                  <strong>Appearance</strong>
                  <small>Switch between light and dark theme</small>
                </div>
                <button className="secondary" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </button>
              </div>
              <div className="settings-row">
                <div>
                  <strong>Local data</strong>
                  <small>Notes, tasks, links and countdowns are saved in this browser.</small>
                </div>
                <button
                  className="secondary"
                  onClick={() => {
                    if (confirm('Export dashboard data as JSON?')) {
                      const blob = new Blob(
                        [JSON.stringify({ notes, tasks, links, events, theme }, null, 2)],
                        { type: 'application/json' },
                      );
                      const a = document.createElement('a');
                      a.href = URL.createObjectURL(blob);
                      a.download = 'khatib-dashboard-backup.json';
                      a.click();
                      URL.revokeObjectURL(a.href);
                    }
                  }}
                >
                  Export backup
                </button>
              </div>
              <div className="settings-row">
                <div>
                  <strong>Reset local data</strong>
                  <small>Deletes notes, tasks, links and countdowns from this browser.</small>
                </div>
                <button
                  className="danger"
                  onClick={() => {
                    if (confirm('Delete all dashboard data?')) {
                      setNotes([]);
                      setTasks([]);
                      setLinks([]);
                      setEvents([]);
                    }
                  }}
                >
                  Reset
                </button>
              </div>
            </>,
          )}
      </main>
    </div>
  );
}

function AddLinkForm({ linkTitle, setLinkTitle, linkUrl, setLinkUrl, onAdd }) {
  return (
    <div className="add-form">
      <input placeholder="Link name" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} aria-label="Link name" />
      <input placeholder="https://…" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} aria-label="Link URL" />
      <button className="primary" onClick={onAdd}><Plus size={15} /> Add</button>
    </div>
  );
}

export default App;
