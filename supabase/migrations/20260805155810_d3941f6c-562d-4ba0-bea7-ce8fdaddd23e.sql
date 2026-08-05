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
BEGIN
  -- 1. Determine username
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

  -- 2. Pick a random STORE avatar (Prioritize store identity)
  SELECT a.id, a.image_url INTO rnd_avatar
  FROM public.avatars a
  WHERE a.is_active = true
  ORDER BY random()
  LIMIT 1;

  -- 3. Create profile (Always use store avatar if found, else fallback to metadata)
  INSERT INTO public.profiles (id, email, username, full_name, avatar_url, avatar_id)
  VALUES (
    NEW.id,
    NEW.email,
    final_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(rnd_avatar.image_url, NEW.raw_user_meta_data->>'avatar_url'),
    rnd_avatar.id
  );

  -- 4. Grant initial avatar to user_avatars
  IF rnd_avatar.id IS NOT NULL THEN
    INSERT INTO public.user_avatars (user_id, avatar_id)
    VALUES (NEW.id, rnd_avatar.id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- 5. Set default role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
