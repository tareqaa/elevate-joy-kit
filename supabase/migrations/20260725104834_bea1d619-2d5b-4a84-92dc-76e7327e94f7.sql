
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.auto_cancel_stale_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  WITH updated AS (
    UPDATE public.orders
       SET status = 'cancelled',
           admin_notes = COALESCE(admin_notes, '') ||
             CASE WHEN admin_notes IS NULL OR admin_notes = '' THEN '' ELSE E'\n' END ||
             'تم الإلغاء تلقائياً: لم يكتمل الطلب خلال 24 ساعة.',
           updated_at = now()
     WHERE status = 'pending'
       AND created_at < now() - interval '24 hours'
    RETURNING id
  )
  SELECT count(*) INTO n FROM updated;
  RETURN n;
END;
$$;

-- Schedule hourly auto-cancel
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'gx_auto_cancel_stale_orders') THEN
    PERFORM cron.unschedule('gx_auto_cancel_stale_orders');
  END IF;
  PERFORM cron.schedule(
    'gx_auto_cancel_stale_orders',
    '*/15 * * * *',
    $cron$SELECT public.auto_cancel_stale_orders();$cron$
  );
END $$;

-- Immediate first pass
SELECT public.auto_cancel_stale_orders();
