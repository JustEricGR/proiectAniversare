-- Ruleaza acest fisier in Supabase SQL Editor peste proiectul tau actual.
-- Este facut sa NU stearga datele existente.

create extension if not exists pgcrypto;

create table if not exists site_settings (
  id bigint primary key default 1,
  client_title text default 'Bine ai venit!',
  client_button_text text default 'Intră în meniu',
  background_image_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint only_one_settings_row check (id = 1)
);

create table if not exists main_buttons (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  position int default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists button_content (
  id uuid primary key default gen_random_uuid(),
  button_id uuid not null references main_buttons(id) on delete cascade,
  image_urls text[] default '{}',
  custom_text text,
  youtube_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint unique_button_content unique (button_id)
);

insert into site_settings (id, client_title, client_button_text)
values (1, 'Bine ai venit!', 'Intră în meniu')
on conflict (id) do nothing;

alter table site_settings enable row level security;
alter table main_buttons enable row level security;
alter table button_content enable row level security;

-- Curata policies vechi doar daca exista, apoi le recreeaza corect pentru Auth.
drop policy if exists "Public can read site settings" on site_settings;
drop policy if exists "Public can read main buttons" on main_buttons;
drop policy if exists "Public can read button content" on button_content;

drop policy if exists "Anon can insert site settings" on site_settings;
drop policy if exists "Anon can update site settings" on site_settings;
drop policy if exists "Anon can insert main buttons" on main_buttons;
drop policy if exists "Anon can update main buttons" on main_buttons;
drop policy if exists "Anon can delete main buttons" on main_buttons;
drop policy if exists "Anon can insert button content" on button_content;
drop policy if exists "Anon can update button content" on button_content;
drop policy if exists "Anon can delete button content" on button_content;

drop policy if exists "Authenticated can insert site settings" on site_settings;
drop policy if exists "Authenticated can update site settings" on site_settings;
drop policy if exists "Authenticated can insert main buttons" on main_buttons;
drop policy if exists "Authenticated can update main buttons" on main_buttons;
drop policy if exists "Authenticated can delete main buttons" on main_buttons;
drop policy if exists "Authenticated can insert button content" on button_content;
drop policy if exists "Authenticated can update button content" on button_content;
drop policy if exists "Authenticated can delete button content" on button_content;

create policy "Public can read site settings"
on site_settings for select to anon, authenticated using (true);

create policy "Public can read main buttons"
on main_buttons for select to anon, authenticated using (true);

create policy "Public can read button content"
on button_content for select to anon, authenticated using (true);

create policy "Authenticated can insert site settings"
on site_settings for insert to authenticated with check (true);

create policy "Authenticated can update site settings"
on site_settings for update to authenticated using (true) with check (true);

create policy "Authenticated can insert main buttons"
on main_buttons for insert to authenticated with check (true);

create policy "Authenticated can update main buttons"
on main_buttons for update to authenticated using (true) with check (true);

create policy "Authenticated can delete main buttons"
on main_buttons for delete to authenticated using (true);

create policy "Authenticated can insert button content"
on button_content for insert to authenticated with check (true);

create policy "Authenticated can update button content"
on button_content for update to authenticated using (true) with check (true);

create policy "Authenticated can delete button content"
on button_content for delete to authenticated using (true);

-- Storage policies pentru bucket-ul tau public: site-images
-- Creeaza bucket-ul din UI daca nu exista: Storage -> New bucket -> site-images -> Public.

drop policy if exists "Public can read site images" on storage.objects;
drop policy if exists "Anon can upload site images" on storage.objects;
drop policy if exists "Anon can update site images" on storage.objects;
drop policy if exists "Anon can delete site images" on storage.objects;
drop policy if exists "Authenticated can upload site images" on storage.objects;
drop policy if exists "Authenticated can update site images" on storage.objects;
drop policy if exists "Authenticated can delete site images" on storage.objects;

create policy "Public can read site images"
on storage.objects for select to anon, authenticated
using (bucket_id = 'site-images');

create policy "Authenticated can upload site images"
on storage.objects for insert to authenticated
with check (bucket_id = 'site-images');

create policy "Authenticated can update site images"
on storage.objects for update to authenticated
using (bucket_id = 'site-images')
with check (bucket_id = 'site-images');

create policy "Authenticated can delete site images"
on storage.objects for delete to authenticated
using (bucket_id = 'site-images');
