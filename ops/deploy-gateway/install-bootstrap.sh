#!/bin/sh
set -eu
[ "$(id -u)" -eq 0 ] || { echo "root required" >&2; exit 1; }
[ "$(hostname)" = "sabtbrooker" ] || { echo "unexpected host" >&2; exit 1; }
[ "$(stat -c '%U:%G:%a' /opt/apex-home-fit/.env)" = "root:root:600" ] || { echo "protected env invariant failed" >&2; exit 1; }
getent group apexdeploy >/dev/null || groupadd --system apexdeploy
usermod -a -G apexdeploy apexadmin
install -d -o root -g apexdeploy -m 0750 /var/lib/apex-deploy-gateway
install -o root -g root -m 0755 "$(dirname "$0")/apex_deploy_gateway.py" /usr/local/sbin/apex-deploy-gateway-daemon
install -o root -g root -m 0755 "$(dirname "$0")/apex-deploy" /usr/local/bin/apex-deploy
touch /var/log/apex-deploy-gateway.log; chown root:root /var/log/apex-deploy-gateway.log; chmod 0600 /var/log/apex-deploy-gateway.log
cat >/etc/systemd/system/apex-deploy-gateway.service <<'EOF'
[Unit]
Description=Apex Home Fit constrained Production deployment gateway
After=docker.service network-online.target
Requires=docker.service
[Service]
Type=simple
ExecStart=/usr/local/sbin/apex-deploy-gateway-daemon
User=root
Group=apexdeploy
RuntimeDirectory=apex-deploy-gateway
RuntimeDirectoryMode=0750
NoNewPrivileges=yes
PrivateTmp=yes
ProtectHome=yes
ProtectSystem=full
ReadWritePaths=/opt/apex-home-fit /var/lib/apex-deploy-gateway /var/log /run/apex-deploy-gateway
[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now apex-deploy-gateway.service
systemctl is-active --quiet apex-deploy-gateway.service
echo '{"status":"BOOTSTRAP_INSTALLED","legacy_privileges":"PRESERVED_PENDING_PROOF"}'
