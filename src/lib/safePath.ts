/**
 * Guard for a post-login destination.
 *
 * An OAuth round trip loses React Router's navigation state, so the page
 * the visitor was heading to has to travel in the URL — which turns it
 * into attacker-controllable input. Without this check, a crafted
 * /auth?next=https://evil.example link would bounce a freshly signed-in
 * student straight off the site, wearing our sign-in as credibility.
 *
 * Only a path on this origin is allowed through. Everything else falls
 * back to the homepage.
 */
export function safeInternalPath(candidate: string | null | undefined, fallback = "/"): string {
  if (!candidate) return fallback;
  // Must start with a single slash: "//evil.com" and "https://evil.com"
  // are both absolute destinations, and "/\evil.com" is treated as
  // protocol-relative by some browsers.
  if (!candidate.startsWith("/")) return fallback;
  if (candidate.startsWith("//") || candidate.startsWith("/\\")) return fallback;
  return candidate;
}
