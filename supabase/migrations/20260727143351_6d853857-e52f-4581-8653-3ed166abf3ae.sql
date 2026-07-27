CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.create_order(
  p_items jsonb,
  p_total_jod numeric,
  p_currency_snapshot text DEFAULT 'JOD',
  p_customer_name text DEFAULT NULL,
  p_customer_whatsapp text DEFAULT NULL,
  p_delivery_data jsonb DEFAULT '{}'::jsonb,
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE(id uuid, order_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_id uuid;
  v_order_number text;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order items are required';
  END IF;

  IF p_total_jod IS NULL OR p_total_jod < 0 THEN
    RAISE EXCEPTION 'Invalid order total';
  END IF;

  INSERT INTO public.orders (
    user_id,
    customer_name,
    customer_whatsapp,
    items,
    total_jod,
    currency_snapshot,
    delivery_data,
    status
  )
  VALUES (
    p_user_id,
    NULLIF(trim(p_customer_name), ''),
    NULLIF(trim(p_customer_whatsapp), ''),
    p_items,
    p_total_jod,
    COALESCE(NULLIF(trim(p_currency_snapshot), ''), 'JOD'),
    COALESCE(p_delivery_data, '{}'::jsonb),
    'pending'
  )
  RETURNING orders.id, orders.order_number INTO v_id, v_order_number;

  RETURN QUERY SELECT v_id, v_order_number;
END;
$$;

REVOKE ALL ON FUNCTION public.create_order(jsonb, numeric, text, text, text, jsonb) FROM PUBLIC, anon, authenticated, service_role;
DROP FUNCTION public.create_order(jsonb, numeric, text, text, text, jsonb);
REVOKE ALL ON FUNCTION private.create_order(jsonb, numeric, text, text, text, jsonb, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.create_order(jsonb, numeric, text, text, text, jsonb, uuid) TO service_role;