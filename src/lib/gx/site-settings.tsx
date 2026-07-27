import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SiteSettings = {
  store_name: string;
  default_currency: string;
  order_completion_hours: number;
  support_whatsapp: string;
  support_email: string;
  social_instagram: string;
  social_facebook: string;
  social_tiktok: string;
  maintenance_mode: boolean;
  maintenance_message: string;
};

const DEFAULTS: SiteSettings = {
  store_name: "GX STORE",
  default_currency: "JOD",
  order_completion_hours: 24,
  support_whatsapp: "962776252313",
  support_email: "support@gxstore.com",
  social_instagram: "",
  social_facebook: "",
  social_tiktok: "",
  maintenance_mode: false,
  maintenance_message: "الموقع تحت الصيانة حالياً — راجعنا خلال قليل.",
};

const CACHE_KEY = "gx_site_settings_v1";
const Ctx = createContext<SiteSettings>(DEFAULTS);

function readCache(): SiteSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(readCache);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data } = await supabase.from("site_settings").select("key,value");
      if (!mounted || !data) return;
      const merged: SiteSettings = { ...DEFAULTS };
      for (const row of data) {
        const k = row.key as keyof SiteSettings;
        const v = row.value as unknown;
        if (k in merged) (merged as Record<string, unknown>)[k] = v as never;
      }
      setSettings(merged);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(merged)); } catch { /* noop */ }
    }
    load();

    const ch = supabase
      .channel("site-settings-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, () => load())
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, []);

  const value = useMemo(() => settings, [settings]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSiteSettings(): SiteSettings {
  return useContext(Ctx);
}
