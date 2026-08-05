import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** 
 * Simple global hook to detect if the current user is an admin.
 * Verifies against has_role() in the database.
 */
export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function check() {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const uid = sess.session?.user?.id;
        if (!uid) {
          if (mounted) { setIsAdmin(false); setLoading(false); }
          return;
        }
        const { data } = await supabase.rpc("has_role", { _user_id: uid, _role: "admin" });
        if (mounted) { setIsAdmin(Boolean(data)); setLoading(false); }
      } catch {
        if (mounted) { setIsAdmin(false); setLoading(false); }
      }
    }
    check();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        check();
      }
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  return { isAdmin, loading };
}
