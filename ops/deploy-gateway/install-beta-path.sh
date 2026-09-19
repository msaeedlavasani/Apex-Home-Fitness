#!/bin/sh
# Install the repository-owned Beta Compose topology without restarting any
# service. The next Beta gateway release performs the controlled image switch.
set -eu
[ "$(id -u)" -eq 0 ] || { echo "root required" >&2; exit 1; }
[ "$(hostname)" = "sabtbrooker" ] || { echo "unexpected host" >&2; exit 1; }
[ "$(stat -c '%U:%G:%a' /opt/apex-home-fit/.env)" = "root:root:600" ] || { echo "Production protected env invariant failed" >&2; exit 1; }
[ -f /opt/ahf-beta/.env ] || { echo "Beta environment missing" >&2; exit 1; }
[ "$(stat -c '%U:%G:%a' /opt/ahf-beta/.env)" = "root:root:600" ] || { echo "Beta protected env invariant failed" >&2; exit 1; }

DIR="$(dirname "$0")"
install -d -o root -g root -m 0755 /opt/ahf-beta
if [ -f /opt/ahf-beta/compose.yml ] && [ ! -f /opt/ahf-beta/compose.yml.pre-canonical-beta ]; then
  install -o root -g root -m 0600 /opt/ahf-beta/compose.yml /opt/ahf-beta/compose.yml.pre-canonical-beta
fi
install -o root -g root -m 0644 "$DIR/beta-compose.yml" /opt/ahf-beta/compose.yml

docker compose -f /opt/ahf-beta/compose.yml config --format json | python3 -c '
import json, sys
c = json.load(sys.stdin)
services = c.get("services", {})
app = services.get("app", {})
migrate = services.get("migrate", {})
if app.get("image") != "ahf-home-fit:beta-current": raise SystemExit("Beta app image invariant failed")
if migrate.get("image") != "ahf-home-fit:beta-migrate-current": raise SystemExit("Beta migrate image invariant failed")
if "127.0.0.1:3100" not in json.dumps(app.get("ports", [])): raise SystemExit("Beta port invariant failed")
for service in (app, migrate):
    if not any(v.get("source") == "ahf_beta_db" and v.get("target") == "/data" for v in service.get("volumes", [])): raise SystemExit("Beta volume invariant failed")
if "apexhomefit_prod_db" in json.dumps(c) or "127.0.0.1:3000" in json.dumps(c): raise SystemExit("Production boundary appeared in Beta topology")
print("BETA_COMPOSE_PASS")
'
nginx -t >/dev/null
nginx -T 2>/dev/null | grep -q 'server_name beta.apexhomefit.ir'
echo '{"status":"BETA_PATH_INSTALLED","restarted_services":[]}'
