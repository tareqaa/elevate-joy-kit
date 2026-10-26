CREATE OR REPLACE FUNCTION public.cleanup_test_review()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  DELETE FROM public.reviews WHERE order_number = 'TEST-ORDER-NONEXIST';
END;
$function$;

DROP POLICY IF EXISTS "Allow anyone to insert restock request" ON public.product_restock_requests;

CREATE POLICY "Anyone can submit a pending restock request"
ON public.product_restock_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status = 'pending'
  AND notified_at IS NULL
  AND char_length(btrim(product_slug)) BETWEEN 1 AND 200
  AND char_length(btrim(product_name)) BETWEEN 1 AND 300
  AND (variant_cart_id IS NULL OR char_length(variant_cart_id) <= 200)
  AND char_length(btrim(customer_name)) BETWEEN 1 AND 120
  AND char_length(customer_email) BETWEEN 3 AND 254
  AND customer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
);