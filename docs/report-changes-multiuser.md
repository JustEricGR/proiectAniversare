# How the university report changes for the multi-user version

Applies to `proiectAniversare_University_Report v02.docx`. Sections 7 and 8 are already updated in v03; the contents page numbers in v03 were corrected to match Word's layout. Companion to
[multiuser-design.md](multiuser-design.md). For each section: what it says
today, and what it must say after the switch.

Legend: **Rewrite** = the section's claims become false; **Extend** = still
true, needs additions; **Keep** = minor wording only.

| Section | Action | What changes |
|---|---|---|
| Title / subtitle | Rewrite | "Design and Implementation of an Anniversary Website" becomes "…of a Multi-Tenant Anniversary Website Platform". |
| Abstract | Rewrite | Describe a platform hosting many pairs, three roles, isolation by row-level security. Remove "an administrator manages the content"; state the master/pair-admin/pair-user model. Update keywords: add *multi-tenancy, row-level security, role-based access control*. |
| 1.1 Background | Extend | Keep the original gift story as the motivating first tenant; add that the system was generalised so other couples can use it. |
| 1.2 Objectives | Extend | Add: isolate each pair's data; let a master admin onboard pairs without touching SQL; recipient access from a phone without a password (magic link). |
| 1.3 Scope | Rewrite | Today says "exactly one admin account… no registration… one database serves one site". New scope: one database serves many pairs; invite-only accounts (still no public registration); out of scope: payments, custom domains, real-time editing. |
| 2.1 Functional requirements | Rewrite | FR-01 (landing with Nadia/Eric entries) becomes a neutral platform landing. FR-08 "visitor needs no account" changes to "pair user signs in with a magic link" (or share token, if chosen). FR-09–FR-11 extend to all roles. FR-12–FR-15 gain "…for their own pair only". FR-18–FR-19 become a master bulk-import tool. Add FR-21…FR-30: master creates/suspends/deletes pairs; invites admin and user; role routing after login; pair switcher; per-pair image upload in the browser; accept-invite flow; suspended pair is unreachable; deleting a pair removes its rows and files. |
| 2.2 Non-functional requirements | Rewrite | NFR-01 "only the admin can change data" becomes "a pair's data is readable only by its members and the master, and writable only by its admin and the master, enforced by RLS". Add NFR-10 tenant isolation, NFR-11 master role cannot be granted from a browser, NFR-12 privacy/deletion, NFR-13 per-pair quotas. NFR-02 extends: service-role key also lives in the Edge Function's secrets. |
| 3.1 Architecture overview | Rewrite | Figure 1 needs a new diagram: add master.html, accept.html, the invite Edge Function, private storage with signed URLs. The "visitor pages only read using a public key" paragraph is no longer true. File and line counts change. |
| 3.2 Frontend design | Extend | Pages go from four to six; describe `?pair=` scoping and login routing. The "no framework" argument still holds but should be re-justified at six pages and more state. Media-query sentence: the admin breakpoint is now 860 px in the `admin-page` scope. |
| 3.3 Backend and access control | Rewrite | Currently the core weakness of the report ("policies must establish whether that user is the administrator"). Replace with the actual design: `pair_members`, `platform_admins`, helper functions `is_master()` and `pair_role()`, the policy pattern, storage policies, why the helpers are `SECURITY DEFINER`, and the Edge Function as the only service-role code. Include the policy listing as a new appendix listing. |
| 3.4 Data model | Rewrite | Three tables become eight. New table of tables with `pair_id` on every content table, constraints listed explicitly (FKs with cascade, unique `(pair_id, role)`, unique position per pair). An ER diagram is now worth adding. The paragraph "statements that created the tables are not in the repository" is resolved by `supabase/migrations/`. Image fields store storage paths, not URLs. |
| 3.5 Technology selection | Extend | Add why RLS-based multi-tenancy (shared tables + `pair_id`) was chosen over one Supabase project per pair or one schema per pair: cost, single deployment, simpler migrations; trade-off: one policy mistake leaks across tenants, mitigated by the isolation tests. |
| 4.1 Landing page | Rewrite | New screenshot; names and heading now come from pair settings. |
| 4.2–4.5 Visitor screens | Keep | Behaviour is the same; mention pair scoping in one sentence and refresh screenshots. |
| 4.6 Authentication | Rewrite | Add magic link, invite acceptance, role routing. Figure 7 replaced. |
| 4.7–4.8 Admin | Extend | Add pair switcher and browser image upload; listings A16–A20 change because every query gains `pair_id`. |
| New 4.11 Master console | Add | Screenshots and listings for creating a pair, inviting members, suspending. |
| New 4.12 Invitations | Add | Edge Function sequence: master → function → Auth invite email → accept.html → membership active. |
| 4.10 Image uploads | Rewrite | Workflow becomes a master bulk-import tool; day-to-day upload is in the admin panel. |
| 5.2 Reported observations | Rewrite | The two CSS defect rows: the admin layout one is fixed (commit `8b9d932`, admin page now has its own `admin-page` scope); the content-colour one stays until fixed. Add observations from the new tests once run. |
| 5.3 Tests | Extend | Keep T01–T10, rescoped per pair. Add T11 role matrix via REST API, T12 cross-pair read/write by ID, T13 cross-pair storage access, T14 suspended pair, T15 invite flow, T16 migration preserves the existing site, T17 pair deletion removes rows and files. |
| 5.4 Assessment | Rewrite | Re-assess against the new objectives. |
| 6 Deployment | Rewrite | Steps become: apply `supabase/migrations/0001…0003`, disable public sign-up, insert yourself into `platform_admins` via SQL editor, deploy the Edge Function and its secrets, configure SMTP, deploy static files. This also closes the report's own "full schema must be supplied" gap. |
| 7 Limitations → **7 Future Development** | **Done in v03** | Replaced in `proiectAniversare_University_Report v03.docx`. Phase 1 = the current site. 7.1 Phase 2 multi-user platform (7.1.1 roles, 7.1.2 architecture, 7.1.3 data model and access control, 7.1.4 migration, 7.1.5 delivery stages, 7.1.6 evaluation). 7.2 Phase 3 paid styling option (outline only: built-in themes, photo frames, extra layouts; provider and pricing left open). The old 7.1 (schema export), 7.3 (cascade deletes) are folded into phase 2. The old 7.4 (upload efficiency) and 7.5 (media/accessibility validation) were dropped from the report and should be re-added under Section 5 if still relevant. |
| 8 Conclusion | **Done in v03** | Rewritten around the three phases. |
| References | Extend | Add Supabase docs on RLS, Storage access control, Edge Functions, `auth.admin.inviteUserByEmail`, magic link sign-in. |
| Appendix A | Extend | New listings: migration SQL, helper functions, a policy, storage policy, Edge Function, login routing, master.js pair creation. Renumber. |
| Appendix B | Extend | Add: confirm public sign-up disabled; attach role-matrix test results. |

## Other documentation in the folder

| Item | Change |
|---|---|
| `supabase_update.sql` | Moved into `supabase/migrations/` as part of `0001_initial.sql` (together with the missing base schema), then deleted from the root. |
| `README.md` | Does not exist yet. Should be added: what the platform is, roles, setup steps (copy of report section 6), how to become master admin, how to run locally. |
| `docs/multiuser-design.md` | The design itself; once implemented, sections 3–5 become the source for report chapters 3 and 4. |
| Code comments | Admin/client code comments are in Romanian; keep that, add brief comments on `pair_id` scoping where queries are built. |
