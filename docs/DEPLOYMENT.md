# Deployment guide (free-first)

This guide puts the portfolio online using free tiers, on temporary web addresses first. The custom `.com.np` domain is added later ([DOMAIN.md](DOMAIN.md)); nothing here depends on it.

```
Visitor's browser
   │  HTTPS
   ├──► Netlify ........ the React site (client/)            free
   │       │
   │       └─ API calls ─► Render ........ the Express API (server/)    free (sleeps when idle)
   │                          │
   │                          ├──► Aiven for MySQL ..... the database           free (1 GB)
   │                          ├──► Cloudflare R2 / Backblaze B2 ... uploaded files   free allowance
   │                          └──► Resend (optional) ... "new message" e-mails  free allowance
   └──► file storage (images, PDFs) are loaded directly from the bucket's public URL
```

> **Please read [FREE_TIER.md](FREE_TIER.md) first.** Free tiers have real limits (the API sleeps after 15 minutes without visitors, the database can be powered off when unused, some providers want a payment card on file). Nothing here is guaranteed to stay free forever.

I could not create accounts or deploy from the build environment, so **these steps have not been run end-to-end against real providers**. They follow each provider's current official documentation (linked), but dashboards change: if a button is named differently, look for the closest match. The commands and settings *inside this repository* (build, migrations, seed, start script, production safety checks) were tested locally; where something could only be tested against a mock, it says so.

**Order matters** because each step needs an address from the previous one:
database → file storage → (e-mail) → API → admin account → frontend → connect the two.

---

## 0. Before you start

- Accounts (all have free plans): [GitHub](https://github.com) (you have this), [Aiven](https://aiven.io), [Cloudflare](https://dash.cloudflare.com/sign-up) **or** [Backblaze](https://www.backblaze.com/cloud-storage), [Render](https://render.com), [Netlify](https://www.netlify.com). Optional: [Resend](https://resend.com).
- The code must be in your GitHub repository (branch `main`).
- Install [Node.js 22.12 or newer](https://nodejs.org) locally. You need it once, to create your admin account.
- Never paste passwords or keys into the repository, a chat, or a screenshot. They go **only** into each provider's environment-variable screen.

Generate a strong random secret whenever one is asked for:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

---

## 1. Database — Aiven for MySQL (free plan)

Aiven's free MySQL plan has no time limit and includes 1 CPU, 1 GB RAM and 1 GB disk ([Aiven docs](https://aiven.io/docs/products/mysql/concepts/mysql-free-tier)). Aiven may power off a free service that is unused for a while (it emails you first); you can power it back on in the console.

1. In the [Aiven Console](https://console.aiven.io) create a **MySQL** service on the **Free** plan. Pick a region near the API (you will choose Render's region in step 4; Render's `singapore` is the closest to Nepal).
2. Wait until the service is **Running**, then open its **Overview** page → *Connection information*.
3. Copy the **Service URI**. It looks like `mysql://avnadmin:<password>@<host>:<port>/defaultdb?ssl-mode=REQUIRED`. Use the **port shown there** (it is not 3306).
4. Download the **CA certificate** (`ca.pem`) from the same page.
5. Make the value you will give the API — the URI **without** `?ssl-mode=REQUIRED` (that flag belongs to the `mysql` command-line client, not to Prisma) and with a small connection limit, because free databases allow few connections:

   ```
   DATABASE_URL = mysql://avnadmin:<password>@<host>:<port>/defaultdb?connection_limit=5
   ```

6. **Encrypted connection.** Open `ca.pem` in a text editor; you will paste its whole contents into an environment variable named `DB_CA_CERT` in step 4. The API start script saves it to a file and adds `sslcert=…&sslaccept=strict` to the connection, so the connection is encrypted **and** the server's identity is verified (Prisma documents these options: [MySQL connection arguments](https://www.prisma.io/docs/orm/overview/databases/mysql)).

   > What was tested, and what was not. Against a local MySQL with its own certificate authority I confirmed that the mechanism works: the CA text is written to a file, Prisma loads it, and it performs **full verification including the host name** — so a server whose certificate is issued for a different name is refused (`P1011 … certificate's CN name does not match`), which is the safe behaviour. Pasting the CA with literal `\n` line breaks also works, and the fallback below connects. I had no real Aiven service, so a successful *verified* connection to Aiven itself is unconfirmed; Aiven issues its certificates for the service's own host name, so it should pass.
   >
   > If the API's logs show a certificate error on the first deploy, remove `DB_CA_CERT` and append `&sslaccept=accept_invalid_certs` to `DATABASE_URL` as a temporary fallback (still encrypted, but the server's identity is not checked), and ask your developer to look into it.

No tables need to be created by hand: the API applies the migrations in `server/prisma/migrations` every time it starts (`prisma migrate deploy` — it never drops or resets data).

---

## 2. File storage (images, certificates, resume)

Uploaded files must **not** live on the API server: Render's free disk is wiped on every restart. They go to an S3-compatible bucket; only the file's address and details are saved in MySQL.

Pick **one** option.

### Option A — Cloudflare R2

Free allowance: 10 GB-month storage, 1 million "Class A" and 10 million "Class B" operations per month, and **no egress fees** ([R2 pricing](https://developers.cloudflare.com/r2/pricing/)). Reports say R2 needs a payment method on file even for the free allowance — check at sign-up.

1. Cloudflare dashboard → **R2 Object Storage** → **Create bucket** (e.g. `portfolio-files`).
2. **API token**: R2 overview → *API Tokens* → *Manage* → create a token with **Object Read & Write**, limited to **this one bucket** ([docs](https://developers.cloudflare.com/r2/api/tokens/)). Copy the **Access Key ID** and **Secret Access Key** — the secret is shown only once.
3. Note your **S3 endpoint**: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` (the account ID is on the R2 overview page).
4. **Make files readable**: bucket → *Settings* → *Public Development URL* → *Enable*. You get an address like `https://pub-xxxxxxxx.r2.dev`.
   > Cloudflare states the `r2.dev` address is **rate-limited and for development only** ([docs](https://developers.cloudflare.com/r2/buckets/public-buckets/)). It is fine to get started; for a permanent setup attach your own domain (needs the domain on Cloudflare DNS, see [DOMAIN.md](DOMAIN.md)) or use Option B.
5. Values for step 4:

   ```
   S3_ENDPOINT             = https://<ACCOUNT_ID>.r2.cloudflarestorage.com
   S3_BUCKET               = portfolio-files
   S3_ACCESS_KEY_ID        = <access key id>
   S3_SECRET_ACCESS_KEY    = <secret access key>
   S3_REGION               = auto
   STORAGE_PUBLIC_BASE_URL = https://pub-xxxxxxxx.r2.dev
   ```

### Option B — Backblaze B2

Free: the first 10 GB of storage; downloads are free up to 3× your average stored amount, then $0.01/GB (figures from comparison sites — confirm on [Backblaze's pricing page](https://www.backblaze.com/cloud-storage/pricing); whether a card is needed at sign-up was not confirmed).

1. Create a bucket with **Public** files.
2. Create an **Application Key** limited to that bucket, with read and write access. Copy the *keyID* and *applicationKey* (shown once).
3. On the bucket's page copy the **Endpoint** (for example `s3.us-west-004.backblazeb2.com`). Backblaze's guide says to copy it from there rather than build it by hand ([Backblaze quick-start](https://www.backblaze.com/docs/cloud-storage-developer-quick-start-guide)).
4. Public files can be fetched at `https://<bucket-name>.<endpoint>/<file-name>` (the S3-style URL in the same guide).
5. Values for step 4:

   ```
   S3_ENDPOINT             = https://<endpoint>
   S3_BUCKET               = <bucket-name>
   S3_ACCESS_KEY_ID        = <keyID>
   S3_SECRET_ACCESS_KEY    = <applicationKey>
   S3_REGION               = <the region part of the endpoint, e.g. us-west-004>
   STORAGE_PUBLIC_BASE_URL = https://<bucket-name>.<endpoint>
   ```

**Security model (both options):** the bucket is *publicly readable* (anyone with a file's address can open it — addresses are long random names that are never listed), but *only the API holds the write key*, and that key is limited to this one bucket. Do not put anything private in this bucket. The server checks every upload (real file type from its contents, size, authorisation) before storing it.

> Tested locally against a **mock** S3 endpoint (request format, cache headers, deletes, unsafe-key refusal) — not against a real R2 or B2 bucket.

---

## 3. E-mail alerts (optional)

Every contact-form message is **always saved in MySQL** and visible in the dashboard's *Messages* page. E-mail alerts are an optional extra.

Render's free web services **block outbound SMTP ports 25, 465 and 587** ([Render docs](https://render.com/docs/free)), so Gmail/SMTP will not work there. Use Resend, which sends over HTTPS:

1. Create a [Resend](https://resend.com) account and an **API key** (sending access).
2. Without a verified domain you can use the test sender `onboarding@resend.dev`, which Resend only allows to deliver to **your own Resend account's e-mail address** ([Resend: 403 error](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain)) — exactly what a "new message" alert needs. Free limits: 100 e-mails/day, 3,000/month ([Resend limits](https://resend.com/docs/knowledge-base/resend-sending-limits)).
3. Values for step 4:

   ```
   EMAIL_PROVIDER    = resend
   RESEND_API_KEY    = <your key>
   EMAIL_FROM        = Portfolio <onboarding@resend.dev>
   CONTACT_NOTIFY_TO = <the e-mail address you registered with Resend>
   ```

If sending fails (wrong key, limit reached…), the message is still saved and the dashboard shows "Email alert failed"; the site never claims an e-mail was sent when it was not.

Optional spam protection: create a free [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/plans/) widget (free plan: unlimited verifications, 20 widgets). Put the **secret** key in `TURNSTILE_SECRET_KEY` on the API and the **site** key in `VITE_TURNSTILE_SITE_KEY` on Netlify. Leave both empty to disable it (the honeypot, minimum-fill-time check, link limit and rate limits still apply).

---

## 4. The API — Render

1. In the [Render dashboard](https://dashboard.render.com): **New → Blueprint**, connect your GitHub repository. Render reads [`render.yaml`](../render.yaml) in the repository root and proposes a free web service named `portfolio-api` rooted at `server/`.
2. Render asks for the variables marked "enter a value". Fill in:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | from step 1 |
   | `FRONTEND_ORIGINS` | the Netlify address you will get in step 6. You do not know it yet: enter `https://placeholder.netlify.app` now and fix it in step 7 |
   | `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `STORAGE_PUBLIC_BASE_URL` | from step 2 |

   Already set by the blueprint: `NODE_ENV=production`, `TRUST_PROXY=1`, `SESSION_SECRET` (generated by Render), `SEED_ON_START=true`, `COOKIE_SAMESITE=none`, `STORAGE_DRIVER=s3`, `S3_REGION=auto` (change for Backblaze), `EMAIL_PROVIDER=none`.
3. After creation open the service → **Environment** and add what the blueprint did not ask for: `DB_CA_CERT` (the full contents of `ca.pem`; you may write line breaks as `\n`), and the e-mail variables from step 3 if you want alerts (also change `EMAIL_PROVIDER` to `resend`).
4. Render builds (`npm ci --include=dev && npm run build`) and starts (`npm start`). The start script **applies database migrations**, then — because `SEED_ON_START=true` — fills a **brand-new empty database** with Namita's starter content (profile, skills, SmartBite, Skill Connect Nepal, draft certificates, journey), then starts the API. It does nothing to a database that already has a profile, so your later edits are never overwritten or resurrected.
5. Open `https://<your-service>.onrender.com/api/v1/health/ready`. You should see `{"success":true,"data":{"status":"ready","database":"up"}}`. If the API refuses to start, the log lists exactly which variable is missing or unsafe (for example, it will not start in production with local file storage, a placeholder secret, or non-HTTPS origins).

Free-tier behaviour: the service sleeps after 15 minutes without requests and takes about a minute to wake; the first visitor after a quiet period sees a "waking up the server" message while the site retries automatically. There is no shell on free services — that is why the next step runs on your computer.

---

## 5. Create your admin account

There is **no default account and no default password**. Create yours once, from your computer, against the production database:

```bash
cd server
npm install
```

Then, in **PowerShell** (Windows):

```powershell
$env:DATABASE_URL = "mysql://avnadmin:<password>@<host>:<port>/defaultdb?sslaccept=accept_invalid_certs"
npm run admin:create
```

or in macOS/Linux:

```bash
DATABASE_URL="mysql://avnadmin:<password>@<host>:<port>/defaultdb?sslaccept=accept_invalid_certs" npm run admin:create
```

The script asks for a username and a password (hidden while you type; minimum 12 characters; it is stored only as an Argon2id hash). Close the terminal afterwards so the database address is not left in its history. To change a forgotten password later, run `npm run admin:reset-password` the same way.

---

## 6. The website — Netlify

1. In [Netlify](https://app.netlify.com): **Add new project → Import an existing project → GitHub**, choose the repository. Build settings come from [`netlify.toml`](../netlify.toml): base directory `client`, command `npm run build`, publish directory `dist`, and the single-page-app fallback so refreshing `/projects/smartbite` or `/admin` works.
2. Before the first build, open **Site configuration → Environment variables** and add:

   | Variable | Value |
   | --- | --- |
   | `VITE_API_BASE_URL` | `https://<your-service>.onrender.com/api/v1` |
   | `VITE_SITE_URL` | the site's final address, e.g. `https://<site-name>.netlify.app` (rename the site under *Site configuration → General → Change site name* first; when you add your own domain later, update this to it) |
   | `VITE_TURNSTILE_SITE_KEY` | optional |

   `VITE_` variables are **public** (they end up in the browser). Never put secrets in them.
3. Deploy. The build also writes `robots.txt` (which blocks `/admin`), `sitemap.xml`, and fills in the social-preview tags.

---

## 7. Connect the API to the site

1. Back in Render → **Environment**, set `FRONTEND_ORIGINS` to the exact Netlify address — scheme included, no trailing slash, e.g. `https://<site-name>.netlify.app` (comma-separate several). Save; Render redeploys.
2. Open the Netlify address. The home page should show Namita's content; sign in at `/admin` with the account from step 5.

**About login cookies.** On temporary addresses the site (`*.netlify.app`) and the API (`*.onrender.com`) are different sites, so the session cookie is a *third-party* cookie (`SameSite=None; Secure`). Most browsers allow it, but **Safari and browsers with strict tracking protection may block it**, which shows up as "login succeeds, then you are signed out". Two fixes:
- **Best:** attach your own domain with the API on a subdomain ([DOMAIN.md](DOMAIN.md)) — then everything is same-site and `COOKIE_SAMESITE=lax` works everywhere.
- **Meanwhile:** use the Netlify proxy described in `netlify.toml` (uncomment the `/api/*` rule, set `VITE_API_BASE_URL=/api/v1`, and set `COOKIE_SAMESITE=lax` on Render). Caveat: Netlify gives up on a proxied request after 26 seconds ([Netlify docs](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies)), and a sleeping free Render service can take longer to wake — open the API's health address in another tab first to wake it.

---

## 8. Final checks

Open each of these on the live site and note anything that fails:

- [ ] Home page shows content, with no red errors in the browser console (F12).
- [ ] `/projects`, `/projects/smartbite`, refresh on each (deep links work).
- [ ] `/admin` shows the sign-in page; wrong password is refused; correct password works; reload keeps you signed in; *Sign out* signs you out.
- [ ] Dashboard → *Resume*: upload a PDF → the home page shows a Resume button; open it.
- [ ] Dashboard → *Projects*: create a project with a cover image → it appears publicly; unpublish → it disappears.
- [ ] Contact form: send a test message → it appears under *Messages* (and in your inbox if you set up Resend).
- [ ] In the browser's network tab, uploaded images load from your bucket address over `https://`.
- [ ] `https://<api>/api/v1/admin/projects` opened directly in a new tab returns `401`, never data.

---

## Access and permissions (least privilege)

Work through this once after the first deployment.

| Area | What to do | Why |
| --- | --- | --- |
| **Accounts** | Turn on two-factor authentication (2FA) for GitHub, Netlify, Render, Aiven and Cloudflare/Backblaze. Use a different strong password for each, in a password manager. | These accounts control the site, the database and the files. |
| **Database** | Use the long random password the provider generated. If your plan lets you create extra database users, create one limited to **this one database** and use it in `DATABASE_URL` instead of the provider's all-powerful default user (it needs ordinary read/write plus the right to alter tables, because migrations run when the API starts). Keep TLS on (step 1). If you know a fixed address to allow, restrict connections to it — Render's free tier has no fixed outgoing address, so on the free tier leave the provider's default network rule and rely on the strong password + TLS. | A leaked or guessed database login is the worst-case failure. |
| **File storage** | The API key must be limited to **one bucket** with *Object Read & Write* only — never an account-wide or admin key. Keep the bucket's public setting at "readable" only; never enable public *listing* or public *writing*. Do not store anything private in it. | A leaked key can then only affect these public portfolio files. |
| **Secrets** | Only ever in the hosts' *Environment variables* screens. Never in the repository, in `VITE_…` variables, in screenshots or in chat. If a secret is exposed, revoke it at the provider and create a new one immediately. `SESSION_SECRET` can be replaced at any time (it only hashes visitor IPs; sessions live in the database). | Anything in the repository or a `VITE_` variable is public. |
| **Admin account** | One strong, unique password (12+ characters). Change it under *Dashboard → Account* if you ever sign in on a shared computer. Signing out destroys the session on the server. | The dashboard can change everything on the site. |
| **API** | Keep `FRONTEND_ORIGINS` to exactly your own site addresses. Never add `*` or an address you do not control. | It decides which websites may call the API with your login cookie. |
| **Contact data** | Delete old messages you no longer need (*Messages → Delete*). | They contain visitors' names and e-mail addresses. |

---

## Environment variables reference

### API (`server/.env.example` has the full annotated list)

| Variable | Required | Purpose |
| --- | --- | --- |
| `NODE_ENV` | yes | `production` enables strict checks and the `__Host-` cookie |
| `PORT` | no | Render sets it automatically |
| `DATABASE_URL` | yes | MySQL connection URL (add `?connection_limit=5`) |
| `DB_CA_CERT` | recommended | PEM text of the database provider's CA certificate (verified TLS) |
| `FRONTEND_ORIGINS` | yes | exact site origins allowed to call the API with cookies |
| `TRUST_PROXY` | yes on Render | `1` — number of proxies in front of the API (needed for correct client IPs / rate limits) |
| `COOKIE_SAMESITE` | yes | `none` (different domains) or `lax` (same domain / proxy) |
| `SESSION_SECRET` | yes | ≥32 random characters; used to hash visitor IPs |
| `SESSION_TTL_HOURS`, `SESSION_IDLE_HOURS` | no | 168 / 24 |
| `STORAGE_DRIVER` | yes | `s3` in production (`local` is refused) |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION`, `S3_FORCE_PATH_STYLE` | yes (s3) | bucket access |
| `STORAGE_PUBLIC_BASE_URL` | yes | public address files are served from (`https://`) |
| `UPLOAD_MAX_IMAGE_MB`, `UPLOAD_MAX_DOCUMENT_MB` | no | 8 / 10 |
| `EMAIL_PROVIDER` | no | `none`, `resend` or `smtp` |
| `EMAIL_FROM`, `CONTACT_NOTIFY_TO`, `RESEND_API_KEY`, `SMTP_*` | if e-mail on | notification settings |
| `TURNSTILE_SECRET_KEY` | no | enables the CAPTCHA check |
| `SEED_ON_START` | no | `true` = fill an empty database on start |
| `LOG_LEVEL` | no | `info` |

### Website (`client/.env.example`)

`VITE_API_BASE_URL`, `VITE_SITE_URL`, `VITE_TURNSTILE_SITE_KEY` — all public.

---

## Troubleshooting

| Symptom | Likely cause and fix |
| --- | --- |
| Site shows "Waking up the server…" for a long time | Free API is cold-starting (about a minute) or the database is powered off in the Aiven console. |
| Browser console: *blocked by CORS policy* | `FRONTEND_ORIGINS` does not exactly equal the site's address (check `https`, `www`, trailing slash). Fix in Render and redeploy. |
| Login works then you are signed out immediately | Third-party cookie blocking — see "About login cookies" above. |
| API won't start: *Invalid environment configuration* | The log names the problem; fix that variable. |
| API logs a database certificate error | See the fallback note in step 1. |
| Uploads fail with 5xx | Wrong `S3_*` values, token not scoped to the bucket, or wrong `S3_REGION`. |
| Uploaded images show as broken | `STORAGE_PUBLIC_BASE_URL` is wrong, or the bucket's public access is off. |
| Admin shows "Too many login attempts" | The limit is 10 attempts per 15 minutes per address, and 5 wrong passwords lock the account for 15 minutes. Wait, then retry. |

## Updating, backups, local development

- **Updating:** push to GitHub; Render and Netlify redeploy. Pending migrations are applied automatically on API start. Be aware that Netlify's free plan counts each production deploy against a monthly credit allowance ([FREE_TIER.md](FREE_TIER.md)) — avoid deploying on every tiny change.
- **Backups:** check the backup options in the Aiven console and make your own occasional copy: `mysqldump --single-transaction -h <host> -P <port> -u avnadmin -p defaultdb > backup.sql`. Uploaded files live only in the bucket; keep your own copy of your resume and certificates.
- **Local development:** see the [README](../README.md).
