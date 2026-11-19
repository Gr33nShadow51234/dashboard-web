# dashboard-web

Personal dashboard built with React and Vite. It includes notes, tasks, quick links, countdowns, a calculator, a theme toggle, local browser storage, and a Microsoft To Do / Graph integration scaffold.

## Run locally
1. Install Node.js (LTS).
2. Run `npm install`.
3. Run `npm run dev` and open the local URL printed by Vite.
4. To build production files, run `npm run build`.

## Microsoft Graph setup
- Register a SPA app in Microsoft Entra.
- Add the local dev redirect URI shown by Vite (usually `http://localhost:5173`).
- Add delegated Graph permissions `User.Read` and `Tasks.ReadWrite`, then grant consent as required by your tenant.
- Put your application (client) ID in `src/lib/config.js`.
- The included code is a basic sign-in/list-tasks scaffold. Full bidirectional sync, Planner routing, task completion sync, and robust token/error handling are not implemented.

## Data
Dashboard items are stored in browser localStorage. Use Settings > Export backup to download a JSON export. Reset removes local items.

## Notes
- The weather widget is a placeholder; no weather API is wired up.
- The calculator uses a character filter but is a convenience widget, not a secure sandbox. Avoid evaluating untrusted expressions.
- Do not store secrets or client secrets in this SPA.
