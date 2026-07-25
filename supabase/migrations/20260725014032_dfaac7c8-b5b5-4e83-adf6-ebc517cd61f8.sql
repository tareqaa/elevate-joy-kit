
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key ON public.profiles (LOWER(username)) WHERE username IS NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  meta_username TEXT;
  base_username TEXT;
  final_username TEXT;
  suffix INT := 0;
BEGIN
  meta_username := NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), '');
  IF meta_username IS NULL THEN
    base_username := regexp_replace(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g');
  ELSE
    base_username := regexp_replace(meta_username, '[^a-zA-Z0-9_]', '', 'g');
  END IF;
  IF base_username IS NULL OR length(base_username) < 3 THEN
    base_username := 'gx' || substr(replace(NEW.id::text, '-', ''), 1, 6);
  END IF;
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(username) = LOWER(final_username)) LOOP
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  END LOOP;

  INSERT INTO public.profiles (id, email, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    final_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;

-- Backfill usernames for existing profiles
UPDATE public.profiles p
SET username = COALESCE(
  regexp_replace(split_part(p.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g'),
  'gx' || substr(replace(p.id::text, '-', ''), 1, 6)
)
WHERE p.username IS NULL;
