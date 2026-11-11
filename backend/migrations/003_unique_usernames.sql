begin;

lock table auth.users in share row exclusive mode;

create table if not exists public.account_usernames (
    user_id uuid primary key
        references auth.users(id) on delete cascade,
    username text unique
);

-- Confirm the existing table has the columns this migration needs.
do $$
begin
    if not exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'account_usernames'
          and column_name = 'user_id'
          and data_type = 'uuid'
    ) or not exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'account_usernames'
          and column_name = 'username'
          and data_type = 'text'
    ) then
        raise exception
            'account_usernames must have user_id (uuid) and username (text). No changes were committed. Share its column definitions to adapt this migration.';
    end if;
end;
$$;

-- Stop instead of silently renaming existing accounts.
do $$
begin
    if exists (
        select 1
        from auth.users
        where coalesce(
            nullif(btrim(raw_user_meta_data->>'username'), ''),
            split_part(email, '@', 1)
        ) is not null
        group by lower(coalesce(
            nullif(btrim(raw_user_meta_data->>'username'), ''),
            split_part(email, '@', 1)
        ))
        having count(*) > 1
    ) then
        raise exception
            'Duplicate usernames exist in auth.users. Assign distinct usernames before retrying.';
    end if;
end;
$$;

-- Recreate these migration-owned indexes to ensure their definitions.
drop index if exists public.account_usernames_reservation_user_idx;
create unique index account_usernames_reservation_user_idx
    on public.account_usernames (user_id);

drop index if exists public.account_usernames_reservation_name_idx;
create unique index account_usernames_reservation_name_idx
    on public.account_usernames (lower(btrim(username)));

alter table public.account_usernames enable row level security;

revoke all on public.account_usernames
    from public, anon, authenticated;

create or replace function public.normalize_account_username()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.raw_user_meta_data :=
        coalesce(new.raw_user_meta_data, '{}'::jsonb)
        || jsonb_build_object(
            'username',
            lower(coalesce(
                nullif(btrim(new.raw_user_meta_data->>'username'), ''),
                split_part(new.email, '@', 1)
            ))
        );

    return new;
end;
$$;

drop trigger if exists normalize_account_username on auth.users;

create trigger normalize_account_username
before insert or update on auth.users
for each row
execute function public.normalize_account_username();

create or replace function public.sync_account_username()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if tg_op = 'DELETE' then
        delete from public.account_usernames
        where user_id = old.id;

        return old;
    end if;

    insert into public.account_usernames (user_id, username)
    values (
        new.id,
        lower(coalesce(
            nullif(btrim(new.raw_user_meta_data->>'username'), ''),
            split_part(new.email, '@', 1)
        ))
    )
    on conflict (user_id) do update
    set username = excluded.username;

    return new;
end;
$$;

revoke all on function public.sync_account_username()
    from public, anon, authenticated;

drop trigger if exists sync_account_username on auth.users;

create trigger sync_account_username
after insert or update or delete on auth.users
for each row
execute function public.sync_account_username();

-- Populate reservations for confirmed and unconfirmed accounts.
-- Also refresh messaging profiles through their existing trigger.
update auth.users
set raw_user_meta_data = raw_user_meta_data;

create or replace function public.username_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select
        nullif(btrim(candidate), '') is not null
        and not exists (
            select 1
            from public.account_usernames
            where lower(btrim(username)) = lower(btrim(candidate))
              and user_id is distinct from auth.uid()
        );
$$;

revoke all on function public.username_available(text)
    from public, anon, authenticated;

grant execute on function public.username_available(text)
    to anon, authenticated;

commit;