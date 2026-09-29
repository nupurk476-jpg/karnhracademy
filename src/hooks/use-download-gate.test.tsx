import { useEffect } from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// A gate view is one row, resolved once — the same store gateAnalytics.test
// models, so these tests can assert the dashboard's reconcile identity.
type Row = { id: string; status: string };
const rows = new Map<string, Row>();
const captured: any[] = [];
let captureError: { message: string } | null = null;
let session: any = null;

const insert = vi.fn((row: any) => {
  rows.set(row.id, { id: row.id, status: row.status });
  return Promise.resolve({ error: null });
});
const rpc = vi.fn((name: string, args: any) => {
  if (name === "resolve_gate_view") {
    const row = rows.get(args._id);
    if (row && row.status === "shown") row.status = args._status;
    return Promise.resolve({ error: null });
  }
  if (name === "capture_download_email") {
    captured.push(args);
    return Promise.resolve({ error: captureError });
  }
  return Promise.resolve({ error: null });
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({ insert }),
    rpc: (...args: unknown[]) => (rpc as any)(...args),
    auth: { getSession: () => Promise.resolve({ data: { session } }) },
  },
}));

const track = vi.fn();
vi.mock("@/lib/analytics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/analytics")>()),
  track: (...args: unknown[]) => (track as any)(...args),
}));

// pdfjs has no place in jsdom; the preview only needs to report a count.
vi.mock("@/components/PdfPreview", () => ({
  default: ({ onPageCount }: { onPageCount?: (n: number) => void }) => {
    useEffect(() => { onPageCount?.(12); }, [onPageCount]);
    return <div data-testid="pdf-preview" />;
  },
}));

import { useDownloadGate, gateHeadline, type GateResource } from "./use-download-gate";
import { __resetGateAnalyticsForTest } from "@/lib/gateAnalytics";

const flush = () => act(() => new Promise((r) => setTimeout(r, 0)));

const resolveUrl = vi.fn(() => Promise.resolve("https://files.example/notes.pdf?token=x"));
const pdf: GateResource = {
  title: "Industrial Relations",
  isPdf: true,
  previewUrl: () => Promise.resolve("https://files.example/view.pdf"),
};

function Host({ resource = pdf }: { resource?: GateResource }) {
  const { request, gateDialog } = useDownloadGate();
  return (
    <>
      <button onClick={() => request(resolveUrl, () => {}, resource)}>Download</button>
      {gateDialog}
    </>
  );
}

const tally = () => {
  const all = [...rows.values()];
  return {
    shown: all.length,
    email_given: all.filter((r) => r.status === "email_given").length,
    walked_away: all.filter((r) => r.status === "walked_away").length,
    unresolved: all.filter((r) => r.status === "shown").length,
  };
};
const reconciles = () => {
  const t = tally();
  return t.email_given + t.walked_away + t.unresolved === t.shown;
};

async function openGate(resource?: GateResource) {
  render(<MemoryRouter><Host resource={resource} /></MemoryRouter>);
  fireEvent.click(screen.getByText("Download"));
  await flush();
}

async function submitEmail(value: string) {
  fireEvent.change(screen.getByLabelText("Email address"), { target: { value } });
  fireEvent.submit(screen.getByLabelText("Email address").closest("form")!);
  await flush();
}

const realLocation = window.location;

beforeEach(() => {
  rows.clear();
  captured.length = 0;
  captureError = null;
  session = null;
  insert.mockClear();
  rpc.mockClear();
  track.mockClear();
  resolveUrl.mockClear();
  __resetGateAnalyticsForTest();
  localStorage.clear();
  sessionStorage.clear();
  Object.defineProperty(navigator, "webdriver", { value: false, configurable: true });
  Object.defineProperty(navigator, "userAgent", { value: "Mozilla/5.0 (real browser)", configurable: true });
  (navigator as any).sendBeacon = undefined;
  // jsdom can't navigate; a plain object lets the download be observed.
  Object.defineProperty(window, "location", {
    value: { pathname: "/hrm/industrial-relations", href: "" },
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  Object.defineProperty(window, "location", { value: realLocation, configurable: true, writable: true });
});

describe("download gate", () => {
  it("keeps the email field (and focus) while typing", async () => {
    await openGate({ title: "Deck", isPdf: false });
    const input = screen.getByLabelText("Email address") as HTMLInputElement;
    input.focus();
    fireEvent.change(input, { target: { value: "a" } });
    expect(screen.getByLabelText("Email address")).toBe(input);
    expect(document.activeElement).toBe(input);
  });

  it("shows the preview first; the gate view starts only at the form", async () => {
    await openGate();
    expect(screen.getByTestId("pdf-preview")).toBeInTheDocument();
    expect(screen.queryByLabelText("Email address")).toBeNull();
    expect(rows.size).toBe(0);

    fireEvent.click(screen.getByText("Get the full PDF free"));
    await flush();
    expect(rows.size).toBe(1);
    expect(screen.getByText("Industrial Relations — full 12-page PDF, free")).toBeInTheDocument();
    expect(screen.getByText("No spam. One click to unsubscribe.")).toBeInTheDocument();
  });

  it("has exactly one text field, set up for the mobile email keyboard", async () => {
    await openGate({ title: "Deck", isPdf: false });
    const input = screen.getByLabelText("Email address");
    expect(input).toHaveAttribute("type", "email");
    expect(input).toHaveAttribute("autocomplete", "email");
    expect(document.querySelectorAll('input:not([type="checkbox"])')).toHaveLength(1);
    const box = screen.getByLabelText("Send me new notes and exam updates.") as HTMLInputElement;
    expect(box.checked).toBe(false);
  });

  it("closing the preview records nothing", async () => {
    await openGate();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await flush();
    expect(rows.size).toBe(0);
  });

  it("a failed save keeps the gate open, records nothing, and a retry succeeds", async () => {
    await openGate({ title: "Deck", isPdf: false });
    captureError = { message: "network down" };
    await submitEmail("student@example.com");

    expect(screen.getByRole("alert")).toHaveTextContent("couldn't save your email");
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
    expect(localStorage.getItem("khr_subscriber_email")).toBeNull();
    expect(tally()).toMatchObject({ shown: 1, unresolved: 1, email_given: 0 });
    expect(resolveUrl).not.toHaveBeenCalled();

    captureError = null;
    fireEvent.submit(screen.getByLabelText("Email address").closest("form")!);
    await flush();
    expect(tally()).toMatchObject({ shown: 1, email_given: 1, unresolved: 0 });
    expect(localStorage.getItem("khr_subscriber_email")).toBe("student@example.com");
    expect(reconciles()).toBe(true);
  });

  it("rejects an obviously bad address without a round trip", async () => {
    await openGate({ title: "Deck", isPdf: false });
    await submitEmail("not-an-email");
    expect(screen.getByRole("alert")).toHaveTextContent("doesn't look right");
    expect(captured).toHaveLength(0);
    expect(tally().unresolved).toBe(1);
  });

  it("on success starts the download and shows Download again", async () => {
    await openGate({ title: "Deck", isPdf: false });
    await submitEmail("student@example.com");
    expect(window.location.href).toBe("https://files.example/notes.pdf?token=x");
    expect(screen.getByText("Your download has started")).toBeInTheDocument();

    window.location.href = "";
    fireEvent.click(screen.getByText("Download again"));
    await flush();
    expect(window.location.href).toBe("https://files.example/notes.pdf?token=x");

    // Closing the success screen is not a walk-away.
    fireEvent.click(screen.getByText("Done"));
    await flush();
    expect(tally()).toMatchObject({ shown: 1, email_given: 1, walked_away: 0 });
  });

  it("adds to the newsletter only when the box is ticked", async () => {
    await openGate({ title: "Deck", isPdf: false });
    await submitEmail("a@example.com");
    expect(captured[0]).toMatchObject({ _email: "a@example.com", _newsletter: false });
    expect(track).not.toHaveBeenCalledWith("newsletter_subscribe", expect.anything());
  });

  it("ticked box subscribes and counts a newsletter sign-up", async () => {
    await openGate({ title: "Deck", isPdf: false });
    fireEvent.click(screen.getByLabelText("Send me new notes and exam updates."));
    await submitEmail("b@example.com");
    expect(captured[0]).toMatchObject({ _email: "b@example.com", _newsletter: true });
    expect(track).toHaveBeenCalledWith("newsletter_subscribe", { where: "download_gate" });
  });

  it("closing the form is a walk-away and the numbers still reconcile", async () => {
    await openGate({ title: "Deck", isPdf: false });
    fireEvent.keyDown(screen.getByLabelText("Email address"), { key: "Escape" });
    await flush();
    expect(tally()).toMatchObject({ shown: 1, walked_away: 1 });
    expect(reconciles()).toBe(true);
  });

  it("a returning visitor skips the gate entirely", async () => {
    localStorage.setItem("khr_subscriber_email", "back@example.com");
    await openGate();
    expect(screen.queryByTestId("pdf-preview")).toBeNull();
    expect(rows.size).toBe(0);
    expect(window.location.href).toBe("https://files.example/notes.pdf?token=x");
  });

  it("a signed-in visitor skips the gate entirely", async () => {
    session = { user: { email: "member@example.com" } };
    await openGate();
    expect(screen.queryByTestId("pdf-preview")).toBeNull();
    expect(rows.size).toBe(0);
    expect(window.location.href).toBe("https://files.example/notes.pdf?token=x");
  });
});

describe("gateHeadline", () => {
  it("uses the title and real page count", () => {
    expect(gateHeadline({ title: "Wages", isPdf: true }, 24)).toBe("Wages — full 24-page PDF, free");
    expect(gateHeadline({ title: "Wages", isPdf: true }, null)).toBe("Wages — full PDF, free");
    expect(gateHeadline({ title: "Deck", isPdf: false }, null)).toBe("Deck — free download");
  });
});
