create extension if not exists pgcrypto;

create type public.civic_role as enum ('citizen', 'engineer', 'officer', 'auditor');
create type public.report_status as enum ('submitted', 'ai_checked', 'approved', 'assigned', 'verifying', 'resolved', 'rejected');
create type public.report_severity as enum ('low', 'medium', 'high', 'critical');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role public.civic_role not null default 'citizen',
  phone text,
  language text not null default 'English',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.create_citizen_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''), 'citizen')
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_citizen_profile();

create table public.issue_categories (
  id smallint generated always as identity primary key,
  slug text not null unique,
  label text not null,
  active boolean not null default true
);

insert into public.issue_categories (slug, label) values
  ('pothole', 'Pothole'), ('road-surface', 'Road surface'), ('manhole', 'Manhole cover'),
  ('streetlight', 'Streetlight'), ('garbage', 'Garbage'), ('water-leak', 'Water leak'), ('drain', 'Drain')
on conflict (slug) do nothing;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  ticket_code text not null unique,
  citizen_id uuid not null references public.profiles(id),
  assigned_to uuid references public.profiles(id),
  category_id smallint not null references public.issue_categories(id),
  title text not null,
  description text not null,
  status public.report_status not null default 'submitted',
  severity public.report_severity not null default 'medium',
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  address text,
  ward text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reports_status_created_idx on public.reports (status, created_at desc);
create index reports_citizen_created_idx on public.reports (citizen_id, created_at desc);
create index reports_location_idx on public.reports (latitude, longitude);

create table public.report_media (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id),
  media_kind text not null check (media_kind in ('before', 'after', 'dispute')),
  object_path text not null unique,
  captured_at timestamptz not null,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now()
);

create table public.report_events (
  id bigint generated always as identity primary key,
  report_id uuid not null references public.reports(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  previous_hash text,
  record_hash text not null,
  created_at timestamptz not null default now()
);
create index report_events_history_idx on public.report_events (report_id, id);

create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id),
  ward text not null,
  post_type text not null check (post_type in ('update', 'question', 'suggestion')),
  title text not null,
  body text not null,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now()
);
create index community_posts_ward_created_idx on public.community_posts (ward, created_at desc);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id),
  report_id uuid references public.reports(id) on delete cascade,
  post_id uuid references public.community_posts(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint comment_target_xor check ((report_id is null) <> (post_id is null))
);

create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  report_id uuid references public.reports(id) on delete cascade,
  post_id uuid references public.community_posts(id) on delete cascade,
  kind text not null default 'support' check (kind in ('support', 'save')),
  created_at timestamptz not null default now(),
  constraint reaction_target_xor check ((report_id is null) <> (post_id is null))
);
create unique index reactions_report_unique on public.reactions (user_id, kind, report_id) where report_id is not null;
create unique index reactions_post_unique on public.reactions (user_id, kind, post_id) where post_id is not null;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  report_id uuid references public.reports(id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_unread_idx on public.notifications (user_id, created_at desc) where read_at is null;

create table public.polls (
  id uuid primary key default gen_random_uuid(),
  ward text not null,
  question text not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);
create table public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  label text not null,
  unique (poll_id, label),
  unique (poll_id, id)
);
create table public.poll_votes (
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_id uuid not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id),
  foreign key (poll_id, option_id) references public.poll_options(poll_id, id) on delete cascade
);
create index poll_votes_option_idx on public.poll_votes (option_id);
create view public.poll_results as
  select p.id as poll_id, o.id as option_id, o.label, count(v.user_id)::bigint as vote_count
  from public.polls p
  join public.poll_options o on o.poll_id = p.id
  left join public.poll_votes v on v.option_id = o.id and v.poll_id = p.id
  group by p.id, o.id, o.label;

alter table public.profiles enable row level security;
alter table public.issue_categories enable row level security;
alter table public.reports enable row level security;
alter table public.report_media enable row level security;
alter table public.report_events enable row level security;
alter table public.community_posts enable row level security;
alter table public.comments enable row level security;
alter table public.reactions enable row level security;
alter table public.notifications enable row level security;
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;

create policy "profiles readable by owner" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles insert own citizen row" on public.profiles for insert to authenticated with check (id = auth.uid() and role = 'citizen');
create policy "profiles update own row" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "categories readable" on public.issue_categories for select using (active);

create policy "reports public read" on public.reports for select using (true);
create policy "citizens create reports" on public.reports for insert to authenticated with check (citizen_id = auth.uid());
create policy "report parties update" on public.reports for update to authenticated using
  (citizen_id = auth.uid() or assigned_to = auth.uid());
create policy "officers review reports" on public.reports for update to authenticated using
  (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'officer'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'officer'));

create policy "media public read" on public.report_media for select using (true);
create policy "report parties add media" on public.report_media for insert to authenticated with check
  (uploaded_by = auth.uid() and exists (select 1 from public.reports r where r.id = report_id and (r.citizen_id = auth.uid() or r.assigned_to = auth.uid())));

create policy "audit trail public read" on public.report_events for select using (true);
-- Audit events are inserted by a trusted Edge Function using the service role.

create policy "ward posts public read" on public.community_posts for select using (true);
create policy "users create own posts" on public.community_posts for insert to authenticated with check (author_id = auth.uid());
create policy "authors update own posts" on public.community_posts for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "comments public read" on public.comments for select using (true);
create policy "users create own comments" on public.comments for insert to authenticated with check (author_id = auth.uid());
create policy "users manage own reactions" on public.reactions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users read own notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "users update own notifications" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "polls public read" on public.polls for select using (true);
create policy "poll options public read" on public.poll_options for select using (true);
create policy "users read own poll votes" on public.poll_votes for select to authenticated using (user_id = auth.uid());
create policy "one vote per user" on public.poll_votes for insert to authenticated with check (user_id = auth.uid());
grant select on public.poll_results to anon, authenticated;

-- Keep the public audit table append-only for authenticated client roles.
revoke update, delete, truncate on public.report_events from anon, authenticated;
revoke insert, update, delete on public.report_events from anon, authenticated;

-- Keep role assignment and audit writes on trusted server paths.
revoke update on public.profiles from authenticated;
grant update (display_name, phone, language, updated_at) on public.profiles to authenticated;
revoke insert on public.profiles from authenticated;
revoke update on public.reports from authenticated;
grant update (title, description, updated_at) on public.reports to authenticated;

grant select on public.profiles, public.issue_categories, public.reports, public.report_media,
  public.report_events, public.community_posts, public.comments, public.reactions,
  public.notifications, public.polls, public.poll_options to anon, authenticated;
grant insert on public.reports, public.report_media, public.community_posts, public.comments to authenticated;
grant update (title, body) on public.community_posts to authenticated;
grant insert, delete on public.reactions to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant select on public.poll_votes to authenticated;
grant insert on public.poll_votes to authenticated;
grant select on public.poll_results to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('civic-reports', 'civic-reports', true)
on conflict (id) do nothing;

create policy "public report media read" on storage.objects for select
  using (bucket_id = 'civic-reports');
create policy "users upload into own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'civic-reports' and (storage.foldername(name))[1] = auth.uid()::text);
