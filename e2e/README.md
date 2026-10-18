# Browser tests (end-to-end)

Real-browser tests that drive the running site and dashboard with [Playwright](https://playwright.dev) and an **already installed Chrome, Edge or Chromium** (no browser download needed).

| Script | What it checks | Changes data? |
| --- | --- | --- |
| `npm run test:public` | The public pages at phone / tablet / desktop widths: no horizontal overflow, one `<h1>` per page, images have `alt`, links and buttons have names, skip link, keyboard control of the hero code window, anchor navigation, mobile menu, reduced motion, theme switching | no |
| `npm run test:a11y` | [axe-core](https://github.com/dequelabs/axe-core) WCAG 2.0/2.1 A + AA audit of every public page in **all five themes**, the phone layout, and (with credentials) **every dashboard page** | no |
| `npm run test:admin` | The whole dashboard: sign-in/out, session cookie, CRUD, uploads, publish/unpublish rules, the certificate publishing guard, reordering, preview, settings, resume, contact form → inbox | **yes** |

Automated accessibility tools find only part of the problems; they do not replace a manual keyboard and screen-reader check.

## Run them

1. Start the stack (database, then `cd server && npm run dev`, then `cd client && npm run dev`).
2. Create a throw-away admin account on the **development** database: `cd server && npm run admin:create`.
3. Then:

```bash
cd e2e
npm install
# PowerShell:  $env:E2E_ADMIN_USER="…"; $env:E2E_ADMIN_PASSWORD="…"
# macOS/Linux: export E2E_ADMIN_USER=… E2E_ADMIN_PASSWORD=…
npm run test:public
npm run test:a11y
npm run test:admin
```

| Variable | Purpose |
| --- | --- |
| `E2E_BASE_URL` | site address (default `http://localhost:5173`) |
| `E2E_ADMIN_USER`, `E2E_ADMIN_PASSWORD` | dashboard login (needed by the admin and the admin part of the a11y test) |
| `E2E_BROWSER` | path to Chrome/Edge/Chromium if it is not found automatically |
| `E2E_ALLOW_REMOTE=1` | allow the data-changing admin test against a non-local address (use only on a throw-away deployment) |

**Testing the production build instead of the dev server.** Run `cd client && npm run build && npm run preview` (serves on port 4173) and set `E2E_BASE_URL=http://localhost:4173`. Add `http://localhost:4173` to `FRONTEND_ORIGINS` in `server/.env` first and restart the API — otherwise sign-in is refused with `403`, because the API only accepts requests from the origins it is told to trust.

**Safety.** `test:admin` creates and deletes content, briefly changes the theme, section visibility and profile (restoring them), uploads and removes a resume, and sends a message through the contact form. It refuses to run against a non-local address, and it stops early if it finds leftovers from a previous failed run (records whose names start with `E2E`).

**Rate limits.** The API limits sign-ins to 10 per 15 minutes per address and `test:admin` signs in 3 times, so avoid running it more than three times in 15 minutes (restart the dev API to reset the counters).

Screenshots and failure screenshots are written to `e2e/screenshots/` (git-ignored).
