CREATE OR REPLACE FUNCTION public.guard_order_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _name text;
  _contact text;
  _digits text;
  _items_count int;
  _bad_qty int;
  _recent int;
  _limit int := 10;
  _email text;
BEGIN
  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  _name := NULLIF(TRIM(COALESCE(NEW.customer_name, '')), '');
  IF _name IS NOT NULL AND (char_length(_name) < 2 OR char_length(_name) > 60) THEN
    RAISE EXCEPTION 'الاسم غير صالح: يجب أن يكون بين حرفين و60 حرفاً';
  END IF;

  _contact := NULLIF(TRIM(COALESCE(NEW.customer_whatsapp, '')), '');
  _email := NULLIF(TRIM(COALESCE(NEW.delivery_data->>'customer_email', '')), '');

  IF _contact IS NULL THEN
    IF NEW.user_id IS NULL AND _email IS NULL THEN
      RAISE EXCEPTION 'البريد الإلكتروني مطلوب لإتمام الطلب';
    END IF;
  ELSE
    IF char_length(_contact) > 30 THEN
      RAISE EXCEPTION 'رقم التواصل غير صالح: طويل جداً';
    END IF;
    _digits := public.normalize_contact(_contact);
    IF _digits IS NOT NULL AND (char_length(_digits) < 7 OR char_length(_digits) > 15) THEN
      RAISE EXCEPTION 'رقم التواصل غير صالح: تأكد من كتابة الرقم بشكل صحيح';
    END IF;
  END IF;

  IF jsonb_typeof(COALESCE(NEW.items, 'null'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'محتويات السلة غير صالحة';
  END IF;
  _items_count := jsonb_array_length(NEW.items);
  IF _items_count < 1 THEN
    RAISE EXCEPTION 'السلة فارغة';
  END IF;
  IF _items_count > 30 THEN
    RAISE EXCEPTION 'عدد المنتجات في السلة كبير جداً (الحد الأقصى 30 منتجاً)';
  END IF;

  SELECT count(*) INTO _bad_qty
    FROM jsonb_array_elements(NEW.items) it
   WHERE COALESCE((it->>'qty')::numeric, (it->>'quantity')::numeric, 1) > 99
      OR COALESCE((it->>'qty')::numeric, (it->>'quantity')::numeric, 1) < 1;
  IF _bad_qty > 0 THEN
    RAISE EXCEPTION 'الكمية غير صالحة: الحد الأقصى 99 لكل منتج';
  END IF;

  IF _digits IS NOT NULL THEN
    SELECT count(*) INTO _recent
      FROM public.orders
     WHERE public.normalize_contact(customer_whatsapp) = _digits
       AND created_at > now() - interval '1 hour';
    IF _recent >= _limit THEN
      RAISE EXCEPTION 'تجاوزت الحد المسموح للطلبات خلال ساعة واحدة، حاول لاحقاً';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
