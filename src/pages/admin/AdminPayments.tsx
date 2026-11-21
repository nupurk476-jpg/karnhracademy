import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatRupees } from "@/lib/programmes";

type Order = {
  id: string;
  item_type: "programme" | "course" | "note";
  item_title: string;
  amount_paise: number;
  status: "created" | "paid";
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  user_id: string | null;
  created_at: string;
  paid_at: string | null;
};

const TYPE_LABEL: Record<Order["item_type"], string> = { programme: "Programme", course: "Course", note: "Note" };

/**
 * Every online payment, newest first. Read-only on purpose: a paid order
 * was confirmed by Razorpay's signature, not by anyone here, and refunds
 * are issued from the Razorpay dashboard where the money actually is.
 * "Started" rows are checkouts that were opened but never completed.
 */
const AdminPayments = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUnpaid, setShowUnpaid] = useState(false);

  useEffect(() => {
    (supabase.from("payment_orders" as any) as any)
      .select("*").order("created_at", { ascending: false }).limit(500)
      .then(({ data, error }: any) => {
        setLoading(false);
        if (error) {
          toast({ title: "Couldn't load payments", description: error.message, variant: "destructive" });
          return;
        }
        setOrders(data ?? []);
      });
  }, [toast]);

  const paid = useMemo(() => orders.filter(o => o.status === "paid"), [orders]);
  const visible = showUnpaid ? orders : paid;
  const total = paid.reduce((sum, o) => sum + o.amount_paise, 0);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const thisMonth = paid.filter(o => o.paid_at && new Date(o.paid_at) >= monthStart).reduce((s, o) => s + o.amount_paise, 0);

  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold text-foreground">Payments</h1>
      <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
        Online payments through Razorpay. These are confirmed automatically — there is nothing to check by hand.
        To refund someone, use the Razorpay dashboard and search for the payment ID shown here.
      </p>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total received</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{formatRupees(total)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{paid.length} payment{paid.length === 1 ? "" : "s"}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">This month</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{formatRupees(thisMonth)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Started, not paid</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{orders.length - paid.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">closed the payment window</p>
        </div>
      </div>

      <label className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground">
        <input type="checkbox" checked={showUnpaid} onChange={e => setShowUnpaid(e.target.checked)} />
        Show unfinished checkouts too
      </label>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No online payments yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">When</th>
                <th className="px-3 py-2 text-left font-medium">Item</th>
                <th className="px-3 py-2 text-right font-medium">Amount</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">Razorpay payment ID</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(o => (
                <tr key={o.id} className="border-t border-border">
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {new Date(o.paid_at ?? o.created_at).toLocaleString("en-IN")}
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-medium text-foreground">{o.item_title}</p>
                    <p className="text-xs text-muted-foreground">{TYPE_LABEL[o.item_type]}</p>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-foreground">{formatRupees(o.amount_paise)}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${o.status === "paid" ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>
                      {o.status === "paid" ? "Paid" : "Started"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <code className="select-all text-xs text-foreground">{o.razorpay_payment_id ?? "—"}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminPayments;
