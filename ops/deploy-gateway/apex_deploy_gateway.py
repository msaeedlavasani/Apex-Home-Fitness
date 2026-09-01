#!/usr/bin/env python3
"""Root-only Apex Home Fit deployment daemon; emits sanitized JSON only.

V2 (GOVERNED-PROD-DB-CAPABILITY-01): adds the bounded `db-operation` action —
read-only Production DB inspection/dry-run evidence plus explicitly authorized,
dry-run-gated DB_CHANGED=YES backfill/migration execution. The existing
`release` / `verify-rollback` / `status` contract is unchanged. See
docs/PRODUCTION_DEPLOYMENT_GATEWAY.md §db-operation and
docs/architecture/GOVERNED-DB-MUTATION-01.md.
"""

from __future__ import annotations
import hashlib, json, os, re, secrets, shutil, socket, struct, subprocess, tarfile, tempfile, time, urllib.request
from datetime import datetime, timezone
from pathlib import Path

HOST = "sabtbrooker"
REPO = "msaeedlavasani/Apex-Home-Fitness"
ROOT = Path("/opt/apex-home-fit")
COMPOSE = ROOT / "compose.yml"
ENV_FILE = ROOT / ".env"
STATE = Path("/var/lib/apex-deploy-gateway")
SOCKET = Path("/run/apex-deploy-gateway/gateway.sock")
AUDIT = Path("/var/log/apex-deploy-gateway.log")
VOLUME = "apexhomefit_prod_db"
PRISMA = "6.19.3"
BASE_DIGEST = "sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32"
GATEWAY_VERSION = 2
REQUEST_KEYS = {"action", "schema_version", "release_id", "source_sha", "expected_current_image", "db_change", "phase", "operation_id", "mode", "dry_run_evidence_sha"}
ACTIONS = ("status", "release", "verify-rollback", "db-operation")
DB_OP_MODES = ("dry-run", "apply", "rehearsal")
# Bounded operation allowlist. Each entry maps an operation identity to the
# allowlisted runner inside the repository archive at the authoritative SHA.
# The caller can only select an identity; the daemon executes the checked-in
# script/command. No arbitrary SQL, shell, Docker, or compose is ever accepted.
OPERATION_ALLOWLIST = {
    "s02e-exercise-identity-backfill": {
        "kind": "script",
        "path": "scripts/gateway-db-ops/s02e-exercise-identity-backfill.mjs",
    },
    "prisma-migrate-deploy": {
        "kind": "migrate",
        "path": None,
    },
}


class GateError(RuntimeError):
    pass


def run(args, *, cwd=None, quiet=True):
    # Always capture so failures carry a diagnosable head+tail (streamed output
    # is not required for the short bounded commands the gateway runs). The
    # full captured output is also printed to the daemon stderr (systemd
    # journal) for root forensics.
    result = subprocess.run(args, cwd=cwd, text=True, capture_output=True, check=False)
    if result.returncode:
        output = ((result.stderr or "") + (result.stdout or "")).strip()
        lines = [line for line in output.splitlines() if line.strip()]
        head = " | ".join(lines[:20])[:1500]
        tail = " | ".join(lines[-20:])[:1500]
        detail = ("; HEAD: " + head + " ; TAIL: " + tail) if lines else ""
        print(f"[gateway] command failed: {' '.join(args)}\n{output}", flush=True)
        raise GateError(f"allowlisted command failed: {Path(args[0]).name}{detail}")
    return result.stdout.strip() if quiet else ""


def audit(event, release="-"):
    with AUDIT.open("a", encoding="utf-8") as handle:
        handle.write(f"{time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())} event={event} release={release}\n")


def base_guard():
    if os.geteuid() != 0 or run(["/usr/bin/hostname"]) != HOST:
        raise GateError("host/root invariant failed")
    if not COMPOSE.is_file() or not ENV_FILE.is_file():
        raise GateError("canonical deployment files missing")
    st = ENV_FILE.stat()
    if st.st_uid != 0 or st.st_mode & 0o077:
        raise GateError("protected environment invariant failed")


def env_values():
    values = {}
    for raw in ENV_FILE.read_text(encoding="utf-8").splitlines():
        if not raw.strip() or raw.lstrip().startswith("#") or "=" not in raw:
            continue
        key, value = raw.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    for key in ("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SITE_URL"):
        if not values.get(key):
            raise GateError(f"required configuration absent: {key}")
    return values


def compose_image():
    match = re.search(r"(?m)^\s+image:\s+(apex-home-fit:[A-Za-z0-9_.-]+)\s*$", COMPOSE.read_text())
    if not match:
        raise GateError("canonical compose image invariant failed")
    return match.group(1)


def validate_request(req):
    if not isinstance(req, dict) or set(req) - REQUEST_KEYS:
        raise GateError("unknown request fields")
    if req.get("schema_version") != 1:
        raise GateError("unsupported request schema")
    if req.get("action") not in ACTIONS:
        raise GateError("unsupported action")
    if req["action"] == "status":
        return
    if req["action"] == "db-operation":
        if req.get("operation_id") not in OPERATION_ALLOWLIST:
            raise GateError("operation not allowlisted")
        if req.get("mode") not in DB_OP_MODES:
            raise GateError("invalid db-operation mode")
        if not isinstance(req.get("source_sha"), str) or not re.fullmatch(r"[0-9a-f]{40}", req["source_sha"]):
            raise GateError("invalid source SHA")
        if req["mode"] == "apply":
            evidence = req.get("dry_run_evidence_sha")
            if not isinstance(evidence, str) or not re.fullmatch(r"[0-9a-f]{64}", evidence):
                raise GateError("dry-run evidence SHA required before apply")
        return
    if not isinstance(req.get("release_id"), str) or not re.fullmatch(r"[a-z0-9][a-z0-9-]{2,63}", req.get("release_id") or ""):
        raise GateError("invalid release id")
    if req["action"] == "verify-rollback":
        return
    if req.get("db_change") is not False:
        raise GateError("database-changing releases unsupported")
    if not isinstance(req.get("source_sha"), str) or not re.fullmatch(r"[0-9a-f]{40}", req["source_sha"]):
        raise GateError("invalid source SHA")
    if not isinstance(req.get("expected_current_image"), str) or not re.fullmatch(r"apex-home-fit:[A-Za-z0-9_.-]+", req["expected_current_image"]):
        raise GateError("invalid current image")
    if req.get("phase") not in ("pre-hardening", "post-hardening", "normal"):
        raise GateError("invalid acceptance phase")


def remote_main():
    request = urllib.request.Request(f"https://api.github.com/repos/{REPO}/commits/main", headers={"User-Agent": "apex-gateway/2"})
    with urllib.request.urlopen(request, timeout=20) as response:
        sha = json.load(response).get("sha")
    if not isinstance(sha, str) or not re.fullmatch(r"[0-9a-f]{40}", sha):
        raise GateError("authoritative main unavailable")
    return sha


def topology(expected):
    if compose_image() != expected:
        raise GateError("current image drift")
    if run(["/usr/bin/docker", "volume", "ls", "-q", "--filter", f"name=^{VOLUME}$"]) != VOLUME:
        raise GateError("database volume drift")
    config = json.loads(run(["/usr/bin/docker", "compose", "-f", str(COMPOSE), "config", "--format", "json"]))
    app = config.get("services", {}).get("app", {})
    mounts = app.get("volumes", [])
    if app.get("image") != expected or not any(v.get("source") == VOLUME and v.get("target") == "/data" for v in mounts):
        raise GateError("compose topology drift")
    if "127.0.0.1" not in json.dumps(app.get("ports", [])):
        raise GateError("port binding drift")


def extract(archive, destination):
    with tarfile.open(archive, "r:gz") as bundle:
        for member in bundle.getmembers():
            target = (destination / member.name).resolve()
            if destination.resolve() not in target.parents or member.issym() or member.islnk() or member.isdev():
                raise GateError("unsafe source archive")
        bundle.extractall(destination)
    roots = [item for item in destination.iterdir() if item.is_dir()]
    if len(roots) != 1 or not (roots[0] / "Dockerfile").is_file() or not (roots[0] / "package-lock.json").is_file():
        raise GateError("source layout drift")
    dockerfile = (roots[0] / "Dockerfile").read_text()
    if dockerfile.count(f"node:22-alpine@{BASE_DIGEST}") != 3:
        raise GateError("immutable base-image pin drift")
    return roots[0]


def update_image(target):
    text = COMPOSE.read_text()
    updated, count = re.subn(r"(?m)^(\s+image:\s+)apex-home-fit:[A-Za-z0-9_.-]+\s*$", rf"\g<1>{target}", text)
    if count != 1:
        raise GateError("compose update not singular")
    temp = COMPOSE.with_suffix(".gateway-tmp")
    temp.write_text(updated)
    os.chmod(temp, 0o644)
    os.replace(temp, COMPOSE)


def sha256_file(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 16), b""):
            digest.update(chunk)
    return digest.hexdigest()


# --- exclusive database-operation lock (crash-resilient) ---------------------

OP_LOCK = STATE / "db-op-active"


def acquire_op_lock():
    if OP_LOCK.exists():
        try:
            owner = json.loads(OP_LOCK.read_text())
            pid = int(owner.get("pid") or 0)
            os.kill(pid, 0)  # raises ProcessLookupError when dead
            raise GateError("another database operation is active")
        except (ProcessLookupError, ValueError, TypeError, json.JSONDecodeError):
            OP_LOCK.unlink()  # stale marker from a crashed process
    OP_LOCK.write_text(json.dumps({"pid": os.getpid(), "started": datetime.now(timezone.utc).isoformat()}))
    os.chmod(OP_LOCK, 0o600)


def release_op_lock():
    try:
        OP_LOCK.unlink()
    except FileNotFoundError:
        pass


# --- db-operation -------------------------------------------------------------

def _build_op_image(sha, source, opid, values):
    target = f"apex-home-fit:dbop-{sha[:12]}-{opid}"
    args = ["--build-arg", "NPM_REGISTRY=https://package-mirror.liara.ir/repository/npm/",
            "--build-arg", f"NEXT_PUBLIC_SUPABASE_URL={values['NEXT_PUBLIC_SUPABASE_URL']}",
            "--build-arg", f"NEXT_PUBLIC_SUPABASE_ANON_KEY={values['NEXT_PUBLIC_SUPABASE_ANON_KEY']}",
            "--build-arg", f"NEXT_PUBLIC_SITE_URL={values['NEXT_PUBLIC_SITE_URL']}"]
    run(["/usr/bin/docker", "image", "inspect", f"node:22-alpine@{BASE_DIGEST}", "--format", "{{.Id}}"])
    run(["/usr/bin/docker", "build", "--pull=false", "--target", "build", "-t", target, *args, str(source)], quiet=False)
    return target


def _op_command(opid, mode, op_image, rehearsal_token=None):
    """Bounded docker-run command for the operation. The caller can only select
    an allowlisted operation + mode; the image and DB path are daemon-chosen.
    Rehearsal mode points DATABASE_URL at a clone of app.db (real DB untouched).
    Dry-run ALWAYS mounts the Production volume read-only (both script and
    migrate kinds) — the read-only inspection contract is unconditional."""
    op = OPERATION_ALLOWLIST[opid]
    db_url = f"file:/data/app.db{'.rehearsal-' + rehearsal_token if rehearsal_token else ''}"
    mount = f"{VOLUME}:/data:ro" if mode == "dry-run" else f"{VOLUME}:/data"
    base = ["/usr/bin/docker", "run", "--rm", "--network", "none",
            "-e", f"DATABASE_URL={db_url}", "-v", mount, op_image]
    if op["kind"] == "migrate":
        command = "./node_modules/.bin/prisma migrate status" if mode == "dry-run" else "./node_modules/.bin/prisma migrate deploy"
        return base + ["sh", "-c", command]
    return base + ["-e", f"DB_OPERATION_MODE={mode}", "sh", "-c", f"node --import tsx {op['path']}"]


def _run_op(opid, mode, op_image, rehearsal_token=None):
    return run(_op_command(opid, mode, op_image, rehearsal_token), quiet=False)


def _canonical(doc):
    return json.dumps(doc, sort_keys=True, separators=(",", ":"))


def _store_dry_run_evidence(opid, sha, report):
    canonical = _canonical(report)
    report_sha = hashlib.sha256(canonical.encode()).hexdigest()
    evidence = {
        "operation_id": opid,
        "source_sha": sha,
        "mode": "dry-run",
        "report_sha": report_sha,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    path = STATE / f"db-op-dryrun-{opid}-{sha[:12]}.json"
    path.write_text(json.dumps(evidence))
    os.chmod(path, 0o600)
    return report_sha, evidence


def _load_dry_run_evidence(opid, sha, expected_sha):
    path = STATE / f"db-op-dryrun-{opid}-{sha[:12]}.json"
    if not path.is_file():
        raise GateError("dry-run evidence missing — run mode=dry-run first")
    evidence = json.loads(path.read_text())
    if evidence.get("report_sha") != expected_sha:
        raise GateError("dry-run evidence SHA mismatch")
    return evidence


def _db_backup(opid, sha, op_image):
    backup = f"gateway-backup-{opid}-{sha[:12]}.db"
    run(["/usr/bin/docker", "run", "--rm", "--user", "0:0", "-v", f"{VOLUME}:/data", op_image,
         "sh", "-c", f"test -f /data/app.db && cp /data/app.db /data/{backup} && chown 100:101 /data/{backup}"], quiet=False)
    return backup


def _db_sha(op_image, db_path="app.db", ro=True):
    mount = f"{VOLUME}:/data:ro" if ro else f"{VOLUME}:/data"
    return run(["/usr/bin/docker", "run", "--rm", "-v", mount, op_image, "sha256sum", f"/data/{db_path}"]).split()[0]


def _restart_app():
    run(["/usr/bin/docker", "compose", "-f", str(COMPOSE), "up", "-d", "--no-deps", "--force-recreate", "app"], quiet=False)


def db_operation(req):
    opid = req["operation_id"]
    mode = req["mode"]
    sha = req["source_sha"]
    audit("db-op-start", f"{opid}:{mode}")
    if remote_main() != sha:
        raise GateError("source SHA is not authoritative main")
    acquire_op_lock()
    try:
        values = env_values()
        with tempfile.TemporaryDirectory(prefix="apex-gateway-") as td:
            temp = Path(td)
            archive = temp / "source.tar.gz"
            urllib.request.urlretrieve(f"https://github.com/{REPO}/archive/{sha}.tar.gz", archive)
            source = extract(archive, temp / "source")
            op = OPERATION_ALLOWLIST[opid]
            if op["kind"] == "script" and not (source / op["path"]).is_file():
                raise GateError("operation script missing from authoritative source")
            op_image = _build_op_image(sha, source, opid, values)

            if mode == "dry-run":
                raw = _run_op(opid, "dry-run", op_image)
                try:
                    report = json.loads(raw)
                except json.JSONDecodeError:
                    report = {"operation_id": opid, "mode": "dry-run", "report": raw}
                report_sha, evidence = _store_dry_run_evidence(opid, sha, report)
                audit("db-op-dry-run-pass", f"{opid}:{sha[:12]}")
                return {
                    "status": "PASS", "version": GATEWAY_VERSION, "mode": "dry-run",
                    "operation_id": opid, "source_sha": sha,
                    "dry_run_evidence_sha": report_sha,
                    "evidence": evidence,
                }

            # apply / rehearsal share the pre-mutation gates.
            evidence = None
            if mode == "apply":
                evidence = _load_dry_run_evidence(opid, sha, req["dry_run_evidence_sha"])

            rehearsal_token = None
            if mode == "rehearsal":
                rehearsal_token = secrets.token_hex(8)
                clone = f"app.db.rehearsal-{rehearsal_token}"
                run(["/usr/bin/docker", "run", "--rm", "--user", "0:0", "-v", f"{VOLUME}:/data", op_image,
                     "sh", "-c", f"cp /data/app.db /data/{clone} && chown 100:101 /data/{clone}"], quiet=False)

            backup = None
            stopped = False
            try:
                if mode == "apply":
                    run(["/usr/bin/docker", "compose", "-f", str(COMPOSE), "stop", "app"], quiet=False)
                    stopped = True
                    backup = _db_backup(opid, sha, op_image)
                    before = _db_sha(op_image)
                elif mode == "rehearsal":
                    before = _db_sha(op_image)  # real app.db hash (clone is identical)
                else:  # defensive; unreachable
                    raise GateError("unexpected mode")

                raw = _run_op(opid, "apply", op_image, rehearsal_token)
                try:
                    op_report = json.loads(raw)
                except json.JSONDecodeError:
                    # Allowlisted CLI operations (e.g. `prisma migrate deploy`)
                    # legitimately emit text — wrap it as the report.
                    op_report = {"operation_id": opid, "mode": mode, "report": raw}

                if mode == "apply":
                    after = _db_sha(op_image)
                    result = {
                        "status": "PASS", "version": GATEWAY_VERSION, "mode": "apply",
                        "operation_id": opid, "source_sha": sha,
                        "dry_run_evidence_sha": evidence["report_sha"],
                        "backup": backup, "db_before_hash": before, "db_after_hash": after,
                        "operation_report": op_report,
                    }
                else:  # rehearsal
                    real_after = _db_sha(op_image)
                    clone_after = _db_sha(op_image, f"app.db.rehearsal-{rehearsal_token}")
                    result = {
                        "status": "PASS", "version": GATEWAY_VERSION, "mode": "rehearsal",
                        "operation_id": opid, "source_sha": sha,
                        "real_db_unchanged": before == real_after,
                        "real_before_hash": before, "real_after_hash": real_after,
                        "clone_before_hash": before, "clone_after_hash": clone_after,
                        "operation_report": op_report,
                    }
                audit("db-op-pass", f"{opid}:{mode}:{sha[:12]}")
                return result
            except Exception:
                if mode == "apply" and stopped:
                    if backup:
                        run(["/usr/bin/docker", "run", "--rm", "--user", "0:0", "-v", f"{VOLUME}:/data", op_image,
                             "sh", "-c", f"test -f /data/{backup} && cp /data/{backup} /data/app.db && chown 100:101 /data/app.db"], quiet=False)
                    _restart_app()
                audit("db-op-fail", f"{opid}:{mode}")
                raise
            finally:
                if rehearsal_token:
                    clone = f"app.db.rehearsal-{rehearsal_token}"
                    run(["/usr/bin/docker", "run", "--rm", "--user", "0:0", "-v", f"{VOLUME}:/data", op_image,
                         "sh", "-c", f"rm -f /data/{clone} /data/{clone}-wal /data/{clone}-shm"], quiet=False)
                if mode == "apply" and stopped:
                    _restart_app()
    finally:
        release_op_lock()


def release(req):
    release_id = req["release_id"]
    sha = req["source_sha"]
    expected = req["expected_current_image"]
    audit("release-start", release_id)
    acquire_op_lock()
    try:
        if remote_main() != sha:
            raise GateError("source SHA is not authoritative main")
        topology(expected)
        values = env_values()
        target = f"apex-home-fit:release-{sha[:12]}"
        ops = f"apex-home-fit:migrate-{sha[:12]}"
        rollback = ROOT / f"compose.yml.rollback-{release_id}"
        backup = f"gateway-backup-{release_id}.db"
        stopped = False
        migrated = False
        with tempfile.TemporaryDirectory(prefix="apex-gateway-") as td:
            temp = Path(td)
            archive = temp / "source.tar.gz"
            urllib.request.urlretrieve(f"https://github.com/{REPO}/archive/{sha}.tar.gz", archive)
            source = extract(archive, temp / "source")
            args = ["--build-arg", "NPM_REGISTRY=https://package-mirror.liara.ir/repository/npm/",
                    "--build-arg", f"NEXT_PUBLIC_SUPABASE_URL={values['NEXT_PUBLIC_SUPABASE_URL']}",
                    "--build-arg", f"NEXT_PUBLIC_SUPABASE_ANON_KEY={values['NEXT_PUBLIC_SUPABASE_ANON_KEY']}",
                    "--build-arg", f"NEXT_PUBLIC_SITE_URL={values['NEXT_PUBLIC_SITE_URL']}"]
            run(["/usr/bin/docker", "image", "inspect", f"node:22-alpine@{BASE_DIGEST}", "--format", "{{.Id}}"])
            run(["/usr/bin/docker", "build", "--pull=false", "--target", "runner", "-t", target, *args, str(source)], quiet=False)
            run(["/usr/bin/docker", "build", "--pull=false", "--target", "build", "-t", ops, *args, str(source)], quiet=False)
            image_id = run(["/usr/bin/docker", "image", "inspect", target, "--format", "{{.Id}}"])
            version = run(["/usr/bin/docker", "run", "--rm", ops, "./node_modules/.bin/prisma", "--version"])
            if f"prisma                  : {PRISMA}" not in version:
                raise GateError("pinned migration tooling drift")
            shutil.copy2(COMPOSE, rollback)
            os.chmod(rollback, 0o600)
            try:
                run(["/usr/bin/docker", "compose", "-f", str(COMPOSE), "stop", "app"], quiet=False)
                stopped = True
                run(["/usr/bin/docker", "run", "--rm", "--user", "0:0", "-v", f"{VOLUME}:/data", ops,
                     "sh", "-c", f"test -f /data/app.db && cp /data/app.db /data/{backup} && chown 100:101 /data/{backup}"], quiet=False)
                before = run(["/usr/bin/docker", "run", "--rm", "-v", f"{VOLUME}:/data:ro", ops, "sha256sum", "/data/app.db"]).split()[0]
                run(["/usr/bin/docker", "run", "--rm", "--user", "0:0", "-e", "DATABASE_URL=file:/data/app.db", "-v", f"{VOLUME}:/data", ops,
                     "sh", "-c", "./node_modules/.bin/prisma migrate deploy >/dev/null && chown -R 100:101 /data"], quiet=False)
                migrated = True
                after = run(["/usr/bin/docker", "run", "--rm", "-v", f"{VOLUME}:/data:ro", ops, "sha256sum", "/data/app.db"]).split()[0]
                if before != after:
                    raise GateError("database changed in DB_CHANGED=NO release")
                update_image(target)
                run(["/usr/bin/docker", "compose", "-f", str(COMPOSE), "up", "-d", "--no-deps", "--force-recreate", "app"], quiet=False)
                for _ in range(20):
                    try:
                        run(["/usr/bin/curl", "--fail", "--silent", "--max-time", "5", "http://127.0.0.1:3000/en"])
                        break
                    except GateError:
                        time.sleep(3)
                else:
                    raise GateError("health verification failed")
                topology(target)
            except Exception:
                if stopped:
                    shutil.copy2(rollback, COMPOSE)
                    if migrated:
                        run(["/usr/bin/docker", "run", "--rm", "--user", "0:0", "-v", f"{VOLUME}:/data", ops,
                             "sh", "-c", f"test -f /data/{backup} && cp /data/{backup} /data/app.db && chown 100:101 /data/app.db"], quiet=False)
                    run(["/usr/bin/docker", "compose", "-f", str(COMPOSE), "up", "-d", "--no-deps", "--force-recreate", "app"], quiet=False)
                audit("release-rolled-back", release_id)
                raise
        proof = {"release_id": release_id, "phase": req["phase"], "source_sha": sha, "image": target, "rollback": rollback.name, "status": "PASS"}
        (STATE / f"proof-{req['phase']}.json").write_text(json.dumps(proof))
        os.chmod(STATE / f"proof-{req['phase']}.json", 0o600)
        audit("release-pass", release_id)
        return {**proof, "version": GATEWAY_VERSION, "image_id": image_id, "db_changed": False, "health": "PASS", "secret_boundary": "PROTECTED"}
    finally:
        release_op_lock()


def verify_rollback(req):
    proof = STATE / "proof-pre-hardening.json"
    if not proof.is_file():
        raise GateError("pre-hardening release proof missing")
    data = json.loads(proof.read_text())
    rollback = ROOT / data["rollback"]
    if not rollback.is_file() or rollback.stat().st_mode & 0o077:
        raise GateError("rollback compose evidence invalid")
    previous = compose_image() if data["image"] != compose_image() else re.search(r"(?m)^\s+image:\s+(apex-home-fit:[^\s]+)", rollback.read_text()).group(1)
    run(["/usr/bin/docker", "image", "inspect", previous, "--format", "{{.Id}}"])
    marker = STATE / "rollback-verified"
    marker.write_text(req["release_id"])
    os.chmod(marker, 0o600)
    audit("rollback-verified", req["release_id"])
    return {"status": "PASS", "version": GATEWAY_VERSION, "rollback": "VERIFIED", "previous_image": "AVAILABLE"}


def handle(req):
    base_guard()
    validate_request(req)
    if req["action"] == "status":
        return {"status": "READY", "version": GATEWAY_VERSION, "host": HOST, "image": compose_image(), "volume": VOLUME, "secret_boundary": "PROTECTED"}
    if req["action"] == "verify-rollback":
        return verify_rollback(req)
    if req["action"] == "db-operation":
        return db_operation(req)
    return release(req)


def main():
    base_guard()
    SOCKET.parent.mkdir(parents=True, exist_ok=True)
    if SOCKET.exists():
        SOCKET.unlink()
    server = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    server.bind(str(SOCKET))
    os.chown(SOCKET, 0, os.getgid())
    os.chmod(SOCKET, 0o660)
    server.listen(4)
    while True:
        conn, _ = server.accept()
        with conn:
            uid = struct.unpack("3i", conn.getsockopt(socket.SOL_SOCKET, socket.SO_PEERCRED, 12))[1]
            try:
                if uid not in (0, 1000):
                    raise GateError("caller identity rejected")
                payload = conn.recv(16385)
                if len(payload) > 16384:
                    raise GateError("request too large")
                response = {"ok": True, "result": handle(json.loads(payload.decode()))}
            except Exception as error:
                audit("request-fail")
                response = {"ok": False, "error": str(error)}
            conn.sendall((json.dumps(response, sort_keys=True) + "\n").encode())


def self_test():
    """Offline logic assertions (no root, no docker, no network). Run by CI."""
    failures = []

    def check(name, fn):
        try:
            fn()
            print(f"  ok  {name}")
        except Exception as error:
            failures.append(name)
            print(f"  FAIL {name}: {error}")

    def valid(req):
        validate_request(req)

    def invalid(req):
        try:
            validate_request(req)
        except GateError:
            return
        raise AssertionError("expected GateError")

    check("status minimal", lambda: valid({"action": "status", "schema_version": 1}))
    check("db-operation dry-run valid", lambda: valid({"action": "db-operation", "schema_version": 1, "operation_id": "s02e-exercise-identity-backfill", "mode": "dry-run", "source_sha": "a" * 40}))
    check("db-operation rehearsal valid", lambda: valid({"action": "db-operation", "schema_version": 1, "operation_id": "s02e-exercise-identity-backfill", "mode": "rehearsal", "source_sha": "a" * 40}))
    check("db-operation apply requires evidence", lambda: valid({"action": "db-operation", "schema_version": 1, "operation_id": "s02e-exercise-identity-backfill", "mode": "apply", "source_sha": "a" * 40, "dry_run_evidence_sha": "b" * 64}))
    check("db-operation apply without evidence rejected", lambda: invalid({"action": "db-operation", "schema_version": 1, "operation_id": "s02e-exercise-identity-backfill", "mode": "apply", "source_sha": "a" * 40}))
    check("db-operation unknown operation rejected", lambda: invalid({"action": "db-operation", "schema_version": 1, "operation_id": "drop-tables", "mode": "apply", "source_sha": "a" * 40, "dry_run_evidence_sha": "b" * 64}))
    check("db-operation unknown mode rejected", lambda: invalid({"action": "db-operation", "schema_version": 1, "operation_id": "s02e-exercise-identity-backfill", "mode": "exploit", "source_sha": "a" * 40}))
    check("db-operation unknown fields rejected", lambda: invalid({"action": "db-operation", "schema_version": 1, "operation_id": "s02e-exercise-identity-backfill", "mode": "dry-run", "source_sha": "a" * 40, "sql": "DROP TABLE users"}))
    check("db-operation bad source sha rejected", lambda: invalid({"action": "db-operation", "schema_version": 1, "operation_id": "s02e-exercise-identity-backfill", "mode": "dry-run", "source_sha": "short"}))
    check("release db_change=true still rejected", lambda: invalid({"action": "release", "schema_version": 1, "release_id": "x-1", "db_change": True, "source_sha": "a" * 40, "expected_current_image": "apex-home-fit:x", "phase": "normal"}))
    check("release db_change=false valid", lambda: valid({"action": "release", "schema_version": 1, "release_id": "x-1", "db_change": False, "source_sha": "a" * 40, "expected_current_image": "apex-home-fit:x", "phase": "normal"}))
    check("allowlist exact", lambda: (_ for _ in ()).throw(AssertionError()) if set(OPERATION_ALLOWLIST) != {"s02e-exercise-identity-backfill", "prisma-migrate-deploy"} else None)
    check("evidence sha format", lambda: (_ for _ in ()).throw(AssertionError()) if not re.fullmatch(r"[0-9a-f]{64}", "b" * 64) else None)
    check("canonical json stable", lambda: (_ for _ in ()).throw(AssertionError()) if _canonical({"a": 1, "b": [2, 3]}) != _canonical({"b": [2, 3], "a": 1}) else None)

    # Mount contract: dry-run is ALWAYS read-only; apply/rehearsal are RW and
    # rehearsal points DATABASE_URL at the clone.
    check("dry-run mounts volume read-only (script)", lambda: (_ for _ in ()).throw(AssertionError()) if f"{VOLUME}:/data:ro" not in _op_command("s02e-exercise-identity-backfill", "dry-run", "img") else None)
    check("dry-run mounts volume read-only (migrate)", lambda: (_ for _ in ()).throw(AssertionError()) if f"{VOLUME}:/data:ro" not in _op_command("prisma-migrate-deploy", "dry-run", "img") else None)
    check("apply mounts volume read-write", lambda: (_ for _ in ()).throw(AssertionError()) if f"{VOLUME}:/data" not in _op_command("s02e-exercise-identity-backfill", "apply", "img") or f"{VOLUME}:/data:ro" in _op_command("s02e-exercise-identity-backfill", "apply", "img") else None)
    check("rehearsal targets the clone", lambda: (_ for _ in ()).throw(AssertionError()) if "file:/data/app.db.rehearsal-" not in " ".join(_op_command("s02e-exercise-identity-backfill", "apply", "img", "tok123")) else None)
    check("operations run with no network", lambda: (_ for _ in ()).throw(AssertionError()) if "--network" not in _op_command("s02e-exercise-identity-backfill", "apply", "img") or "none" not in _op_command("s02e-exercise-identity-backfill", "apply", "img") else None)

    def run_error_detail():
        try:
            run(["sh", "-c", "echo boom >&2; exit 1"])
        except GateError as error:
            return str(error)
        return ""
    check("run() error carries output head+tail", lambda: (_ for _ in ()).throw(AssertionError()) if "boom" not in run_error_detail() else None)

    if failures:
        print(f"SELF_TEST_FAIL ({len(failures)}): {', '.join(failures)}")
        return 1
    print("SELF_TEST_PASS")
    return 0


if __name__ == "__main__":
    import sys
    if len(sys.argv) == 2 and sys.argv[1] == "--self-test":
        raise SystemExit(self_test())
    main()
