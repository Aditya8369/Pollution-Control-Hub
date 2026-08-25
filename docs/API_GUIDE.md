# API Guide

This backend is separate from the Vite frontend — run it on its own:

\`\`\`bash
npm run api-server
\`\`\`

It starts on `http://localhost:5000` (override with `PORT`). On startup it
prints two demo API keys (one `read-only`, one `read-write`) so you can try
the examples below immediately. There is no database yet, so keys and data
reset whenever the server restarts.

## Authentication

Every route under `/api` requires an `x-api-key` header:

\`\`\`bash
curl http://localhost:5000/api/reports \
  -H "x-api-key: <your key>"
\`\`\`

Requests without a valid key get `401 Unauthorized`.

## Key roles

Every API key has a `role`, either:

- **`read-write`** — full access: can call any route, including ones that create or modify data.
- **`read-only`** — can call `GET`/`HEAD`/`OPTIONS` routes only. Any `POST`, `PUT`, `PATCH`, or `DELETE` request is rejected with `403 Forbidden`, even if the route itself would otherwise succeed.

Check which role your key has:

\`\`\`bash
curl http://localhost:5000/api/keys/me \
  -H "x-api-key: <your key>"
\`\`\`
\`\`\`json
{ "role": "read-only", "label": "demo-read-only" }
\`\`\`

## Example: reading data (works with either role)

\`\`\`bash
curl http://localhost:5000/api/reports \
  -H "x-api-key: <your key>"
\`\`\`

## Example: writing data (read-write key required)

\`\`\`bash
curl -X POST http://localhost:5000/api/reports \
  -H "x-api-key: <read-write key>" \
  -H "Content-Type: application/json" \
  -d '{"message": "Heavy smoke near the market", "latitude": 28.6, "longitude": 77.2}'
\`\`\`

## Example: a read-only key attempting to write

\`\`\`bash
curl -X POST http://localhost:5000/api/reports \
  -H "x-api-key: <read-only key>" \
  -H "Content-Type: application/json" \
  -d '{"message": "This should be blocked"}'
\`\`\`
\`\`\`json
{
  "error": "This API key is read-only and cannot perform write operations.",
  "method": "POST",
  "path": "/api/reports"
}
\`\`\`
(HTTP status `403`.)

## Issuing new keys

There's no HTTP endpoint for this yet — for now, generate one from a Node
REPL or a small script:

\`\`\`js
import { createApiKey } from "./server/apiKeys.js";
const key = createApiKey("read-only", "my-external-service");
console.log(key);
\`\`\`