/** Shared shape and selection rules for the subscriber list. */

export type Subscriber = {
  id: string;
  email: string;
  created_at: string;
  /** NULL means still subscribed. */
  unsubscribed_at: string | null;
  /**
   * The credential behind /unsubscribe?token=... . Real data, not a
   * display field: never render it, log it, or put it anywhere but a
   * file built to leave this screen for a sending tool.
   */
  unsubscribe_token: string;
};

/**
 * The addresses it is safe to send to.
 *
 * Opted-out rows are dropped first and unconditionally: the search box
 * narrows an audience, it must never widen one back into people who asked
 * to leave. Kept as a function, and tested, because this single rule is
 * what stands between an unsubscribe and a repeat email.
 */
export function activeSubscribers(rows: Subscriber[], searchTerm = ""): Subscriber[] {
  const term = searchTerm.trim().toLowerCase();
  return rows
    .filter(s => !s.unsubscribed_at)
    .filter(s => !term || s.email?.toLowerCase().includes(term));
}
