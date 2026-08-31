# Pitfall: Standalone Next.js Rebuilds `request.url` From HOSTNAME/PORT, Breaking Same-Origin Checks Behind a Proxy

- **STATUS:** CLOSED / documented lesson
- **RELATED INCIDENT:** ADMIN-AUTH-PROD-01

## Lesson

In a self-hosted Next.js standalone deployment the server builds `request.url`
from the container `HOSTNAME`/`PORT` env
(`next-server.js` `attachRequestMeta`): with `HOSTNAME=0.0.0.0` and
`PORT=3000` every request URL becomes `https://0.0.0.0:3000/...`. A
same-origin check that compares the browser `Origin` header to
`new URL(request.url).origin` therefore rejects every real-browser POST
(observed: `403 invalid_request` on `/api/admin/login`) even though the proxy
correctly forwards `Host` and `X-Forwarded-Proto`. The `trustHostHeader`
config branch is unreachable while `HOSTNAME`/`PORT` are set. Localhost
CI/E2E pass because the dev-server origin matches `request.url`.

## Rules

- Do not compare browser `Origin`/`Referer` only against `request.url`'s
  origin in proxy deployments. Accept the configured public site origin
  (`NEXT_PUBLIC_SITE_URL`, read at runtime from the container env) and its
  `www.` variant as an explicit allowlist — never the default fallback domain.
- Verify CSRF posture with a real browser through the actual public HTTPS
  surface, not only HTTP 200 / localhost; HTTP 200 is not browser acceptance
  (`HTTP-200-IS-NOT-BROWSER-ACCEPTANCE.md`).
