
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_main boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accent_color text,
  ADD COLUMN IF NOT EXISTS theme_gradient text,
  ADD COLUMN IF NOT EXISTS description_ar text,
  ADD COLUMN IF NOT EXISTS description_en text;

CREATE INDEX IF NOT EXISTS categories_parent_id_idx ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS categories_is_main_idx ON public.categories(is_main) WHERE is_main = true;

-- Existing top-level rows become main (visible on homepage) by default
UPDATE public.categories SET is_main = true WHERE parent_id IS NULL AND is_main = false;
