ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS codes_revealed_at timestamptz,
  ADD COLUMN IF NOT EXISTS codes_reveal_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.reveal_order_codes(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.orders;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  UPDATE public.orders
     SET codes_revealed_at = COALESCE(codes_revealed_at, now()),
         codes_reveal_count = codes_reveal_count + 1
   WHERE id = _order_id
     AND user_id = _uid
     AND status = 'delivered'
  RETURNING * INTO _row;

  IF _row.id IS NULL THEN
    RAISE EXCEPTION 'order not found';
  END IF;

  RETURN jsonb_build_object(
    'revealed_at', _row.codes_revealed_at,
    'reveal_count', _row.codes_reveal_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reveal_order_codes(uuid) TO authenticated;