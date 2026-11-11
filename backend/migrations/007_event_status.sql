begin;

alter table public.maker_posts
    add column if not exists event_status text not null default 'Upcoming',
    add column if not exists event_status_mode text not null default 'manual';

alter table public.maker_posts drop constraint if exists maker_posts_event_status_check;
alter table public.maker_posts add constraint maker_posts_event_status_check check (
    event_status in ('Upcoming', 'In Progress', 'Event Ended')
    and event_status_mode in ('manual', 'automatic')
    and (not is_event or event_status_mode <> 'automatic' or event_ends_at is not null)
);

-- Automatic status is derived from the stored schedule, so it does not depend
-- on a visitor being present or a background job running.
create or replace function public.event_is_finished(p public.maker_posts)
returns boolean language sql stable set search_path = '' as $$
    select p.is_event and (
        p.event_status = 'Event Ended'
        or (p.event_status_mode = 'automatic' and p.event_ends_at <= now())
    );
$$;

create or replace function public.protect_finished_event()
returns trigger language plpgsql set search_path = '' as $$
begin
    if public.event_is_finished(old) then
        raise exception 'Finished events cannot be edited.';
    end if;
    return new;
end;
$$;

drop trigger if exists protect_finished_event on public.maker_posts;
create trigger protect_finished_event before update on public.maker_posts
for each row execute function public.protect_finished_event();

-- This is the only client write path for existing event details. Locking the
-- row and checking the stored relationship prevents races and unauthorized edits.
create or replace function public.update_maker_event(p_id bigint, p_changes jsonb, p_confirm_finished boolean default false)
returns public.maker_posts language plpgsql security definer set search_path = '' as $$
declare
    current_post public.maker_posts;
    updated_post public.maker_posts;
begin
    if auth.uid() is null or not public.is_verified_maker() then
        raise exception 'Only verified sellers can manage events.';
    end if;
    select * into current_post from public.maker_posts where id = p_id for update;
    if not found or not current_post.is_event then raise exception 'Event not found.'; end if;
    if not (current_post.seller_id = auth.uid() or exists (
        select 1 from public.messaging_profiles profile
        where profile.id = auth.uid() and profile.seller_verified
          and exists (select 1 from jsonb_array_elements_text(current_post.collaborators) member
                      where lower(ltrim(member, '@')) = lower(profile.username))
    )) then raise exception 'You are not authorized to manage this event.'; end if;
    if public.event_is_finished(current_post) then raise exception 'Finished events cannot be edited.'; end if;
    if jsonb_typeof(p_changes) <> 'object' or exists (
        select 1 from jsonb_object_keys(p_changes) key
        where key not in ('event_status', 'event_status_mode', 'event_title', 'event_location', 'event_starts_at', 'event_ends_at', 'caption', 'event_listings', 'event_slots', 'event_posts')
    ) then raise exception 'Invalid event changes.'; end if;
    if p_changes->>'event_status' = 'Event Ended' and not p_confirm_finished then
        raise exception 'Confirm before marking the event as finished.';
    end if;
    if (p_changes ? 'event_listings' and jsonb_typeof(p_changes->'event_listings') <> 'array')
       or (p_changes ? 'event_slots' and jsonb_typeof(p_changes->'event_slots') <> 'array')
       or (p_changes ? 'event_posts' and jsonb_typeof(p_changes->'event_posts') <> 'array') then
        raise exception 'Event listings, appointments, and posts must be arrays.';
    end if;
    update public.maker_posts set
        event_status = case when p_changes ? 'event_status' then p_changes->>'event_status' else event_status end,
        event_status_mode = case when p_changes ? 'event_status_mode' then p_changes->>'event_status_mode' else event_status_mode end,
        event_title = case when p_changes ? 'event_title' then p_changes->>'event_title' else event_title end,
        event_location = case when p_changes ? 'event_location' then p_changes->>'event_location' else event_location end,
        event_starts_at = case when p_changes ? 'event_starts_at' then (p_changes->>'event_starts_at')::timestamptz else event_starts_at end,
        event_ends_at = case when p_changes ? 'event_ends_at' then (p_changes->>'event_ends_at')::timestamptz else event_ends_at end,
        caption = case when p_changes ? 'caption' then p_changes->>'caption' else caption end,
        event_listings = case when p_changes ? 'event_listings' then p_changes->'event_listings' else event_listings end,
        event_slots = case when p_changes ? 'event_slots' then p_changes->'event_slots' else event_slots end,
        event_posts = case when p_changes ? 'event_posts' then p_changes->'event_posts' else event_posts end
    where id = p_id returning * into updated_post;
    if updated_post.event_status_mode = 'automatic' and updated_post.event_ends_at <= now() then
        raise exception 'Automatic events need an end time in the future.';
    end if;
    return updated_post;
end;
$$;
revoke all on function public.update_maker_event(bigint, jsonb, boolean) from public, anon;
grant execute on function public.update_maker_event(bigint, jsonb, boolean) to authenticated;

commit;
