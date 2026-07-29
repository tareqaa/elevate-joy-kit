import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function getServerPublicClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const validateCouponFn = createServerFn({ method: "POST" })
  .validator((data) =>
    z.object({
      code: z.string().trim().min(1).max(64),
      subtotal_jod: z.number().min(0).max(100000),
      product_slugs: z.array(z.string().max(120)).max(200).default([]),
      category_slugs: z.array(z.string().max(120)).max(200).default([]),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const supabase = getServerPublicClient();

    let userId: string | null = null;
    const authHeader = getRequestHeader("authorization");
    if (authHeader?.toLowerCase().startsWith("bearer ")) {
      const token = authHeader.slice(7).trim();
      if (token) {
        const { data: u } = await supabase.auth.getUser(token);
        userId = u.user?.id ?? null;
      }
    }

    const { data: res, error } = await supabase.rpc("validate_coupon", {
      _code: data.code,
      _subtotal_jod: data.subtotal_jod,
      _user_id: userId as unknown as string,
      _product_slugs: data.product_slugs,
      _category_slugs: data.category_slugs,
    });

    if (error) return { valid: false, message: error.message };
    return res as {
      valid: boolean;
      message: string;
      coupon_id?: string;
      code?: string;
      discount_type?: "percent" | "fixed";
      discount_value?: number;
      discount_jod?: number;
    };
  });
