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

test('gateway source is fixed to canonical host, repository, compose and volume', () => {
  const source = readFileSync(gateway, 'utf8');
  assert.match(source, /HOST = "sabtbrooker"/);
  assert.match(source, /REPO = "msaeedlavasani\/Apex-Home-Fitness"/);
  assert.match(source, /COMPOSE = ROOT \/ "compose.yml"/);
  assert.match(source, /VOLUME = "apexhomefit_prod_db"/);
  assert.match(source, /PRISMA = "6\.19\.3"/);
  assert.doesNotMatch(source, /shell=True/);
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
