# CivicLens Web App

CivicLens is a responsive browser prototype for residents, repair crews, and ward officers. The app rebuilds the supplied screen flows as working web pages with interactive navigation and demo actions.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). Create an account for a quick local demo, or use **Fill demo details** on the sign-in page. Role switching is also available from Profile. `npm run build` creates the production bundle in `dist/`.

## Demo behavior

Reports, community posts, saved reports, and sign-in state are stored in browser local storage. New issue reports require a photo, and report photos remain in local browser storage. Engineer repair-photo uploads move the report into verification. Map filters and sorting, officer review queue tabs, approvals, rejections, report support, and community actions are interactive. Demo data is simulated and is not sent to a public service.

## Optional Supabase connection

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in a local `.env` file to enable browser authentication. Use only the public anon key in the browser. Configure the Supabase auth redirect URL to include `/reset-password`. The demo data remains local; connecting Supabase does not publish reports to a backend.

The files in `assets/screens/` and the original Expo project files are retained as source references. The browser app starts at `/signin`.
