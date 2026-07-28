DROP POLICY IF EXISTS "Anyone views country prices" ON public.product_country_prices;

CREATE POLICY "Anyone views prices of active products"
ON public.product_country_prices
FOR SELECT
TO anon, authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1
    FROM public.product_variants v
    JOIN public.products p ON p.id = v.product_id
    WHERE v.id = product_country_prices.variant_id
      AND v.is_active = true
      AND p.is_active = true
  )
);