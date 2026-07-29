INSERT INTO public.site_settings (key, value, description)
VALUES (
  'home_layout',
  '{
    "version": 1,
    "sections": [
      {"id": "sec_hero",         "type": "hero",         "enabled": true, "data": {}},
      {"id": "sec_announcement", "type": "announcement", "enabled": false, "data": {"text": "", "link": "", "bg": "#0f172a", "color": "#ffffff"}},
      {"id": "sec_carousel",     "type": "carousel",     "enabled": true, "data": {}},
      {"id": "sec_categories",   "type": "categories",   "enabled": true, "data": {}},
      {"id": "sec_bestsellers",  "type": "bestsellers",  "enabled": true, "data": {}},
      {"id": "sec_trust",        "type": "trust",        "enabled": true, "data": {}},
      {"id": "sec_reviews",      "type": "reviews",      "enabled": true, "data": {}},
      {"id": "sec_faq",          "type": "faq",          "enabled": false, "data": {"title": "الأسئلة الشائعة", "items": [{"id":"q1","q":"كيف يتم التسليم؟","a":"يتم التسليم فوراً بعد تأكيد الطلب."}]}},
      {"id": "sec_newsletter",   "type": "newsletter",   "enabled": false, "data": {"title": "اشترك بالنشرة", "subtitle": "أول من يعرف عن العروض", "cta": "اشترك"}}
    ]
  }'::jsonb,
  'Ordered list of homepage sections rendered by the visual page builder.'
)
ON CONFLICT (key) DO NOTHING;