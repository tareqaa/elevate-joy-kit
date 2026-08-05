CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_username TEXT;
  base_username TEXT;
  final_username TEXT;
  suffix INT := 0;
  rnd_avatar RECORD;
  meta_avatar TEXT;
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

  SELECT a.id, a.image_url INTO rnd_avatar
  FROM public.avatars a
  WHERE a.is_active = true
  ORDER BY random()
  LIMIT 1;

  meta_avatar := NULLIF(TRIM(NEW.raw_user_meta_data->>'avatar_url'), '');

  INSERT INTO public.profiles (id, email, username, full_name, avatar_url, avatar_id)
  VALUES (
    NEW.id,
    NEW.email,
    final_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(meta_avatar, rnd_avatar.image_url),
    CASE WHEN meta_avatar IS NULL THEN rnd_avatar.id ELSE NULL END
  );

  IF rnd_avatar.id IS NOT NULL THEN
    INSERT INTO public.user_avatars (user_id, avatar_id)
    VALUES (NEW.id, rnd_avatar.id)
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DO $$
DECLARE p RECORD; a RECORD;
BEGIN
  FOR p IN SELECT id FROM public.profiles WHERE avatar_url IS NULL OR avatar_url = '' LOOP
    SELECT av.id, av.image_url INTO a FROM public.avatars av WHERE av.is_active ORDER BY random() LIMIT 1;
    IF a.id IS NOT NULL THEN
      UPDATE public.profiles SET avatar_url = a.image_url, avatar_id = a.id WHERE id = p.id;
      INSERT INTO public.user_avatars (user_id, avatar_id) VALUES (p.id, a.id) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;