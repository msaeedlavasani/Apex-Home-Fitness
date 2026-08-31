#!/bin/sh
set -eu
[ "$(id -u)" -eq 0 ] || { echo "root required" >&2; exit 1; }
[ "$(hostname)" = "sabtbrooker" ] || { echo "unexpected host" >&2; exit 1; }
[ -f /var/lib/apex-deploy-gateway/proof-pre-hardening.json ] || { echo "pre-hardening release proof missing" >&2; exit 1; }
[ -f /var/lib/apex-deploy-gateway/rollback-verified ] || { echo "rollback proof missing" >&2; exit 1; }
systemctl is-active --quiet apex-deploy-gateway.service || { echo "gateway inactive" >&2; exit 1; }
[ -S /run/apex-deploy-gateway/gateway.sock ] || { echo "gateway socket missing" >&2; exit 1; }
rm -f /etc/sudoers.d/apexadmin
gpasswd -d apexadmin docker >/dev/null 2>&1 || true
visudo -c >/dev/null
echo '{"status":"LEGACY_PRIVILEGES_REVOKED","reconnect_required":true}'
