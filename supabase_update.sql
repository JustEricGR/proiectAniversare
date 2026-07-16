alter table site_settings
add column if not exists welcome_top_text text
default 'Un mesaj frumos pentru tine.';

alter table site_settings
add column if not exists welcome_second_title text
default 'Descoperă surprizele pregătite';

alter table site_settings
add column if not exists welcome_bottom_text text
default 'Apasă pe buton pentru a intra în meniul principal.';

alter table site_settings
add column if not exists welcome_background_color text
default '#d319b7';

alter table site_settings
add column if not exists content_background_color text
default '#d319b7';
