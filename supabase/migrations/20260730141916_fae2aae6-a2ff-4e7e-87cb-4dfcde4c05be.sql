DO $$
DECLARE
  r RECORD;
  d TEXT;
BEGIN
  FOR r IN
    SELECT p.oid FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('validate_coupon','validate_my_level_coupon','admin_refund_order','refund_order_credit','create_store_order')
  LOOP
    d := pg_get_functiondef(r.oid);
    d := replace(d, 'round((eligible * c.discount_value / 100)::numeric, 2)', 'round((eligible * c.discount_value / 100)::numeric, 3)');
    d := replace(d, 'round((GREATEST(_subtotal_jod,0) * c.percent / 100)::numeric, 2)', 'round((GREATEST(_subtotal_jod,0) * c.percent / 100)::numeric, 3)');
    d := replace(d, 'round(_remaining,2)', 'round(_remaining,3)');
    d := replace(d, 'round((o.credit_used_jod * r)::numeric, 2)', 'round((o.credit_used_jod * r)::numeric, 3)');
    d := replace(d, 'round((target - COALESCE(o.credit_refunded_jod, 0))::numeric, 2)', 'round((target - COALESCE(o.credit_refunded_jod, 0))::numeric, 3)');
    d := replace(d, 'round((_subtotal * _uc.percent / 100)::numeric, 2)', 'round((_subtotal * _uc.percent / 100)::numeric, 3)');
    d := replace(d, 'round(_credit, 2)', 'round(_credit, 3)');
    d := replace(d, 'round(GREATEST(_subtotal - _discount, 0), 2)', 'round(GREATEST(_subtotal - _discount, 0), 3)');
    d := replace(d, 'round(GREATEST(_credit_bal - _credit, 0), 2)', 'round(GREATEST(_credit_bal - _credit, 0), 3)');
    EXECUTE d;
  END LOOP;
END $$;

REVOKE EXECUTE ON FUNCTION public.create_store_order(uuid, text, text, jsonb, numeric, text, jsonb, text, text, bigint, numeric, numeric) FROM PUBLIC, anon, authenticated;
