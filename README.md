# Fikr Health International — Sales & Accounts Ledger

A standalone web app for recording daily sales, tracking inventory and
expenses, and generating reports (Naira-based).

Data is saved in the browser's local storage, so it stays on whatever
device/browser it's used on — no account or server needed.

## Run it locally

```bash
npm install
npm run dev
```

Then open the URL it prints (usually http://localhost:5173).

## Deploy it for free (recommended: Vercel)

1. Push this folder to a GitHub repository (or upload it directly — Vercel
   also supports drag-and-drop of a project folder).
2. Go to https://vercel.com, sign up/log in, click **Add New → Project**.
3. Import the repository. Vercel auto-detects Vite — leave the defaults:
   - Build command: `npm run build`
   - Output directory: `dist`
4. Click **Deploy**. You'll get a live URL like
   `fikr-health-ledger.vercel.app` within a minute.

### Alternative: Netlify

1. Go to https://app.netlify.com, sign up/log in.
2. **Add new site → Import an existing project**, connect your repo (or drag
   the `dist` folder after running `npm run build` for a no-git deploy).
3. Build command: `npm run build`, publish directory: `dist`.

## Add it to a phone's home screen

Once deployed, open the URL on a phone:
- **iPhone (Safari):** Share button → "Add to Home Screen"
- **Android (Chrome):** Menu (⋮) → "Add to Home screen"

It'll open full-screen like an app icon.

## Important note on data

Because data lives in the browser's local storage, it is **per device, per
browser**. Sales entered on a phone won't automatically show up on a laptop.
If the team needs shared, synced data across multiple devices/staff, the next
step would be adding a small backend (e.g. Supabase or Firebase) — happy to
help wire that up if you get there.

## Project structure

```
index.html          Entry HTML
src/main.jsx         React entry point
src/App.jsx          The whole app (dashboard, sales, inventory, expenses,
                      customers, reports)
src/storage.js        Local-storage persistence layer
src/index.css         Tailwind setup
```
