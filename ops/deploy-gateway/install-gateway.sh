#!/bin/sh
# install-gateway.sh — idempotent install/upgrade of the constrained Production
# Deployment Gateway daemon + client on the canonical host (sabtbrooker).
#
# This is the ONLY supported way to change the gateway daemon. It must run as
# root on the Production host (the daemon itself has no self-update surface).
# Guarded exactly like install-bootstrap.sh: root + host + protected-env
# invariants, then an atomic install of the daemon and client from this repo
# directory, a daemon restart, and a version verification.
set -eu
[ "$(id -u)" -eq 0 ] || { echo "root required" >&2; exit 1; }
[ "$(hostname)" = "sabtbrooker" ] || { echo "unexpected host" >&2; exit 1; }
[ -f /opt/apex-home-fit/.env ] || { echo "canonical deployment files missing" >&2; exit 1; }
[ "$(stat -c '%U:%G:%a' /opt/apex-home-fit/.env)" = "root:root:600" ] || { echo "protected env invariant failed" >&2; exit 1; }
[ -d /var/lib/apex-deploy-gateway ] || { echo "gateway state dir missing — run install-bootstrap.sh first" >&2; exit 1; }
getent group apexdeploy >/dev/null || { echo "apexdeploy group missing" >&2; exit 1; }

DIR="$(dirname "$0")"
install -o root -g root -m 0755 "$DIR/apex_deploy_gateway.py" /usr/local/sbin/apex-deploy-gateway-daemon
install -o root -g root -m 0755 "$DIR/apex-deploy" /usr/local/bin/apex-deploy

# Syntax + offline logic gate before touching the service.
python3 -m py_compile /usr/local/sbin/apex-deploy-gateway-daemon
python3 /usr/local/sbin/apex-deploy-gateway-daemon --self-test >/dev/null

systemctl daemon-reload
systemctl restart apex-deploy-gateway.service
sleep 1
systemctl is-active --quiet apex-deploy-gateway.service || { echo "gateway inactive after upgrade" >&2; exit 1; }
VERSION="$(/usr/local/bin/apex-deploy status | sed -n 's/.*"version": *\([0-9]*\).*/\1/p')"
[ "$VERSION" = "2" ] || { echo "gateway version verification failed (got: $VERSION)" >&2; exit 1; }
echo "{\"status\":\"GATEWAY_INSTALLED\",\"version\":$VERSION}"
