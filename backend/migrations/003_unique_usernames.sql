-- Run after 001 and 002 in the Supabase SQL editor.
-- All accounts reserve their username, including unconfirmed accounts.
begin;
lock table auth.users in share row exclusive mode;

-- Stop rather than silently renaming existing users. Resolve duplicates and retry.
do $$
begin
    if exists (
        select 1 from auth.users
        group by lower(coalesce(nullif(btrim(raw_user_meta_data->>'username'), ''), split_part(email, '@', 1)))
        having count(*) > 1
    ) then
        raise exception 'Duplicate usernames exist. Assign distinct usernames to these accounts before running migration 003.';
    end if;
end;
$$;

create function public.normalize_account_username() returns trigger
language plpgsql set search_path = '' as $$
begin
    new.raw_user_meta_data = coalesce(new.raw_user_meta_data, '{}'::jsonb) ||
        jsonb_build_object('username', lower(coalesce(nullif(btrim(new.raw_user_meta_data->>'username'), ''), split_part(new.email, '@', 1))));
    return new;
end;
$$;
create trigger normalize_account_username before insert or update on auth.users
for each row execute function public.normalize_account_username();

-- Also refresh messaging profiles through their existing sync trigger.
update auth.users set raw_user_meta_data = raw_user_meta_data;

-- The database arbitrates concurrent signup and rename requests atomically.
create unique index accounts_unique_username on auth.users
    ((lower(coalesce(nullif(btrim(raw_user_meta_data->>'username'), ''), split_part(email, '@', 1)))));

-- Reveal only availability, never account details. An authenticated user may
-- retain their own username when editing their profile.
create function public.username_available(candidate text) returns boolean
language sql stable security definer set search_path = '' as $$
    select not exists (
        select 1 from auth.users
        where lower(coalesce(nullif(btrim(raw_user_meta_data->>'username'), ''), split_part(email, '@', 1))) = lower(btrim(candidate))
          and id is distinct from auth.uid()
    );
$$;
revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;
commit;
