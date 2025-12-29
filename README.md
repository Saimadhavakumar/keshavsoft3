# TaskFlow — Local Task Manager

A small client-side task management app with individual screens and CRUD, stored in `localStorage`.

Files
- [TaskFlow UI](Task3/index.html)
- Styles: [TaskFlow CSS](Task3/app.css)
- Logic: [TaskFlow JS](Task3/app.js)

Quick start

- Open `TaskFlow/index.html` in your browser (double-click or `File -> Open`).
There are two modes: static-only (no backend) or with the built-in Node + SQLite backend.

Run with backend (recommended)

1. Open PowerShell in the `Task3` folder.
2. Install dependencies and start server:

```powershell
npm install
npm start
```

This starts an Express server and serves the frontend on http://localhost:5173 — the app will persist tasks into a local SQLite DB (`taskflow.db`).

Quick static-only (no server)

You can still open `index.html` directly for quick testing, but some browsers require a static server for module and fetch features.

Notes
- Backend: `server.js` provides a small REST API and serves static files.
- Data is stored in `taskflow.db` next to the project.
- Next steps: add auth, remote sync, and advanced filters.
