// Supabase/PostgREST caps a single response at a server-configured row
// limit (1000 by default) — a query whose result set is larger than that
// silently returns only the first page, with no error. Any query that
// aggregates or counts across a whole table (or a filtered slice that can
// still grow past the limit, e.g. every question across every quiz) needs
// to page through with .range() instead of trusting one .select() to
// return everything, or it quietly undercounts once content grows enough.
const PAGE_SIZE = 1000;

/** `build` returns a Supabase query (already `.select(...)`/`.eq(...)`/etc, but not `.range()`'d) fresh each call. */
export async function fetchAllRows<T = any>(build: () => any): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await build().range(from, from + PAGE_SIZE - 1);
    if (error || !data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}
