-- Admins: people who can see moderation reports and app-wide stats.
-- Add an admin with:  insert into private.admins (user_id) values ('<auth user id>');

create table private.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
revoke all on private.admins from public, anon, authenticated;

-- Tells the signed-in player whether they are an admin (reveals nothing about anyone else).
create or replace function public.am_i_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from private.admins where user_id = auth.uid());
$$;
revoke all on function public.am_i_admin() from public, anon;
grant execute on function public.am_i_admin() to authenticated;

create or replace function public.admin_overview() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from private.admins where user_id = auth.uid()) then
    raise exception 'Admins only';
  end if;
  return json_build_object(
    'players', (select count(*) from public.characters),
    'women', (select count(*) from public.characters where gender = 'woman'),
    'men', (select count(*) from public.characters where gender = 'man'),
    'drinks_accepted', (select count(*) from public.drink_offers where status = 'accepted'),
    'dates', (select count(*) from public.date_invites where status = 'accepted'),
    'reports', (select count(*) from public.reports)
  );
end $$;
revoke all on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;

create or replace function public.admin_reports()
returns table (id bigint, created_at timestamptz, reason text, reporter_name text, reported_id uuid, reported_name text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from private.admins where user_id = auth.uid()) then
    raise exception 'Admins only';
  end if;
  return query
    select r.id, r.created_at, r.reason, rc.name, r.reported_id, dc.name
      from public.reports r
      left join public.characters rc on rc.id = r.reporter_id
      left join public.characters dc on dc.id = r.reported_id
     order by r.created_at desc
     limit 200;
end $$;
revoke all on function public.admin_reports() from public, anon;
grant execute on function public.admin_reports() to authenticated;
