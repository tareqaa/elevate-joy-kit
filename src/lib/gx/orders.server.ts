import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";

type CreateOrderInput = {
  items: Json;
  totalJOD: number;
  currency: string;
  customerName?: string | null;
  customerWhatsapp?: string | null;
  deliveryData?: Json;
  userId?: string | null;
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
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function createStoreOrder(input: CreateOrderInput) {
  const supabase = getAdminClient();
  const privateClient = supabase.schema("private" as never) as {
    rpc: (
      fn: "create_order",
      args: {
        p_items: Json;
        p_total_jod: number;
        p_currency_snapshot: string;
        p_customer_name: string | null;
        p_customer_whatsapp: string | null;
        p_delivery_data: Json;
        p_user_id: string | null;
      },
    ) => Promise<{ data: Array<{ id: string; order_number: string }> | null; error: { message: string } | null }>;
  };

  const { data, error } = await privateClient.rpc("create_order", {
    p_items: input.items,
    p_total_jod: input.totalJOD,
    p_currency_snapshot: input.currency,
    p_customer_name: input.customerName ?? null,
    p_customer_whatsapp: input.customerWhatsapp ?? null,
    p_delivery_data: input.deliveryData ?? {},
    p_user_id: input.userId ?? null,
  });

  if (error) throw new Error(error.message);
  const row = data?.[0];
  if (!row?.order_number) throw new Error("Order was not created");
  return { id: row.id, order_number: row.order_number };
}