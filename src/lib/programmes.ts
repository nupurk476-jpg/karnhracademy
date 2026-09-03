// Shared shapes and formatting for paid programmes, their cohorts, and
// UPI registrations. Prices live in the database as INTEGER paise; they
// become rupees exactly once, here, on the way to the screen.

export type CohortStatus = "draft" | "open" | "closed" | "completed";
export type RegistrationStatus =
  | "pending_verification"
  | "confirmed"
  | "rejected"
  | "cancelled";

export interface Programme {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  highlights: string[];
  price_paise: number;
  duration_note: string | null;
  is_published: boolean;
  display_order: number;
}

export interface Cohort {
  id: string;
  programme_id: string;
  batch_name: string;
  starts_on: string;
  ends_on: string | null;
  registration_closes_on: string | null;
  seats_total: number;
  schedule_note: string | null;
  status: CohortStatus;
}

export interface Registration {
  id: string;
  cohort_id: string;
  full_name: string;
  email: string;
  phone: string;
  college: string | null;
  course: string | null;
  upi_reference: string;
  amount_paise: number;
  status: RegistrationStatus;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

/** ₹1,500 — no trailing ".00" on whole rupees, which is how fees are written. */
export function formatRupees(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: Number.isInteger(rupees) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/** "12 March 2026" — unambiguous, unlike any all-numeric format. */
export function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** "12 – 26 March 2026", collapsing the month when both dates share one. */
export function formatDateRange(startIso: string, endIso: string | null): string {
  if (!endIso) return formatDate(startIso);
  const start = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${endIso}T00:00:00`);
  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    return `${start.getDate()} – ${formatDate(endIso)}`;
  }
  return `${formatDate(startIso)} – ${formatDate(endIso)}`;
}

/**
 * Whether a batch can still take registrations. The database enforces this
 * too (see the prepare_programme_registration trigger) — this copy only
 * decides what the page shows, and is never the thing standing between a
 * closed batch and a new row.
 */
export function isCohortOpen(cohort: Cohort): boolean {
  if (cohort.status !== "open") return false;
  if (!cohort.registration_closes_on) return true;
  const closes = new Date(`${cohort.registration_closes_on}T23:59:59`);
  return closes.getTime() >= Date.now();
}

/** null when the batch is uncapped (seats_total = 0). */
export function seatsLeft(cohort: Cohort, taken: number): number | null {
  if (cohort.seats_total <= 0) return null;
  return Math.max(0, cohort.seats_total - taken);
}

export const REGISTRATION_STATUS_LABEL: Record<RegistrationStatus, string> = {
  pending_verification: "Awaiting payment check",
  confirmed: "Confirmed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};
