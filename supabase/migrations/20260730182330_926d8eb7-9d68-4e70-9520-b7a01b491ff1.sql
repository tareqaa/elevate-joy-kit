INSERT INTO public.reviews (display_name, comment, rating, status, is_featured, product_name)
SELECT v.name, v.comment, 5, 'approved'::review_status, true, NULL
FROM (VALUES
  ('يوسف المومني', 'أفضل متجر بالأسعار'),
  ('يزن القضاة', 'تعامل ممتاز وسرعة بالتسليم'),
  ('زهير زامل', 'التفعيل كان فوري'),
  ('Wessam', 'أنصح فيه بشدة'),
  ('علي', 'خدمة سريعة وأسعار منافسة'),
  ('افنان عمر', 'خدمة ممتازة'),
  ('طارق دوعر', 'تعامل راقي'),
  ('Sara Alasmar', 'تجربة شراء سلسة وسريعة'),
  ('Kh H', 'سريع وموثوق'),
  ('Rami Awad', 'تجربة ممتازة'),
  ('أحمد زامل', 'خدمة رائعة وسريعة')
) AS v(name, comment)
WHERE NOT EXISTS (
  SELECT 1 FROM public.reviews r WHERE r.display_name = v.name
);