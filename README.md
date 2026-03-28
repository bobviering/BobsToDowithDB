# Todo Cloud

A simple personal to-do list built with Next.js, Supabase Auth, and Postgres.  

## What this version includes

- Email magic-link login
- Per-user cloud task storage
- Task add, edit, complete, delete
- List and calendar views
- Sort by date, priority, or list
- Filters for list and priority
- Export JSON backup
- Import JSON backup
- Due-today / overdue reminder overlay
- Mobile-friendly layout

## Setup

1. Create a Supabase project.
2. In Supabase, run the SQL in `supabase/schema.sql`.
3. In Supabase Auth, set your site URL and redirect URL:
   - Local: `http://localhost:3000/auth/callback`
   - Production: `https://YOUR-VERCEL-DOMAIN/auth/callback`
4. Copy `.env.example` to `.env.local` and add your values:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-publishable-key
```

5. Install packages:

```bash
npm install
```

6. Run locally:

```bash
npm run dev
```

7. Deploy to Vercel and add the same environment variables there.

## Notes

- This app uses email magic links, not passwords.
- The dashboard is scoped by Supabase Row Level Security, so each signed-in user only sees their own tasks.
- JSON export/import is still included as a backup path.
- If you want to migrate from your old browser-only version, export the old JSON and import it into this version after logging in.
