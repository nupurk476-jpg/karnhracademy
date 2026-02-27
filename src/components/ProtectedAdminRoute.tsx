import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLogin from "@/pages/admin/AdminLogin";

const ProtectedAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

  useEffect(() => {
    const checkAdmin = async (userId: string) => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      setState(data ? "authenticated" : "unauthenticated");
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        checkAdmin(session.user.id);
      } else {
        setState("unauthenticated");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        checkAdmin(session.user.id);
      } else {
        setState("unauthenticated");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (state === "unauthenticated") {
    return <AdminLogin />;
  }

  return <>{children}</>;
};

export default ProtectedAdminRoute;
