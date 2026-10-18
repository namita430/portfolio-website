# Free-tier limits and possible future costs

*Checked against each provider's own documentation or pricing page in October 2026. Prices and allowances change — confirm before you rely on a number. Where only third-party sites gave a figure, it is marked "(third-party)".*

**Nothing here is promised to be free forever.** Free tiers can be shrunk, paused or withdrawn, and a few of them ask for a payment card on file. The site is designed so that you can move any single piece to another provider (the storage layer is plain S3, the database is standard MySQL, the API is a normal Node app).

## Summary

| Piece | Service | What is free | What to watch |
| --- | --- | --- | --- |
| Website (React) | **Netlify Free** | $0 plan with a monthly **credit** allowance (300) | Each production deploy and each GB of bandwidth uses credits; if they run out your sites pause. |
| API (Express) | **Render Free** web service | 750 instance-hours/month, custom domain + TLS | Sleeps after 15 min idle (≈1 min to wake), no persistent disk, no shell, outbound SMTP blocked. |
| Database | **Aiven for MySQL, Free plan** | 1 CPU · 1 GB RAM · 1 GB disk, no time limit | May be powered off if unused; 1 GB is the hard ceiling. |
| Files | **Cloudflare R2** | 10 GB-month, 1 M writes + 10 M reads/month, no egress fee | Card on file reportedly needed; `r2.dev` URL is for development only. |
| | *or* **Backblaze B2** | first 10 GB; downloads free up to 3× stored size (third-party) | Card requirement unconfirmed. |
| E-mail alerts | **Resend Free** (optional) | 100 e-mails/day, 3,000/month | Test sender only reaches your own address; a verified domain is needed for others. |
| CAPTCHA | **Cloudflare Turnstile** (optional) | free, unlimited verifications | 20 widgets per account. |
| Code | **GitHub** | free public repositories | — |
| Domain | **register.com.np** | free of charge per the registry's policy | Needs identity/organisation documents; approval takes time; renewal terms unverified. |

## Details

### Netlify (frontend)

- Accounts created after September 2025 are on a **credit-based** free plan: the pricing page shows a *300 credit limit* and lists *15 credits per production deploy*, *20 credits per GB of bandwidth*, *10 credits per GB-hour of compute* and *2 credits per 10,000 web requests* ([pricing](https://www.netlify.com/pricing/)). Third-party summaries disagree on some rates and say that on the free plan exhausted credits pause every site on the account until the next billing cycle (third-party).
- Practical meaning: roughly **20 production deploys a month** would use the whole allowance on their own. Do not deploy on every small change — batch your edits. Content changes made in the admin dashboard do **not** need a deploy at all.
- Older accounts (created before September 2025) may still be on the previous plan with 100 GB bandwidth / 300 build minutes (third-party) — check your account's *Billing* page.
- Custom domains and HTTPS are included.

### Render (API)

From [Render's free-tier documentation](https://render.com/docs/free):

- A free web service **spins down after 15 minutes** without traffic and takes about **one minute** to start again. The site tells visitors it is "waking up" and retries for about 90 seconds.
- **750 free instance-hours per workspace per month**; when they are used up all free web services are suspended until next month.
- The local disk is wiped on every restart or redeploy — which is why uploads go to a bucket.
- **No shell access**, one instance only, and **outbound ports 25, 465 and 587 are blocked** (so SMTP e-mail cannot work; the project uses Resend over HTTPS).
- Outbound bandwidth and build minutes are metered against an included amount that the page does not state; without a payment method, exceeding them suspends free services or disables new builds.
- Custom domains and managed TLS are supported on free services.

### Aiven for MySQL (database)

From [Aiven's documentation](https://aiven.io/docs/products/mysql/concepts/mysql-free-tier): a free MySQL service has no time limit and includes one node with 1 CPU, 1 GB RAM and **1 GB of disk**, monitoring and backups. Aiven reserves the right to shut down services that are unused for some time (you are notified, and can power it back on). A text-heavy portfolio uses a few megabytes, so 1 GB is ample — files never go in the database.

### Cloudflare R2 or Backblaze B2 (files)

- **R2**: 10 GB-month of storage, 1 million Class A (write/list) and 10 million Class B (read) operations per month, and no egress charges ([pricing](https://developers.cloudflare.com/r2/pricing/)). Beyond that: $0.015/GB-month and $4.50 per million Class A / $0.36 per million Class B. Reports (not Cloudflare's own page) say a payment method must be on file even to use the free allowance. The free **`r2.dev` public address is documented as rate-limited and for development only**; for a permanent setup use a custom domain on Cloudflare DNS ([docs](https://developers.cloudflare.com/r2/buckets/public-buckets/)).
- **B2**: the first 10 GB is free and egress is free up to 3× your average stored amount, then $0.01 per GB (third-party figures). Public buckets serve files without authentication ([Backblaze docs](https://www.backblaze.com/docs/cloud-storage-developer-quick-start-guide)). Check the sign-up page for card requirements.
- The upload limits the site enforces (8 MB per image, 10 MB per PDF) keep a portfolio far below 10 GB.

### Resend (optional e-mail)

Free accounts: **100 e-mails/day and 3,000/month** ([limits](https://resend.com/docs/knowledge-base/resend-sending-limits)). Without a verified domain the test sender `onboarding@resend.dev` can only deliver to the e-mail address of your own Resend account ([docs](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain)) — enough for "you have a new message" alerts. Messages are saved in MySQL either way.

## What could cost money later

| Trigger | What happens | Cheapest remedy |
| --- | --- | --- |
| Many visitors, or many Netlify deploys | Netlify credits run out; sites pause | Deploy less often; upgrade the plan (check current price). |
| You want the API always awake | Free API sleeps after 15 min | Move the API to a paid always-on instance (check Render's current price), or accept the one-minute first load. |
| Database grows past 1 GB or must never power off | Aiven free ceiling / auto power-off | Upgrade the Aiven plan (it has a paid "developer" tier — check current pricing) or move to another MySQL host. |
| Heavy file traffic | R2/B2 free operations or egress allowance exceeded | Small per-GB charges (figures above). Compress images; keep the number of uploads sensible. |
| More than 100 contact e-mails a day | Resend stops sending that day | Messages are still stored; upgrade Resend or turn alerts off. |
| Domain renewal | The registry may require renewal | See the registry's terms. |

## Keeping an eye on it

- Look at Netlify (*Billing → usage*), Render (*Billing*) and the Aiven console about once a month.
- Keep your own copy of the database (`mysqldump`, see [DEPLOYMENT.md](DEPLOYMENT.md)) and of your resume/certificate files.
- Put a reminder in your calendar for the domain's renewal date.
