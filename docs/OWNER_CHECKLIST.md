# Owner checklist — what only you can do

Everything below needs *your* accounts, documents or knowledge, so it cannot be done for you. Tick each box as you go.

## A. Accounts to create (all free to start)

- [ ] **GitHub** — you already have one (`namita430`).
- [ ] **Aiven** — database ([step 1](DEPLOYMENT.md#1-database--aiven-for-mysql-free-plan)).
- [ ] **Cloudflare** (R2 storage) **or Backblaze** (B2 storage) — uploaded files ([step 2](DEPLOYMENT.md#2-file-storage-images-certificates-resume)). *Cloudflare may ask for a payment card even for the free allowance — decide whether you are comfortable with that, or use the alternative.*
- [ ] **Render** — runs the API ([step 4](DEPLOYMENT.md#4-the-api--render)).
- [ ] **Netlify** — hosts the website ([step 6](DEPLOYMENT.md#6-the-website--netlify)).
- [ ] *(optional)* **Resend** — "new message" e-mail alerts; **Cloudflare Turnstile** — CAPTCHA.

Keep every password and key in a password manager. They go only into the providers' *Environment variables* screens — never into GitHub, chat or screenshots. If a key is ever exposed, delete it at the provider and create a new one.

## B. Secrets and settings to set yourself

- [ ] Strong `SESSION_SECRET` (Render generates one from `render.yaml`; keep it).
- [ ] `DATABASE_URL`, the file-storage keys, and `FRONTEND_ORIGINS` (exact site address) on Render.
- [ ] `VITE_API_BASE_URL` and `VITE_SITE_URL` on Netlify.
- [ ] Decide the e-mail alert setup (or leave `EMAIL_PROVIDER=none`; messages are still saved).

## C. Your admin account

- [ ] Run `npm run admin:create` against the production database ([step 5](DEPLOYMENT.md#5-create-your-admin-account)). Use a long, unique password (12+ characters). There is no default account.
- [ ] Sign in at `/admin`, then open *Account* and confirm it works.

## D. Content only you can confirm (nothing was invented — these need your input)

- [ ] **Skill Connect Nepal link.** The GitHub address `github.com/namita430/Skill-Connect-Nepal` returned *404 Not Found* when it was checked (private or renamed?). Fix it in *Projects* or make the repository public. Also confirm the project's **status** (currently "In progress", which was a guess).
- [ ] **SmartBite** — confirm the description and status; add **real screenshots** (not mock-ups). Your old site's README says its images were illustrative mock-ups: do not upload those as screenshots.
- [ ] **Skills.** React is **not** listed because it was marked "if confirmed". Add it under *Skills* if you want it shown.
- [ ] **Certificates.** Five drafts were created from the programmes you named. For each one, attach the real certificate file (PDF/image) or a verification link, check the title/issuer/date, then publish. The site refuses to publish a certificate with neither. Add your MERN webinar certificates if you have them.
- [ ] **Journey.** Four entries were created without dates. Add dates only if you are sure of them.
- [ ] **Resume.** Upload your current resume under *Resume*. (Your previous resume is in the old site's history: branch `old-static-site`, file `assets/resume/`.)
- [ ] **About text and highlights** in *Profile* — it was drafted from the facts you gave; rewrite it in your own voice.
- [ ] **Profile photo** (optional) — the site looks good without one.
- [ ] **Settings** — pick a colour theme, check the hero text and footer.
- [ ] Remove any `[DEMO]` sample content in your own database: `npm run seed:demo:clear` (local) — demo data is never created in production.

## E. Domain (`.com.np`)

- [ ] Apply at [register.com.np](https://register.com.np) with the documents it asks for ([DOMAIN.md](DOMAIN.md#1-register-the-domain)).
- [ ] Choose a DNS host (Netlify DNS or Cloudflare) and give its name servers to the registry.
- [ ] Add the domain in Netlify and Render, then update `FRONTEND_ORIGINS`, `COOKIE_SAMESITE`, `VITE_API_BASE_URL` and `VITE_SITE_URL` ([DOMAIN.md §5](DOMAIN.md#5-change-the-settings-that-mention-addresses)).
- [ ] Write down the renewal date and any renewal requirements.

## F. Privacy and legal

- [ ] The contact form stores visitors' names, e-mail addresses and messages in your database. Consider adding a short privacy note to the site, and delete old messages you no longer need (*Messages → Delete*).
- [ ] Only publish certificates, logos and screenshots you have the right to show.

## G. Before you announce the site

- [ ] Run the checks in [DEPLOYMENT.md §8](DEPLOYMENT.md#8-final-checks) on the live address, on a phone and a laptop.
- [ ] Send yourself a test message through the contact form.
- [ ] Open the site in a private/incognito window and in Safari if you can (cookie behaviour differs).
- [ ] Share the link with one friend and ask them to try the site and the contact form.

## H. Ongoing

- [ ] About once a month: check Netlify, Render and Aiven usage ([FREE_TIER.md](FREE_TIER.md)); make sure the Aiven database has not been powered off.
- [ ] Occasionally back up the database and keep your own copies of your files.
- [ ] Update your resume and journey as you grow — everything is editable from the dashboard, no code needed.
