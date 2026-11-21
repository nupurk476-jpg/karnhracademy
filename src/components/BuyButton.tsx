import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CreditCard, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatRupees } from "@/lib/programmes";
import { payWithRazorpay, useOnlinePaymentsEnabled } from "@/lib/razorpay";

type Props = {
  itemType: "course" | "note";
  itemId: string;
  pricePaise: number;
  /** Called once access has been granted (or is about to be). */
  onPurchased: () => void;
  className?: string;
};

/**
 * The one "Buy" button for courses and notes. A purchase attaches to an
 * account, so a signed-out visitor is sent to sign in first and brought
 * straight back here afterwards.
 */
const BuyButton = ({ itemType, itemId, pricePaise, onPurchased, className = "" }: Props) => {
  const enabled = useOnlinePaymentsEnabled();
  const location = useLocation();
  const { toast } = useToast();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  const base = `inline-flex items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold transition ${className}`;

  if (!enabled) {
    return (
      <span className={`${base} cursor-not-allowed bg-muted text-muted-foreground`}>
        <Lock aria-hidden="true" className="h-4 w-4" /> Purchases open soon
      </span>
    );
  }

  if (signedIn === false) {
    const next = encodeURIComponent(location.pathname + location.search);
    return (
      <Link to={`/auth?next=${next}`} className={`${base} bg-accent text-accent-foreground hover:brightness-110`}>
        <Lock aria-hidden="true" className="h-4 w-4" /> Sign in to buy · {formatRupees(pricePaise)}
      </Link>
    );
  }

  const buy = async () => {
    setPaying(true);
    try {
      const result = await payWithRazorpay({ item_type: itemType, item_id: itemId });
      if (result === "dismissed") return;
      if (result === "paid") {
        toast({ title: "Payment successful", description: "It's unlocked — enjoy!" });
      } else {
        toast({ title: "Payment received", description: "It will unlock automatically in a few minutes." });
      }
      onPurchased();
    } catch (err: any) {
      // 409 = they already own it (bought in another tab, or via a course).
      if (err?.status === 409) { onPurchased(); return; }
      toast({ title: "Payment didn't go through", description: err?.message, variant: "destructive" });
    } finally {
      setPaying(false);
    }
  };

  return (
    <button
      type="button"
      onClick={buy}
      disabled={paying || signedIn === null}
      className={`${base} bg-accent text-accent-foreground hover:brightness-110 disabled:opacity-60`}
    >
      {paying ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <CreditCard aria-hidden="true" className="h-4 w-4" />}
      {paying ? "Opening payment…" : `Buy for ${formatRupees(pricePaise)}`}
    </button>
  );
};

export default BuyButton;
