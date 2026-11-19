import React, { useEffect, useRef, useState } from 'react';
import {
  Plus, Play, Pause, RotateCcw, Trash2, CalendarDays, Sun, CloudSun, Cloud, CloudFog, CloudDrizzle,
  CloudRain, CloudSnow, CloudLightning, RefreshCw, MapPin, Timer, ListTodo, StickyNote, Link as LinkIcon, Star,
} from 'lucide-react';
import Widget from './Widget.jsx';
import { BarChart, Sparkline } from './Charts.jsx';
import { Stat, TaskForm, TaskRow } from './Views.jsx';
import { fetchWeather, describeWeather } from '../lib/weather.js';
import {
  todayKey, dayKey, lastDays, sumByDay, shortDay, completedEntries, sortTasks, isOverdue, daysUntil,
  countdownLabel, hostOf, formatStamp, formatFullDate,
} from '../lib/model.js';

export const PRESETS = [15, 25, 50];

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

  return (
    <div className="stack">
      <header className="page-head">
        <div className="page-title">
          <h1>{`${greeting}, Nico`}</h1>
          <p className="muted-line">{dateLabel}</p>
        </div>
      </header>

      <section className="stats" aria-label="Summary">
        <Stat
          label="Open tasks"
          value={open.length}
          sub={overdue ? `${overdue} overdue` : dueToday ? `${dueToday} due today` : 'Nothing overdue'}
        />
        <Stat label="Done today" value={doneToday} sub={`${doneWeek} in the last 7 days`}>
          <Sparkline values={last14.map((d) => d.value)} />
        </Stat>
        <Stat
          label="Focus today"
          value={`${minutesToday} min`}
          sub={`${focusToday.length} ${focusToday.length === 1 ? 'session' : 'sessions'}`}
        />
        <Stat label="Next countdown" value={nextEvent ? nextEvent.title : 'None'} sub={nextEvent ? countdownLabel(nextEvent.days) : 'Add one below'} />
      </section>

      <div className="grid">
        <Widget
          className="g-7"
          title="Open tasks"
          icon={<ListTodo size={16} />}
          extra={<button type="button" className="link-btn" onClick={() => onNavigate('tasks')}>View all</button>}
        >
          <TaskForm compact onAdd={addTask} />
          {open.length === 0 ? (
            <p className="empty">No open tasks. Add one above.</p>
          ) : (
            <ul className="task-list">
              {open.slice(0, 6).map((t) => (
                <TaskRow key={t.id} task={t} onToggle={toggleTask} onUpdate={updateTask} onRemove={removeTask} />
              ))}
            </ul>
          )}
          {open.length > 6 && (
            <p className="muted-line">{`+${open.length - 6} more on the Tasks page`}</p>
          )}
        </Widget>

        <Widget className="g-5" title="Completed, last 14 days" icon={<ListTodo size={16} />}>
          <BarChart data={chartData} height={220} ariaLabel="Tasks completed per day over the last 14 days" />
        </Widget>

        <FocusCard timer={timer} minutesToday={minutesToday} sessionsToday={focusToday.length} />
        <WeatherCard city={city} onSettings={() => onNavigate('settings')} />
        <CountdownsWidget events={events} onAdd={addEvent} onRemove={removeEvent} />

        <Widget
          className="g-6"
          title="Recent notes"
          icon={<StickyNote size={16} />}
          extra={<button type="button" className="link-btn" onClick={() => onNavigate('notes')}>View all</button>}
        >
          {recentNotes.length === 0 ? (
            <p className="empty">Your notes will appear here.</p>
          ) : (
            <ul className="plain-list">
              {recentNotes.map((n) => (
                <li key={n.id}>
                  <button type="button" className="result-btn" onClick={() => onNavigate('notes')}>
                    <span className="result-title">{n.text}</span>
                    <span className="muted-line">{`${formatStamp(n.createdAt)}${n.pinned ? ' \u00b7 Pinned' : ''}`}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Widget>

        <Widget
          className="g-6"
          title="Quick links"
          icon={<LinkIcon size={16} />}
          extra={<button type="button" className="link-btn" onClick={() => onNavigate('links')}>All links</button>}
        >
          {tiles.length === 0 ? (
            <p className="empty">No links yet.</p>
          ) : (
            <ul className="tile-grid">
              {tiles.map((l) => (
                <li key={l.id}>
                  <a className="tile" href={l.url} target="_blank" rel="noreferrer">
                    <span className="favicon" aria-hidden="true">{l.title.charAt(0).toUpperCase()}</span>
                    <span className="tile-text">
                      <span className="tile-title">{l.title}</span>
                      <span className="muted-line">{hostOf(l.url)}</span>
                    </span>
                    {l.favorite && (
                      <>
                        <Star size={13} aria-hidden="true" className="fav-mark" />
                        <span className="sr-only">Favorite</span>
                      </>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Widget>
      </div>
    </div>
  );
}
