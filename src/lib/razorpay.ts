import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Razorpay Checkout, end to end, for every paid thing on the site.
//
// The browser's part is deliberately small: say what is being bought, show
// Razorpay's popup, and hand the result to the server. The price is set by
// razorpay-checkout from the database; access is granted only by
// razorpay-verify (or razorpay-webhook) after Razorpay's signature checks
// out. Nothing in this file can make anything "paid".

export type PayableItem =
  | { item_type: "course" | "note"; item_id: string }
  | {
      item_type: "programme";
      /** The cohort being registered for. */
      item_id: string;
      registration: { full_name: string; email: string; phone: string; college?: string | null; course?: string | null };
    };

/** paid: access/seat is granted. processing: money taken but not yet
 *  captured — the webhook finishes the job. dismissed: closed the popup. */
export type CheckoutResult = "paid" | "processing" | "dismissed";

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
let scriptPromise: Promise<void> | null = null;

// Loaded on first use rather than in index.html: most visitors never pay,
// and Razorpay's script is not small.
function loadCheckoutScript(): Promise<void> {
  if ((window as any).Razorpay) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SCRIPT_SRC;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        scriptPromise = null;
        reject(new Error("Couldn't load the payment window. Check your connection and try again."));
      };
      document.body.appendChild(s);
    });
  }
  return scriptPromise;
}

// supabase-js wraps a non-2xx answer in a FunctionsHttpError whose body
// carries the message our functions wrote for the student ("This batch is
// full", "Please sign in to buy this."). Surface that, not "non-2xx".
async function invoke<T>(name: string, body: unknown): Promise<{ data: T; status: number }> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    const res: Response | undefined = (error as any).context;
    let message = "Something went wrong with the payment. Please try again.";
    let status = 500;
    if (res && typeof res.json === "function") {
      status = res.status;
      const payload = await res.json().catch(() => null);
      if (payload?.error) message = payload.error;
    }
    throw Object.assign(new Error(message), { status });
  }
  return { data: data as T, status: 200 };
}

export async function payWithRazorpay(item: PayableItem): Promise<CheckoutResult> {
  const [{ data: order }] = await Promise.all([
    invoke<{
      key_id: string; razorpay_order_id: string; amount: number; currency: string;
      name: string; description: string; prefill: Record<string, string>;
    }>("razorpay-checkout", item),
    loadCheckoutScript(),
  ]);

  return new Promise<CheckoutResult>((resolve, reject) => {
    const rzp = new (window as any).Razorpay({
      key: order.key_id,
      order_id: order.razorpay_order_id,
      amount: order.amount,
      currency: order.currency,
      name: order.name,
      description: order.description,
      prefill: order.prefill,
      theme: { color: "#E3392C" },
      handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        try {
          const { data } = await invoke<{ status?: string }>("razorpay-verify", resp);
          resolve(data?.status === "paid" ? "paid" : "processing");
        } catch (e: any) {
          // 202 = captured-later; the webhook will finish it. Anything else
          // after a successful checkout is still not the student's fault.
          if (e?.status === 202) resolve("processing");
          else reject(e);
        }
      },
      modal: { ondismiss: () => resolve("dismissed"), confirm_close: true },
    });
    // A failed attempt (declined card, wrong UPI PIN) keeps the popup open
    // for another try, so there is nothing to resolve here.
    rzp.open();
  });
}

/** Whether "Pay online" should be offered at all. Off until the admin has
 *  added Razorpay keys and flipped the switch in Payment settings. */
export function useOnlinePaymentsEnabled(): boolean {
  const { data } = useQuery({
    queryKey: ["online-payments-enabled"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await (supabase.from("payment_settings" as any) as any)
        .select("online_payments_enabled").maybeSingle();
      return !!data?.online_payments_enabled;
    },
  });
  return !!data;
}
