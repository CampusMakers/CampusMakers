begin;

create table if not exists public.maker_follows (
    follower_id uuid not null references public.messaging_profiles(id) on delete cascade,
    followee_id uuid not null references public.messaging_profiles(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (follower_id, followee_id),
    check (follower_id <> followee_id)
);

create index if not exists maker_follows_followee on public.maker_follows (followee_id);
alter table public.maker_follows enable row level security;
grant select on public.maker_follows to anon, authenticated;
grant insert, delete on public.maker_follows to authenticated;

drop policy if exists maker_follows_read on public.maker_follows;
create policy maker_follows_read on public.maker_follows for select to anon, authenticated using (true);
drop policy if exists maker_follows_create on public.maker_follows;
create policy maker_follows_create on public.maker_follows for insert to authenticated
    with check (follower_id = auth.uid());
drop policy if exists maker_follows_delete on public.maker_follows;
create policy maker_follows_delete on public.maker_follows for delete to authenticated
    using (follower_id = auth.uid());

commit;
