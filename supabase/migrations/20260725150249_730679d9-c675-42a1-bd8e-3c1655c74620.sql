
-- Public profile lookup + search (returns only safe/public fields; PII stays private)
create or replace function public.get_public_profile(_username text)
returns table (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  level int,
  xp int,
  rank bigint,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with ranked as (
    select p.id, p.username, p.full_name, p.avatar_url, p.level, p.xp, p.created_at,
           rank() over (order by coalesce(p.xp,0) desc, p.created_at asc) as rank
    from public.profiles p
    where p.username is not null
  )
  select id, username, full_name, avatar_url, level, xp, rank, created_at
  from ranked
  where lower(username) = lower(_username)
  limit 1;
$$;

create or replace function public.search_public_profiles(_q text, _limit int default 10)
returns table (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  level int
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.username, p.full_name, p.avatar_url, p.level
  from public.profiles p
  where p.username is not null
    and (_q is null or _q = '' or p.username ilike '%' || _q || '%' or coalesce(p.full_name,'') ilike '%' || _q || '%')
  order by coalesce(p.xp,0) desc
  limit greatest(1, least(coalesce(_limit,10), 25));
$$;

revoke all on function public.get_public_profile(text) from public;
revoke all on function public.search_public_profiles(text, int) from public;
grant execute on function public.get_public_profile(text) to anon, authenticated;
grant execute on function public.search_public_profiles(text, int) to anon, authenticated;
