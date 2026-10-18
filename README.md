# Namita Giri — Full-Stack Portfolio

A premium, database-backed portfolio for **Namita Giri** (Frontend Developer · Full-Stack Developer · Aspiring Software Engineer, Nepal). Everything on the public site — projects, certificates, skills, journey, resume, text and colour theme — is edited from a secure admin dashboard and stored in MySQL, so no code change is ever needed to update it.

| | |
| --- | --- |
| **Public site** | Responsive, accessible, animated (and fully usable with reduced motion): hero with an interactive code-editor visual built from real data, About, Skills, Projects (filter / search / detail pages / galleries), Certificates (filters + accessible lightbox), Journey timeline, Resume (download + preview), Contact form |
| **Admin dashboard** (`/admin`) | Overview · Projects · Certificates · Journey · Profile · Skills · Resume · Messages inbox · Settings (hero text, 5 accessible themes, section visibility, footer) · Account |
| **API** | REST under `/api/v1`, validated with Zod, MySQL via Prisma, S3-compatible file storage |
| **Security** | Argon2id passwords, HTTP-only server-side sessions, CSRF tokens, Origin checks, rate limiting + lockout, Helmet, strict CORS, upload validation by file contents, no secrets in the browser |

## Documentation

| Guide | What is in it |
| --- | --- |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Step-by-step free-first deployment: Aiven MySQL → R2/B2 storage → Render API → Netlify site |
| [docs/DOMAIN.md](docs/DOMAIN.md) | Registering a `.com.np` domain and connecting it (DNS, CORS, cookies, HTTPS) |
| [docs/FREE_TIER.md](docs/FREE_TIER.md) | Every free-tier limit, what can cost money later, and what to monitor |
| [docs/OWNER_CHECKLIST.md](docs/OWNER_CHECKLIST.md) | The things only the owner can do (accounts, content to confirm, domain) |
| [docs/API.md](docs/API.md) | Every endpoint, request/response shape and error code |

## Technology

- **Frontend** (`client/`): React 19, Vite, TypeScript, Tailwind CSS 4, Motion for React, React Router, React Hook Form + Zod, TanStack Query. Fonts are self-hosted (no third-party font requests).
- **Backend** (`server/`): Node.js 22, Express 5, TypeScript, Zod, Prisma ORM, MySQL 8.
- **Hosting plan**: Netlify (site) · Render (API) · Aiven for MySQL (database) · Cloudflare R2 or Backblaze B2 (files) · Resend (optional e-mail alerts).

```
client/    React single-page app (public site + /admin dashboard, lazy-loaded)
server/    Express API, Prisma schema + migrations, seed, CLI scripts, tests
docs/      guides (see above)
netlify.toml   frontend build, SPA fallback, security headers
render.yaml    API blueprint for Render
```

## Run it on your computer

You need **Node.js 22.12 or newer** (the current LTS) and a **MySQL 8** database you can create tables in.

```bash
# 1. Backend
cd server
cp .env.example .env        # then edit DATABASE_URL and SESSION_SECRET (see comments in the file)
npm install
npx prisma migrate deploy   # creates the tables
npm run db:seed             # starter content; only runs on an EMPTY database
npm run admin:create        # asks for your admin username + password (there is no default account)
npm run dev                 # API on http://localhost:4000

# 2. Frontend (a second terminal)
cd client
npm install
npm run dev                 # site on http://localhost:5173 — the dashboard is at /admin
```

In development uploaded files are written to `server/uploads/` (the server refuses to do this in production, where an S3-compatible bucket is required).

Optional sample content for trying the dashboard — everything is labelled `[DEMO]` and removable:

```bash
cd server
npm run seed:demo           # adds sample projects, certificates, journey entries, a skill group, inbox messages
                            # and abstract "DEMO IMAGE" placeholders (never real screenshots)
npm run seed:demo:clear     # removes all of it again, images included (neither command runs in production)
```

## Useful commands

| Where | Command | What it does |
| --- | --- | --- |
| `server` | `npm test` | 171 API tests (needs a MySQL user that can create the `portfolio_test` database; refuses any database not ending in `_test`) |
| `server` | `npm run build` / `npm start` | compile / production start (migrates, optionally seeds, starts) |
| `server` | `npm run db:migrate:dev` | create a new migration after editing `prisma/schema.prisma` |
| `server` | `npm run admin:reset-password` | set a new admin password and sign out all sessions |
| `client` | `npm test` | unit and component tests |
| `client` | `npm run build` | type-check, bundle, then write `robots.txt` / `sitemap.xml` and fill social tags |
| `client` | `node scripts/check-contrast.mjs` | proves every colour theme meets WCAG AA contrast |

## Continuous integration (optional)

[docs/github-actions-ci.yml](docs/github-actions-ci.yml) is a ready-made GitHub Actions workflow that type-checks, tests and builds both packages on every push (with a throw-away MySQL service for the API tests). Copy it to `.github/workflows/ci.yml` to switch it on — GitHub only accepts workflow files from a login with the `workflow` permission (or when you add the file through the GitHub website), which is why it is not already in place. Each of its steps has been run locally from a fresh clone, but the workflow itself has not yet run on GitHub.

## What was verified, and what was not

Run and passing in the build environment: the API test suite (auth, sessions, CSRF/Origin, authorisation of **every** admin route, published-vs-draft visibility, CRUD, upload validation and cleanup, contact form + spam handling, rate limits, security headers/CORS); the client tests; production-mode start-up checks; type-checks and production builds of both packages; and automated browser tests of the public site and admin dashboard in Microsoft Edge (layouts at phone/tablet/desktop widths, keyboard use, sign-in/sign-out, creating/editing/publishing/deleting content, uploads, the contact inbox).

**Not possible to verify here:** a real Cloudflare R2 / Backblaze B2 bucket (the S3 layer was tested against a mock server), a real e-mail provider, a real Aiven database over TLS, deployment to Netlify and Render, and the `.com.np` domain. [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) says exactly where the first live run needs checking.

## Known advisory

`npm audit` in `server/` reports three "high" findings that are one issue: `deepmerge-ts` (stack exhaustion when merging deeply recursive objects) inside the **Prisma 6 command-line tool**. It only runs at build and migration time on this project's own fixed configuration — never on visitor input — so it is not reachable from the website. The clean fix is a major upgrade to Prisma 7 (it needs a different database-driver setup), which is worth scheduling but is not urgent. The client, and the e2e tools, report 0 vulnerabilities.

## Content policy

The seed data contains only information supplied by the owner. Certificates start as unpublished drafts and **cannot be published** until a certificate file or a verification link is attached. There are no skill percentages, invented statistics, testimonials or screenshots; projects without images get a clearly abstract placeholder.

## Legacy static version

The owner's original static portfolio (plain HTML/CSS/JS) is preserved on the `old-static-site` branch.
