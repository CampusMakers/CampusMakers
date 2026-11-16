do $$ begin
    create type listing_type as enum ('product', 'commission', 'service', 'digital');
exception when duplicate_object then null; end $$;

do $$ begin
    create type payment_method as enum ('cash', 'card', 'venmo', 'zelle', 'paypal', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
    create type order_status as enum ('pending', 'scheduled', 'ready', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
    create type post_type as enum ('image', 'video', 'text');
exception when duplicate_object then null; end $$;

do $$ begin
    create type rsvp_status as enum ('going', 'interested');
exception when duplicate_object then null; end $$;

create table if not exists campuses (
    id bigint generated always as identity primary key,
    name text not null,
    email_domain text not null unique check (email_domain = lower(email_domain)),
    state text,
    created_at timestamptz not null default now()
);

create table if not exists locations (
    id bigint generated always as identity primary key,
    campus_id bigint not null references campuses (id) on delete cascade,
    name text not null,
    address text,
    city text,
    state text,
    zip text,
    latitude numeric(9, 6),
    longitude numeric(9, 6),
    unique (campus_id, name)
);

create table if not exists users (
    id text primary key,
    name text not null,
    email text not null unique,
    email_verified boolean not null default false,
    image text,
    username text unique,
    display_username text,
    bio text,
    campus_id bigint references campuses (id) on delete set null,
    role text not null default 'user' check (role in ('user', 'admin')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists sessions (
    id text primary key,
    user_id text not null references users (id) on delete cascade,
    token text not null unique,
    expires_at timestamptz not null,
    ip_address text,
    user_agent text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists accounts (
    id text primary key,
    user_id text not null references users (id) on delete cascade,
    account_id text not null,
    provider_id text not null,
    access_token text,
    refresh_token text,
    id_token text,
    access_token_expires_at timestamptz,
    refresh_token_expires_at timestamptz,
    scope text,
    password text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists verifications (
    id text primary key,
    identifier text not null,
    value text not null,
    expires_at timestamptz not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists stores (
    id bigint generated always as identity primary key,
    owner_id text not null unique references users (id) on delete cascade,
    campus_id bigint not null references campuses (id),
    name text not null,
    description text,
    school_email text not null,
    verified_at timestamptz,
    inactive_since timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- Tracks pending university email verification requests.
create table if not exists store_email_verifications (
    store_id bigint primary key references stores (id) on delete cascade,
    school_email text not null,
    token_hash text not null unique,
    expires_at timestamptz not null,
    created_at timestamptz not null default now()
);

create table if not exists store_payment_methods (
    store_id bigint not null references stores (id) on delete cascade,
    method payment_method not null,
    primary key (store_id, method)
);

create table if not exists availability (
    id bigint generated always as identity primary key,
    store_id bigint not null references stores (id) on delete cascade,
    location_id bigint not null references locations (id) on delete cascade,
    starts_at timestamptz not null,
    ends_at timestamptz not null,
    check (ends_at > starts_at)
);

create table if not exists categories (
    id bigint generated always as identity primary key,
    name text not null unique
);

create table if not exists listings (
    id bigint generated always as identity primary key,
    store_id bigint not null references stores (id) on delete cascade,
    category_id bigint references categories (id) on delete set null,
    type listing_type not null default 'product',
    title text not null,
    description text,
    quantity integer not null default 1 check (quantity >= 0),
    price numeric(10, 2) not null check (price >= 0),
    inactive_since timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists listing_images (
    id bigint generated always as identity primary key,
    listing_id bigint not null references listings (id) on delete cascade,
    url text not null,
    position smallint not null default 0
);

create table if not exists saved_listings (
    user_id text not null references users (id) on delete cascade,
    listing_id bigint not null references listings (id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (user_id, listing_id)
);

create table if not exists orders (
    id bigint generated always as identity (start with 2400) primary key,
    buyer_id text references users (id) on delete set null,
    store_id bigint references stores (id) on delete set null,
    status order_status not null default 'pending',
    payment_method payment_method not null,
    paid_at timestamptz,
    pickup_location_id bigint references locations (id) on delete set null,
    pickup_at timestamptz,
    pickup_pin text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists order_items (
    id bigint generated always as identity primary key,
    order_id bigint not null references orders (id) on delete cascade,
    listing_id bigint references listings (id) on delete set null,
    title text not null,
    quantity integer not null check (quantity > 0),
    unit_price numeric(10, 2) not null check (unit_price >= 0),
    unique (order_id, listing_id)
);

create table if not exists reviews (
    order_item_id bigint primary key references order_items (id) on delete cascade,
    rating smallint not null check (rating between 1 and 5),
    content text,
    created_at timestamptz not null default now()
);

create table if not exists messages (
    id bigint generated always as identity primary key,
    sender_id text not null references users (id) on delete cascade,
    receiver_id text not null references users (id) on delete cascade,
    content text not null check (length(trim(content)) > 0),
    created_at timestamptz not null default now(),
    read_at timestamptz,
    check (sender_id <> receiver_id)
);

create table if not exists follows (
    follower_id text not null references users (id) on delete cascade,
    followee_id text not null references users (id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (follower_id, followee_id),
    check (follower_id <> followee_id)
);

create table if not exists posts (
    id bigint generated always as identity primary key,
    author_id text not null references users (id) on delete cascade,
    type post_type not null,
    caption text,
    media_url text,
    created_at timestamptz not null default now(),
    check (type = 'text' or media_url is not null or caption is not null)
);

create table if not exists tags (
    id bigint generated always as identity primary key,
    name text not null unique
);

create table if not exists post_tags (
    post_id bigint not null references posts (id) on delete cascade,
    tag_id bigint not null references tags (id) on delete cascade,
    primary key (post_id, tag_id)
);

create table if not exists post_likes (
    user_id text not null references users (id) on delete cascade,
    post_id bigint not null references posts (id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (user_id, post_id)
);

create table if not exists post_comments (
    id bigint generated always as identity primary key,
    post_id bigint not null references posts (id) on delete cascade,
    author_id text not null references users (id) on delete cascade,
    content text not null check (length(trim(content)) > 0),
    created_at timestamptz not null default now()
);

create table if not exists events (
    id bigint generated always as identity primary key,
    campus_id bigint not null references campuses (id) on delete cascade,
    location_id bigint references locations (id) on delete set null,
    created_by text references users (id) on delete set null,
    host_store_id bigint references stores (id) on delete set null,
    title text not null,
    description text,
    starts_at timestamptz not null,
    ends_at timestamptz,
    created_at timestamptz not null default now(),
    check (ends_at is null or ends_at > starts_at)
);

create table if not exists event_rsvps (
    event_id bigint not null references events (id) on delete cascade,
    user_id text not null references users (id) on delete cascade,
    status rsvp_status not null,
    created_at timestamptz not null default now(),
    primary key (event_id, user_id)
);

create table if not exists event_vendors (
    event_id bigint not null references events (id) on delete cascade,
    store_id bigint not null references stores (id) on delete cascade,
    booth text,
    primary key (event_id, store_id)
);

create index if not exists sessions_user_id_idx on sessions (user_id);
create index if not exists accounts_user_id_idx on accounts (user_id);
create index if not exists verifications_identifier_idx on verifications (identifier);
create index if not exists users_campus_id_idx on users (campus_id);
create index if not exists locations_campus_id_idx on locations (campus_id);
create index if not exists stores_campus_id_idx on stores (campus_id);
create index if not exists availability_store_id_idx on availability (store_id, starts_at);
create index if not exists listings_store_id_idx on listings (store_id);
create index if not exists listings_category_id_idx on listings (category_id);
create index if not exists listings_active_idx on listings (created_at desc) where inactive_since is null;
create index if not exists listing_images_listing_id_idx on listing_images (listing_id, position);
create index if not exists saved_listings_listing_id_idx on saved_listings (listing_id);
create index if not exists orders_buyer_id_idx on orders (buyer_id, created_at desc);
create index if not exists orders_store_id_idx on orders (store_id, created_at desc);
create index if not exists order_items_listing_id_idx on order_items (listing_id);
create index if not exists messages_pair_idx on messages (sender_id, receiver_id, created_at desc);
create index if not exists messages_receiver_idx on messages (receiver_id, created_at desc);
create index if not exists follows_followee_id_idx on follows (followee_id);
create index if not exists posts_author_id_idx on posts (author_id, created_at desc);
create index if not exists post_tags_tag_id_idx on post_tags (tag_id);
create index if not exists post_likes_post_id_idx on post_likes (post_id);
create index if not exists post_comments_post_id_idx on post_comments (post_id, created_at);
create index if not exists events_campus_id_idx on events (campus_id, starts_at);
create index if not exists event_rsvps_user_id_idx on event_rsvps (user_id);
create index if not exists event_vendors_store_id_idx on event_vendors (store_id);

alter table campuses enable row level security;
alter table locations enable row level security;
alter table users enable row level security;
alter table sessions enable row level security;
alter table accounts enable row level security;
alter table verifications enable row level security;
alter table stores enable row level security;
alter table store_payment_methods enable row level security;
alter table availability enable row level security;
alter table categories enable row level security;
alter table listings enable row level security;
alter table listing_images enable row level security;
alter table saved_listings enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table reviews enable row level security;
alter table messages enable row level security;
alter table follows enable row level security;
alter table posts enable row level security;
alter table tags enable row level security;
alter table post_tags enable row level security;
alter table post_likes enable row level security;
alter table post_comments enable row level security;
alter table events enable row level security;
alter table event_rsvps enable row level security;
alter table event_vendors enable row level security;
