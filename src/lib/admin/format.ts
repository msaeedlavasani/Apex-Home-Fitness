import type {AdminLocale} from './locale';

/**
 * Date formatting shared by Admin Console read-only surfaces (ADMIN-DS-02,
 * localized in ADMIN-DS-05). Follows the consumer app's convention
 * (`locale === 'fa' ? 'fa-IR' : 'en-US'`, see e.g. ProfileView /
 * AnalyticsCharts): fa renders the Persian calendar with Persian digits
 * (e.g. ۱۲ شهریور ۱۴۰۵) while en keeps the existing en-GB short date
 * (e.g. 1 Sep 2026).
 */
export function formatAdminDate(value: Date, locale: AdminLocale = 'en'): string {
  return value.toLocaleDateString(locale === 'fa' ? 'fa-IR' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}