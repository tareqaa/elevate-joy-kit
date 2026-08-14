-- Add GX Flux 3D to mini_games catalog
INSERT INTO public.mini_games (slug, game_slug, path, icon, name_ar, name_en, desc_ar, desc_en, sort_order)
VALUES (
  'gx-flux',
  'gx-flux',
  '/games/flux',
  '⚡',
  'GX Flux 3D',
  'GX Flux 3D',
  'طابق ألوان بوابات النيون ثلاثية الأبعاد بسرعة فائقة!',
  'Match 3D neon gate colors at hyper speed!',
  3
)
ON CONFLICT (slug) DO UPDATE
SET
  game_slug = EXCLUDED.game_slug,
  path = EXCLUDED.path,
  icon = EXCLUDED.icon,
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  desc_ar = EXCLUDED.desc_ar,
  desc_en = EXCLUDED.desc_en,
  sort_order = EXCLUDED.sort_order;
