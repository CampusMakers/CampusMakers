begin;

-- Existing rows stay null: their original creator time zone is not known.
alter table public.maker_posts add column if not exists event_time_zone text;
alter table public.maker_appointments add column if not exists time_zone text;

commit;
