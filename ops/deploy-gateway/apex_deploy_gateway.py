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
from urllib.parse import quote

HOST = "sabtbrooker"
REPO = "msaeedlavasani/Apex-Home-Fitness"
ROOT = Path("/opt/apex-home-fit")
COMPOSE = ROOT / "compose.yml"
ENV_FILE = ROOT / ".env"
BETA_ROOT = Path("/opt/ahf-beta")
BETA_COMPOSE = BETA_ROOT / "compose.yml"
BETA_ENV_FILE = BETA_ROOT / ".env"
STATE = Path("/var/lib/apex-deploy-gateway")
SOCKET = Path("/run/apex-deploy-gateway/gateway.sock")
AUDIT = Path("/var/log/apex-deploy-gateway.log")
VOLUME = "apexhomefit_prod_db"
BETA_VOLUME = "ahf_beta_db"
BETA_HOSTNAME = "beta.apexhomefit.ir"
BETA_PORT = "3100"
BETA_SOURCE_REF = "feat/workout-v2-first-slice"
BETA_PR_NUMBER = 72
PRISMA = "6.19.3"
BASE_DIGEST = "sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32"
GATEWAY_VERSION = 5
REQUEST_KEYS = {"action", "schema_version", "release_id", "source_sha", "expected_current_image", "db_change", "phase", "operation_id", "mode", "dry_run_evidence_sha"}
ACTIONS = ("status", "release", "verify-rollback", "db-operation", "beta-status", "beta-release", "beta-verify-rollback", "beta-db-operation", "storage-hygiene")
DB_OP_MODES = ("dry-run", "apply", "rehearsal")
STORAGE_MODES = ("audit", "cleanup")
STORAGE_CLASSES = ("RETAIN_CURRENT", "RETAIN_ROLLBACK", "RETAIN_ACTIVE_TRANSACTION", "SAFE_TO_DELETE", "AMBIGUOUS_DO_NOT_DELETE")
STORAGE_POLICY = STATE / "storage-policy.json"
RELEASE_AUTHORITY = STATE / "release-authority.json"
# Bounded operation allowlist. Each entry maps an operation identity to the
# allowlisted runner inside the repository archive at the authoritative SHA.
# The caller can only select an identity; the daemon executes the checked-in
# script/command. No arbitrary SQL, shell, Docker, or compose is ever accepted.
OPERATION_ALLOWLIST = {
    "s02e-exercise-identity-backfill": {
        "kind": "script",
        "path": "scripts/gateway-db-ops/s02e-exercise-identity-backfill.mjs",
    },
    "mg09-movement-graph-adopt": {
        "kind": "script",
        "path": "scripts/gateway-db-ops/mg09-movement-graph-adopt.mjs",
    },
    "prisma-migrate-deploy": {
        "kind": "migrate",
        "path": None,
    },
}
BETA_OPERATION_ALLOWLIST = {
    "beta-qa-program-assign": {
        "path": "scripts/gateway-db-ops/beta-qa-program-assign.mjs",
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


def beta_env_values():
    if not BETA_COMPOSE.is_file() or not BETA_ENV_FILE.is_file():
        raise GateError("canonical Beta deployment files missing")
    st = BETA_ENV_FILE.stat()
    if st.st_uid != 0 or st.st_mode & 0o077:
        raise GateError("Beta protected environment invariant failed")
    values = {}
    for raw in BETA_ENV_FILE.read_text(encoding="utf-8").splitlines():
        if not raw.strip() or raw.lstrip().startswith("#") or "=" not in raw:
            continue
        key, value = raw.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    for key in ("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SITE_URL"):
        if not values.get(key):
            raise GateError(f"required Beta configuration absent: {key}")
    if values["NEXT_PUBLIC_SITE_URL"].rstrip("/") != f"https://{BETA_HOSTNAME}":
        raise GateError("Beta NEXT_PUBLIC_SITE_URL does not match canonical Beta identity")
    return values


def compose_image():
    match = re.search(r"(?m)^\s+image:\s+(apex-home-fit:[A-Za-z0-9_.-]+)\s*$", COMPOSE.read_text())
    if not match:
        raise GateError("canonical compose image invariant failed")
    return match.group(1)


def beta_compose_images():
    text = BETA_COMPOSE.read_text(encoding="utf-8")
    app = re.search(r"(?m)^\s+image:\s+(ahf-home-fit:beta-(?!migrate-)[A-Za-z0-9_.-]+)\s*$", text)
    migrate = re.search(r"(?m)^\s+image:\s+(ahf-home-fit:beta-migrate-[A-Za-z0-9_.-]+)\s*$", text)
    if not app or not migrate:
        raise GateError("canonical Beta compose image invariant failed")
    return app.group(1), migrate.group(1)


def beta_topology(expected_app=None, expected_migrate=None):
    app_image, migrate_image = beta_compose_images()
    if expected_app and app_image != expected_app:
        raise GateError("current Beta image drift")
    if expected_migrate and migrate_image != expected_migrate:
        raise GateError("current Beta migration image drift")
    if run(["/usr/bin/docker", "volume", "ls", "-q", "--filter", f"name=^{BETA_VOLUME}$"]) != BETA_VOLUME:
        raise GateError("Beta database volume drift")
    config = json.loads(run(["/usr/bin/docker", "compose", "-f", str(BETA_COMPOSE), "config", "--format", "json"]))
    services = config.get("services", {})
    app = services.get("app", {})
    migrate = services.get("migrate", {})
    if app.get("image") != app_image or migrate.get("image") != migrate_image:
        raise GateError("Beta compose image drift")
    encoded = json.dumps(config)
    beta_port = any(
        p.get("host_ip") == "127.0.0.1" and str(p.get("published")) == "3100" and str(p.get("target")) == "3000"
        for p in app.get("ports", [])
    )
    production_port = any(
        p.get("host_ip") == "127.0.0.1" and str(p.get("published")) == "3000"
        for p in app.get("ports", [])
    )
    if not beta_port or production_port:
        raise GateError("Beta port boundary drift")
    if "apexhomefit_prod_db" in encoded or "apex-home-fit:release-" in encoded:
        raise GateError("Production resource appeared in Beta topology")
    for service in (app, migrate):
        if not any(v.get("source") == BETA_VOLUME and v.get("target") == "/data" for v in service.get("volumes", [])):
            raise GateError("Beta database volume mount drift")
    return app_image, migrate_image


def update_beta_images(app_target, migrate_target):
    text = BETA_COMPOSE.read_text(encoding="utf-8")
    updated, app_count = re.subn(r"(?m)^(\s+image:\s+)ahf-home-fit:beta-(?!migrate-)[A-Za-z0-9_.-]+\s*$", rf"\g<1>{app_target}", text, count=1)
    updated, migrate_count = re.subn(r"(?m)^(\s+image:\s+)ahf-home-fit:beta-migrate-[A-Za-z0-9_.-]+\s*$", rf"\g<1>{migrate_target}", updated, count=1)
    if app_count != 1 or migrate_count != 1:
        raise GateError("Beta compose image update not singular")
    temp = BETA_COMPOSE.with_suffix(".gateway-tmp")
    temp.write_text(updated, encoding="utf-8")
    os.chmod(temp, 0o644)
    os.replace(temp, BETA_COMPOSE)


def validate_request(req):
    if not isinstance(req, dict) or set(req) - REQUEST_KEYS:
        raise GateError("unknown request fields")
    if req.get("schema_version") != 1:
        raise GateError("unsupported request schema")
    if req.get("action") not in ACTIONS:
        raise GateError("unsupported action")
    if req["action"] == "status":
        return
    if req["action"] == "beta-status":
        return
    if req["action"] == "storage-hygiene":
        if req.get("mode") not in STORAGE_MODES:
            raise GateError("invalid storage-hygiene mode")
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
    if req["action"] == "beta-db-operation":
        if req.get("operation_id") not in BETA_OPERATION_ALLOWLIST:
            raise GateError("Beta operation not allowlisted")
        if req.get("mode") not in ("dry-run", "apply"):
            raise GateError("invalid Beta db-operation mode")
        if not isinstance(req.get("source_sha"), str) or not re.fullmatch(r"[0-9a-f]{40}", req["source_sha"]):
            raise GateError("invalid source SHA")
        if req["mode"] == "apply":
            evidence = req.get("dry_run_evidence_sha")
            if not isinstance(evidence, str) or not re.fullmatch(r"[0-9a-f]{64}", evidence):
                raise GateError("dry-run evidence SHA required before Beta apply")
        return
    if not isinstance(req.get("release_id"), str) or not re.fullmatch(r"[a-z0-9][a-z0-9-]{2,63}", req.get("release_id") or ""):
        raise GateError("invalid release id")
    if req["action"] == "beta-verify-rollback":
        return
    if req["action"] == "verify-rollback":
        return
    if req["action"] == "beta-release":
        if not isinstance(req.get("db_change"), bool):
            raise GateError("Beta db_change must be boolean")
        if req.get("phase") != "beta":
            raise GateError("invalid Beta acceptance phase")
        if not isinstance(req.get("expected_current_image"), str) or not re.fullmatch(r"ahf-home-fit:beta-[A-Za-z0-9_.-]+", req["expected_current_image"]):
            raise GateError("invalid current Beta image")
        if not isinstance(req.get("source_sha"), str) or not re.fullmatch(r"[0-9a-f]{40}", req["source_sha"]):
            raise GateError("invalid source SHA")
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


def github_json(path):
    request = urllib.request.Request(f"https://api.github.com/repos/{REPO}/{path}", headers={"User-Agent": "apex-gateway/3", "Accept": "application/vnd.github+json"})
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return json.load(response)
    except Exception as error:
        raise GateError(f"GitHub authority unavailable: {type(error).__name__}") from error


def beta_authoritative_source(sha):
    ref = github_json(f"git/ref/heads/{quote(BETA_SOURCE_REF, safe='')}")
    branch_sha = ((ref.get("object") or {}).get("sha")) if isinstance(ref, dict) else None
    if branch_sha != sha:
        raise GateError("Beta source SHA is not the canonical Workout V2 branch head")
    pr = github_json(f"pulls/{BETA_PR_NUMBER}")
    head = pr.get("head") if isinstance(pr, dict) else None
    if pr.get("state") != "open" or not isinstance(head, dict) or head.get("sha") != sha or head.get("ref") != BETA_SOURCE_REF:
        raise GateError("Beta source SHA is not the open canonical Workout V2 PR head")
    runs = github_json(f"actions/runs?head_sha={quote(sha, safe='')}&per_page=100").get("workflow_runs", [])
    authoritative = {}
    for event in ("push", "pull_request"):
        matches = [run_info for run_info in runs if run_info.get("name") == "CI" and run_info.get("event") == event and run_info.get("head_sha") == sha]
        if not matches or matches[0].get("conclusion") != "success":
            raise GateError(f"authoritative Beta CI is not PASS for event {event}")
        authoritative[event] = {"run_id": matches[0].get("id"), "url": matches[0].get("html_url"), "conclusion": matches[0].get("conclusion")}
    return {"branch": BETA_SOURCE_REF, "pr": BETA_PR_NUMBER, "sha": sha, "ci": authoritative}


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
    # ALL docker options must precede the image name: anything after the image
    # is the container COMMAND, not a docker option (a trailing `-e` would be
    # passed into the container and mis-evaluated by the node entrypoint).
    env_args = ["-e", f"DATABASE_URL={db_url}"]
    if op["kind"] != "migrate":
        env_args += ["-e", f"DB_OPERATION_MODE={mode}"]
    base = ["/usr/bin/docker", "run", "--rm", "--network", "none", *env_args, "-v", mount, op_image]
    if op["kind"] == "migrate":
        command = "./node_modules/.bin/prisma migrate status" if mode == "dry-run" else "./node_modules/.bin/prisma migrate deploy"
        return base + ["sh", "-c", command]
    return base + ["sh", "-c", f"node --import tsx {op['path']}"]


def _run_op(opid, mode, op_image, rehearsal_token=None):
    # quiet=True so the operation's stdout is RETURNED (the operation report
    # is captured and hashed/parsed by the caller). quiet=False would discard it.
    return run(_op_command(opid, mode, op_image, rehearsal_token), quiet=True)


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


def _restart_beta_app():
    run(["/usr/bin/docker", "compose", "-f", str(BETA_COMPOSE), "up", "-d", "--no-deps", "--force-recreate", "app"], quiet=False)


def _beta_db_sha(op_image, db_path="app.db", ro=True):
    mount = f"{BETA_VOLUME}:/data:ro" if ro else f"{BETA_VOLUME}:/data"
    return run(["/usr/bin/docker", "run", "--rm", "-v", mount, op_image, "sha256sum", f"/data/{db_path}"]).split()[0]


def _beta_build_id(app_image):
    build_id = run(["/usr/bin/docker", "run", "--rm", app_image, "sh", "-c", "cat /app/.next/BUILD_ID"])
    if not re.fullmatch(r"[A-Za-z0-9_-]+", build_id):
        raise GateError("Beta build identity is invalid")
    return build_id


def _beta_operation_command(opid, mode, image, qa_phones):
    operation = BETA_OPERATION_ALLOWLIST[opid]
    mount = f"{BETA_VOLUME}:/data:ro" if mode == "dry-run" else f"{BETA_VOLUME}:/data"
    return [
        "/usr/bin/docker", "run", "--rm", "--network", "none",
        "-e", "DATABASE_URL=file:/data/app.db",
        "-e", f"DB_OPERATION_MODE={mode}",
        "-e", f"BETA_QA_PHONES={qa_phones}",
        "-v", mount, image,
        "sh", "-c", f"node --import tsx {operation['path']}",
    ]


def _run_beta_operation(opid, mode, image, qa_phones):
    return run(_beta_operation_command(opid, mode, image, qa_phones), quiet=True)


def _beta_dry_run_evidence_path(opid, sha):
    return STATE / f"beta-db-op-dryrun-{opid}-{sha[:12]}.json"


def _store_beta_dry_run_evidence(opid, sha, report):
    canonical = _canonical(report)
    report_sha = hashlib.sha256(canonical.encode()).hexdigest()
    evidence = {
        "operation_id": opid,
        "source_sha": sha,
        "environment": "AHF_BETA",
        "mode": "dry-run",
        "report_sha": report_sha,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    path = _beta_dry_run_evidence_path(opid, sha)
    path.write_text(json.dumps(evidence))
    os.chmod(path, 0o600)
    return report_sha, evidence


def _load_beta_dry_run_evidence(opid, sha, expected_sha):
    path = _beta_dry_run_evidence_path(opid, sha)
    if not path.is_file():
        raise GateError("Beta dry-run evidence missing — run mode=dry-run first")
    evidence = json.loads(path.read_text())
    if evidence.get("report_sha") != expected_sha:
        raise GateError("Beta dry-run evidence SHA mismatch")
    return evidence


def beta_status():
    beta_env_values()
    app_image, migrate_image = beta_topology()
    return {
        "status": "READY", "version": GATEWAY_VERSION, "environment": "AHF_BETA",
        "host": HOST, "url": f"https://{BETA_HOSTNAME}", "image": app_image,
        "migration_image": migrate_image, "volume": BETA_VOLUME,
        "port": f"127.0.0.1:{BETA_PORT}", "production_untouched": True,
        "secret_boundary": "PROTECTED",
    }


def beta_release(req):
    release_id = req["release_id"]
    sha = req["source_sha"]
    expected = req["expected_current_image"]
    db_change = req["db_change"]
    audit("beta-release-start", release_id)
    acquire_op_lock()
    try:
        admission = _disk_admission("beta-release")
        source_evidence = beta_authoritative_source(sha)
        beta_env = beta_env_values()
        beta_topology(expected)
        previous_image_id = _image_inspect(expected)["id"]
        target = f"ahf-home-fit:beta-{sha[:12]}"
        migrate_target = f"ahf-home-fit:beta-migrate-{sha[:12]}"
        rollback = BETA_ROOT / f"compose.yml.rollback-{release_id}"
        backup = f"gateway-beta-backup-{release_id}.db"
        stopped = False
        migrated = False
        preflight_report = {"status": "NOT_REQUIRED"}
        with tempfile.TemporaryDirectory(prefix="apex-beta-gateway-") as td:
            temp = Path(td)
            archive = temp / "source.tar.gz"
            urllib.request.urlretrieve(f"https://github.com/{REPO}/archive/{sha}.tar.gz", archive)
            source = extract(archive, temp / "source")
            args = ["--build-arg", "NPM_REGISTRY=https://package-mirror.liara.ir/repository/npm/",
                    "--build-arg", f"NEXT_PUBLIC_SUPABASE_URL={beta_env['NEXT_PUBLIC_SUPABASE_URL']}",
                    "--build-arg", f"NEXT_PUBLIC_SUPABASE_ANON_KEY={beta_env['NEXT_PUBLIC_SUPABASE_ANON_KEY']}",
                    "--build-arg", f"NEXT_PUBLIC_SITE_URL={beta_env['NEXT_PUBLIC_SITE_URL']}"]
            run(["/usr/bin/docker", "image", "inspect", f"node:22-alpine@{BASE_DIGEST}", "--format", "{{.Id}}"])
            run(["/usr/bin/docker", "build", "--pull=false", "--target", "runner", "-t", target, *args, str(source)], quiet=False)
            run(["/usr/bin/docker", "build", "--pull=false", "--target", "build", "-t", migrate_target, *args, str(source)], quiet=False)
            image_id = run(["/usr/bin/docker", "image", "inspect", target, "--format", "{{.Id}}"])
            migrate_image_id = run(["/usr/bin/docker", "image", "inspect", migrate_target, "--format", "{{.Id}}"])
            version = run(["/usr/bin/docker", "run", "--rm", migrate_target, "./node_modules/.bin/prisma", "--version"])
            if f"prisma                  : {PRISMA}" not in version:
                raise GateError("pinned Beta migration tooling drift")
            build_id = _beta_build_id(target)
            shutil.copy2(BETA_COMPOSE, rollback)
            os.chmod(rollback, 0o600)
            try:
                run(["/usr/bin/docker", "compose", "-f", str(BETA_COMPOSE), "stop", "app"], quiet=False)
                stopped = True
                preflight = None
                if db_change:
                    preflight = f"gateway-beta-preflight-{release_id}.db"
                    try:
                        run(["/usr/bin/docker", "run", "--rm", "--user", "0:0", "-v", f"{BETA_VOLUME}:/data", migrate_target,
                             "sh", "-c", f"test -f /data/app.db && cp /data/app.db /data/{preflight} && chown 100:101 /data/{preflight}"], quiet=False)
                        pre_before = _beta_db_sha(migrate_target, preflight)
                        run(["/usr/bin/docker", "run", "--rm", "--user", "0:0", "-e", f"DATABASE_URL=file:/data/{preflight}", "-v", f"{BETA_VOLUME}:/data", migrate_target,
                             "sh", "-c", "./node_modules/.bin/prisma migrate deploy >/dev/null && chown -R 100:101 /data"], quiet=False)
                        pre_after = _beta_db_sha(migrate_target, preflight)
                        if pre_before == pre_after:
                            raise GateError("Beta schema migration preflight produced no schema change")
                        preflight_report = {"status": "PASS", "before_sha256": pre_before, "after_sha256": pre_after}
                    finally:
                        run(["/usr/bin/docker", "run", "--rm", "--user", "0:0", "-v", f"{BETA_VOLUME}:/data", migrate_target,
                             "sh", "-c", f"rm -f /data/{preflight} /data/{preflight}-wal /data/{preflight}-shm"], quiet=False)
                run(["/usr/bin/docker", "run", "--rm", "--user", "0:0", "-v", f"{BETA_VOLUME}:/data", migrate_target,
                     "sh", "-c", f"test -f /data/app.db && cp /data/app.db /data/{backup} && chown 100:101 /data/{backup}"], quiet=False)
                before = _beta_db_sha(migrate_target)
                migrated = True
                run(["/usr/bin/docker", "run", "--rm", "--user", "0:0", "-e", "DATABASE_URL=file:/data/app.db", "-v", f"{BETA_VOLUME}:/data", migrate_target,
                     "sh", "-c", "./node_modules/.bin/prisma migrate deploy >/dev/null && chown -R 100:101 /data"], quiet=False)
                after = _beta_db_sha(migrate_target)
                if not db_change and before != after:
                    raise GateError("Beta database changed in DB_CHANGED=NO release")
                update_beta_images(target, migrate_target)
                _restart_beta_app()
                for _ in range(20):
                    try:
                        run(["/usr/bin/curl", "--fail", "--silent", "--max-time", "5", f"http://127.0.0.1:{BETA_PORT}/en"])
                        break
                    except GateError:
                        time.sleep(3)
                else:
                    raise GateError("Beta health verification failed")
                beta_topology(target, migrate_target)
            except Exception:
                if stopped:
                    shutil.copy2(rollback, BETA_COMPOSE)
                    if migrated:
                        run(["/usr/bin/docker", "run", "--rm", "--user", "0:0", "-v", f"{BETA_VOLUME}:/data", migrate_target,
                             "sh", "-c", f"test -f /data/{backup} && cp /data/{backup} /data/app.db && chown 100:101 /data/app.db"], quiet=False)
                    _restart_beta_app()
                audit("beta-release-rolled-back", release_id)
                raise
        proof = {
            "release_id": release_id, "phase": req["phase"], "environment": "AHF_BETA",
            "url": f"https://{BETA_HOSTNAME}", "source_sha": sha, "source": source_evidence,
            "image": target, "image_id": image_id, "migration_image": migrate_target,
            "migration_image_id": migrate_image_id, "build_id": build_id,
            "rollback": rollback.name, "database_before_sha256": before,
            "database_after_sha256": after, "status": "PASS",
            "db_changed": db_change,
            "migration_preflight": preflight_report,
            "production_untouched": True, "application_release_status": "PASS",
            "storage_hygiene_status": "PENDING_ROLLBACK_VERIFICATION", "disk_admission": admission,
            "filesystem_after": _disk_state(),
        }
        proof_path = STATE / f"proof-beta-{release_id}.json"
        proof_path.write_text(json.dumps(proof))
        os.chmod(proof_path, 0o600)
        marker = BETA_ROOT / ".deployed-commit"
        marker.write_text(json.dumps({"source_sha": sha, "image": target, "image_id": image_id, "build_id": build_id, "release_id": release_id}))
        os.chmod(marker, 0o600)
        _save_release_authority(
            "beta",
            {"image": target, "image_id": image_id, "source_sha": sha, "build_id": build_id},
            {"image": expected, "image_id": previous_image_id},
            rollback.name,
            _compose_refs(BETA_COMPOSE),
            _compose_refs(rollback),
            rollback_verified=False,
            release_id=release_id,
        )
        audit("beta-release-pass", release_id)
        return {**proof, "version": GATEWAY_VERSION, "health": "PASS", "secret_boundary": "PROTECTED"}
    finally:
        release_op_lock()


def beta_verify_rollback(req):
    beta_env_values()
    proof_path = STATE / f"proof-beta-{req['release_id']}.json"
    if not proof_path.is_file():
        raise GateError("Beta release proof missing")
    proof = json.loads(proof_path.read_text())
    rollback = BETA_ROOT / proof["rollback"]
    if not rollback.is_file() or rollback.stat().st_mode & 0o077:
        raise GateError("Beta rollback compose evidence invalid")
    previous = re.search(r"(?m)^\s+image:\s+(ahf-home-fit:beta-(?!migrate-)[^\s]+)", rollback.read_text()).group(1)
    previous_info = _image_inspect(previous)
    _save_release_authority(
        "beta", {"image": proof["image"], "image_id": proof["image_id"], "source_sha": proof["source_sha"], "build_id": proof["build_id"]},
        {"image": previous, "image_id": previous_info["id"]}, proof["rollback"],
        _compose_refs(BETA_COMPOSE), _compose_refs(rollback), rollback_verified=True,
        release_id=req["release_id"],
    )
    Path(BETA_ROOT / ".beta-rollback-verified").write_text(req["release_id"], encoding="utf-8")
    storage = _storage_hygiene({"mode": "cleanup"})
    audit("beta-rollback-verified", req["release_id"])
    return {"status": "PASS", "version": GATEWAY_VERSION, "environment": "AHF_BETA", "rollback": "VERIFIED", "previous_image": previous, "application_release_status": "UNCHANGED", "storage_hygiene_status": storage["status"], "storage_hygiene_report": storage}


def beta_db_operation(req):
    opid = req["operation_id"]
    mode = req["mode"]
    sha = req["source_sha"]
    beta_env = beta_env_values()
    qa_phones = beta_env.get("SMOKE_TEST_PHONE", "").strip() or beta_env.get("AUTH_OTP_MOCK_PHONES", "").strip()
    if not qa_phones:
        raise GateError("Beta QA identity configuration is absent")
    source_evidence = beta_authoritative_source(sha)
    app_image, migrate_image = beta_topology()
    marker = BETA_ROOT / ".deployed-commit"
    if not marker.is_file() or json.loads(marker.read_text()).get("source_sha") != sha:
        raise GateError("Beta operation source SHA is not the deployed Beta candidate")
    acquire_op_lock()
    try:
        _disk_admission("beta-db-operation")
        if mode == "dry-run":
            raw = _run_beta_operation(opid, "dry-run", migrate_image, qa_phones)
            try:
                report = json.loads(raw)
            except json.JSONDecodeError:
                report = {"operation_id": opid, "mode": "dry-run", "report": raw}
            report_sha, evidence = _store_beta_dry_run_evidence(opid, sha, report)
            audit("beta-db-op-dry-run-pass", f"{opid}:{sha[:12]}")
            return {
                "status": "PASS", "version": GATEWAY_VERSION, "environment": "AHF_BETA",
                "mode": "dry-run", "operation_id": opid, "source_sha": sha,
                "source": source_evidence, "dry_run_evidence_sha": report_sha,
                "operation_report": report, "secret_boundary": "PROTECTED",
            }

        evidence = _load_beta_dry_run_evidence(opid, sha, req["dry_run_evidence_sha"])
        backup = f"gateway-beta-dbop-{opid}-{sha[:12]}.db"
        stopped = False
        try:
            run(["/usr/bin/docker", "compose", "-f", str(BETA_COMPOSE), "stop", "app"], quiet=False)
            stopped = True
            run(["/usr/bin/docker", "run", "--rm", "--user", "0:0", "-v", f"{BETA_VOLUME}:/data", migrate_image,
                 "sh", "-c", f"test -f /data/app.db && cp /data/app.db /data/{backup} && chown 100:101 /data/{backup}"], quiet=False)
            before = _beta_db_sha(migrate_image)
            raw = _run_beta_operation(opid, "apply", migrate_image, qa_phones)
            try:
                report = json.loads(raw)
            except json.JSONDecodeError:
                report = {"operation_id": opid, "mode": "apply", "report": raw}
            after = _beta_db_sha(migrate_image)
            _restart_beta_app()
            stopped = False
            result = {
                "status": "PASS", "version": GATEWAY_VERSION, "environment": "AHF_BETA",
                "mode": "apply", "operation_id": opid, "source_sha": sha,
                "dry_run_evidence_sha": evidence["report_sha"], "backup": backup,
                "db_before_hash": before, "db_after_hash": after,
                "operation_report": report, "production_untouched": True,
                "secret_boundary": "PROTECTED",
            }
            audit("beta-db-op-pass", f"{opid}:{sha[:12]}")
            return result
        except Exception:
            if stopped:
                run(["/usr/bin/docker", "run", "--rm", "--user", "0:0", "-v", f"{BETA_VOLUME}:/data", migrate_image,
                     "sh", "-c", f"test -f /data/{backup} && cp /data/{backup} /data/app.db && chown 100:101 /data/app.db"], quiet=False)
            _restart_beta_app()
            audit("beta-db-op-fail", f"{opid}:{sha[:12]}")
            raise
    finally:
        release_op_lock()


def db_operation(req):
    opid = req["operation_id"]
    mode = req["mode"]
    sha = req["source_sha"]
    audit("db-op-start", f"{opid}:{mode}")
    if remote_main() != sha:
        raise GateError("source SHA is not authoritative main")
    acquire_op_lock()
    try:
        _disk_admission("production-db-operation")
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


# --- governed server-storage hygiene ---------------------------------------

def _read_json(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError, OSError) as error:
        raise GateError(f"invalid or missing gateway state: {path.name}") from error


def _write_json(path, value):
    STATE.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(value, sort_keys=True, separators=(",", ":")), encoding="utf-8")
    os.chmod(temp, 0o600)
    os.replace(temp, path)


def _disk_state():
    stat = os.statvfs("/")
    total = stat.f_blocks * stat.f_frsize
    available = stat.f_bavail * stat.f_frsize
    return {
        "path": "/",
        "total_bytes": total,
        "available_bytes": available,
        "used_bytes": total - available,
        "utilization_percent": round(((total - available) / total) * 100, 2) if total else None,
    }


def _load_storage_policy():
    policy = _read_json(STORAGE_POLICY)
    required = (
        "schema_version", "filesystem", "builder", "builder_scope",
        "emergency_headroom_bytes", "temporary_docker_overhead_bytes",
        "max_build_cache_growth_bytes", "max_cache_bytes", "reserved_cache_bytes",
        "cache_retention_hours", "pressure_cache_retention_hours",
    )
    if policy.get("schema_version") != 1 or policy.get("filesystem") != "/":
        raise GateError("storage policy schema/filesystem mismatch")
    if policy.get("builder_scope") != "AHF_ONLY":
        raise GateError("builder scope is not proven AHF_ONLY")
    if not isinstance(policy.get("builder"), str) or not policy["builder"].strip():
        raise GateError("storage policy builder is missing")
    for key in required[4:]:
        if not isinstance(policy.get(key), int) or policy[key] <= 0:
            raise GateError(f"storage policy value is invalid: {key}")
    return policy


def _image_inspect(ref):
    data = json.loads(run(["/usr/bin/docker", "image", "inspect", ref]))[0]
    return {
        "id": data.get("Id"),
        "size_bytes": int(data.get("Size") or 0),
        "repo_tags": data.get("RepoTags") or [],
        "labels": data.get("Config", {}).get("Labels") or {},
    }


def _compose_refs(path):
    if not path.is_file():
        return []
    text = path.read_text(encoding="utf-8")
    return sorted(set(re.findall(r"(?m)^\s+image:\s+((?:apex-home-fit|ahf-home-fit):[A-Za-z0-9_.-]+)\s*$", text)))


def _compose_runtime_image(path):
    result = run(["/usr/bin/docker", "compose", "-f", str(path), "ps", "-q", "app"])
    container_id = result.splitlines()[0].strip() if result.splitlines() else ""
    if not container_id:
        raise GateError(f"app container is not running for {path}")
    data = json.loads(run(["/usr/bin/docker", "inspect", container_id]))[0]
    configured = ((data.get("Config") or {}).get("Image"))
    image_id = data.get("Image")
    if not configured or not image_id:
        raise GateError("running app identity is incomplete")
    return {"image": configured, "image_id": image_id}


def _rollback_app_ref(path, prefix):
    refs = [ref for ref in _compose_refs(path) if ref.startswith(prefix)]
    app_refs = [ref for ref in refs if "migrate-" not in ref and ":dbop-" not in ref and ":migrate-" not in ref]
    if len(app_refs) != 1:
        raise GateError("rollback compose app identity is ambiguous")
    return app_refs[0]


def _authority_from_state(environment, compose_path, app_prefix):
    state = _read_json(RELEASE_AUTHORITY).get(environment)
    if not isinstance(state, dict) or state.get("rollback_verified") is not True:
        raise GateError(f"{environment} rollback authority is not verified")
    current = state.get("current") or {}
    rollback = state.get("rollback") or {}
    runtime = _compose_runtime_image(compose_path)
    compose_current = compose_image() if environment == "production" else beta_compose_images()[0]
    if current.get("image") != compose_current or runtime["image"] != compose_current:
        raise GateError(f"{environment} current runtime identity drift")
    if rollback.get("image") == compose_current or not rollback.get("image"):
        raise GateError(f"{environment} rollback identity is invalid")
    rollback_info = _image_inspect(rollback["image"])
    if rollback_info["id"] != rollback.get("image_id"):
        raise GateError(f"{environment} rollback image identity drift")
    rollback_compose = compose_path.parent / rollback.get("compose_file", "")
    if not rollback_compose.is_file():
        raise GateError(f"{environment} rollback compose evidence is missing")
    rollback_ref = _rollback_app_ref(rollback_compose, app_prefix)
    if rollback_ref != rollback["image"]:
        raise GateError(f"{environment} rollback compose identity drift")
    return {
        "status": "PASS",
        "environment": environment,
        "release_id": rollback.get("release_id"),
        "current": {"image": compose_current, "image_id": runtime["image_id"]},
        "rollback": {"image": rollback["image"], "image_id": rollback_info["id"]},
        "current_refs": _compose_refs(compose_path),
        "rollback_refs": _compose_refs(rollback_compose),
        "rollback_compose": str(rollback_compose),
    }


def _legacy_authority(environment, compose_path, app_prefix):
    """Recover a single unambiguous authority from existing gateway proof.

    This deliberately does not select by recency. Multiple valid candidates
    are a hard ambiguity until the new release-authority record is established.
    """
    runtime = _compose_runtime_image(compose_path)
    marker_path = STATE / ("rollback-verified" if environment == "production" else ".beta-rollback-verified")
    marker = marker_path.read_text(encoding="utf-8").strip() if marker_path.is_file() else None
    deployed = {}
    if environment == "beta" and not marker:
        deployed_path = BETA_ROOT / ".deployed-commit"
        if deployed_path.is_file():
            deployed = _read_json(deployed_path)
            marker = deployed.get("release_id")
        if not marker:
            marker = "__deployed-image-proof__"
    if environment == "production":
        proof_paths = sorted(STATE.glob("proof-*.json"))
    else:
        proof_paths = sorted(STATE.glob("proof-beta-*.json"))
    candidates = []
    for path in proof_paths:
        try:
            proof = _read_json(path)
            matches_release = proof.get("release_id") == marker
            if environment == "beta" and marker == "__deployed-image-proof__":
                matches_release = proof.get("image") == deployed.get("image") == runtime["image"]
                audit_text = AUDIT.read_text(encoding="utf-8") if AUDIT.is_file() else ""
                matches_release = matches_release and f"event=beta-rollback-verified release={proof.get('release_id')}" in audit_text
            if proof.get("status") != "PASS" or not matches_release or proof.get("image") != runtime["image"]:
                continue
            rollback_path = compose_path.parent / proof.get("rollback", "")
            if not rollback_path.is_file():
                continue
            rollback_ref = _rollback_app_ref(rollback_path, app_prefix)
            rollback_info = _image_inspect(rollback_ref)
            candidates.append({
                "status": "PASS", "environment": environment,
                "current": {"image": runtime["image"], "image_id": runtime["image_id"]},
                "rollback": {"image": rollback_ref, "image_id": rollback_info["id"]},
                "current_refs": _compose_refs(compose_path),
                "rollback_refs": _compose_refs(rollback_path),
                "rollback_compose": str(rollback_path),
                "release_id": proof.get("release_id"),
            })
        except GateError:
            continue
    unique = {(item["current"]["image"], item["rollback"]["image"]): item for item in candidates}
    if len(unique) != 1:
        raise GateError(f"{environment} rollback authority is ambiguous")
    return next(iter(unique.values()))


def _release_authority():
    result = {}
    for environment, compose_path, prefix in (
        ("production", COMPOSE, "apex-home-fit:release-"),
        ("beta", BETA_COMPOSE, "ahf-home-fit:beta-"),
    ):
        try:
            result[environment] = _authority_from_state(environment, compose_path, prefix)
        except GateError as error:
            try:
                result[environment] = _legacy_authority(environment, compose_path, prefix)
            except GateError as legacy_error:
                result[environment] = {
                    "status": "AMBIGUOUS_DO_NOT_DELETE",
                    "environment": environment,
                    "blocker": f"{error}; legacy: {legacy_error}",
                }
    return result


def _docker_image_records():
    raw = run(["/usr/bin/docker", "image", "ls", "--all", "--no-trunc", "--format", "{{json .}}"])
    records = {}
    for line in raw.splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        image_id = row.get("ID") or row.get("Id")
        if not image_id:
            continue
        info = _image_inspect(image_id)
        tags = sorted(set(info["repo_tags"] or ([] if row.get("Repository") in (None, "<none>") else [f"{row['Repository']}:{row.get('Tag', '<none>')}"])))
        records[image_id] = {
            "kind": "image", "identity": image_id, "image_id": image_id,
            "tags": tags, "size_bytes": info["size_bytes"],
            "labels": info["labels"],
            "dangling": not tags,
        }
    return list(records.values())


def _docker_container_records():
    raw = run(["/usr/bin/docker", "ps", "-a", "--no-trunc", "--format", "{{json .}}"])
    result = []
    for line in raw.splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        container_id = row.get("ID") or row.get("Id")
        data = json.loads(run(["/usr/bin/docker", "inspect", container_id]))[0]
        config = data.get("Config") or {}
        state = data.get("State") or {}
        result.append({
            "kind": "container", "identity": container_id,
            "name": str(data.get("Name") or "").lstrip("/"),
            "image": config.get("Image"), "image_id": data.get("Image"),
            "running": bool(state.get("Running")),
            "labels": config.get("Labels") or {},
            "size_rw_bytes": int(data.get("SizeRw") or 0),
        })
    return result


def _artifact_owner(tags):
    if any(tag.startswith(("apex-home-fit:", "apex-home-fit/")) for tag in tags):
        return "production"
    if any(tag.startswith(("ahf-home-fit:", "ahf-beta-app:", "ahf-beta-migrate:")) for tag in tags):
        return "beta"
    return None


def _recognized_owner_tag(owner, tag):
    if owner == "production":
        return tag.startswith(("apex-home-fit:release-", "apex-home-fit:migrate-", "apex-home-fit:dbop-"))
    if owner == "beta":
        return tag.startswith(("ahf-home-fit:beta-", "ahf-beta-app:", "ahf-beta-migrate:"))
    return False


def _lock_state():
    if not OP_LOCK.exists():
        return "ABSENT"
    try:
        pid = int(_read_json(OP_LOCK).get("pid") or 0)
        if pid == os.getpid():
            return "SELF"
        os.kill(pid, 0)
        return "LIVE"
    except (ProcessLookupError, ValueError, TypeError, json.JSONDecodeError, OSError):
        return "STALE"


def _cache_artifact(policy):
    try:
        if policy.get("builder_type", "buildx") == "legacy":
            raw = run(["/usr/bin/docker", "system", "df"])
        else:
            raw = run(["/usr/bin/docker", "buildx", "du", "--builder", policy["builder"]])
        cache_status = "SAFE_TO_DELETE" if policy.get("builder_scope") == "AHF_ONLY" else "AMBIGUOUS_DO_NOT_DELETE"
        return {
            "kind": "build-cache", "identity": f"builder:{policy['builder']}",
            "class": cache_status, "evidence": raw[-4000:],
            "retention_hours": policy["cache_retention_hours"],
        }
    except GateError as error:
        return {"kind": "build-cache", "identity": f"builder:{policy.get('builder', 'unknown')}", "class": "AMBIGUOUS_DO_NOT_DELETE", "blocker": str(error)}


def _storage_audit():
    before = _disk_state()
    blockers = []
    try:
        policy = _load_storage_policy()
    except GateError as error:
        policy = None
        blockers.append(f"STORAGE_POLICY:{error}")
    authority = _release_authority()
    for environment in ("production", "beta"):
        if authority[environment]["status"] != "PASS":
            blockers.append(f"{environment.upper()}_AUTHORITY:{authority[environment].get('blocker', 'ambiguous')}")
    lock = _lock_state()
    if lock in ("LIVE", "STALE"):
        blockers.append(f"ACTIVE_OR_INCOMPLETE_TRANSACTION_LOCK:{lock}")
    images = _docker_image_records()
    containers = _docker_container_records()
    current_ids = set()
    rollback_ids = set()
    current_refs = set()
    rollback_refs = set()
    for environment in ("production", "beta"):
        data = authority[environment]
        if data["status"] != "PASS":
            continue
        current_refs.update(data.get("current_refs", []))
        rollback_refs.update(data.get("rollback_refs", []))
        current_ids.update({_image_inspect(ref)["id"] for ref in data.get("current_refs", [])})
        rollback_ids.update({_image_inspect(ref)["id"] for ref in data.get("rollback_refs", [])})
    active_ids = {item["image_id"] for item in containers if item["running"] and _artifact_owner([item.get("image", "")])}
    artifacts = []
    for image in images:
        owner = _artifact_owner(image["tags"])
        if image["image_id"] in current_ids or any(tag in current_refs for tag in image["tags"]):
            classification = "RETAIN_CURRENT"
        elif image["image_id"] in rollback_ids or any(tag in rollback_refs for tag in image["tags"]):
            classification = "RETAIN_ROLLBACK"
        elif image["image_id"] in active_ids:
            classification = "RETAIN_ACTIVE_TRANSACTION"
        elif owner and authority[owner]["status"] != "PASS":
            classification = "AMBIGUOUS_DO_NOT_DELETE"
        elif owner and all(_recognized_owner_tag(owner, tag) for tag in image["tags"]):
            classification = "SAFE_TO_DELETE"
        else:
            classification = "AMBIGUOUS_DO_NOT_DELETE"
        artifacts.append({**image, "owner": owner, "class": classification})
    for container in containers:
        owner = _artifact_owner([container.get("image", "")])
        if not owner:
            continue
        if container["running"] and container["image_id"] in current_ids:
            classification = "RETAIN_CURRENT"
        elif container["running"]:
            classification = "RETAIN_ACTIVE_TRANSACTION"
        elif container.get("labels", {}).get("com.apexhomefit.recovery") == "required":
            classification = "AMBIGUOUS_DO_NOT_DELETE"
        else:
            classification = "SAFE_TO_DELETE"
        artifacts.append({**container, "owner": owner, "class": classification})
    if policy:
        cache_artifact = _cache_artifact(policy)
        artifacts.append(cache_artifact)
        if cache_artifact["class"] == "AMBIGUOUS_DO_NOT_DELETE":
            blockers.append(f"BUILDER_CACHE:{cache_artifact.get('blocker', 'cache evidence unavailable')}")
    else:
        artifacts.append({"kind": "build-cache", "identity": "builder:unknown", "class": "AMBIGUOUS_DO_NOT_DELETE"})
    return {"before": before, "authority": authority, "lock_state": lock, "artifacts": artifacts, "blockers": blockers, "policy": policy}


def _disk_admission(operation):
    audit_result = _storage_audit()
    blockers = list(audit_result["blockers"])
    if blockers:
        raise GateError(f"disk admission blocked for {operation}: {'; '.join(blockers)}")
    policy = audit_result["policy"]
    images = [item for item in audit_result["artifacts"] if item["kind"] == "image"]
    app_sizes = [item["size_bytes"] for item in images if any(tag.startswith(("apex-home-fit:release-", "ahf-home-fit:beta-")) and "migrate-" not in tag for tag in item.get("tags", []))]
    transaction_sizes = [item["size_bytes"] for item in images if any(":migrate-" in tag or ":dbop-" in tag for tag in item.get("tags", []))]
    if not app_sizes or not transaction_sizes:
        raise GateError(f"disk admission blocked for {operation}: candidate size evidence is incomplete")
    retained_ids = {item["identity"] for item in images if item["class"] in ("RETAIN_CURRENT", "RETAIN_ROLLBACK")}
    retained_bytes = sum(item["size_bytes"] for item in images if item["identity"] in retained_ids)
    candidate_app = max(app_sizes)
    candidate_transaction = max(transaction_sizes)
    volume_bytes = 0
    for volume in (VOLUME, BETA_VOLUME):
        mount = json.loads(run(["/usr/bin/docker", "volume", "inspect", volume]))[0].get("Mountpoint")
        if not mount:
            raise GateError(f"disk admission blocked for {operation}: volume mountpoint unavailable")
        volume_bytes += int(run(["/usr/bin/du", "-sb", mount]).split()[0])
    required = retained_bytes + candidate_app + candidate_transaction + volume_bytes + policy["temporary_docker_overhead_bytes"] + policy["max_build_cache_growth_bytes"] + policy["emergency_headroom_bytes"]
    state = _disk_state()
    if state["available_bytes"] < required:
        raise GateError(f"disk admission blocked for {operation}: available={state['available_bytes']} required={required}")
    return {"status": "PASS", "operation": operation, "before": state, "required_headroom_bytes": required, "components": {
        "retained_current_and_rollback_bytes": retained_bytes,
        "candidate_application_peak_bytes": candidate_app,
        "candidate_migration_peak_bytes": candidate_transaction,
        "database_backup_reserve_bytes": volume_bytes,
        "temporary_docker_overhead_bytes": policy["temporary_docker_overhead_bytes"],
        "max_build_cache_growth_bytes": policy["max_build_cache_growth_bytes"],
        "emergency_headroom_bytes": policy["emergency_headroom_bytes"],
    }, "build_cache": next((item for item in audit_result["artifacts"] if item["kind"] == "build-cache"), None)}


def _bounded_cache_cleanup(policy, available_bytes):
    retention = policy["cache_retention_hours"] if available_bytes >= policy["emergency_headroom_bytes"] else policy["pressure_cache_retention_hours"]
    if policy.get("builder_type", "buildx") == "legacy":
        return {
            "retention_hours": retention,
            "result": run([
                "/usr/bin/docker", "builder", "prune", "--force",
                "--filter", f"until={retention}h",
                "--keep-storage", str(policy["max_cache_bytes"]),
            ], quiet=True),
        }
    return {
        "retention_hours": retention,
        "result": run([
            "/usr/bin/docker", "buildx", "prune", "--builder", policy["builder"], "--force",
            "--filter", f"until={retention}h",
            "--max-used-space", str(policy["max_cache_bytes"]),
            "--min-free-space", str(policy["emergency_headroom_bytes"]),
            "--reserved-space", str(policy["reserved_cache_bytes"]),
        ], quiet=True),
    }


def _save_release_authority(environment, current, rollback, compose_file, current_refs, rollback_refs, rollback_verified=False, release_id=None):
    try:
        document = _read_json(RELEASE_AUTHORITY) if RELEASE_AUTHORITY.is_file() else {"schema_version": 1}
    except GateError:
        document = {"schema_version": 1}
    document["schema_version"] = 1
    document[environment] = {
        "current": current, "rollback": {**rollback, "compose_file": compose_file, "release_id": release_id},
        "current_refs": sorted(set(current_refs)), "rollback_refs": sorted(set(rollback_refs)),
        "rollback_verified": rollback_verified,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    _write_json(RELEASE_AUTHORITY, document)


def _storage_hygiene(req):
    audit_event = "storage-hygiene-audit" if req["mode"] == "audit" else "storage-hygiene-cleanup"
    acquire_op_lock()
    try:
        result = _storage_audit()
        # A read-only audit may canonicalize a single, evidence-backed legacy
        # proof into the new authority record. It never invents or selects by
        # age; ambiguity remains a blocker.
        for environment in ("production", "beta"):
            authority = result["authority"][environment]
            if authority.get("status") != "PASS" or not authority.get("release_id"):
                continue
            existing = {}
            if RELEASE_AUTHORITY.is_file():
                try:
                    existing = _read_json(RELEASE_AUTHORITY)
                except GateError:
                    existing = {}
            if not (existing.get(environment) or {}).get("rollback_verified"):
                _save_release_authority(
                    environment, authority["current"], authority["rollback"],
                    Path(authority["rollback_compose"]).name,
                    authority.get("current_refs", []), authority.get("rollback_refs", []),
                    rollback_verified=True, release_id=authority["release_id"],
                )
        removed = []
        errors = []
        if req["mode"] == "cleanup":
            safe_containers = [item for item in result["artifacts"] if item["kind"] == "container" and item["class"] == "SAFE_TO_DELETE"]
            safe_images = [item for item in result["artifacts"] if item["kind"] == "image" and item["class"] == "SAFE_TO_DELETE"]
            for item in safe_containers:
                try:
                    run(["/usr/bin/docker", "container", "rm", item["identity"]], quiet=False)
                    removed.append({"kind": "container", "identity": item["identity"], "class": item["class"], "size_rw_bytes": item.get("size_rw_bytes", 0)})
                except GateError as error:
                    errors.append({"kind": "container", "identity": item["identity"], "error": str(error)})
            for item in safe_images:
                try:
                    run(["/usr/bin/docker", "image", "rm", item["identity"]], quiet=False)
                    removed.append({"kind": "image", "identity": item["identity"], "tags": item.get("tags", []), "class": item["class"], "size_bytes": item.get("size_bytes", 0)})
                except GateError as error:
                    errors.append({"kind": "image", "identity": item["identity"], "error": str(error)})
            cache_artifact = next((item for item in result["artifacts"] if item["kind"] == "build-cache"), None)
            if result["policy"] and result["policy"].get("builder_scope") == "AHF_ONLY" and cache_artifact and cache_artifact.get("class") == "SAFE_TO_DELETE":
                try:
                    cache = _bounded_cache_cleanup(result["policy"], result["before"]["available_bytes"])
                except GateError as error:
                    cache = {"status": "BLOCKED", "reason": str(error)}
                    errors.append({"kind": "build-cache", "identity": f"builder:{result['policy']['builder']}", "error": str(error)})
            else:
                cache = {"status": "BLOCKED", "reason": "builder scope is not proven AHF_ONLY"}
        else:
            cache = next((item for item in result["artifacts"] if item["kind"] == "build-cache"), None)
        after = _disk_state()
        status = "PASS" if not result["blockers"] and not errors else "BLOCKED"
        report = {
            "status": status, "version": GATEWAY_VERSION, "mode": req["mode"],
            "application_release_status": "UNCHANGED", "storage_hygiene_status": status,
            "filesystem_before": result["before"], "filesystem_after": after,
            "authority": result["authority"], "lock_state": result["lock_state"],
            "artifacts": result["artifacts"], "removed": removed,
            "actual_storage_reclaimed_bytes": sum(item.get("size_bytes", 0) for item in removed),
            "filesystem_available_delta_bytes": after["available_bytes"] - result["before"]["available_bytes"],
            "build_cache": cache, "blockers": result["blockers"], "errors": errors,
        }
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        _write_json(STATE / f"storage-hygiene-{stamp}.json", report)
        audit(audit_event, status)
        return report
    finally:
        release_op_lock()


def release(req):
    release_id = req["release_id"]
    sha = req["source_sha"]
    expected = req["expected_current_image"]
    audit("release-start", release_id)
    acquire_op_lock()
    try:
        admission = _disk_admission("production-release")
        if remote_main() != sha:
            raise GateError("source SHA is not authoritative main")
        topology(expected)
        values = env_values()
        target = f"apex-home-fit:release-{sha[:12]}"
        ops = f"apex-home-fit:migrate-{sha[:12]}"
        previous_image_id = _image_inspect(expected)["id"]
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
                migrated = True
                run(["/usr/bin/docker", "run", "--rm", "--user", "0:0", "-e", "DATABASE_URL=file:/data/app.db", "-v", f"{VOLUME}:/data", ops,
                     "sh", "-c", "./node_modules/.bin/prisma migrate deploy >/dev/null && chown -R 100:101 /data"], quiet=False)
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
        proof = {"release_id": release_id, "phase": req["phase"], "source_sha": sha, "image": target, "rollback": rollback.name, "status": "PASS", "application_release_status": "PASS", "storage_hygiene_status": "PENDING_ROLLBACK_VERIFICATION", "disk_admission": admission, "filesystem_after": _disk_state()}
        (STATE / f"proof-{req['phase']}.json").write_text(json.dumps(proof))
        os.chmod(STATE / f"proof-{req['phase']}.json", 0o600)
        _save_release_authority(
            "production",
            {"image": target, "image_id": image_id, "source_sha": sha},
            {"image": expected, "image_id": previous_image_id},
            rollback.name,
            _compose_refs(COMPOSE),
            _compose_refs(rollback),
            rollback_verified=False,
            release_id=release_id,
        )
        audit("release-pass", release_id)
        return {**proof, "version": GATEWAY_VERSION, "image_id": image_id, "db_changed": False, "health": "PASS", "secret_boundary": "PROTECTED"}
    finally:
        release_op_lock()


def verify_rollback(req):
    proof = STATE / "proof-pre-hardening.json"
    if RELEASE_AUTHORITY.is_file():
        authority_doc = _read_json(RELEASE_AUTHORITY)
        authority = authority_doc.get("production") or {}
        rollback_state = authority.get("rollback") or {}
        if rollback_state.get("release_id") != req["release_id"]:
            raise GateError("Production rollback release identity mismatch")
        data = {"image": (authority.get("current") or {}).get("image"), "rollback": rollback_state.get("compose_file")}
        rollback = ROOT / data["rollback"]
        previous = rollback_state.get("image")
        previous_info = _image_inspect(previous)
        if previous_info["id"] != rollback_state.get("image_id"):
            raise GateError("Production rollback image identity drift")
        _save_release_authority(
            "production", authority.get("current") or {}, rollback_state, rollback_state.get("compose_file"),
            _compose_refs(COMPOSE), _compose_refs(rollback), rollback_verified=True,
            release_id=req["release_id"],
        )
        (STATE / "rollback-verified").write_text(req["release_id"], encoding="utf-8")
        storage = _storage_hygiene({"mode": "cleanup"})
        audit("rollback-verified", req["release_id"])
        return {"status": "PASS", "version": GATEWAY_VERSION, "rollback": "VERIFIED", "previous_image": previous, "application_release_status": "UNCHANGED", "storage_hygiene_status": storage["status"], "storage_hygiene_report": storage}
    if not proof.is_file():
        raise GateError("pre-hardening release proof missing")
    data = json.loads(proof.read_text())
    rollback = ROOT / data["rollback"]
    if not rollback.is_file() or rollback.stat().st_mode & 0o077:
        raise GateError("rollback compose evidence invalid")
    previous = compose_image() if data["image"] != compose_image() else re.search(r"(?m)^\s+image:\s+(apex-home-fit:[^\s]+)", rollback.read_text()).group(1)
    _image_inspect(previous)
    marker = STATE / "rollback-verified"
    marker.write_text(req["release_id"], encoding="utf-8")
    os.chmod(marker, 0o600)
    storage = _storage_hygiene({"mode": "cleanup"})
    audit("rollback-verified", req["release_id"])
    return {"status": "PASS", "version": GATEWAY_VERSION, "rollback": "VERIFIED", "previous_image": previous, "application_release_status": "UNCHANGED", "storage_hygiene_status": storage["status"], "storage_hygiene_report": storage}


def handle(req):
    base_guard()
    validate_request(req)
    if req["action"] == "status":
        return {"status": "READY", "version": GATEWAY_VERSION, "host": HOST, "image": compose_image(), "volume": VOLUME, "secret_boundary": "PROTECTED"}
    if req["action"] == "beta-status":
        return beta_status()
    if req["action"] == "storage-hygiene":
        return _storage_hygiene(req)
    if req["action"] == "beta-verify-rollback":
        return beta_verify_rollback(req)
    if req["action"] == "beta-db-operation":
        return beta_db_operation(req)
    if req["action"] == "verify-rollback":
        return verify_rollback(req)
    if req["action"] == "db-operation":
        return db_operation(req)
    if req["action"] == "beta-release":
        return beta_release(req)
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
            try:
                conn.sendall((json.dumps(response, sort_keys=True) + "\n").encode())
            except BrokenPipeError:
                # A caller may time out or disconnect after the bounded
                # operation has begun. The operation's own rollback/receipt
                # semantics remain authoritative; a lost response must not
                # terminate the daemon and strand the deployment capability.
                audit("response-disconnected")


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
    check("db-operation mg09-adopt dry-run valid", lambda: valid({"action": "db-operation", "schema_version": 1, "operation_id": "mg09-movement-graph-adopt", "mode": "dry-run", "source_sha": "a" * 40}))
    check("db-operation mg09-adopt apply requires evidence", lambda: valid({"action": "db-operation", "schema_version": 1, "operation_id": "mg09-movement-graph-adopt", "mode": "apply", "source_sha": "a" * 40, "dry_run_evidence_sha": "b" * 64}))
    check("db-operation unknown operation rejected", lambda: invalid({"action": "db-operation", "schema_version": 1, "operation_id": "drop-tables", "mode": "apply", "source_sha": "a" * 40, "dry_run_evidence_sha": "b" * 64}))
    check("db-operation unknown mode rejected", lambda: invalid({"action": "db-operation", "schema_version": 1, "operation_id": "s02e-exercise-identity-backfill", "mode": "exploit", "source_sha": "a" * 40}))
    check("db-operation unknown fields rejected", lambda: invalid({"action": "db-operation", "schema_version": 1, "operation_id": "s02e-exercise-identity-backfill", "mode": "dry-run", "source_sha": "a" * 40, "sql": "DROP TABLE users"}))
    check("db-operation bad source sha rejected", lambda: invalid({"action": "db-operation", "schema_version": 1, "operation_id": "s02e-exercise-identity-backfill", "mode": "dry-run", "source_sha": "short"}))
    check("release db_change=true still rejected", lambda: invalid({"action": "release", "schema_version": 1, "release_id": "x-1", "db_change": True, "source_sha": "a" * 40, "expected_current_image": "apex-home-fit:x", "phase": "normal"}))
    check("release db_change=false valid", lambda: valid({"action": "release", "schema_version": 1, "release_id": "x-1", "db_change": False, "source_sha": "a" * 40, "expected_current_image": "apex-home-fit:x", "phase": "normal"}))
    check("Beta release valid", lambda: valid({"action": "beta-release", "schema_version": 1, "release_id": "beta-1", "db_change": False, "source_sha": "a" * 40, "expected_current_image": "ahf-home-fit:beta-current", "phase": "beta"}))
    check("Beta schema-changing release valid", lambda: valid({"action": "beta-release", "schema_version": 1, "release_id": "beta-1", "db_change": True, "source_sha": "a" * 40, "expected_current_image": "ahf-home-fit:beta-current", "phase": "beta"}))
    check("Beta release requires boolean db_change", lambda: invalid({"action": "beta-release", "schema_version": 1, "release_id": "beta-1", "db_change": "yes", "source_sha": "a" * 40, "expected_current_image": "ahf-home-fit:beta-current", "phase": "beta"}))
    check("Beta release cannot use Production image", lambda: invalid({"action": "beta-release", "schema_version": 1, "release_id": "beta-1", "db_change": False, "source_sha": "a" * 40, "expected_current_image": "apex-home-fit:release-current", "phase": "beta"}))
    check("Beta release requires Beta phase", lambda: invalid({"action": "beta-release", "schema_version": 1, "release_id": "beta-1", "db_change": False, "source_sha": "a" * 40, "expected_current_image": "ahf-home-fit:beta-current", "phase": "normal"}))
    check("Beta db-operation dry-run valid", lambda: valid({"action": "beta-db-operation", "schema_version": 1, "operation_id": "beta-qa-program-assign", "mode": "dry-run", "source_sha": "a" * 40}))
    check("Beta db-operation apply requires evidence", lambda: valid({"action": "beta-db-operation", "schema_version": 1, "operation_id": "beta-qa-program-assign", "mode": "apply", "source_sha": "a" * 40, "dry_run_evidence_sha": "b" * 64}))
    check("Beta db-operation unknown operation rejected", lambda: invalid({"action": "beta-db-operation", "schema_version": 1, "operation_id": "drop-tables", "mode": "dry-run", "source_sha": "a" * 40}))
    check("Beta db-operation rehearsal rejected", lambda: invalid({"action": "beta-db-operation", "schema_version": 1, "operation_id": "beta-qa-program-assign", "mode": "rehearsal", "source_sha": "a" * 40}))
    check("storage hygiene audit valid", lambda: valid({"action": "storage-hygiene", "schema_version": 1, "mode": "audit"}))
    check("storage hygiene cleanup valid", lambda: valid({"action": "storage-hygiene", "schema_version": 1, "mode": "cleanup"}))
    check("storage hygiene invalid mode rejected", lambda: invalid({"action": "storage-hygiene", "schema_version": 1, "mode": "delete-all"}))
    check("storage recognizes only governed Production tags", lambda: (_ for _ in ()).throw(AssertionError()) if not _recognized_owner_tag("production", "apex-home-fit:migrate-a") or _recognized_owner_tag("production", "apex-home-fit:latest") else None)
    check("storage recognizes Beta migration namespaces", lambda: (_ for _ in ()).throw(AssertionError()) if not _recognized_owner_tag("beta", "ahf-home-fit:beta-migrate-a") or not _artifact_owner(["ahf-beta-migrate:latest"]) else None)
    check("storage has exactly five operational classes", lambda: (_ for _ in ()).throw(AssertionError()) if set(STORAGE_CLASSES) != {"RETAIN_CURRENT", "RETAIN_ROLLBACK", "RETAIN_ACTIVE_TRANSACTION", "SAFE_TO_DELETE", "AMBIGUOUS_DO_NOT_DELETE"} else None)
    check("allowlist exact", lambda: (_ for _ in ()).throw(AssertionError()) if set(OPERATION_ALLOWLIST) != {"s02e-exercise-identity-backfill", "mg09-movement-graph-adopt", "prisma-migrate-deploy"} else None)
    check("evidence sha format", lambda: (_ for _ in ()).throw(AssertionError()) if not re.fullmatch(r"[0-9a-f]{64}", "b" * 64) else None)
    check("canonical json stable", lambda: (_ for _ in ()).throw(AssertionError()) if _canonical({"a": 1, "b": [2, 3]}) != _canonical({"b": [2, 3], "a": 1}) else None)

    # Mount contract: dry-run is ALWAYS read-only; apply/rehearsal are RW and
    # rehearsal points DATABASE_URL at the clone.
    check("dry-run mounts volume read-only (script)", lambda: (_ for _ in ()).throw(AssertionError()) if f"{VOLUME}:/data:ro" not in _op_command("s02e-exercise-identity-backfill", "dry-run", "img") else None)
    check("dry-run mounts volume read-only (migrate)", lambda: (_ for _ in ()).throw(AssertionError()) if f"{VOLUME}:/data:ro" not in _op_command("prisma-migrate-deploy", "dry-run", "img") else None)
    check("apply mounts volume read-write", lambda: (_ for _ in ()).throw(AssertionError()) if f"{VOLUME}:/data" not in _op_command("s02e-exercise-identity-backfill", "apply", "img") or f"{VOLUME}:/data:ro" in _op_command("s02e-exercise-identity-backfill", "apply", "img") else None)
    check("rehearsal targets the clone", lambda: (_ for _ in ()).throw(AssertionError()) if "file:/data/app.db.rehearsal-" not in " ".join(_op_command("s02e-exercise-identity-backfill", "apply", "img", "tok123")) else None)
    check("operations run with no network", lambda: (_ for _ in ()).throw(AssertionError()) if "--network" not in _op_command("s02e-exercise-identity-backfill", "apply", "img") or "none" not in _op_command("s02e-exercise-identity-backfill", "apply", "img") else None)
    check("Beta operation allowlist exact", lambda: (_ for _ in ()).throw(AssertionError()) if set(BETA_OPERATION_ALLOWLIST) != {"beta-qa-program-assign"} else None)
    check("Beta operation is network isolated", lambda: (_ for _ in ()).throw(AssertionError()) if "--network" not in _beta_operation_command("beta-qa-program-assign", "dry-run", "img", "qa") or "none" not in _beta_operation_command("beta-qa-program-assign", "dry-run", "img", "qa") else None)

    def run_error_detail():
        try:
            run(["sh", "-c", "echo boom >&2; exit 1"])
        except GateError as error:
            return str(error)
        return ""
    check("run() error carries output head+tail", lambda: (_ for _ in ()).throw(AssertionError()) if "boom" not in run_error_detail() else None)
    check("run() quiet=True returns captured stdout", lambda: (_ for _ in ()).throw(AssertionError()) if run(["sh", "-c", "echo hello"], quiet=True) != "hello" else None)
    check("run() quiet=False discards stdout", lambda: (_ for _ in ()).throw(AssertionError()) if run(["sh", "-c", "echo hello"], quiet=False) != "" else None)

    # All docker options (-e/-v/--network/--rm) must precede the image name;
    # only the container command (sh -c ...) may follow it.
    def assert_no_docker_opts_after_image(cmd, image):
        if image not in cmd:
            raise AssertionError("image missing from command")
        for token in cmd[cmd.index(image) + 1:]:
            if token in ("-e", "-v", "--network", "--rm"):
                raise AssertionError(f"docker option after image: {token}")
    check("docker options precede image (script dry-run)", lambda: assert_no_docker_opts_after_image(_op_command("s02e-exercise-identity-backfill", "dry-run", "img"), "img"))
    check("docker options precede image (script apply)", lambda: assert_no_docker_opts_after_image(_op_command("s02e-exercise-identity-backfill", "apply", "img", "tok"), "img"))
    check("docker options precede image (migrate apply)", lambda: assert_no_docker_opts_after_image(_op_command("prisma-migrate-deploy", "apply", "img"), "img"))

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
