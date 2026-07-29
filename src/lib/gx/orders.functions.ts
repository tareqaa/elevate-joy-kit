import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { createStoreOrder } from "./orders.server";

export const submitStoreOrder = createServerFn({ method: "POST" })
  .validator((data) => z.object({
    items: z.array(z.object({
      cartId: z.string().min(1).max(120),
      name: z.string().min(1).max(240),
      qty: z.number().int().min(1).max(99),
      price: z.number().min(0).max(10000),
      usernames: z.array(z.string().trim().min(1).max(80)).nullable(),
    })).min(1).max(80),
    totalJOD: z.number().min(0).max(100000),
    currency: z.string().trim().min(1).max(12),
    notes: z.string().max(2000).optional(),
    customerName: z.string().trim().min(1).max(120),
    customerWhatsapp: z.string().trim().min(4).max(40),
    contactType: z.enum(["whatsapp", "telegram"]),
    coupon: z.object({
      id: z.string().uuid(),
      code: z.string().min(1).max(64),
      discount_jod: z.number().min(0).max(100000),
    }).nullable().optional(),
  }).parse(data))
  .handler(async ({ data }) => {
    let userId: string | null = null;
    const authHeader = getRequestHeader("authorization");

    if (authHeader?.toLowerCase().startsWith("bearer ")) {
      const token = authHeader.slice(7).trim();
      if (token) {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (url && key) {
          const supabase = createClient<Database>(url, key, {
            auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
          });
          const { data: userData } = await supabase.auth.getUser(token);
          userId = userData.user?.id ?? null;
        }
      }
    }

    return createStoreOrder({
      items: data.items,
      totalJOD: data.totalJOD,
      currency: data.currency,
      customerName: data.customerName,
      customerWhatsapp: data.customerWhatsapp,
      contactType: data.contactType,
      deliveryData: data.notes?.trim() ? { customer_notes: data.notes.trim() } : {},
      userId,
      coupon: data.coupon ?? null,
    });
  });
