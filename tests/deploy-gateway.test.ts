import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import test from 'node:test';

const gateway = 'ops/deploy-gateway/apex_deploy_gateway.py';

function validate(payload: Record<string, unknown>) {
  const source = `import importlib.util,json\ns=importlib.util.spec_from_file_location('g',${JSON.stringify(gateway)})\ng=importlib.util.module_from_spec(s);s.loader.exec_module(g)\ntry:\n g.validate_request(json.loads(${JSON.stringify(JSON.stringify(payload))}));print('PASS')\nexcept Exception as e:\n print(type(e).__name__)`;
  return spawnSync('python3', ['-c', source], {encoding: 'utf8'});
}

test('gateway accepts only the bounded non-DB release schema', () => {
  const valid = {action:'release',schema_version:1,release_id:'release-001',source_sha:'a'.repeat(40),expected_current_image:'apex-home-fit:current',db_change:false,phase:'normal'};
  assert.equal(validate(valid).stdout.trim(), 'PASS');
  assert.equal(validate({...valid, db_change:true}).stdout.trim(), 'GateError');
  assert.equal(validate({...valid, command:'docker ps'}).stdout.trim(), 'GateError');
  assert.equal(validate({...valid, source_sha:'main'}).stdout.trim(), 'GateError');
});

test('gateway accepts Beta only through the explicit isolated Beta schema', () => {
  const valid = {action:'beta-release',schema_version:1,release_id:'beta-001',source_sha:'a'.repeat(40),expected_current_image:'ahf-home-fit:beta-current',db_change:false,phase:'beta'};
  assert.equal(validate(valid).stdout.trim(), 'PASS');
  assert.equal(validate({...valid, expected_current_image:'apex-home-fit:release-current'}).stdout.trim(), 'GateError');
  assert.equal(validate({...valid, phase:'normal'}).stdout.trim(), 'GateError');
});

test('gateway allowlists the S02-E backfill and the MG-09 adoption operations', () => {
  const source = readFileSync(gateway, 'utf8');
  assert.match(source, /"s02e-exercise-identity-backfill"/);
  assert.match(source, /"mg09-movement-graph-adopt"/);
  assert.match(source, /scripts\/gateway-db-ops\/mg09-movement-graph-adopt\.mjs/);
});

test('gateway accepts a dry-run db-operation for the MG-09 adoption op', () => {
  const valid = {action:'db-operation',schema_version:1,operation_id:'mg09-movement-graph-adopt',mode:'dry-run',source_sha:'a'.repeat(40)};
  assert.equal(validate(valid).stdout.trim(), 'PASS');
  // apply without evidence is refused by the shared gate.
  const noEvidence = {...valid, mode:'apply'};
  assert.equal(validate(noEvidence).stdout.trim(), 'GateError');
});

test('gateway source is fixed to canonical host, repository, compose and volume', () => {
  const source = readFileSync(gateway, 'utf8');
  assert.match(source, /HOST = "sabtbrooker"/);
  assert.match(source, /REPO = "msaeedlavasani\/Apex-Home-Fitness"/);
  assert.match(source, /COMPOSE = ROOT \/ "compose.yml"/);
  assert.match(source, /VOLUME = "apexhomefit_prod_db"/);
  assert.match(source, /BETA_VOLUME = "ahf_beta_db"/);
  assert.match(source, /BETA_HOSTNAME = "beta\.apexhomefit\.ir"/);
  assert.match(source, /BETA_SOURCE_REF = "feat\/workout-v2-first-slice"/);
  assert.match(source, /BETA_PR_NUMBER = 72/);
  assert.match(source, /PRISMA = "6\.19\.3"/);
  assert.doesNotMatch(source, /shell=True/);
});

test('Beta installer and service explicitly preserve Production isolation', () => {
  const installer = readFileSync('ops/deploy-gateway/install-beta-path.sh', 'utf8');
  const service = readFileSync('ops/deploy-gateway/install-gateway.sh', 'utf8');
  assert.match(installer, /ahf_beta_db/);
  assert.match(installer, /host_ip.*127\.0\.0\.1/);
  assert.match(installer, /published.*3100/);
  assert.match(installer, /apexhomefit_prod_db/);
  assert.match(service, /\/opt\/ahf-beta/);
});

test('bootstrap preserves legacy privileges and hardening is proof-gated', () => {
  const bootstrap = readFileSync('ops/deploy-gateway/install-bootstrap.sh', 'utf8');
  const harden = readFileSync('ops/deploy-gateway/harden-after-proof.sh', 'utf8');
  assert.doesNotMatch(bootstrap, /sudoers\.d\/apexadmin/);
  assert.doesNotMatch(bootstrap, /gpasswd -d/);
  assert.match(harden, /proof-pre-hardening\.json/);
  assert.match(harden, /rollback-verified/);
  assert.match(harden, /rm -f \/etc\/sudoers\.d\/apexadmin/);
  assert.match(harden, /gpasswd -d apexadmin docker/);
});

test('unprivileged client uses only the gateway Unix socket', () => {
  const client = readFileSync('ops/deploy-gateway/apex-deploy', 'utf8');
  assert.match(client, /AF_UNIX/);
  assert.doesNotMatch(client, /sudo|docker|subprocess/);
});
