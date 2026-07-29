import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";

type CreateOrderInput = {
  items: Json;
  totalJOD: number;
  currency: string;
  customerName?: string | null;
  customerWhatsapp?: string | null;
  contactType?: "whatsapp" | "telegram" | null;
  deliveryData?: Record<string, unknown>;
  userId?: string | null;
  coupon?: {
    id: string;
    code: string;
    discount_jod: number;
  } | null;
};

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Backend is not configured");
  return createClient<Database>(url, key, {
    global: { fetch: createSupabaseFetch(key) },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export async function createStoreOrder(input: CreateOrderInput) {
  const supabase = getAdminClient();

  const deliveryData: Record<string, unknown> = { ...(input.deliveryData ?? {}) };
  if (input.contactType) deliveryData.contact_type = input.contactType;
  if (input.coupon) deliveryData.coupon = { code: input.coupon.code, discount_jod: input.coupon.discount_jod };

  const { data, error } = await supabase
    .from("orders")
    .insert({
      user_id: input.userId ?? null,
      customer_name: input.customerName ?? null,
      customer_whatsapp: input.customerWhatsapp ?? null,
      items: input.items,
      total_jod: input.totalJOD,
      currency_snapshot: input.currency,
      delivery_data: deliveryData as Json,
      status: "pending",
      contact_type: input.contactType ?? null,
      coupon_id: input.coupon?.id ?? null,
      coupon_code: input.coupon?.code ?? null,
      discount_jod: input.coupon?.discount_jod ?? 0,
    })
    .select("id, order_number")
    .single();

  if (error) throw new Error(error.message);
  if (!data?.order_number) throw new Error("Order was not created");

  // Record coupon redemption + increment usage counter (best-effort, non-blocking on failure)
  if (input.coupon) {
    try {
      await supabase.from("coupon_redemptions").insert({
        coupon_id: input.coupon.id,
        user_id: input.userId ?? null,
        order_id: data.id,
        discount_jod: input.coupon.discount_jod,
      });
      // increment usage_count via RPC-free path: read then update
      const { data: cRow } = await supabase.from("coupons").select("usage_count").eq("id", input.coupon.id).maybeSingle();
      const nextCount = (cRow?.usage_count ?? 0) + 1;
      await supabase.from("coupons").update({ usage_count: nextCount }).eq("id", input.coupon.id);
    } catch (e) {
      console.warn("[GX] coupon redemption record failed", e);
    }
  }

  return { id: data.id, order_number: data.order_number };
}
