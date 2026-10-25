-- Security hardening migration:
-- 1. Scrub resend_api_key from public.site_settings (API keys must only live in server environment variables)
UPDATE public.site_settings SET value = '{}'::jsonb WHERE key = 'resend_api_key';

-- 2. Restrict site_settings SELECT policy to block any sensitive keys from being read by anon/authenticated users
ALTER POLICY "Anyone reads settings" ON public.site_settings
  USING (
    key NOT LIKE '%_key%'
    AND key NOT LIKE '%_secret%'
    AND key NOT LIKE '%_token%'
    AND key NOT IN ('resend_api_key')
  );

-- 3. Lock down product_restock_requests so customer contact details are only readable and modifiable by admins
ALTER POLICY "Allow anyone to read restock request" ON public.product_restock_requests
  USING (has_role(auth.uid(), 'admin'::app_role));

ALTER POLICY "Allow anyone to update restock request" ON public.product_restock_requests
  USING (has_role(auth.uid(), 'admin'::app_role));
