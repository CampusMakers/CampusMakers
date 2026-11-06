-- Run once in the Supabase SQL editor before using messaging.
begin;
create table public.messaging_profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    username text not null,
    name text not null default '',
    image text not null default '',
    seller_verified boolean not null default false
);
create index messaging_profiles_username on public.messaging_profiles (lower(username));
create function public.sync_messaging_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
    if new.email_confirmed_at is null then
        delete from public.messaging_profiles where id = new.id;
    else
        insert into public.messaging_profiles (id, username, name, image, seller_verified)
        values (new.id, lower(coalesce(nullif(new.raw_user_meta_data->>'username', ''), split_part(new.email, '@', 1))),
            coalesce(new.raw_user_meta_data->>'full_name', ''), coalesce(new.raw_user_meta_data->>'avatar_url', ''),
            new.email ~* '^[^\s@]+@[^\s@]+\.edu$')
        on conflict (id) do update set username = excluded.username, name = excluded.name,
            image = excluded.image, seller_verified = excluded.seller_verified;
    end if;
    return new;
end;
$$;
create trigger sync_messaging_profile after insert or update on auth.users
for each row execute function public.sync_messaging_profile();
insert into public.messaging_profiles (id, username, name, image, seller_verified)
select id, lower(coalesce(nullif(raw_user_meta_data->>'username', ''), split_part(email, '@', 1))),
    coalesce(raw_user_meta_data->>'full_name', ''), coalesce(raw_user_meta_data->>'avatar_url', ''),
    email ~* '^[^\s@]+@[^\s@]+\.edu$'
from auth.users where email_confirmed_at is not null;

create table public.messages (
    id uuid primary key default gen_random_uuid(),
    sender_id uuid not null references public.messaging_profiles(id) on delete cascade,
    recipient_id uuid not null references public.messaging_profiles(id) on delete cascade,
    content text not null check (char_length(btrim(content)) between 1 and 4000),
    created_at timestamptz not null default now(),
    read_at timestamptz,
    check (sender_id <> recipient_id)
);
create index messages_sender_time on public.messages(sender_id, created_at);
create index messages_recipient_time on public.messages(recipient_id, created_at);
alter table public.messaging_profiles enable row level security;
alter table public.messages enable row level security;
revoke all on public.messaging_profiles, public.messages from anon, authenticated;
grant select on public.messaging_profiles, public.messages to authenticated;
grant insert (sender_id, recipient_id, content) on public.messages to authenticated;
grant update (read_at) on public.messages to authenticated;
grant delete on public.messages to authenticated;
create policy profiles_read on public.messaging_profiles for select to authenticated using (true);
create policy messages_read on public.messages for select to authenticated
using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy messages_send on public.messages for insert to authenticated with check (
    auth.uid() = sender_id and exists (
        select 1 from public.messaging_profiles sender, public.messaging_profiles recipient
        where sender.id = auth.uid() and recipient.id = recipient_id
          and (sender.seller_verified or recipient.seller_verified)
    )
);
create policy messages_mark_read on public.messages for update to authenticated
using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);
create policy messages_delete on public.messages for delete to authenticated using (auth.uid() = sender_id);
commit;
