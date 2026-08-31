#!/usr/bin/env python3
"""Root-only Apex Home Fit deployment daemon; emits sanitized JSON only."""

from __future__ import annotations
import json, os, re, shutil, socket, struct, subprocess, tarfile, tempfile, time, urllib.request
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
REQUEST_KEYS = {"action", "schema_version", "release_id", "source_sha", "expected_current_image", "db_change", "phase"}

class GateError(RuntimeError): pass

def run(args, *, cwd=None, quiet=True):
    result = subprocess.run(args, cwd=cwd, text=True, capture_output=quiet, check=False)
    if result.returncode:
        raise GateError(f"allowlisted command failed: {Path(args[0]).name}")
    return result.stdout.strip() if quiet else ""

def audit(event, release="-"):
    with AUDIT.open("a", encoding="utf-8") as handle:
        handle.write(f"{time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())} event={event} release={release}\n")

def base_guard():
    if os.geteuid() != 0 or run(["/usr/bin/hostname"]) != HOST: raise GateError("host/root invariant failed")
    if not COMPOSE.is_file() or not ENV_FILE.is_file(): raise GateError("canonical deployment files missing")
    st = ENV_FILE.stat()
    if st.st_uid != 0 or st.st_mode & 0o077: raise GateError("protected environment invariant failed")

def env_values():
    values = {}
    for raw in ENV_FILE.read_text(encoding="utf-8").splitlines():
        if not raw.strip() or raw.lstrip().startswith("#") or "=" not in raw: continue
        key, value = raw.split("=", 1); values[key.strip()] = value.strip().strip('"').strip("'")
    for key in ("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SITE_URL"):
        if not values.get(key): raise GateError(f"required configuration absent: {key}")
    return values

def compose_image():
    match = re.search(r"(?m)^\s+image:\s+(apex-home-fit:[A-Za-z0-9_.-]+)\s*$", COMPOSE.read_text())
    if not match: raise GateError("canonical compose image invariant failed")
    return match.group(1)

def validate_request(req):
    if not isinstance(req, dict) or set(req) - REQUEST_KEYS: raise GateError("unknown request fields")
    if req.get("schema_version") != 1: raise GateError("unsupported request schema")
    if req.get("action") not in ("status", "release", "verify-rollback"): raise GateError("unsupported action")
    if req["action"] == "status": return
    if not isinstance(req.get("release_id"), str) or not re.fullmatch(r"[a-z0-9][a-z0-9-]{2,63}", req["release_id"]): raise GateError("invalid release id")
    if req["action"] == "verify-rollback": return
    if req.get("db_change") is not False: raise GateError("database-changing releases unsupported")
    if not isinstance(req.get("source_sha"), str) or not re.fullmatch(r"[0-9a-f]{40}", req["source_sha"]): raise GateError("invalid source SHA")
    if not isinstance(req.get("expected_current_image"), str) or not re.fullmatch(r"apex-home-fit:[A-Za-z0-9_.-]+", req["expected_current_image"]): raise GateError("invalid current image")
    if req.get("phase") not in ("pre-hardening", "post-hardening", "normal"): raise GateError("invalid acceptance phase")

def remote_main():
    request = urllib.request.Request(f"https://api.github.com/repos/{REPO}/commits/main", headers={"User-Agent":"apex-gateway/1"})
    with urllib.request.urlopen(request, timeout=20) as response: sha = json.load(response).get("sha")
    if not isinstance(sha, str) or not re.fullmatch(r"[0-9a-f]{40}", sha): raise GateError("authoritative main unavailable")
    return sha

def topology(expected):
    if compose_image() != expected: raise GateError("current image drift")
    if run(["/usr/bin/docker","volume","ls","-q","--filter",f"name=^{VOLUME}$"]) != VOLUME: raise GateError("database volume drift")
    config = json.loads(run(["/usr/bin/docker","compose","-f",str(COMPOSE),"config","--format","json"]))
    app = config.get("services",{}).get("app",{})
    mounts = app.get("volumes",[])
    if app.get("image") != expected or not any(v.get("source")==VOLUME and v.get("target")=="/data" for v in mounts): raise GateError("compose topology drift")
    if "127.0.0.1" not in json.dumps(app.get("ports",[])): raise GateError("port binding drift")

def extract(archive, destination):
    with tarfile.open(archive,"r:gz") as bundle:
        for member in bundle.getmembers():
            target=(destination/member.name).resolve()
            if destination.resolve() not in target.parents or member.issym() or member.islnk() or member.isdev(): raise GateError("unsafe source archive")
        bundle.extractall(destination)
    roots=[item for item in destination.iterdir() if item.is_dir()]
    if len(roots)!=1 or not (roots[0]/"Dockerfile").is_file() or not (roots[0]/"package-lock.json").is_file(): raise GateError("source layout drift")
    dockerfile=(roots[0]/"Dockerfile").read_text()
    if dockerfile.count(f"node:22-alpine@{BASE_DIGEST}") != 3: raise GateError("immutable base-image pin drift")
    return roots[0]

def update_image(target):
    text=COMPOSE.read_text(); updated,count=re.subn(r"(?m)^(\s+image:\s+)apex-home-fit:[A-Za-z0-9_.-]+\s*$",rf"\g<1>{target}",text)
    if count!=1: raise GateError("compose update not singular")
    temp=COMPOSE.with_suffix(".gateway-tmp"); temp.write_text(updated); os.chmod(temp,0o644); os.replace(temp,COMPOSE)

def release(req):
    release_id=req["release_id"]; sha=req["source_sha"]; expected=req["expected_current_image"]
    audit("release-start",release_id)
    if remote_main()!=sha: raise GateError("source SHA is not authoritative main")
    topology(expected); values=env_values()
    target=f"apex-home-fit:release-{sha[:12]}"; ops=f"apex-home-fit:migrate-{sha[:12]}"
    rollback=ROOT/f"compose.yml.rollback-{release_id}"; backup=f"gateway-backup-{release_id}.db"
    stopped=False; migrated=False
    with tempfile.TemporaryDirectory(prefix="apex-gateway-") as td:
        temp=Path(td); archive=temp/"source.tar.gz"
        urllib.request.urlretrieve(f"https://github.com/{REPO}/archive/{sha}.tar.gz",archive)
        source=extract(archive,temp/"source")
        args=["--build-arg","NPM_REGISTRY=https://package-mirror.liara.ir/repository/npm/","--build-arg",f"NEXT_PUBLIC_SUPABASE_URL={values['NEXT_PUBLIC_SUPABASE_URL']}","--build-arg",f"NEXT_PUBLIC_SUPABASE_ANON_KEY={values['NEXT_PUBLIC_SUPABASE_ANON_KEY']}","--build-arg",f"NEXT_PUBLIC_SITE_URL={values['NEXT_PUBLIC_SITE_URL']}"]
        run(["/usr/bin/docker","image","inspect",f"node:22-alpine@{BASE_DIGEST}","--format","{{.Id}}"])
        run(["/usr/bin/docker","build","--pull=false","--target","runner","-t",target,*args,str(source)],quiet=False)
        run(["/usr/bin/docker","build","--pull=false","--target","build","-t",ops,*args,str(source)],quiet=False)
        image_id=run(["/usr/bin/docker","image","inspect",target,"--format","{{.Id}}"])
        version=run(["/usr/bin/docker","run","--rm",ops,"./node_modules/.bin/prisma","--version"])
        if f"prisma                  : {PRISMA}" not in version: raise GateError("pinned migration tooling drift")
        shutil.copy2(COMPOSE,rollback); os.chmod(rollback,0o600)
        try:
            run(["/usr/bin/docker","compose","-f",str(COMPOSE),"stop","app"],quiet=False); stopped=True
            run(["/usr/bin/docker","run","--rm","--user","0:0","-v",f"{VOLUME}:/data",ops,"sh","-c",f"test -f /data/app.db && cp /data/app.db /data/{backup} && chown 100:101 /data/{backup}"],quiet=False)
            before=run(["/usr/bin/docker","run","--rm","-v",f"{VOLUME}:/data:ro",ops,"sha256sum","/data/app.db"]).split()[0]
            run(["/usr/bin/docker","run","--rm","--user","0:0","-e","DATABASE_URL=file:/data/app.db","-v",f"{VOLUME}:/data",ops,"sh","-c","./node_modules/.bin/prisma migrate deploy >/dev/null && chown -R 100:101 /data"],quiet=False); migrated=True
            after=run(["/usr/bin/docker","run","--rm","-v",f"{VOLUME}:/data:ro",ops,"sha256sum","/data/app.db"]).split()[0]
            if before!=after: raise GateError("database changed in DB_CHANGED=NO release")
            update_image(target)
            run(["/usr/bin/docker","compose","-f",str(COMPOSE),"up","-d","--no-deps","--force-recreate","app"],quiet=False)
            for _ in range(20):
                try: run(["/usr/bin/curl","--fail","--silent","--max-time","5","http://127.0.0.1:3000/en"]); break
                except GateError: time.sleep(3)
            else: raise GateError("health verification failed")
            topology(target)
        except Exception:
            if stopped:
                shutil.copy2(rollback,COMPOSE)
                if migrated:
                    run(["/usr/bin/docker","run","--rm","--user","0:0","-v",f"{VOLUME}:/data",ops,"sh","-c",f"test -f /data/{backup} && cp /data/{backup} /data/app.db && chown 100:101 /data/app.db"],quiet=False)
                run(["/usr/bin/docker","compose","-f",str(COMPOSE),"up","-d","--no-deps","--force-recreate","app"],quiet=False)
            audit("release-rolled-back",release_id); raise
    proof={"release_id":release_id,"phase":req["phase"],"source_sha":sha,"image":target,"rollback":rollback.name,"status":"PASS"}
    (STATE/f"proof-{req['phase']}.json").write_text(json.dumps(proof)); os.chmod(STATE/f"proof-{req['phase']}.json",0o600)
    audit("release-pass",release_id)
    return {**proof,"image_id":image_id,"db_changed":False,"health":"PASS","secret_boundary":"PROTECTED"}

def verify_rollback(req):
    proof=STATE/"proof-pre-hardening.json"
    if not proof.is_file(): raise GateError("pre-hardening release proof missing")
    data=json.loads(proof.read_text()); rollback=ROOT/data["rollback"]
    if not rollback.is_file() or rollback.stat().st_mode & 0o077: raise GateError("rollback compose evidence invalid")
    previous=compose_image() if data["image"]!=compose_image() else re.search(r"(?m)^\s+image:\s+(apex-home-fit:[^\s]+)",rollback.read_text()).group(1)
    run(["/usr/bin/docker","image","inspect",previous,"--format","{{.Id}}"])
    marker=STATE/"rollback-verified"; marker.write_text(req["release_id"]); os.chmod(marker,0o600)
    audit("rollback-verified",req["release_id"])
    return {"status":"PASS","rollback":"VERIFIED","previous_image":"AVAILABLE"}

def handle(req):
    base_guard(); validate_request(req)
    if req["action"]=="status": return {"status":"READY","host":HOST,"image":compose_image(),"volume":VOLUME,"secret_boundary":"PROTECTED"}
    if req["action"]=="verify-rollback": return verify_rollback(req)
    return release(req)

def main():
    base_guard(); SOCKET.parent.mkdir(parents=True,exist_ok=True)
    if SOCKET.exists(): SOCKET.unlink()
    server=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM); server.bind(str(SOCKET)); os.chown(SOCKET,0,os.getgid()); os.chmod(SOCKET,0o660); server.listen(4)
    while True:
        conn,_=server.accept()
        with conn:
            uid=struct.unpack("3i",conn.getsockopt(socket.SOL_SOCKET,socket.SO_PEERCRED,12))[1]
            try:
                if uid not in (0,1000): raise GateError("caller identity rejected")
                payload=conn.recv(16385)
                if len(payload)>16384: raise GateError("request too large")
                response={"ok":True,"result":handle(json.loads(payload.decode()))}
            except Exception as error:
                audit("request-fail"); response={"ok":False,"error":str(error)}
            conn.sendall((json.dumps(response,sort_keys=True)+"\n").encode())

if __name__=="__main__": main()
