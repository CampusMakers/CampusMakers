begin;

create table if not exists public.maker_tag_follows (
    follower_id uuid not null references public.messaging_profiles(id) on delete cascade,
    tag_name text not null check (length(trim(tag_name)) between 1 and 40),
    created_at timestamptz not null default now(),
    primary key (follower_id, tag_name)
);

create index if not exists maker_tag_follows_tag_name
    on public.maker_tag_follows (tag_name);

alter table public.maker_tag_follows enable row level security;
grant select on public.maker_tag_follows to authenticated;
grant insert, delete on public.maker_tag_follows to authenticated;

drop policy if exists maker_tag_follows_read on public.maker_tag_follows;
create policy maker_tag_follows_read on public.maker_tag_follows for select to authenticated
    using (follower_id = auth.uid());

drop policy if exists maker_tag_follows_create on public.maker_tag_follows;
create policy maker_tag_follows_create on public.maker_tag_follows for insert to authenticated
    with check (follower_id = auth.uid());

drop policy if exists maker_tag_follows_delete on public.maker_tag_follows;
create policy maker_tag_follows_delete on public.maker_tag_follows for delete to authenticated
    using (follower_id = auth.uid());

commit;
