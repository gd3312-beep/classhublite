
# ClassHub Lite — Final Build Plan

Incorporates the lean-but-secure checklist on top of the previously approved architecture.

## Stack
- React + Tailwind + shadcn/ui, React Router, React Query
- Lovable Cloud: Auth, Postgres, Storage
- Zod for validation, semantic theme tokens for light/dark

## Public app
- **`/` Dashboard** — Navbar (logo, theme toggle, Admin Login) · 70/30 calendar + announcements (stacks on mobile)
  - Calendar: month grid, today in purple, brown/purple dots on days with deadlines, fetches **current month only**
  - Date click → modal with that day's deadlines + attachments (PDF/PPT icons, download)
  - Announcements: latest 5, pinned first with badge, "View All" modal
  - Empty states everywhere ("No deadlines yet", "No announcements yet")

## Auth
- **`/admin/login`** — email + password, "Forgot Password?" link, simple client-side throttle after 5 failed attempts (progressive delay), clear "Invalid login" error
- **`/admin/forgot-password`** — 3-step card: request reset → confirmation → handled by Lovable's built-in recovery
- **`/reset-password`** — public route, sets new password via `updateUser`
- **Route guard** — `/admin/*` checks session via `onAuthStateChange` + `getSession`; redirects to login if absent

## Admin panel (`/admin`, lazy-loaded)
Header: "Admin Panel", logout, theme toggle. Tabs:
- **Deadlines** — list with edit, delete (with confirm dialog), form (title ≤100, desc ≤1000, date required, optional attachments)
- **Files** — upload (MIME whitelist: pdf/ppt/pptx/doc/docx/images, ≤10 MB, renamed with uuid), list with delete confirm
- **Announcements** — list with edit/delete (confirm), form (title ≤100, body ≤2000, pinned toggle)
- **Admins** — list users + roles, promote/demote (visible to admins only)

All forms use Zod; all destructive actions use AlertDialog confirmations; all mutations show toast on success/failure.

## Backend (Lovable Cloud)

### Tables
- `profiles` (id → auth.users, email, created_at) + auto-create trigger on signup
- `user_roles` (id, user_id, role) with `app_role` enum (`admin`, `user`) + `has_role()` security-definer function
- `deadlines` (id, title, description, due_date, created_by, timestamps)
- `deadline_attachments` (id, deadline_id ON DELETE CASCADE, file_path, file_name, file_type, file_size)
- `announcements` (id, title, body, pinned bool, created_by, timestamps)
- `files` (id, file_path, file_name, file_type, size, uploaded_by, created_at)

### Storage
- Bucket `attachments` — public read, admin-only write/delete; files stored under `deadlines/<uuid>` and `library/<uuid>`

### RLS (server-enforced — never trust frontend)
- Public SELECT on deadlines, deadline_attachments, announcements, files
- INSERT/UPDATE/DELETE on all tables: `has_role(auth.uid(), 'admin')` only
- `user_roles`: users SELECT own row; only admins modify
- First signup auto-promoted to admin via trigger (bootstrap)

### File-handling rules
- Deadline delete → cascade removes attachment rows + storage objects (handled in client mutation)
- File-library delete → removes storage object + row
- Uploads: MIME validated, size capped (10 MB), filenames replaced with UUIDs

## Security notes
- Zod validation on every form (lengths, required, file size/type)
- No `dangerouslySetInnerHTML`; all text rendered as plain
- Password reset uses Lovable built-in flow (no custom tokens)
- Note on rate limiting: backend rate limiting is not implemented — login throttle is client-side only

## States
- Loading skeletons on calendar + announcements
- Empty states on every list
- Error toasts on every failed mutation/upload
- Confirm dialogs on every delete

## Mobile
- Stacked layout, full-screen modals, compact calendar dots, collapsible announcement panel
