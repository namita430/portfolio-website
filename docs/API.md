# API reference

Base URL: `https://<your-api-host>/api/v1` (locally `http://localhost:4000/api/v1`). All requests and responses are JSON, except file uploads (`multipart/form-data`).

## Conventions

**Success**

```json
{ "success": true, "data": { }, "meta": { "page": 1, "pageSize": 12, "total": 2, "totalPages": 1 } }
```

`meta` is present on paginated lists. `204 No Content` is used for deletes, reorders and logout.

**Error**

```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Some fields are invalid.",
  "details": [ { "path": "title", "message": "This field is required." } ] } }
```

| HTTP | `error.code` | Meaning |
| --- | --- | --- |
| 400 | `BAD_REQUEST` | Malformed JSON, missing upload, … |
| 401 | `UNAUTHENTICATED` | No valid session (or wrong login) |
| 403 | `FORBIDDEN` | Missing/invalid CSRF token, or untrusted `Origin` |
| 404 | `NOT_FOUND` | Unknown route, or record missing **or unpublished** |
| 409 | `CONFLICT` | Duplicate slug/name, or a file that is still in use |
| 413 | `PAYLOAD_TOO_LARGE` | Body > 200 kB (JSON) or file over the size limit |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Upload rejected (type, extension, contents) |
| 422 | `VALIDATION_ERROR` | Body, query or params failed validation; `details` lists fields |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 / 503 | `INTERNAL_ERROR` / `SERVICE_UNAVAILABLE` | Server fault / database unreachable (retry shortly) |

Responses never contain stack traces, SQL, or secrets.

**Authentication.** Admin endpoints use a server-side session carried in an **HTTP-only cookie** (`sid`, or `__Host-sid` in production). The browser cannot read it. State-changing admin requests (`POST`, `PUT`, `PATCH`, `DELETE`) must also send the per-session CSRF token in the `X-CSRF-Token` header (returned by `/auth/login` and `/auth/me`) and, if the browser sends an `Origin` header, it must be one of the server's `FRONTEND_ORIGINS`. Call the API with `credentials: "include"`.

**Caching.** Public `GET`s send `Cache-Control: no-cache` (revalidated with `ETag`), so edits appear immediately. Auth and admin responses are `no-store`.

**Rate limits** (per client IP, in memory, so per API instance): 2000 requests / 15 min overall · login 10 / 15 min · contact form 5 / hour · uploads 120 / hour. Limits are returned in standard `RateLimit-*` headers.

**Dates.** Calendar dates (`issueDate`, `startDate`, `endDate`) are `YYYY-MM-DD`; timestamps are ISO-8601 UTC.

## Public endpoints (no login)

Every public query returns **published content only**. Unpublished records behave as if they do not exist.

| Method & path | Description |
| --- | --- |
| `GET /health` | Liveness. No database access. |
| `GET /health/ready` | Readiness. `503` if MySQL is unreachable. |
| `GET /site` | `{ profile, settings, resume }` — everything the page layout needs. `resume` is `null` unless a resume exists with a valid URL. |
| `GET /skills` | Visible categories with their visible skills (empty categories omitted). |
| `GET /experience` | Published journey entries in display order. |
| `GET /resume` | `{ id, url, mimeType, sizeBytes, originalName, updatedAt }` or `null`. |
| `GET /projects` | Paginated list. Query: `page` (1), `pageSize` (1–100, default 12), `q` (search title/description/tags), `category`, `tag` (tag slug), `featured` (`true`/`false`), `sort` (`order` \| `newest`). |
| `GET /projects/filters` | `{ categories: [{name,count}], tags: [{name,slug,count}] }` for the filter UI. |
| `GET /projects/:slug` | Full project: description, features, challenges, lessons learned, gallery, tags. |
| `GET /certificates` | Query: `page`, `pageSize` (≤100, default 60), `q`, `category`, `featured`. `meta.categories` lists the categories in use. |
| `POST /contact` | Contact form (below). |

### `POST /contact`

```json
{ "name": "Asha Sharma", "email": "asha@example.com", "subject": "Hello", "message": "At least 10 characters…",
  "website": "", "startedAt": 1760000000000, "turnstileToken": "optional" }
```

`name` 2–120 · `email` valid address · `subject` 3–200 · `message` 10–5000. `website` is a **honeypot** and must stay empty; `startedAt` (epoch ms when the form was shown) enables a minimum-fill-time check; `turnstileToken` is required only when the server has `TURNSTILE_SECRET_KEY` set.

Returns `201 { "received": true }` once the message is stored in MySQL. Bot-looking submissions (filled honeypot, filled in under 2.5 s) also get `201` but are silently discarded; more than 3 links is rejected with `422`; an identical message from the same address within 10 minutes is stored once. The notification email (if configured) is sent afterwards and its outcome is recorded on the message (`SENT`, `FAILED`, `NOT_CONFIGURED`) — the response never claims an email was sent.

## Authentication

| Method & path | Description |
| --- | --- |
| `POST /auth/login` | Body `{ username, password }`. `200 { user, csrfToken, expiresAt }` and sets the session cookie. Wrong user, wrong password and a locked account all return the same `401`. 5 failures lock the account for 15 minutes. |
| `GET /auth/me` | The current user and CSRF token, or `401`. Used to restore the session after a page reload. |
| `POST /auth/logout` | Destroys the session on the server and clears the cookie (`204`). |
| `POST /auth/change-password` | Body `{ currentPassword, newPassword }` (12–128 characters). Signs out every other session. Needs CSRF. |

Sessions expire after `SESSION_TTL_HOURS` (default 168 h) or `SESSION_IDLE_HOURS` (default 24 h) without use. Only a SHA-256 hash of the session token is stored.

## Admin endpoints

All under `/admin`, all requiring a valid session; all writes also require `X-CSRF-Token`. `PUT` replaces every editable field of the record (send the whole form). Uploaded files are referenced by the `id` returned from an upload.

### Overview, tags

| Method & path | Description |
| --- | --- |
| `GET /admin/overview` | Counts (published/total), unread messages, `hasResume`, recent activity and messages. |
| `GET /admin/tags` | All tag names (for autocomplete). |

### Projects

| Method & path | Description |
| --- | --- |
| `GET /admin/projects` | Query: `page`, `pageSize` (≤100), `q`, `status` (`all` \| `published` \| `draft`). Includes drafts. |
| `POST /admin/projects` | Create (`201`). Slug is generated from the title if omitted and made unique. New projects go to the top of the order. |
| `GET /admin/projects/:id` | One project, drafts included. |
| `PUT /admin/projects/:id` | Replace. Removed images are deleted from storage unless still used elsewhere. |
| `PATCH /admin/projects/:id/publish` | `{ "isPublished": true }` |
| `PATCH /admin/projects/:id/feature` | `{ "isFeatured": true }` |
| `POST /admin/projects/reorder` | `{ "ids": [3,1,2] }` — the new order (`204`). |
| `DELETE /admin/projects/:id` | Deletes the project and releases its files (`204`). |

Project body:

| Field | Type / rules |
| --- | --- |
| `title` | string 1–160, required |
| `slug` | optional; lowercase letters, digits, single hyphens |
| `tagline` | optional string ≤200 |
| `shortDescription` | 1–320, required |
| `description` | 1–10 000, required |
| `category` | 1–80, required |
| `status` | `CONCEPT` \| `IN_PROGRESS` \| `LIVE_DEMO` \| `COMPLETED` \| `ARCHIVED` |
| `githubUrl`, `liveUrl` | optional; **http(s) only** (`javascript:` etc. rejected) |
| `features` | up to 30 strings ≤300 |
| `challenges` | up to 20 × `{ challenge ≤600, solution ≤1500 }` |
| `lessonsLearned` | optional ≤5000 |
| `publishedAt` | optional `YYYY-MM-DD` (set automatically on first publish) |
| `isFeatured`, `isPublished` | booleans |
| `coverImageId` | optional file id (must be an image) |
| `screenshots` | up to 24 × `{ assetId, altText }`, in display order |
| `tags` | up to 25 names (case-insensitive de-duplication; "Node.js" and "NodeJS" are the same tag) |

### Certificates

Same list/CRUD/reorder/publish/feature routes under `/admin/certificates`. Body: `title`, `issuer`, `category` (required) · `issueDate`, `credentialId`, `verificationUrl` (http/s), `description` · `fileId` (image or PDF), `thumbnailId` (image) · `isFeatured`, `isPublished`.

**Publishing guard:** a certificate cannot be published unless it has a file **or** a verification URL (`422`). Drafts can always be saved.

### Journey

`/admin/experience` (list returns everything, no pagination) with the same CRUD/reorder routes and `PATCH /:id/publish`. Body: `type` (`TRAINING` \| `INTERNSHIP` \| `WORKSHOP` \| `WEBINAR` \| `DEVELOPMENT` \| `LEADERSHIP` \| `EMPLOYMENT` \| `EDUCATION` \| `OTHER`), `title`, `organization` · `role`, `location`, `startDate`, `endDate` (not before start), `isCurrent` (clears the end date), `description`, `documentId`, `tags` (skills learned), `isPublished`.

### Profile, settings

| Method & path | Description |
| --- | --- |
| `GET/PUT /admin/profile` | `fullName`, `titles[]` (1–8), `introduction`, `objective`, `aboutTitle`, `aboutBody`, `aboutHighlights[{label,value}]` (≤8), `location`, `email`, `githubUrl`, `linkedinUrl`, `profileImageId`. |
| `GET/PUT /admin/settings` | `siteTitle`, `siteDescription`, `heroHeadline`, `heroSubtext`, `theme` (`ember` \| `jade` \| `indigo` \| `rose` \| `paper`), `sectionVisibility` (`about`, `skills`, `projects`, `certificates`, `journey`, `contact`), `footerText`, `showResumeButton`. |

### Skills

| Method & path | Description |
| --- | --- |
| `GET /admin/skills` | Categories with all their skills, hidden ones included. |
| `POST /admin/skills/categories` · `PUT/DELETE /admin/skills/categories/:id` · `POST /admin/skills/categories/reorder` | Category `{ name, description, icon, isVisible }`. Deleting a category deletes its skills. |
| `POST /admin/skills` · `PUT/DELETE /admin/skills/:id` · `POST /admin/skills/reorder` | Skill `{ categoryId, name, note, isVisible }`. There are deliberately no proficiency percentages. |

### Resume

| Method & path | Description |
| --- | --- |
| `GET /admin/resume` | Current resume or `null`. |
| `POST /admin/resume` | `multipart/form-data`, field `file` (PDF only). Replaces the previous resume and deletes the old file. |
| `DELETE /admin/resume` | Removes it (`204`). |

### Files

| Method & path | Description |
| --- | --- |
| `POST /admin/uploads` | `multipart/form-data` with text field `purpose` (`PROJECT_COVER`, `PROJECT_IMAGE`, `CERTIFICATE`, `RESUME`, `PROFILE`, `JOURNEY_DOC`) sent **before** the `file` field. Returns `{ id, url, mimeType, sizeBytes, width, height, originalName }`. |
| `DELETE /admin/uploads/:id` | `409` if the file is still referenced; otherwise deletes it. |
| `POST /admin/uploads/cleanup` | Deletes uploads that were never attached to anything (older than an hour). |

Upload rules: PNG, JPEG, WebP images (≤ `UPLOAD_MAX_IMAGE_MB`, default 8) and PDF documents (≤ `UPLOAD_MAX_DOCUMENT_MB`, default 10). The type is detected from the file's leading bytes — the client's file name and MIME type must agree with it. SVG and anything else is refused. Images are re-encoded (EXIF/GPS removed, orientation applied, longest side capped at 1200–2400 px). PDFs containing `/JavaScript`, `/JS` or `/Launch` are refused. Files are stored under random names with `Cache-Control: public, max-age=31536000, immutable`.

### Messages

| Method & path | Description |
| --- | --- |
| `GET /admin/messages` | Query: `page`, `pageSize` (≤50, default 15), `status` (`all` \| `unread` \| `read`), `q`. `meta.unread` is the total unread count. |
| `PATCH /admin/messages/:id` | `{ "isRead": true }` |
| `DELETE /admin/messages/:id` | Permanently deletes the message. |

Message text is stored and returned as plain text; clients must render it as text (the bundled dashboard does).
