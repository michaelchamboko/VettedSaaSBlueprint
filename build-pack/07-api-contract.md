# 07 — API Contract

## Admin APIs

```text
POST /api/admin/products
GET /api/admin/products
GET /api/admin/products/:id
PATCH /api/admin/products/:id

POST /api/admin/affiliate-links
GET /api/admin/affiliate-links
PATCH /api/admin/affiliate-links/:id

POST /api/admin/program-resources
GET /api/admin/program-resources
GET /api/admin/program-resources/:id
POST /api/admin/program-resources/:id/analyze

POST /api/admin/offer-folders
GET /api/admin/offer-folders
GET /api/admin/offer-folders/:id
POST /api/admin/offer-folders/:id/review-destination

POST /api/admin/generation-jobs
GET /api/admin/generation-jobs
GET /api/admin/generation-jobs/:id

GET /api/admin/pages
GET /api/admin/pages/:id
PATCH /api/admin/pages/:id
POST /api/admin/pages/:id/approve
POST /api/admin/pages/:id/publish
POST /api/admin/pages/:id/pause
POST /api/admin/pages/:id/noindex

GET /api/admin/optimization-recommendations
POST /api/admin/optimization-recommendations/:id/approve
POST /api/admin/optimization-recommendations/:id/reject
```

## Hermes APIs

```text
POST /api/hermes/jobs/claim
POST /api/hermes/jobs/:id/heartbeat
POST /api/hermes/jobs/:id/complete
POST /api/hermes/jobs/:id/fail
POST /api/hermes/revalidate-page
```

Hermes endpoints require bearer-token authentication using `HERMES_API_TOKEN`.

## Public Tracking APIs

```text
POST /api/events/page-view
POST /api/events/cta-click
POST /api/events/affiliate-click
POST /api/events/link-error
POST /api/events/faq-expand
```

Tracking APIs must collect only minimal first-party event data and must avoid sensitive personal information.

MVP tracking constraints:

- No third-party analytics or pixels.
- No fingerprinting.
- No raw IP storage.
- Hash/truncate IP only if needed for abuse protection or rough uniqueness.
- Store user-agent/referrer minimally.
- Respect browser `Do Not Track` where practical.
- No cookie banner is required unless tracking expands beyond this model.

## API Error Contract

Responses should use:

```json
{ "error": "Human-readable reason" }
```

Required status behavior:

- `400` invalid input.
- `401` missing/invalid auth.
- `403` authenticated but disallowed action.
- `404` entity not found.
- `409` state transition conflict.
- `500` unexpected server failure.

## Step 2 Security and Storage Follow-Ups

- Rate limiting strategy.
- CSRF protection strategy for admin mutations.
- Tracking expansion consent requirements if future cookies, third-party pixels, newsletter capture, remarketing, or profiling are added.
- File/object storage location for uploaded PDFs, images, and videos if Oracle DB storage is not appropriate for larger files.
