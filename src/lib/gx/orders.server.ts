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
  const { data, error } = await supabase
    .from("orders")
    .insert({
      user_id: input.userId ?? null,
      customer_name: input.customerName ?? null,
      customer_whatsapp: input.customerWhatsapp ?? null,
      items: input.items,
      total_jod: input.totalJOD,
      currency_snapshot: input.currency,
      delivery_data: input.deliveryData ?? {},
      status: "pending",
    })
    .select("id, order_number")
    .single();

  if (error) throw new Error(error.message);
  if (!data?.order_number) throw new Error("Order was not created");
  return { id: data.id, order_number: data.order_number };
}