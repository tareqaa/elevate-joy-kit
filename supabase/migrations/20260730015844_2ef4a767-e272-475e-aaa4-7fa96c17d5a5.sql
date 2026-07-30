DROP POLICY IF EXISTS "Anyone reads user badges" ON public.user_badges;

CREATE POLICY "Users read own badges" ON public.user_badges
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins read all user badges" ON public.user_badges
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

REVOKE SELECT ON public.user_badges FROM anon;