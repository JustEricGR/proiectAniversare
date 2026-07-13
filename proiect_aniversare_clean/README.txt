PROIECT ANIVERSARE - VARIANTA CURATA CU SUPABASE AUTH

Ce contine:
- index.html
- login.html
- admin.html
- client.html
- config.js
- css/style.css
- js/login.js
- js/admin.js
- js/client.js
- supabase_update_existing.sql

IMPORTANT:
Am tinut cont de baza ta actuala din Supabase:
- site_settings
- main_buttons
- button_content
- bucket Storage: site-images

1. Supabase
Ruleaza in SQL Editor fisierul:
supabase_update_existing.sql

Acest SQL nu sterge datele existente. Doar se asigura ca tabelele si policies-urile sunt corecte.

2. Supabase Authentication
Mergi la:
Authentication -> Users -> Add user -> Create new user

Pune emailul tau si parola ta de admin.
Bifeaza Auto Confirm User sau confirma userul manual.

3. config.js
In config.js ai deja URL-ul proiectului tau.
Trebuie sa pui cheia anon/public din:
Project Settings -> API -> anon public

Inlocuieste:
PASTE_SUPABASE_ANON_KEY_HERE

4. Storage
Verifica in Supabase Storage ca exista bucket-ul:
site-images

Trebuie sa fie public.

5. Test local
Deschide login.html.
Intra cu email + parola din Supabase Authentication.
Apoi vei ajunge in admin.html.

6. Deploy Vercel
Uploadezi tot folderul pe GitHub sau direct in Vercel.
Clientului ii dai:
https://proiectul-tau.vercel.app/client.html

Tu intri pe:
https://proiectul-tau.vercel.app/login.html

7. Unde se salveaza datele
- site_settings: titlu client, text buton intrare, imagine fundal
- main_buttons: butoanele mari din meniu
- button_content: pozele, textul liber si linkul YouTube pentru fiecare buton
- Storage/site-images: imaginile uploadate
