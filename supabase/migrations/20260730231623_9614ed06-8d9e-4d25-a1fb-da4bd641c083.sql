CREATE OR REPLACE FUNCTION public.apply_loyalty_on_order_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _paid NUMERIC; _xp INT; _coins BIGINT; _bonus NUMERIC; _lvl public.levels;
        _cm NUMERIC; _xm NUMERIC;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' THEN
    -- Store credit is real money the customer already paid, so it counts
    -- toward loyalty rewards just like a cash payment.
    _paid := GREATEST(COALESCE(NEW.paid_jod, NEW.total_jod, 0), 0)
             + GREATEST(COALESCE(NEW.credit_used_jod, 0) - COALESCE(NEW.credit_refunded_jod, 0), 0);
    IF _paid <= 0 THEN RETURN NEW; END IF;
    SELECT * INTO _lvl FROM public.level_for_xp((SELECT COALESCE(xp,0) FROM public.profiles WHERE id=NEW.user_id));
    _bonus := COALESCE(_lvl.coins_bonus_pct, 0);
    _cm := GREATEST(COALESCE(NEW.coins_multiplier, 1), 1);
    _xm := GREATEST(COALESCE(NEW.xp_multiplier, 1), 1);
    _xp := round(_paid * 100 * _xm);
    _coins := round(_paid * 10 * (1 + _bonus/100.0) * _cm);

    UPDATE public.profiles
       SET xp = COALESCE(xp,0) + _xp,
           gx_coins = gx_coins + _coins,
           total_spent = COALESCE(total_spent,0) + _paid,
           orders_count = orders_count + 1
     WHERE id = NEW.user_id;

    INSERT INTO public.xp_transactions (user_id, amount, balance_after, source, reason, order_id, metadata)
    VALUES (NEW.user_id, _xp, (SELECT xp FROM public.profiles WHERE id=NEW.user_id),
            CASE WHEN _xm > 1 THEN 'wheel_boost_applied' ELSE 'purchase' END,
            'طلب '||NEW.order_number || CASE WHEN _xm > 1 THEN ' (مضاعفة XP ×'||_xm||')' ELSE '' END,
            NEW.id, jsonb_build_object('xp_multiplier', _xm));
    INSERT INTO public.gx_coin_transactions (user_id, amount, balance_after, kind, source, reason, order_id, metadata)
    VALUES (NEW.user_id, _coins, (SELECT gx_coins FROM public.profiles WHERE id=NEW.user_id), 'earn',
            CASE WHEN _cm > 1 THEN 'wheel_boost_applied' ELSE 'purchase' END,
            'طلب '||NEW.order_number || CASE WHEN _cm > 1 THEN ' (مضاعفة GX Coins ×'||_cm||')' ELSE '' END,
            NEW.id, jsonb_build_object('coins_multiplier', _cm));

    NEW.xp_awarded := _xp;
    NEW.coins_awarded := _coins;
    PERFORM public.sync_user_level(NEW.user_id);

  ELSIF OLD.status = 'delivered' AND NEW.status IN ('cancelled') THEN
    _xp := COALESCE(OLD.xp_awarded,0);
    _coins := COALESCE(OLD.coins_awarded,0);
    IF _xp > 0 OR _coins > 0 THEN
      UPDATE public.profiles
         SET xp = GREATEST(COALESCE(xp,0) - _xp, 0),
             gx_coins = GREATEST(gx_coins - _coins, 0),
             total_spent = GREATEST(COALESCE(total_spent,0) - COALESCE(OLD.paid_jod, OLD.total_jod,0), 0),
             orders_count = GREATEST(orders_count - 1, 0)
       WHERE id = OLD.user_id;
      INSERT INTO public.xp_transactions (user_id, amount, balance_after, source, reason, order_id)
      VALUES (OLD.user_id, -_xp, (SELECT xp FROM public.profiles WHERE id=OLD.user_id), 'reversal',
              'إلغاء الطلب '||OLD.order_number, OLD.id);
      INSERT INTO public.gx_coin_transactions (user_id, amount, balance_after, kind, source, reason, order_id)
      VALUES (OLD.user_id, -_coins, (SELECT gx_coins FROM public.profiles WHERE id=OLD.user_id), 'reversal','reversal',
              'إلغاء الطلب '||OLD.order_number, OLD.id);
      NEW.xp_awarded := 0;
      NEW.coins_awarded := 0;
      PERFORM public.sync_user_level(OLD.user_id);
    END IF;
  END IF;
  RETURN NEW;
END $function$;