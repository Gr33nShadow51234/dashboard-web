# dashboard-web

Personal "Khatib Dashboard": a React and Vite dashboard for tasks, notes, links, focus sessions, countdowns, weather and simple insights. All data is stored in the browser you use.

Live site: https://gr33nshadow51234.github.io/dashboard-web/

## Features

- **Overview**: greeting, key numbers, open tasks with quick add, 14-day completion chart, focus timer (15, 25 or 50 minutes), weather with a 5-day forecast, countdowns, recent notes and favourite links.
- **Tasks**: filters for Open, Overdue, Done and All; priorities (high, medium, low); due dates; inline editing.
- **Notes**: pinned notes first; save with Ctrl+Enter.
- **Links**: grouped by category, favourites, validated web addresses.
- **Insights**: tasks done this week, day streak, 30-day completion rate, focus time this week, and charts (30-day bars, open tasks by priority, 7-day focus, 12-week heatmap).
- **Settings**: light and dark theme, city for the weather, optional Microsoft To Do sign-in, JSON export and import, reset.
- **Tools**: search with the `/` shortcut (Escape clears it), calculator.

## Getting started

Requires Node.js 20 or newer.

```bash
npm install
npm run dev      # local development at http://localhost:5173
npm run build    # production build in dist/
```

## Data and backups

Data is kept in the browser's localStorage under keys starting with `khatib-dashboard:`. Another browser or cleared site data starts empty. Use **Settings > Export backup** to save a JSON file and **Settings > Import** to restore it. **Reset all data** deletes everything in this browser after a confirmation.

## Weather

Uses the free Open-Meteo API, which needs no key. Set your city in Settings. Requests go straight from the browser to Open-Meteo.

## Microsoft To Do (optional)

1. Register a single-page app in Microsoft Entra ID.
2. Add these redirect URIs exactly as written, including the trailing slash:
   - `http://localhost:5173/`
   - `https://gr33nshadow51234.github.io/dashboard-web/`
3. Grant the delegated Microsoft Graph permissions `User.Read` and `Tasks.ReadWrite`.
4. Put the application (client) ID into `clientId` in `src/lib/config.js`.

Without a client ID, the connect button shows an error. The integration signs you in and lists your To Do lists. It does not sync tasks into the dashboard.

## Deployment (GitHub Pages)

`vite.config.js` sets the production base path to `/dashboard-web/`. The existing `.github/workflows/pages.yml` workflow builds and deploys the app to GitHub Pages on pushes to `main` and on manual runs. In the repository settings under **Pages**, use **GitHub Actions** as the source.

## Project structure

- `src/App.jsx`: shell with navigation, search, theme, calculator and the shared store.
- `src/components/Overview.jsx`: overview page, focus timer and weather card.
- `src/components/Views.jsx`: tasks, notes, links, insights and settings pages.
- `src/components/Charts.jsx`: small SVG charts (bars, donut, heatmap).
- `src/components/Widget.jsx`: shared card wrapper.
- `src/lib/model.js`: data helpers (normalising, dates, streaks, search, calculator).
- `src/lib/weather.js`: Open-Meteo requests and weather codes.
- `src/lib/storage.js`: localStorage access.
- `src/lib/config.js` and `src/lib/msgraph.js`: Microsoft To Do sign-in.

## Notes

- The calculator accepts only digits and basic operators.
- The app runs entirely in the browser. Do not store secrets in it.
