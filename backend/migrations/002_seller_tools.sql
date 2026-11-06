-- Run in the Supabase SQL editor to enable seller posts and private appointments.
begin;
create function public.is_verified_maker() returns boolean
language sql stable security definer set search_path = '' as $$
    select exists (select 1 from auth.users where id = auth.uid()
        and email_confirmed_at is not null and email ~* '^[^\s@]+@[^\s@]+\.edu$');
$$;
create table public.maker_posts (
    id bigint generated always as identity primary key,
    seller_id uuid not null references auth.users(id) on delete cascade,
    creator text not null,
    caption text not null check (char_length(btrim(caption)) between 1 and 2000),
    image text,
    created_at timestamptz not null default now()
);
-- Derive attribution from the authenticated account rather than client input.
create function public.attribute_maker_post() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
    select '@' || coalesce(nullif(raw_user_meta_data->>'username', ''), split_part(email, '@', 1))
    into new.creator from auth.users where id = auth.uid();
    return new;
end;
$$;
create trigger attribute_maker_post before insert on public.maker_posts
for each row execute function public.attribute_maker_post();
create table public.maker_appointments (
    id uuid primary key default gen_random_uuid(),
    seller_id uuid not null references auth.users(id) on delete cascade,
    title text not null check (char_length(btrim(title)) between 1 and 120),
    buyer text not null check (char_length(btrim(buyer)) between 1 and 120),
    location text not null check (char_length(btrim(location)) between 1 and 200),
    starts_at timestamptz not null,
    status text not null default 'Scheduled' check (status in ('Scheduled', 'Completed', 'Cancelled'))
);
alter table public.maker_posts enable row level security;
alter table public.maker_appointments enable row level security;
revoke all on public.maker_posts, public.maker_appointments from anon, authenticated;
grant select on public.maker_posts to anon, authenticated;
grant insert on public.maker_posts to authenticated;
grant usage, select on sequence public.maker_posts_id_seq to authenticated;
grant select, insert, update on public.maker_appointments to authenticated;
create policy posts_read on public.maker_posts for select using (true);
create policy posts_create on public.maker_posts for insert to authenticated
    with check (seller_id = auth.uid() and public.is_verified_maker());
create policy appointments_read on public.maker_appointments for select to authenticated using (seller_id = auth.uid());
create policy appointments_create on public.maker_appointments for insert to authenticated with check (seller_id = auth.uid() and public.is_verified_maker());
create policy appointments_update on public.maker_appointments for update to authenticated using (seller_id = auth.uid() and public.is_verified_maker()) with check (seller_id = auth.uid() and public.is_verified_maker());
create index maker_posts_created on public.maker_posts(created_at desc);
create index maker_appointments_seller on public.maker_appointments(seller_id, starts_at);
commit;
