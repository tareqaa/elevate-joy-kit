import { supabase } from "@/integrations/supabase/client";
import { getRandomActiveAvatar } from "@/lib/gx/catalog.functions";

export function setupAuthListener() {
  if (typeof window === "undefined") return;
  
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_UP" && session?.user) {
      const user = session.user;
      
      // Check if user already has an avatar
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
