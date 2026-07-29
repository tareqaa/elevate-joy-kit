CREATE OR REPLACE FUNCTION public.validate_my_level_coupon(_code TEXT, _subtotal_jod NUMERIC)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.user_coupons%ROWTYPE; d NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('valid',false,'message','سجّل الدخول لاستخدام كوبون المستوى'); END IF;
  SELECT * INTO c FROM public.user_coupons WHERE upper(code) = upper(trim(_code)) LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('valid',false,'message','الكوبون غير موجود'); END IF;
  IF c.user_id <> auth.uid() THEN RETURN jsonb_build_object('valid',false,'message','هذا الكوبون ليس لحسابك'); END IF;
  IF c.used_at IS NOT NULL THEN RETURN jsonb_build_object('valid',false,'message','تم استخدام هذا الكوبون'); END IF;
  IF c.expires_at < now() THEN RETURN jsonb_build_object('valid',false,'message','الكوبون منتهي الصلاحية'); END IF;
  d := round((GREATEST(_subtotal_jod,0) * c.percent / 100)::numeric, 2);
  IF c.max_discount_jod IS NOT NULL AND d > c.max_discount_jod THEN d := c.max_discount_jod; END IF;
  IF d <= 0 THEN RETURN jsonb_build_object('valid',false,'message','قيمة الخصم صفر'); END IF;
  RETURN jsonb_build_object('valid',true,'user_coupon_id',c.id,'code',c.code,'percent',c.percent,
    'max_discount_jod',c.max_discount_jod,'discount_jod',d,'message','تم تطبيق كوبون المستوى');
END;
$$;
GRANT EXECUTE ON FUNCTION public.validate_my_level_coupon(TEXT, NUMERIC) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_loyalty()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.profiles%ROWTYPE; cur public.levels%ROWTYPE; nxt public.levels%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok',false); END IF;
  SELECT * INTO p FROM public.profiles WHERE id = auth.uid();
  SELECT * INTO cur FROM public.level_for_xp(COALESCE(p.xp,0));
  SELECT * INTO nxt FROM public.levels WHERE is_active AND min_xp > COALESCE(p.xp,0) ORDER BY min_xp ASC LIMIT 1;
  RETURN jsonb_build_object(
    'ok', true,
    'xp', COALESCE(p.xp,0),
    'coins', COALESCE(p.gx_coins,0),
    'total_spent', COALESCE(p.total_spent,0),
    'orders_count', COALESCE(p.orders_count,0),
    'level', to_jsonb(cur),
    'next_level', to_jsonb(nxt),
    'rank', (SELECT count(*)+1 FROM public.profiles x WHERE COALESCE(x.xp,0) > COALESCE(p.xp,0))
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_loyalty() TO authenticated;