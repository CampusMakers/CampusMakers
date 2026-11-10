begin;

-- A collaboration stores all participants, including the publishing account.
-- An empty array is a regular post; otherwise it must contain 2–10 accounts.
alter table public.maker_posts
    add column if not exists post_type text not null default 'text',
    add column if not exists collaborators jsonb not null default '[]'::jsonb;

alter table public.maker_posts
    drop constraint if exists maker_posts_post_type_check;

alter table public.maker_posts
    add constraint maker_posts_post_type_check
    check (post_type in ('text', 'image', 'video'));

alter table public.maker_posts
    drop constraint if exists maker_posts_collaborators_check;

alter table public.maker_posts
    add constraint maker_posts_collaborators_check
    check (
        jsonb_typeof(collaborators) = 'array'
        and (
            jsonb_array_length(collaborators) = 0
            or jsonb_array_length(collaborators) between 2 and 10
        )
    );

create or replace function public.validate_maker_post_collaborators()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    participant text;
begin
    if jsonb_array_length(new.collaborators) = 0 then
        return new;
    end if;

    if not exists (
        select 1 from jsonb_array_elements_text(new.collaborators) as item
        where item = new.creator
    ) then
        raise exception 'The publishing account must be a collaboration participant.';
    end if;

    if (select count(*) from jsonb_array_elements_text(new.collaborators) as members(participant))
       <> (select count(distinct participant) from jsonb_array_elements_text(new.collaborators) as members(participant)) then
        raise exception 'A collaborator may only be included once.';
    end if;

    for participant in select jsonb_array_elements_text(new.collaborators)
    loop
        if not exists (
            select 1 from public.messaging_profiles
            where lower(username) = lower(ltrim(participant, '@'))
        ) then
            raise exception 'Every collaborator must be an existing account.';
        end if;
    end loop;

    return new;
end;
$$;

drop trigger if exists validate_maker_post_collaborators on public.maker_posts;
create trigger validate_maker_post_collaborators
before insert or update of collaborators on public.maker_posts
for each row execute function public.validate_maker_post_collaborators();

commit;
