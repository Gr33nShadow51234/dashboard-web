import React, { useEffect, useRef, useState } from 'react';
import {
  Search, X, Menu, Sun, Moon, Calculator as CalcIcon, LayoutDashboard, ListTodo, StickyNote, Link as LinkIcon,
  BarChart3, Settings,
} from 'lucide-react';
import { load, save } from './lib/storage.js';
import { asList, normTask, normNote, normLink, normEvent, normFocus, normCity, uid } from './lib/model.js';
import { Overview, useFocusTimer } from './components/Overview.jsx';
import { TasksPage, NotesPage, LinksPage, InsightsPage, SettingsPage, SearchResults, Calculator } from './components/Views.jsx';

const STARTER_LINKS = [
  { id: 'starter-jellyfin', title: 'Jellyfin', url: 'http://localhost:8096', category: 'Media', favorite: false },
  { id: 'starter-radarr', title: 'Radarr', url: 'http://localhost:7878', category: 'Media', favorite: false },
  { id: 'starter-sonarr', title: 'Sonarr', url: 'http://localhost:8989', category: 'Media', favorite: false },
];

const PAGES = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'links', label: 'Links', icon: LinkIcon },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];
const PAGE_IDS = PAGES.map((p) => p.id);

// The current page lives in the URL hash, so a refresh keeps you on the same page.
function pageFromHash() {
  if (typeof window === 'undefined') return 'overview';
  const id = window.location.hash.replace('#', '');
  return PAGE_IDS.includes(id) ? id : 'overview';
}

function usePersisted(key, fallback, normalize) {
  const [value, setValue] = useState(() => normalize(load(key, fallback)));
  useEffect(() => {
    save(key, value);
  }, [key, value]);
  return [value, setValue];
}

const isTyping = (el) => !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

export default function App() {
  const [theme, setTheme] = usePersisted('theme', 'dark', (v) => (v === 'light' ? 'light' : 'dark'));
  const [tasks, setTasks] = usePersisted('tasks', [], (v) => asList(v, normTask));
  const [notes, setNotes] = usePersisted('notes', [], (v) => asList(v, normNote));
  const [links, setLinks] = usePersisted('links', STARTER_LINKS, (v) => asList(v, normLink));
  const [events, setEvents] = usePersisted('events', [], (v) => asList(v, normEvent));
  const [focus, setFocus] = usePersisted('focus', [], (v) => asList(v, normFocus));
  const [city, setCity] = usePersisted('city', null, normCity);

  const [page, setPageState] = useState(pageFromHash);
  const [query, setQuery] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('theme-light', theme === 'light');
  }, [theme]);

  useEffect(() => {
    const onHash = () => setPageState(pageFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/' || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTyping(e.target)) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const addFocus = (minutes) =>
    setFocus((prev) => [normFocus({ id: uid(), at: Date.now(), minutes }), ...prev]);
  // The timer lives here so it keeps running while the user moves between pages.
  const timer = useFocusTimer(addFocus);

  const store = {
    tasks,
    notes,
    links,
    events,
    focus,
    city,
    theme,
    setTheme: (t) => setTheme(t === 'light' ? 'light' : 'dark'),
    setCity: (c) => setCity(normCity(c)),
    addTask: (fields) =>
      setTasks((prev) => [normTask({ ...fields, id: uid(), createdAt: Date.now(), done: false, completedAt: null }), ...prev]),
    toggleTask: (id) =>
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, done: !t.done, completedAt: t.done ? null : Date.now() } : t)),
      ),
    updateTask: (id, patch) => setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t))),
    removeTask: (id) => setTasks((prev) => prev.filter((t) => t.id !== id)),
    addNote: (text) => setNotes((prev) => [{ id: uid(), text, createdAt: Date.now(), pinned: false }, ...prev]),
    updateNote: (id, patch) => setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n))),
    removeNote: (id) => setNotes((prev) => prev.filter((n) => n.id !== id)),
    addLink: (fields) => setLinks((prev) => [normLink({ id: uid(), favorite: false, ...fields }), ...prev]),
    updateLink: (id, patch) => setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l))),
    removeLink: (id) => setLinks((prev) => prev.filter((l) => l.id !== id)),
    addEvent: (fields) => setEvents((prev) => [...prev, normEvent({ id: uid(), ...fields })]),
    removeEvent: (id) => setEvents((prev) => prev.filter((e) => e.id !== id)),
    replaceAll: (data) => {
      if (Array.isArray(data.tasks)) setTasks(asList(data.tasks, normTask));
      if (Array.isArray(data.notes)) setNotes(asList(data.notes, normNote));
      if (Array.isArray(data.links)) setLinks(asList(data.links, normLink));
      if (Array.isArray(data.events)) setEvents(asList(data.events, normEvent));
      if (Array.isArray(data.focus)) setFocus(asList(data.focus, normFocus));
      if (data.theme === 'light' || data.theme === 'dark') setTheme(data.theme);
      if ('city' in data) setCity(normCity(data.city));
    },
    resetAll: () => {
      setTasks([]);
      setNotes([]);
      setLinks([]);
      setEvents([]);
      setFocus([]);
      setCity(null);
    },
  };

  const go = (id) => {
    setQuery('');
    setMobileNav(false);
    if (typeof window !== 'undefined' && window.location.hash !== `#${id}`) window.location.hash = id;
    setPageState(id);
  };

  const openCount = tasks.filter((t) => !t.done).length;
  const searching = query.trim().length > 0;

  let content;
  if (searching) content = <SearchResults query={query} store={store} onOpen={go} />;
  else if (page === 'tasks') content = <TasksPage store={store} />;
  else if (page === 'notes') content = <NotesPage store={store} />;
  else if (page === 'links') content = <LinksPage store={store} />;
  else if (page === 'insights') content = <InsightsPage store={store} />;
  else if (page === 'settings') content = <SettingsPage store={store} />;
  else content = <Overview store={store} timer={timer} onNavigate={go} />;

  return (
    <div className="app-shell">
      <div className={`scrim ${mobileNav ? 'show' : ''}`} onClick={() => setMobileNav(false)} aria-hidden="true" />

      <aside className={`sidebar ${mobileNav ? 'open' : ''}`} aria-label="Sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">K</div>
          <div>
            <strong>Khatib</strong>
            <small>Dashboard</small>
          </div>
          <button type="button" className="icon-btn mobile-only" onClick={() => setMobileNav(false)} aria-label="Close menu">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <nav className="nav" aria-label="Pages">
          {PAGES.map(({ id, label, icon: Icon }) => {
            const active = !searching && page === id;
            return (
              <button
                key={id}
                type="button"
                className={`nav-item ${active ? 'active' : ''}`}
                onClick={() => go(id)}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={18} aria-hidden="true" />
                <span className="nav-label">{label}</span>
                {id === 'tasks' && openCount > 0 && <span className="nav-badge">{openCount}</span>}
              </button>
            );
          })}
        </nav>
        <div className="profile">
          <div className="avatar" aria-hidden="true">N</div>
          <div>
            <strong>Nico</strong>
            <small>Personal workspace</small>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button type="button" className="icon-btn menu-btn" onClick={() => setMobileNav(true)} aria-label="Open menu">
            <Menu size={20} aria-hidden="true" />
          </button>
          <div className="searchbox" role="search">
            <Search size={16} aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              className="search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setQuery('');
                  e.currentTarget.blur();
                }
              }}
              placeholder="Search tasks, notes, links..."
              aria-label="Search"
            />
            {query ? (
              <button type="button" className="icon-btn" onClick={() => setQuery('')} aria-label="Clear search">
                <X size={15} aria-hidden="true" />
              </button>
            ) : (
              <kbd aria-hidden="true">/</kbd>
            )}
          </div>
          <button
            type="button"
            className={`icon-btn bordered ${calcOpen ? 'is-pressed' : ''}`}
            aria-pressed={calcOpen}
            aria-label="Toggle calculator"
            title="Calculator"
            onClick={() => setCalcOpen((v) => !v)}
          >
            <CalcIcon size={17} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="icon-btn bordered"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
          </button>
        </header>

        <main className="content" id="main">
          {calcOpen && (
            <div className="calc-wrap">
              <Calculator onClose={() => setCalcOpen(false)} />
            </div>
          )}
          {content}
        </main>
      </div>
    </div>
  );
}
