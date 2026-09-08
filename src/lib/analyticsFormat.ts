/**
 * Display helpers for the admin analytics screen. Kept out of the page
 * component so the page stays Fast Refresh friendly, and so these can be
 * tested without mounting React.
 */

/**
 * A step's share of the step above it.
 *
 * Returns an em dash, not "0%", when there is no denominator. "Nobody has
 * reached this step yet" and "everybody who reached it dropped out" are
 * different claims, and rendering the first as the second invents a
 * finding from an empty table.
 */
export function pct(num: number, den: number): string {
  return den > 0 ? `${Math.round((num / den) * 100)}%` : "—";
}
