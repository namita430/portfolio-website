# Namita Giri — Full-Stack Portfolio

A full-stack portfolio with a database-backed admin dashboard, so projects, certificates, skills, journey entries,
the resume and site settings can all be managed without editing code.

> **Work in progress.** The backend is complete and tested. The public site and the admin dashboard are written and
> compile, but have not yet been reviewed in a browser. Deployment guides and configuration files are still to come.

## Stack

| Part | Technology |
| --- | --- |
| Frontend (`client/`) | React, Vite, TypeScript, Tailwind CSS, Motion, React Router, React Hook Form, Zod, TanStack Query |
| Backend (`server/`) | Node.js, Express, TypeScript, Zod, Prisma ORM |
| Database | MySQL 8 |
| Files | S3-compatible object storage (Cloudflare R2, Backblaze B2, …); local disk in development only |
| Auth | Server-side sessions in HTTP-only cookies, Argon2id, CSRF tokens, login rate limiting |

## Run it locally

You need Node.js 20+ and a MySQL 8 database.

```bash
# 1. Backend
cd server
cp .env.example .env          # then edit DATABASE_URL, SESSION_SECRET, ...
npm install
npx prisma migrate deploy     # creates the tables
npm run db:seed               # first-run content (only runs on an empty database)
npm run admin:create          # interactive: choose your admin username and password
npm run dev                   # http://localhost:4000

# 2. Frontend (new terminal)
cd client
npm install
npm run dev                   # http://localhost:5173  (admin at /admin)
```

There is no default admin account and no default password; `npm run admin:create` is the only way to create one.

## Tests

```bash
cd server && npm test         # needs a MySQL user that can create the `portfolio_test` database
```

The suite refuses to run against any database whose name does not end in `_test`.

## Security notes

- Secrets live only in environment variables; `.env` files are git-ignored.
- Public API responses contain published content only; every admin route requires a session and a CSRF token.
- Uploads are validated by file signature, extension, declared type and size; images are re-encoded.

## Content policy

The seed data only contains information the owner supplied. Certificates are created as unpublished drafts and cannot
be published until a certificate file or a verification link is attached.

## Legacy static version

The repository root still contains the original static portfolio (plain HTML, CSS and vanilla JavaScript:
`index.html`, `project.html`, `certificates.html`, `projects/`, `css/`, `js/` and `assets/`). It is unchanged and keeps
working exactly as before; its original README is kept in [README-static-site.md](README-static-site.md).

The full-stack version lives in `client/` (React frontend) and `server/` (Express + MySQL API). Once the full-stack
site is deployed, the legacy files can be removed.