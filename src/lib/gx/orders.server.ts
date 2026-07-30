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
    id: string | null;
    userCouponId?: string | null;
    code: string;
    discount_jod: number;
  } | null;
  coins?: {
    coins: number;
    discount_jod: number;
  } | null;
  /** Store credit (refund balance) applied to this order, in JOD. */
  creditJod?: number | null;
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
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Backend is not configured: missing " +
        (!url ? "SUPABASE_URL" : "SUPABASE_SERVICE_ROLE_KEY") +
        " in the server environment.",
    );
  }
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
      // Orders fully covered by store credit (refund balance) are already settled.
      status: (Number(input.creditJod ?? 0) > 0 && Number(input.totalJOD) <= 0.009) ? "paid" : "pending",
      contact_type: input.contactType ?? null,
      coupon_id: input.coupon?.id ?? null,
      coupon_code: input.coupon?.code ?? null,
      discount_jod: (input.coupon?.discount_jod ?? 0) + (input.coins?.discount_jod ?? 0) + (input.creditJod ?? 0),
      user_coupon_id: input.coupon?.userCouponId ?? null,
      coins_used: input.coins?.coins ?? 0,
      coins_discount_jod: input.coins?.discount_jod ?? 0,
      paid_jod: input.totalJOD,
    })
    .select("id, order_number")
    .single();

  if (error) throw new Error(error.message);
  if (!data?.order_number) throw new Error("Order was not created");

  // Record coupon redemption + increment usage counter (best-effort, non-blocking on failure)
  const couponId = input.coupon?.id ?? null;
  if (input.coupon && couponId) {
    try {
      await supabase.from("coupon_redemptions").insert({
        coupon_id: couponId,
        user_id: input.userId ?? null,
        order_id: data.id,
        discount_jod: input.coupon.discount_jod,
      });
      // increment usage_count via RPC-free path: read then update
      const { data: cRow } = await supabase.from("coupons").select("usage_count").eq("id", couponId).maybeSingle();
      const nextCount = (cRow?.usage_count ?? 0) + 1;
      await supabase.from("coupons").update({ usage_count: nextCount }).eq("id", couponId);
    } catch (e) {
      console.warn("[GX] coupon redemption record failed", e);
    }
  }

  // Personal level coupon: mark as used so it cannot be reused.
  if (input.coupon?.userCouponId && input.userId) {
    try {
      await supabase
        .from("user_coupons")
        .update({ used_at: new Date().toISOString(), order_id: data.id })
        .eq("id", input.coupon.userCouponId)
        .eq("user_id", input.userId)
        .is("used_at", null);
    } catch (e) {
      console.warn("[GX] level coupon consume failed", e);
    }
  }

  // GX Coins: deduct the redeemed balance and log the transaction.
  if (input.coins && input.coins.coins > 0 && input.userId) {
    try {
      const { data: prof } = await supabase
        .from("profiles").select("gx_coins").eq("id", input.userId).maybeSingle();
      const balance = Number(prof?.gx_coins ?? 0);
      const spend = Math.min(balance, input.coins.coins);
      if (spend > 0) {
        const after = balance - spend;
        await supabase.from("profiles").update({ gx_coins: after }).eq("id", input.userId);
        await supabase.from("gx_coin_transactions").insert({
          user_id: input.userId,
          order_id: data.id,
          amount: -spend,
          balance_after: after,
          kind: "spend",
          source: "order_checkout",
          reason: `خصم على الطلب ${data.order_number}`,
        });
      }
    } catch (e) {
      console.warn("[GX] coins spend failed", e);
    }
  }

  // Store credit (refund balance): deduct and log the transaction.
  const wantedCredit = Math.max(0, Number(input.creditJod ?? 0));
  if (wantedCredit > 0 && input.userId) {
    try {
      const { data: prof } = await supabase
        .from("profiles").select("store_credit_jod").eq("id", input.userId).maybeSingle();
      const balance = Number(prof?.store_credit_jod ?? 0);
      const spend = Math.round(Math.min(balance, wantedCredit) * 100) / 100;
      if (spend > 0) {
        const after = Math.round((balance - spend) * 100) / 100;
        await supabase.from("profiles").update({ store_credit_jod: after }).eq("id", input.userId);
        await supabase.from("store_credit_transactions").insert({
          user_id: input.userId,
          order_id: data.id,
          amount_jod: -spend,
          balance_after: after,
          kind: "spend",
          reason: `استخدام رصيد المتجر على الطلب ${data.order_number}`,
        });
      }
    } catch (e) {
      console.warn("[GX] store credit spend failed", e);
    }
  }

  return { id: data.id, order_number: data.order_number };
}


