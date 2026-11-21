-- Like Them — initial schema.
-- Players can only edit their own profile fields; XP and stats are awarded
-- exclusively by the security-definer triggers below, so they can't be faked
-- from the browser.

-- ------------------------------------------------------------------ characters
create table public.characters (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 20),
  gender text not null check (gender in ('woman', 'man')),
  looking_for text not null check (looking_for in ('women', 'men', 'everyone')),
  age int not null check (age between 18 and 99),
  bio text not null default '' check (char_length(bio) <= 160),
  appearance jsonb not null check (jsonb_typeof(appearance) = 'object'),
  xp int not null default 0,
  drinks_shared int not null default 0,
  dates int not null default 0,
  nights int not null default 0,
  last_check_in timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.characters enable row level security;

create policy "characters are visible to signed-in players"
  on public.characters for select to authenticated using (true);
create policy "players create their own character"
  on public.characters for insert to authenticated with check (id = auth.uid());
create policy "players edit their own character"
  on public.characters for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

revoke insert, update on public.characters from anon, authenticated;
grant insert (id, name, gender, looking_for, age, bio, appearance) on public.characters to authenticated;
grant update (name, looking_for, bio, appearance) on public.characters to authenticated;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
create or replace function public.set_answered_at() returns trigger language plpgsql as $$
begin
  if old.status = 'pending' and new.status <> 'pending' then
    new.answered_at := now();
  end if;
  return new;
end $$;

create trigger characters_touch before update on public.characters
  for each row execute function public.touch_updated_at();

-- Award helper (internal only).
create or replace function public.award(p_id uuid, p_xp int, p_drinks int default 0, p_dates int default 0, p_nights int default 0)
returns void language sql security definer set search_path = public as $$
  update public.characters
     set xp = xp + p_xp,
         drinks_shared = drinks_shared + p_drinks,
         dates = dates + p_dates,
         nights = nights + p_nights
   where id = p_id;
$$;
revoke all on function public.award(uuid, int, int, int, int) from public, anon, authenticated;

-- A night out counts at most once every 10 minutes (+10 XP).
create or replace function public.check_in() returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.characters
     set nights = nights + 1, xp = xp + 10, last_check_in = now()
   where id = auth.uid()
     and (last_check_in is null or last_check_in < now() - interval '10 minutes');
end $$;
revoke all on function public.check_in() from public, anon;
grant execute on function public.check_in() to authenticated;

-- ------------------------------------------------------------------ blocks & reports
create table public.blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);
alter table public.blocks enable row level security;
create policy "see own blocks" on public.blocks for select to authenticated using (blocker_id = auth.uid());
create policy "add own blocks" on public.blocks for insert to authenticated with check (blocker_id = auth.uid());
create policy "remove own blocks" on public.blocks for delete to authenticated using (blocker_id = auth.uid());

create table public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reported_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
create policy "file reports" on public.reports for insert to authenticated with check (reporter_id = auth.uid());

create or replace function public.is_blocked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.blocks
                  where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;

-- ------------------------------------------------------------------ drinks
create table public.drink_offers (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.characters (id) on delete cascade,
  to_id uuid not null references public.characters (id) on delete cascade,
  drink text not null check (drink in ('mocktail','beer','wine','martini','whiskey','tropical','champagne','signature')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  check (from_id <> to_id)
);
create index on public.drink_offers (from_id, created_at desc);
create index on public.drink_offers (to_id, created_at desc);
alter table public.drink_offers enable row level security;

create policy "see my offers" on public.drink_offers for select to authenticated
  using (auth.uid() in (from_id, to_id));
create policy "send offers" on public.drink_offers for insert to authenticated
  with check (from_id = auth.uid() and status = 'pending' and not public.is_blocked(from_id, to_id));
create policy "answer offers sent to me" on public.drink_offers for update to authenticated
  using (to_id = auth.uid() and status = 'pending')
  with check (to_id = auth.uid() and status in ('accepted', 'declined'));

revoke insert, update on public.drink_offers from anon, authenticated;
grant insert (from_id, to_id, drink) on public.drink_offers to authenticated;
grant update (status) on public.drink_offers to authenticated;

create or replace function public.drink_offer_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- One pending offer per person every 30 seconds keeps spam (and XP farming) down.
  if exists (select 1 from public.drink_offers
              where from_id = new.from_id and to_id = new.to_id
                and created_at > now() - interval '30 seconds') then
    raise exception 'Give them a moment to finish their drink!';
  end if;
  return new;
end $$;
create trigger drink_offer_rate before insert on public.drink_offers
  for each row execute function public.drink_offer_before_insert();

create or replace function public.drink_offer_after() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.award(new.from_id, 5);
  elsif old.status = 'pending' and new.status = 'accepted' then
    perform public.award(new.from_id, 20, 1);
    perform public.award(new.to_id, 20, 1);
  end if;
  return null;
end $$;
create trigger drink_offer_award after insert or update on public.drink_offers
  for each row execute function public.drink_offer_after();

create trigger drink_offer_answered before update on public.drink_offers
  for each row execute function public.set_answered_at();

-- ------------------------------------------------------------------ dates
create table public.date_invites (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.characters (id) on delete cascade,
  to_id uuid not null references public.characters (id) on delete cascade,
  venue text not null check (venue in ('rooftop', 'diner', 'beach', 'jazz')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  check (from_id <> to_id)
);
create index on public.date_invites (from_id);
create index on public.date_invites (to_id);
alter table public.date_invites enable row level security;

create or replace function public.shared_drink_recently(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.drink_offers
                  where status = 'accepted'
                    and created_at > now() - interval '2 days'
                    and ((from_id = a and to_id = b) or (from_id = b and to_id = a)));
$$;

create policy "see my invites" on public.date_invites for select to authenticated
  using (auth.uid() in (from_id, to_id));
create policy "invite someone you shared a drink with" on public.date_invites for insert to authenticated
  with check (from_id = auth.uid() and status = 'pending'
              and public.shared_drink_recently(from_id, to_id)
              and not public.is_blocked(from_id, to_id));
create policy "answer invites sent to me" on public.date_invites for update to authenticated
  using (to_id = auth.uid() and status = 'pending')
  with check (to_id = auth.uid() and status in ('accepted', 'declined'));

revoke insert, update on public.date_invites from anon, authenticated;
grant insert (from_id, to_id, venue) on public.date_invites to authenticated;
grant update (status) on public.date_invites to authenticated;

create or replace function public.date_invite_after() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'pending' and new.status = 'accepted' then
    perform public.award(new.from_id, 50, 0, 1);
    perform public.award(new.to_id, 50, 0, 1);
  end if;
  return null;
end $$;
create trigger date_invite_award after update on public.date_invites
  for each row execute function public.date_invite_after();

create trigger date_invite_answered before update on public.date_invites
  for each row execute function public.set_answered_at();

-- ------------------------------------------------------------------ date messages
create table public.messages (
  id bigint generated always as identity primary key,
  invite_id uuid not null references public.date_invites (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index on public.messages (invite_id, id);
alter table public.messages enable row level security;

create or replace function public.in_date(p_invite uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.date_invites i
                  where i.id = p_invite and i.status = 'accepted'
                    and auth.uid() in (i.from_id, i.to_id)
                    and not public.is_blocked(i.from_id, i.to_id));
$$;

create policy "read messages of my dates" on public.messages for select to authenticated
  using (public.in_date(invite_id));
create policy "write messages on my dates" on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.in_date(invite_id));

revoke insert, update on public.messages from anon, authenticated;
grant insert (invite_id, sender_id, body) on public.messages to authenticated;

alter publication supabase_realtime add table public.messages;

-- ------------------------------------------------------------------ realtime bar rooms
-- The bar uses private Realtime channels named "bar:<room>"; only signed-in
-- players may listen or broadcast there.
create policy "players read bar rooms" on realtime.messages for select to authenticated
  using (realtime.topic() like 'bar:%');
create policy "players write bar rooms" on realtime.messages for insert to authenticated
  with check (realtime.topic() like 'bar:%');
