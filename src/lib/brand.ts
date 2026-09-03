// THE single source for brand hex values. Tailwind's theme imports this
// (so `text-brand-navy` etc. resolve from here) and any inline-style code
// that genuinely needs a raw hex (canvas drawing, gradients, style props)
// imports BRAND instead of re-declaring the palette per file — the same
// hues used to be defined independently in index.css tokens, Index.tsx
// constants, and scattered bracket-hex Tailwind classes.
//
// The HSL tokens in index.css (--accent etc.) remain the source for
// shadcn's semantic roles; the values below are the marketing palette and
// intentionally match them where they overlap (gold ≙ --accent,
// goldText ≙ --accent-deep).
export const BRAND = {
  navy: "#16274A",
  navyDeep: "#0E1B33",
  steel: "#5B8AB8",
  steelDeep: "#3D6C98",
  gold: "#C6A15B",
  goldDeep: "#9C7C3B",
  // Gold for TEXT on light grounds — ~5:1 on white (WCAG AA); the display
  // golds above fail AA at link/label sizes.
  goldText: "#7A6130",
  // Tinted light grounds
  light: "#EEF0F8",
  mist: "#DCE6F1",
  cream: "#F6F3EC",
} as const;
