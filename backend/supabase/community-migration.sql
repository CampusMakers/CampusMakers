begin;

-- Community moderation: existing and new content waits for administrator approval.
alter table posts add column if not exists moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'approved', 'rejected'));
alter table posts add column if not exists pinned boolean not null default false;
alter table posts add column if not exists announcement boolean not null default false;
alter table posts add column if not exists metadata jsonb not null default '{}';
alter table listings add column if not exists moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'approved', 'rejected'));
create index if not exists posts_moderation_idx on posts (moderation_status, pinned desc, created_at desc);
create index if not exists listings_moderation_idx on listings (moderation_status);


create table if not exists listing_ratings (
    listing_id bigint not null references listings(id) on delete cascade,
    user_id text not null references users(id) on delete cascade,
    rating smallint not null check (rating between 1 and 5),
    primary key (listing_id, user_id)
);
create table if not exists listing_likes (
    listing_id bigint not null references listings(id) on delete cascade,
    user_id text not null references users(id) on delete cascade,
    primary key (listing_id, user_id)
);
create table if not exists listing_comments (
    id bigint generated always as identity primary key,
    listing_id bigint not null references listings(id) on delete cascade,
    author_id text not null references users(id) on delete cascade,
    content text not null check (length(content) between 1 and 1000),
    parent_id bigint references listing_comments(id) on delete cascade,
    created_at timestamptz not null default now()
);
alter table post_comments add column if not exists parent_id bigint references post_comments(id) on delete cascade;

commit;
