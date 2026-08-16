import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {APP_LOCALES, otherLocale} from '../src/components/layout/language';

/**
 * Language switcher contract tests (Batch 15 — global EN ⇄ FA switcher).
 *
 * Guards the pure locale contract shared by the switcher component:
 *  - `otherLocale` flips en ⇄ fa (the exact behavior the UI toggle relies on);
 *  - the locale list stays a two-locale pair (must mirror src/i18n/routing.ts);
 *  - the `Language.*` message namespace stays structurally in sync across
 *    en/fa so the switcher never renders a missing or empty string.
 */

const en = JSON.parse(
  readFileSync(new URL('../src/messages/en.json', import.meta.url), 'utf8'),
) as Record<string, unknown>;
const fa = JSON.parse(
  readFileSync(new URL('../src/messages/fa.json', import.meta.url), 'utf8'),
) as Record<string, unknown>;

function languageOf(messages: Record<string, unknown>) {
  const lang = messages.Language;
  assert.ok(lang && typeof lang === 'object', 'Language namespace exists');
  return lang as Record<string, string>;
}

const EN = languageOf(en);
const FA = languageOf(fa);

test('otherLocale toggles between the two app locales (EN ⇄ FA)', () => {
  assert.equal(otherLocale('en'), 'fa');
  assert.equal(otherLocale('fa'), 'en');
  // Round-trip is stable and matches the declared locale list.
  assert.equal(otherLocale(otherLocale('en')), 'en');
  assert.equal(otherLocale(otherLocale('fa')), 'fa');
  assert.deepEqual([...APP_LOCALES], ['en', 'fa']);
});

test('Language namespace exposes the same keys in en and fa', () => {
  assert.deepEqual(Object.keys(EN).sort(), Object.keys(FA).sort());
  for (const key of ['label', 'en', 'fa', 'enName', 'faName', 'switchToEn', 'switchToFa']) {
    assert.ok(EN[key]?.length > 0, `en.Language.${key} is non-empty`);
    assert.ok(FA[key]?.length > 0, `fa.Language.${key} is non-empty`);
  }
});

test('fa labels are real Persian and en labels are English', () => {
  for (const key of ['label', 'enName', 'faName', 'switchToEn', 'switchToFa']) {
    assert.match(FA[key], /[\u0600-\u06FF]/, `fa.Language.${key} is Persian`);
    assert.doesNotMatch(EN[key], /[\u0600-\u06FF]/, `en.Language.${key} is English`);
  }
});

test('switchTo labels target the counterpart locale (not the current one)', () => {
  // The two switch labels always point in opposite directions.
  assert.notEqual(EN.switchToFa, EN.switchToEn);
  assert.notEqual(FA.switchToFa, FA.switchToEn);
  // English UI announces switching INTO Persian; the Persian UI into English.
  assert.equal(EN.switchToFa, 'Switch to Persian');
  assert.equal(FA.switchToEn, 'تغییر به انگلیسی');
});
