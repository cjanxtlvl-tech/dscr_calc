# VeeCasa DSCR App

Production-ready DSCR loan calculator with lead capture, built with vanilla frontend, Node.js + Express backend, and Docker deployment support.

## Features

- DSCR calculator for rental property analysis
- Qualification bands:
  - `< 1.0` = weak
  - `1.0 - 1.24` = borderline
  - `1.25+` = strong
- Lead capture form with server-side validation
- Lightweight anti-spam controls (honeypot + submit speed check + rate limiting)
- Lead persistence to local JSON file (`backend/data/leads.json`)
- Frontend analytics hooks using `window.dataLayer`
- Automated tests for calculator logic and lead API route
- Dockerized deployment for local, VPS, or cloud hosting

## Project Structure

```text
dscr-app/
  frontend/
    index.html
    styles.css
    app.js
  backend/
    server.js
    routes/
      leads.js
  package.json
  Dockerfile
  docker-compose.yml
  README.md
```

## Run with Docker Compose

From the `dscr-app` directory:

```bash
docker-compose up --build
```

Then open:

- http://localhost:3000

This starts:

- `dscr-app` (Express web app)
- `redis` (persistent rate-limit storage)

## Run without Docker (optional)

```bash
npm install
npm start
```

## Run Tests

```bash
npm test
```

## API: Submit Lead

Endpoint:

- `POST /api/leads`

Example payload:

```json
{
  "firstName": "Alex",
  "lastName": "Investor",
  "email": "alex@example.com",
  "phone": "555-123-4567",
  "loanPurpose": "purchase",
  "propertyType": "single-family",
  "creditScoreRange": "720-759",
  "entityType": "llc"
}
```

## Test Lead Submission

Use your browser form, or run:

```bash
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "firstName":"Alex",
    "lastName":"Investor",
    "email":"alex@example.com",
    "phone":"555-123-4567",
    "loanPurpose":"purchase",
    "propertyType":"single-family",
    "creditScoreRange":"720-759",
    "entityType":"llc"
  }'
```

A successful response returns HTTP 201 and a generated lead ID.

## Anti-Spam Behavior

- Rejects submissions if hidden honeypot field `website` is filled.
- Rejects submissions completed too quickly using `submittedAt` timestamp.
- Limits each client IP to 5 lead submissions per minute.

Rate-limiting storage:

- Uses Redis when `REDIS_URL` is configured.
- Falls back to in-memory storage if Redis is unavailable.

If a client exceeds the limit, the API returns HTTP 429.

## Analytics Events

The frontend sends these events to `window.dataLayer`:

- `calculator_start`
- `calculator_submit`
- `lead_submit`

## Notes

- Lead data is stored locally for now and can later be swapped for a CRM integration.
- Input sanitization and required-field validation are handled both client-side and server-side.
- Dockerfile uses a multi-stage production build on `node:18-alpine`.
