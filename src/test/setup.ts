import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// The gate beacon builds a PostgREST URL from these at call time. Nothing
// in the test run reaches the network; the values just have to exist for
// the URL to be buildable. import.meta.env is a build-time substitution
// with no Vite transform here, so process.env is where they go.
process.env.VITE_SUPABASE_URL ??= "https://test.supabase.co";
process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??= "test-anon-key";
