/**
 * Date formatting shared by Admin Console read-only surfaces (ADMIN-DS-02).
 * Keeps the en-GB short date used across the console in one place.
 */
export function formatAdminDate(value: Date): string {
  return value.toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'});
}