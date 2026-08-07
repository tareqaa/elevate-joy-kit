import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getPublicClient, getVerifiedCaller } from "@/lib/gx/supabase-request";

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
    const supabase = getPublicClient();

    // Coupon validation works for signed-out shoppers too, so a missing/
    // invalid token just means "anonymous" rather than a hard failure.
    const caller = await getVerifiedCaller();
    const userId = caller?.userId ?? null;

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
