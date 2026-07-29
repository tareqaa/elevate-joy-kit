
CREATE OR REPLACE FUNCTION public.increment_purchases_on_delivered()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  s text;
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS DISTINCT FROM 'delivered') THEN
    FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(NEW.items, '[]'::jsonb))
    LOOP
      s := COALESCE(item->>'product_slug', item->>'productSlug', item->>'product');
      IF s IS NOT NULL AND s <> '' THEN
        UPDATE public.products p
           SET purchases_count = p.purchases_count + COALESCE((item->>'quantity')::int, 1)
         WHERE p.slug = s;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_purchases_on_delivered() FROM PUBLIC, anon, authenticated;
