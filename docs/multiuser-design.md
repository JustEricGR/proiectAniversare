# proiectAniversare: multi-user platform design

Status: proposal (nothing here is implemented yet). Date: 12 October 2026.

Roadmap: **Phase 1** is the current single site. **Phase 2** is the multi-user
platform described in this document. **Phase 3** is a later paid styling tier
(section 10). Decisions taken: only the pair admin edits; the pair user signs
in with a magic link.

## 1. Goal

Turn the single anniversary site into a platform that hosts many independent
sites, one per **pair**. Each pair has:

- a **pair admin**, who builds the surprises (today: Eric), and
- a **pair user**, the recipient who views them (today: Nadia).

Above all pairs sits one **master admin** (the platform owner), who creates
pairs, invites people, suspends pairs and can repair any pair's content.

Non-goals for phase 2: payments (see phase 3), public self-registration, custom
domains per pair, real-time collaboration.

## 2. Roles and permissions

| Action | Anonymous | Pair user | Pair admin | Master admin |
|---|---|---|---|---|
| See the platform landing / login page | yes | yes | yes | yes |
| View their own pair's site | no | yes | yes (preview) | yes (any pair) |
| View another pair's site | no | no | no | yes |
| Edit their own pair's settings, buttons, content | no | no | yes | yes (any pair) |
| Upload images to their own pair's storage folder | no | no | yes | yes |
| Create / suspend / delete pairs | no | no | no | yes |
| Invite people to a pair, change their role | no | no | no | yes |
| Become master admin | no | no | no | set manually in SQL only |

Rules that follow from the table:

- **Isolation is enforced by the database (row-level security), not by the
  JavaScript.** Every table row carries a `pair_id`, and every policy checks
  membership of that pair.
- A pair has **exactly one admin and one user**, enforced with a unique
  constraint. A person can belong to several pairs (for example, Nadia can be
  the admin of a second pair where Eric is the user, so both can surprise each
  other).
- The master role is stored in a table with **no write policies at all**, so
  it can only be granted from the Supabase SQL editor.

## 3. Architecture

```
Browser (static HTML/CSS/JS on Vercel)
  index.html     platform landing + login link
  login.html     email+password or magic link, then routes by role
  master.html    NEW  master console: pairs, members, invites
  admin.html     pair admin panel, scoped to ?pair=<slug>
  client.html    recipient site, scoped to ?pair=<slug>
  accept.html    NEW  finishes an invite (set password / confirm)
        |
        | supabase-js (anon key + user JWT)
        v
Supabase
  Auth           accounts; public sign-up DISABLED, invite-only
  Postgres       tables below, every row has pair_id, RLS on every table
  Storage        bucket site-images, path pairs/<pair_id>/..., storage policies
  Edge Function  NEW  invite-member: uses the service-role key to call
                 auth.admin.inviteUserByEmail and insert the membership.
                 Only callable by the master admin.
```

The service-role key still never reaches a browser. The Edge Function is the
only new server-side code, and it exists only because inviting a user by email
requires the service-role key.

### Routing after login

`login.html` reads the signed-in user's memberships and sends them to:

1. `master.html` if the user is in `platform_admins`;
2. `admin.html?pair=<slug>` if they are admin of exactly one pair;
3. `client.html?pair=<slug>` if they are user of exactly one pair;
4. a small chooser list if they belong to several pairs.

### Recipient access

Recommended: the pair user has a real account and signs in with a **magic
link** (no password to remember, works from a phone). The invite email itself
is that first link.

Optional later: a private share link (`client.html?pair=<slug>&t=<token>`)
served through a `SECURITY DEFINER` function that returns one pair's public
content when the token matches. This keeps the "open it from a link" gift
experience without an account, but a leaked link exposes the site, so it should
be revocable by the admin.

## 4. Data model

New tables:

| Table | Purpose | Key columns |
|---|---|---|
| `platform_admins` | Who is master admin | `user_id` (PK, FK auth.users) |
| `profiles` | Display name per account | `id` (PK, FK auth.users), `display_name`, `created_at` |
| `pairs` | One row per hosted site | `id` uuid PK, `slug` unique, `name`, `status` (`active` / `suspended`), `created_at` |
| `pair_members` | Who belongs to which pair, and how | `pair_id`, `user_id`, `role` (`admin` / `user`); PK (`pair_id`, `user_id`); unique (`pair_id`, `role`) |
| `invites` | Pending invitations (audit + resend) | `id`, `pair_id`, `email`, `role`, `invited_by`, `created_at`, `accepted_at` |

Changed tables:

| Table | Today | Multi-user |
|---|---|---|
| `site_settings` | single row, `id = 1` | one row per pair, PK `pair_id`. Also gets the landing texts now hard-coded in `index.html` (names, heading) |
| `main_buttons` | global list | adds `pair_id` (FK `pairs`, on delete cascade); `position` unique per pair |
| `button_content` | `button_id` | adds `pair_id`; `button_id` unique, FK `main_buttons` on delete cascade |

Schema sketch (to become `supabase/migrations/0002_multiuser.sql`):

```sql
create table pairs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  name text not null,
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now()
);

create table pair_members (
  pair_id uuid not null references pairs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','user')),
  primary key (pair_id, user_id),
  unique (pair_id, role)
);

create table platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- Helper functions used by every policy. SECURITY DEFINER so policies on
-- pair_members do not recurse; search_path pinned for safety.
create function is_master() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from platform_admins where user_id = auth.uid())
$$;

create function pair_role(p uuid) returns text
language sql stable security definer set search_path = public as $$
  select m.role from pair_members m
  join pairs on pairs.id = m.pair_id and pairs.status = 'active'
  where m.pair_id = p and m.user_id = auth.uid()
$$;

-- Same pattern for site_settings, main_buttons, button_content:
alter table main_buttons enable row level security;

create policy read_own_pair on main_buttons for select
  using (is_master() or pair_role(pair_id) is not null);

create policy write_own_pair on main_buttons for all
  using (is_master() or pair_role(pair_id) = 'admin')
  with check (is_master() or pair_role(pair_id) = 'admin');

-- pairs, pair_members, invites: select for members/master, writes master only.
-- platform_admins: RLS on, NO policies -> unreadable/unwritable from browsers.
```

Storage policies (bucket `site-images`, made **private**):

- read: `is_master()` or `pair_role((storage.foldername(name))[2]::uuid) is not null`
  for objects under `pairs/<pair_id>/`;
- insert / update / delete: same, but role must be `admin`.

The client then shows images through signed URLs (the admin screenshot shows
the project already uses `/object/sign/` URLs). Signed URLs expire, so the
database should store the **storage path** and the page should sign it at load
time, instead of storing the full signed URL.

## 5. Changes per file

| File | Change |
|---|---|
| `index.html` | Becomes a neutral platform landing page; the couple's names and heading move into `site_settings` of their pair. |
| `login.html` | Adds magic-link option and role-based routing (section 3). |
| `master.html` + `master.js` | New: list pairs, create pair (name, slug), invite admin and user by email, suspend/reactivate, open any pair's admin or client view. |
| `admin.html` / `admin.js` | Reads `?pair=`; every query adds `.eq("pair_id", pairId)` and every insert sets `pair_id`. Adds direct image upload to `pairs/<pair_id>/` (replaces copy-pasting URLs). Pair switcher if the user administers several pairs. |
| `client.html` / `client.js` | Reads `?pair=`; requires a session (or a share token, if that option is added); all reads filtered by `pair_id`. |
| `accept.html` | New: landing page for invite links; sets password or confirms magic link, then routes. |
| `supabase/migrations/*.sql` | New folder: `0001_initial.sql` (export of today's schema, which is currently missing from the repo), `0002_multiuser.sql`, `0003_migrate_existing.sql`. Replaces the loose `supabase_update.sql`. |
| `supabase/functions/invite-member/` | New Edge Function (section 3). |
| `upload_images.mjs` + workflow | Kept only as a master tool for bulk import into one pair (`TARGET_PAIR_ID` env var, upload to `pairs/<id>/`); day-to-day uploads happen in the admin panel. Should skip files that already exist. |
| `style.css` | Add a `master-page` scope like the new `admin-page` one; pair colours stay data-driven. |

## 6. Migrating the existing site

1. Export the current schema and RLS policies to `0001_initial.sql`.
2. Run `0002_multiuser.sql` (tables, functions, policies, nullable `pair_id`).
3. `0003_migrate_existing.sql`:
   - insert pair `eric-nadia`;
   - set `pair_id` on every existing `site_settings`, `main_buttons`,
     `button_content` row, then make `pair_id` NOT NULL;
   - add the existing Supabase user as `admin` of that pair and to
     `platform_admins`;
   - invite Nadia as `user` of the pair.
4. Move existing storage objects from `git-images/` to `pairs/<id>/` and rewrite
   stored URLs to paths.
5. In Supabase Auth settings, **disable public sign-up**.
6. Deploy the new pages. The old `client.html` link should redirect to
   `client.html?pair=eric-nadia`.

## 7. Phase 2 delivery stages

| Stage | Outcome | Visible change for you |
|---|---|---|
| 0. Hardening now | Disable public sign-up; export schema; confirm current RLS restricts writes | none |
| 1. Data layer | Section 6 steps 1–4; app code passes `pair_id` | none, the site behaves as today |
| 2. Pair-scoped pages | `?pair=` routing, recipient login, role routing in login | Nadia signs in once via magic link |
| 3. Master console | `master.html`, Edge Function, invites | you can create new pairs |
| 4. Uploads | Browser upload per pair, private bucket, signed URLs | no more GitHub step for photos |
| 5. Polish | Quotas per pair (images, MB), audit log, account/pair deletion | — |

## 8. Risks and open decisions

- **Sign-up is currently enabled** on the Supabase project
  (`disable_signup: false`). If any table policy today allows writes to
  "any authenticated user", a stranger can register and edit the live site.
  Fix in stage 0 regardless of the multi-user work.
- **Pair shape:** decided: one admin and one user per pair; only the admin
  edits.
- **Recipient access:** decided: account with magic link. The share-link token
  in section 3 stays an optional later addition.
- **Privacy:** the platform will hold personal photos of other people. Needs a
  deletion path (master deletes a pair, cascade removes rows and storage
  folder) and a short privacy note on the landing page.
- **Email delivery:** Supabase's built-in mailer is rate-limited; for more than
  a handful of invites a custom SMTP provider is needed.
- **Free-tier limits:** storage (photos are ~349 MB for one pair today) is the
  first limit multi-tenancy will hit; quotas in stage 5.

## 9. Testing additions

- Role matrix test: for each row of section 2, attempt the action as each role
  directly against the REST API (not through the UI) and confirm allow/deny.
- Cross-pair isolation: a pair admin of pair A tries to read and write pair B's
  rows and storage objects by ID; all must fail.
- Suspended pair: members lose read and write; master keeps access.
- Invite flow: invite, accept, re-invite an existing email, expired link.
- Migration: after stage 1 the existing site renders identically.

## 10. Phase 3: paid styling (outline)

Later and optional; not designed yet. A paid tier would give pair admins
extra built-in styling: themes, decorative frames for photos, more layouts
for the menu and content pages. Free pairs keep today's options.

What phase 2 should leave room for: a `plan` column on `pairs` (`free` /
`premium`), and styles applied from data (a theme key in `site_settings`)
rather than hard-coded CSS. Payment provider, pricing and the style catalogue
are decided after phase 2 is in use.
