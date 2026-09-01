/**
 * Component tests for the Admin Console shared primitives (ADMIN-DS-02).
 *
 * Renders the pure presentational components with react-test-renderer (no
 * DOM available in the Node test environment) and asserts the shared token
 * classes, the section header/badge wiring, and the AdminTable accessibility
 * hooks (sr-only caption + scope="col" headers, right-aligned columns).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import TestRenderer from 'react-test-renderer';
import {
  AdminPageSection,
  AdminSectionHeader,
  AdminStat,
  AdminTable,
  AdminEmptyState,
} from '../src/components/admin/AdminPrimitives';
import {formatAdminDate} from '../src/lib/admin/format';

test('AdminPageSection renders the shared card surface with children', () => {
  const renderer = TestRenderer.create(<AdminPageSection><p>hello</p></AdminPageSection>);
  const section = renderer.root.findByType('section');
  assert.equal(section.props.className, 'rounded-3xl border border-apex-border bg-apex-card p-6 shadow-apple-sm');
  assert.equal(renderer.root.findByType('p').children[0], 'hello');
});

const BADGE_CLASS =
  'rounded-full bg-apex-primary-soft px-3 py-1 text-xs font-semibold text-apex-primary-text';

test('AdminSectionHeader renders title, description and count badge', () => {
  const renderer = TestRenderer.create(
    <AdminSectionHeader title="Users" description="Read-only roster." count={3} />,
  );
  const root = renderer.root;
  assert.equal(root.findByType('h2').children[0], 'Users');
  assert.equal(root.findByProps({className: 'mt-1 text-sm text-apex-text-secondary'}).children[0], 'Read-only roster.');
  // Badge renders the count (looked up by token class, not component type).
  assert.equal(String(root.findByProps({className: BADGE_CLASS}).children[0]), '3');
});

test('AdminSectionHeader omits badge and description when absent', () => {
  const renderer = TestRenderer.create(<AdminSectionHeader title="Users" />);
  assert.equal(renderer.root.findAllByProps({className: BADGE_CLASS}).length, 0);
});

test('AdminStat renders the uppercase label and large value', () => {
  const renderer = TestRenderer.create(<AdminStat label="Workouts" value={42} />);
  const root = renderer.root;
  assert.equal(root.findByProps({className: 'text-xs font-semibold uppercase tracking-[0.12em] text-apex-text-secondary'}).children[0], 'Workouts');
  assert.equal(String(root.findByProps({className: 'mt-2 text-3xl font-bold text-apex-text-primary'}).children[0]), '42');
});

test('AdminTable renders caption, column scope and right-aligned headers', () => {
  const renderer = TestRenderer.create(
    <AdminTable
      caption="Registered users"
      minWidth={760}
      columns={[
        {label: 'Email'},
        {label: 'XP', align: 'right'},
      ]}
    >
      <tr><td>a@b.c</td><td>10</td></tr>
    </AdminTable>,
  );
  const root = renderer.root;
  const table = root.findByType('table');
  assert.equal(table.props['aria-label'], 'Registered users');
  assert.equal(table.props.style.minWidth, 760);
  const caption = root.findByType('caption');
  assert.equal(caption.props.className, 'sr-only');
  assert.equal(caption.children[0], 'Registered users');
  const [emailTh, xpTh] = root.findAllByType('th');
  assert.equal(emailTh.props.scope, 'col');
  assert.equal(xpTh.props.scope, 'col');
  assert.match(xpTh.props.className, /text-end/);
  assert.ok(!emailTh.props.className.includes('text-end'));
});

test('AdminEmptyState renders the shared message classes', () => {
  const renderer = TestRenderer.create(<AdminEmptyState message="No users yet." />);
  const p = renderer.root.findByType('p');
  assert.equal(p.children[0], 'No users yet.');
  assert.match(p.props.className, /text-apex-text-secondary/);
});

test('formatAdminDate renders the en-GB short date', () => {
  assert.equal(formatAdminDate(new Date(2026, 7, 31)), '31 Aug 2026');
});