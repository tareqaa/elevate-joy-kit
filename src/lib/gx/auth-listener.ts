import { supabase } from "@/integrations/supabase/client";
import { getRandomActiveAvatar } from "@/lib/gx/catalog.functions";

export function setupAuthListener() {
  if (typeof window === "undefined") return;
  
  supabase.auth.onAuthStateChange(async (event, session) => {
    // Check for "INITIAL_SESSION" or "SIGNED_IN" logic
    if ((event === "INITIAL_SESSION" || event === "SIGNED_IN") && session?.user) {
      const user = session.user;
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_id")
        .eq("id", user.id)
        .maybeSingle();
        
      if (!profile?.avatar_id) {
        try {
          const avatarId = await getRandomActiveAvatar();
          if (avatarId) {
            await supabase
              .from("profiles")
              .update({ avatar_id: avatarId } as any)
              .eq("id", user.id);
          }
        } catch (e) {
          console.error("Failed to assign random avatar", e);
        }
      }
    }
  });
}
