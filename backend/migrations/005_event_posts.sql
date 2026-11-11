begin;

-- An event remains a normal maker post, with optional folder-like event data.
alter table public.maker_posts
    add column if not exists is_event boolean not null default false,
    add column if not exists event_title text,
    add column if not exists event_location text,
    add column if not exists event_starts_at timestamptz,
    add column if not exists event_ends_at timestamptz,
    add column if not exists event_listings jsonb not null default '[]'::jsonb,
    add column if not exists event_slots jsonb not null default '[]'::jsonb,
    add column if not exists event_posts jsonb not null default '[]'::jsonb;

alter table public.maker_posts
    drop constraint if exists maker_posts_event_details_check;

alter table public.maker_posts
    add constraint maker_posts_event_details_check check (
        (not is_event and event_title is null and event_location is null and event_starts_at is null and event_ends_at is null)
        or
        (is_event and length(trim(event_title)) > 0 and length(trim(event_location)) > 0 and event_starts_at is not null
         and (event_ends_at is null or event_ends_at >= event_starts_at))
    );

create index if not exists maker_posts_event_starts_at
    on public.maker_posts (event_starts_at)
    where is_event;

commit;
