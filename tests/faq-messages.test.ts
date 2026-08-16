import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

/**
 * FAQ message parity — the `Faq.*` namespace must stay structurally in sync
 * across both locales so the FAQ route never renders a missing or empty
 * string in either language (regression guard for the /[locale]/faq page).
 */

const en = JSON.parse(
  readFileSync(new URL('../src/messages/en.json', import.meta.url), 'utf8'),
) as Record<string, unknown>;
const fa = JSON.parse(
  readFileSync(new URL('../src/messages/fa.json', import.meta.url), 'utf8'),
) as Record<string, unknown>;

function faqOf(messages: Record<string, unknown>) {
  const faq = messages.Faq;
  assert.ok(faq && typeof faq === 'object', 'Faq namespace exists');
  return faq as Record<string, unknown>;
}

const EN = faqOf(en);
const FA = faqOf(fa);

/** Depth-first key walk; arrays are treated as leaves (not present here). */
function keyPaths(node: Record<string, unknown>, prefix = ''): string[] {
  const paths: string[] = [];
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      paths.push(...keyPaths(value as Record<string, unknown>, path));
    } else {
      paths.push(path);
    }
  }
  return paths;
}

const SCALAR_KEYS = ['metaTitle', 'title', 'subtitle'] as const;

test('en and fa Faq namespaces expose the same key structure', () => {
  assert.deepEqual(keyPaths(EN), keyPaths(FA));
  assert.deepEqual(keyPaths(EN), [
    ...SCALAR_KEYS,
    'items.whatIs.question',
    'items.whatIs.answer',
    'items.cost.question',
    'items.cost.answer',
    'items.equipment.question',
    'items.equipment.answer',
    'items.injury.question',
    'items.injury.answer',
    'items.offline.question',
    'items.offline.answer',
    'items.support.question',
    'items.support.answer',
    'contact.title',
    'contact.email',
  ]);
});

test('every FAQ item has a non-empty question and answer in both locales', () => {
  const items = EN.items as Record<string, {question: string; answer: string}>;
  const faItems = FA.items as Record<string, {question: string; answer: string}>;
  const itemIds = Object.keys(items);

  assert.equal(itemIds.length, 6);
  assert.deepEqual(Object.keys(faItems), itemIds);

  for (const id of itemIds) {
    assert.ok(items[id].question.trim().length > 0, `en ${id}.question is empty`);
    assert.ok(items[id].answer.trim().length > 0, `en ${id}.answer is empty`);
    assert.ok(faItems[id].question.trim().length > 0, `fa ${id}.question is empty`);
    assert.ok(faItems[id].answer.trim().length > 0, `fa ${id}.answer is empty`);
  }
});

test('fa translations are actual Persian text (non-ASCII)', () => {
  const persianSample = [
    FA.title,
    FA.subtitle,
    (FA.items as Record<string, {question: string}>).whatIs.question,
    (FA.items as Record<string, {answer: string}>).offline.answer,
  ] as string[];
  for (const value of persianSample) {
    assert.match(value, /[\u0600-\u06FF]/, `expected Persian text, got: ${value}`);
  }
});

test('contact email matches the Profile support address', () => {
  const enProfile = en.Profile as Record<string, {contactValue: string}>;
  const enContact = EN.contact as {email: string};
  const faContact = FA.contact as {email: string};
  assert.equal(enContact.email, enProfile.support.contactValue);
  assert.equal(faContact.email, enContact.email);
});
