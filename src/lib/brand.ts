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
  // "Ink Vermillion": near-black ink as the primary ground, vermillion as
  // the single accent — replaces the earlier navy/gold identity.
  navy: "#17181C",
  navyDeep: "#0B0C0E",
  steel: "#6B6B70",
  steelDeep: "#4A4A4F",
  gold: "#E34234",
  goldDeep: "#B23223",
  // Vermillion for TEXT on light grounds — ~7:1 on white (WCAG AA); the
  // display vermillions above are for fills/borders/large display type.
  goldText: "#8C2A1E",
  // Tinted light grounds
  light: "#F2F1EF",
  mist: "#E8E6E2",
  cream: "#F7F4EF",
} as const;
