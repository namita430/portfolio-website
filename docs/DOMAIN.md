# Connecting a `.com.np` domain

The site works on its temporary addresses (`*.netlify.app` and `*.onrender.com`) from the first day. A `.com.np` domain is an upgrade you can add whenever it is approved — nothing needs to be rebuilt in advance, and **no domain name is assumed to be available**. Everything below uses placeholders: replace `yourname.com.np` with the name the registry actually approves.

> **Honesty note.** I could not use the registry's website or any provider dashboard from the build environment. The records below come from each provider's official documentation (linked), not from a live setup. The parts I could **not** verify are listed at the end — check those with the registry or provider before relying on them.

---

## 1. Register the domain

`.np` domains are issued by Nepal's official registry at **[register.com.np](https://register.com.np)**. According to the registry's pages, registration under `.np` is free of charge and first-come-first-served, with terms and conditions ([policy](https://register.com.np/registry-policy)).

Steps from the registry's own guide ([how to register](https://register.com.np/how-to-register-np-domain)):

1. Search for the name you want and, if available, choose *Register Now*.
2. Create an account (e-mail + password) and verify your e-mail address.
3. Sign in, complete the form and **attach the required documents**, then wait for approval.

What the registry requires:

- **A personal domain** must be based only on the applicant's own name, proven with a Nepalese citizenship certificate, passport, driving licence or voter's card (or an NRN ID card, or a resident visa for foreign nationals).
- **A company or organisation** may only choose a name based on its own name, product, service or brand, and must provide its registration certificate (other document types apply to foreign entities, unincorporated entities and trademarks).
- Uploaded documents must be images (jpg, png, jpeg, gif or svg) of **at most 800 KB** each.

Approval time is not stated on the registry's guide ("wait for the approval"); third-party sites quote anything from a day to two weeks, so plan for a wait. Renewal and expiry rules are in the registry's terms and conditions, which I could not read — find out how and when the domain must be renewed so it does not lapse.

## 2. Understand how DNS works for `.np`

At the registry you apply for the name and give it **name servers** (they must be proper host names, not IP addresses). Website records — `A`, `CNAME` and so on — are **not** entered at the registry; they live at whichever DNS service your name servers point to.

So you need a DNS host. Two free options:

- **Netlify DNS** — simplest if the site is on Netlify ([Netlify DNS docs](https://docs.netlify.com/manage/domains/set-up-netlify-dns/)).
- **Cloudflare DNS (free plan)** — needed if you also want your own domain for the file bucket (R2 custom domains require the domain to be on Cloudflare) ([Cloudflare: add a domain](https://developers.cloudflare.com/fundamentals/manage-domains/add-site/)).

Whichever you choose, the sequence is: add the domain there → it shows you its name servers → enter those name servers in your register.com.np application/settings → wait for the change to spread (it can take from minutes to 48 hours).

> Not verified: whether Netlify DNS and Cloudflare accept a `.com.np` domain, and exactly where register.com.np lets you enter name servers. Cloudflare requires the domain to sit one level below a public suffix; because `.np` registrations like `yourname.com.np` are normally treated that way, it *should* work, but confirm when you add the domain. If a provider refuses it, ask register.com.np support whether they can host the DNS records for you.

## 3. The records you will need

Use the **API on a subdomain** of the same domain. That makes the site and the API *same-site*, so the login cookie is a normal first-party cookie and works in every browser.

| Name | Points to | Record type | Source |
| --- | --- | --- | --- |
| `www.yourname.com.np` | `<your-netlify-site>.netlify.app` | `CNAME` | [Netlify docs](https://docs.netlify.com/domains-https/custom-domains/configure-external-dns/) |
| `yourname.com.np` (the bare domain) | `apex-loadbalancer.netlify.com` | `ALIAS` (also called `ANAME` / CNAME-flattening) — **or**, if your DNS host has no ALIAS support, an `A` record to `75.2.60.5` | same page |
| `api.yourname.com.np` | `<your-service>.onrender.com` | `CNAME` | [Render docs](https://render.com/docs/configure-other-dns) |

Notes from those docs:

- Never put a `CNAME` on the bare domain (it would block other records such as e-mail).
- Netlify recommends making **`www` the primary domain** when using external DNS; the bare domain can redirect to it.
- Render: remove any `AAAA` records for the domain you connect (Render uses IPv4 only), and remove any default "domain forwarding" your DNS host adds. If you ever put the *bare* domain on Render, Render's docs give an `ALIAS`/`ANAME`, or `A` to `216.24.57.1`; this project does not need that.
- If you use **Netlify DNS** as the DNS host, Netlify creates the `www`/bare-domain records for you when you add the domain to the site; you only add the `api` `CNAME` yourself.
- HTTPS certificates are issued automatically by Netlify and by Render once DNS is correct.

## 4. Add the domain to each service

**Netlify** (frontend): *Site configuration → Domain management → Add a domain*. Enter `www.yourname.com.np`, follow the prompts, choose it as the **primary** domain and add the bare domain so it redirects. Wait for the HTTPS certificate to be issued.

**Render** (API): service → *Settings → Custom Domains → Add Custom Domain* → `api.yourname.com.np`. Add the `CNAME` it asks for and use *Verify*.

## 5. Change the settings that mention addresses

Do these **after** both domains show HTTPS working:

| Where | Setting | New value |
| --- | --- | --- |
| Render → Environment | `FRONTEND_ORIGINS` | `https://www.yourname.com.np,https://yourname.com.np` (keep the old `*.netlify.app` address in the list while you test, then remove it). Origins must match exactly: scheme included, no trailing slash. |
| Render → Environment | `COOKIE_SAMESITE` | `lax` (site and API are now same-site) |
| Netlify → Environment variables | `VITE_API_BASE_URL` | `https://api.yourname.com.np/api/v1` |
| Netlify → Environment variables | `VITE_SITE_URL` | `https://www.yourname.com.np` (used for the canonical link, social preview and sitemap) |

Then **redeploy both** (Render restarts when you save variables; in Netlify use *Deploys → Trigger deploy*). Sign out and in again — old sessions belong to the old address.

Why the cookie works: the session cookie is set by `api.yourname.com.np` (it is `__Host-` prefixed, `Secure`, `HttpOnly`, host-only) and is sent by the browser to that host for requests that come from `www.yourname.com.np`, because the two share the same registrable domain.

### Optional: your own address for uploaded files

If you use Cloudflare R2 and the domain's DNS is on Cloudflare, connect a custom domain to the bucket (bucket → *Settings → Custom Domains*, e.g. `files.yourname.com.np`) and set `STORAGE_PUBLIC_BASE_URL=https://files.yourname.com.np` on the API ([docs](https://developers.cloudflare.com/r2/buckets/public-buckets/)). Cloudflare says the free `r2.dev` address is for development only, so this is the recommended permanent setup. Files already uploaded keep their old addresses stored in the database; either keep the `r2.dev` address working too, or re-upload the files after the change.

## 6. Check it

- `https://api.yourname.com.np/api/v1/health/ready` shows `"database":"up"`.
- `https://www.yourname.com.np` loads without console errors; `/admin` sign-in works and survives a reload.
- `http://` addresses redirect to `https://`.
- The sitemap at `/sitemap.xml` lists the new address.

## What I could not verify

- How long register.com.np takes to approve an application, what renewal involves, and whether its site is currently reachable (third-party pages reported outages in the past).
- Where in register.com.np you enter name servers, and whether they allow any DNS record hosting themselves.
- Whether Netlify DNS or Cloudflare accept a `.com.np` zone.
- Real propagation and certificate timings.
