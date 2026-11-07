begin;

create or replace function public.is_verified_maker()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from auth.users
        where id = auth.uid()
          and email_confirmed_at is not null
          and email ~* '^[^\s@]+@[^\s@]+\.edu$'
    );
$$;

create or replace function public.attribute_maker_post()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    select '@' || coalesce(
        nullif(raw_user_meta_data->>'username', ''),
        split_part(email, '@', 1)
    )
    into new.creator
    from auth.users
    where id = auth.uid();

    return new;
end;
$$;

drop trigger if exists attribute_maker_post
    on public.maker_posts;

create trigger attribute_maker_post
before insert on public.maker_posts
for each row
execute function public.attribute_maker_post();

alter table public.maker_posts enable row level security;
alter table public.maker_appointments enable row level security;

revoke all on public.maker_posts, public.maker_appointments
    from anon, authenticated;

grant select on public.maker_posts
    to anon, authenticated;

grant insert on public.maker_posts
    to authenticated;

-- Find the identity sequence rather than assume its name.
do $$
declare
    posts_sequence text;
begin
    posts_sequence :=
        pg_get_serial_sequence('public.maker_posts', 'id');

    if posts_sequence is null then
        raise exception 'No identity sequence found for maker_posts.id';
    end if;

    execute format(
        'grant usage, select on sequence %s to authenticated',
        posts_sequence
    );
end;
$$;

grant select, insert, update on public.maker_appointments
    to authenticated;

drop policy if exists posts_read on public.maker_posts;
create policy posts_read
on public.maker_posts
for select
to anon, authenticated
using (true);

drop policy if exists posts_create on public.maker_posts;
create policy posts_create
on public.maker_posts
for insert
to authenticated
with check (
    seller_id = auth.uid()
    and public.is_verified_maker()
);

drop policy if exists appointments_read
    on public.maker_appointments;

create policy appointments_read
on public.maker_appointments
for select
to authenticated
using (seller_id = auth.uid());

drop policy if exists appointments_create
    on public.maker_appointments;

create policy appointments_create
on public.maker_appointments
for insert
to authenticated
with check (
    seller_id = auth.uid()
    and public.is_verified_maker()
);

drop policy if exists appointments_update
    on public.maker_appointments;

create policy appointments_update
on public.maker_appointments
for update
to authenticated
using (
    seller_id = auth.uid()
    and public.is_verified_maker()
)
with check (
    seller_id = auth.uid()
    and public.is_verified_maker()
);

create index if not exists maker_posts_created
    on public.maker_posts (created_at desc);

create index if not exists maker_appointments_seller
    on public.maker_appointments (seller_id, starts_at);

commit;

-- Review all active policies, including any from earlier setup.
select
    tablename,
    policyname,
    roles,
    cmd,
    qual,
    with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('maker_posts', 'maker_appointments')
order by tablename, policyname;