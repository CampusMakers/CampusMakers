begin;

-- Product IDs are strings because the current storefront includes preview listings.
create table if not exists public.maker_product_ratings (
    product_id text not null check (product_id ~ '^listing-[a-zA-Z0-9-]{1,100}$'),
    user_id uuid not null references auth.users(id) on delete cascade,
    rating smallint not null check (rating between 1 and 5),
    created_at timestamptz not null default now(),
    primary key (product_id, user_id)
);

alter table public.maker_product_ratings enable row level security;
grant select, insert, update on public.maker_product_ratings to authenticated;

drop policy if exists maker_product_ratings_read_own on public.maker_product_ratings;
create policy maker_product_ratings_read_own on public.maker_product_ratings for select to authenticated
    using (user_id = auth.uid());
drop policy if exists maker_product_ratings_insert on public.maker_product_ratings;
create policy maker_product_ratings_insert on public.maker_product_ratings for insert to authenticated
    with check (user_id = auth.uid());
drop policy if exists maker_product_ratings_update on public.maker_product_ratings;
create policy maker_product_ratings_update on public.maker_product_ratings for update to authenticated
    using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.maker_product_rating_summary(p_product_id text)
returns table (average_rating numeric, rating_count bigint, own_rating smallint)
language sql stable security definer set search_path = ''
as $$
    select avg(r.rating)::numeric, count(*), max(r.rating) filter (where r.user_id = auth.uid())
    from public.maker_product_ratings r
    where r.product_id = p_product_id;
$$;

revoke all on function public.maker_product_rating_summary(text) from public;
grant execute on function public.maker_product_rating_summary(text) to anon, authenticated;

commit;
