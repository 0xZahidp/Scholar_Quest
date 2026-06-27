# Scholar Quest

Scholar Quest is a full-stack study abroad command center for students preparing competitive scholarship applications. It brings planning, document management, IELTS tracking, professor outreach, finance tracking, gamified progress, and an AI mentor into one focused dashboard.

**Live app:** [sq.zahidp.com](https://sq.zahidp.com)

## Preview

Add project screenshots in `docs/screenshots/` and replace these placeholders when ready.

| Dashboard                                                                         | AI Mentor                                                                      |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| ![Scholar Quest dashboard screenshot placeholder](docs/screenshots/dashboard.png) | ![Scholar Quest AI mentor screenshot placeholder](docs/screenshots/mentor.png) |

| Scholarships                                                                            | IELTS Tracker                                                                     |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| ![Scholar Quest scholarships screenshot placeholder](docs/screenshots/scholarships.png) | ![Scholar Quest IELTS tracker screenshot placeholder](docs/screenshots/ielts.png) |

## What It Does

Scholar Quest helps applicants stay organized from the first shortlist to the final departure checklist.

- Track target scholarships, application stages, deadlines, and priorities.
- Manage university shortlists with country, program, ranking, tuition, and notes.
- Plan IELTS goals, log mock scores, and monitor progress.
- Upload and organize application documents with Supabase Storage.
- Manage professor outreach like a lightweight academic CRM.
- Track savings, expenses, and scholarship-related budgets.
- Complete daily missions, earn XP, keep streaks, and unlock achievements.
- Chat with an AI Mentor that can use the authenticated user's application context.
- Authenticate with email/password, Google OAuth, password reset, and themed Supabase email templates.

## Tech Stack

- React 19
- TanStack Start, TanStack Router, and TanStack Query
- Vite
- Tailwind CSS
- Supabase Auth, Database, Storage, and Row Level Security
- Gemini API and OpenAI API for the AI Mentor
- Vercel deployment through Nitro

## Project Structure

```txt
src/
  components/             Shared UI and app components
  components/ui/          Reusable shadcn-style primitives
  hooks/                  Client hooks
  integrations/supabase/  Supabase clients, auth middleware, and generated types
  lib/                    Server functions, app logic, utilities, and AI mentor code
  routes/                 TanStack Start file-based routes
supabase/
  email-templates/        Custom Supabase Auth email templates
  migrations/             Database patches
  master_reset_and_setup.sql
public/                   Static assets
docs/screenshots/         README screenshot assets
```

## Getting Started

Install dependencies:

```bash
npm install
```

Create your local environment file:

```bash
cp .env.example .env
```

Fill in the Supabase and AI provider values in `.env`, then start the development server:

```bash
npm run dev
```

The local app will be available at the URL printed by Vite, usually `http://localhost:5173`.

## Environment Variables

Public client-safe values:

```txt
VITE_SUPABASE_PROJECT_ID
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_URL
VITE_APP_URL
```

Server-only values:

```txt
SUPABASE_PROJECT_ID
SUPABASE_PUBLISHABLE_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
APP_URL
```

AI Mentor settings:

```txt
MENTOR_AI_PROVIDER=auto
GEMINI_API_KEY
GEMINI_MODEL=gemini-3.1-flash-lite
OPENAI_API_KEY
OPENAI_MODEL=gpt-5.4-nano
MENTOR_DAILY_MESSAGE_LIMIT=12
MENTOR_CONTEXT_ROW_LIMIT=25
MENTOR_MAX_OUTPUT_TOKENS=450
```

Crash report email settings:

```txt
RESEND_API_KEY
RESEND_FROM_EMAIL=Scholar Quest <onboarding@resend.dev>
CRASH_REPORT_TO=mdzahidhasanpatwary@gmail.com
```

Only variables prefixed with `VITE_` are exposed to the browser. Keep service-role keys, AI keys, and OAuth secrets server-side only.

## Supabase Setup

Run the schema setup script from the Supabase SQL Editor:

```txt
supabase/master_reset_and_setup.sql
```

This script is destructive. It drops and recreates Scholar Quest tables, policies, functions, and related setup. It does not delete Supabase Auth users. If you need to clear uploaded files, delete objects from the `documents` bucket in the Supabase Storage dashboard or through the Storage API.

Recommended production Auth URL settings:

```txt
Site URL:
https://sq.zahidp.com

Redirect URLs:
https://sq.zahidp.com/auth
https://sq.zahidp.com/reset-password
https://sq.zahidp.com/dashboard
https://sq.zahidp.com/settings
```

For Google OAuth, configure the Google provider in Supabase Auth and use this authorized redirect URI in Google Cloud:

```txt
https://loifcjcwufznobnsxywv.supabase.co/auth/v1/callback
```

Custom Auth email templates are stored in:

```txt
supabase/email-templates
```

## AI Mentor

The AI Mentor runs through server functions only. It can use the authenticated user's saved Scholar Quest data, including profile details, scholarships, universities, documents, IELTS scores, finance entries, professors, deadlines, tasks, achievements, and XP.

Daily usage is stored in Supabase in `mentor_usage_daily` and consumed through an atomic Postgres function, so refreshing the app cannot bypass the message limit.

Uploaded document text extraction is not enabled yet. The mentor can currently use uploaded document metadata and status, but not the contents inside PDFs or DOCX files.

## Deployment

Scholar Quest is configured for Vercel with Nitro.

Suggested Vercel settings:

```txt
Framework Preset: TanStack Start
Build Command: npm run build
Install Command: npm install
```

Set the same environment variables from `.env.example` in Vercel Project Settings. Keep `.env` private and never commit it.

After connecting the repository to Vercel, pushes to the production branch can deploy automatically to [sq.zahidp.com](https://sq.zahidp.com).

## Scripts

```bash
npm run dev       # Start the local development server
npm run build     # Build for production
npm run preview   # Preview the production build locally
npm run lint      # Run ESLint
npm run format    # Format files with Prettier
```

## Security Notes

- `.env` and credential files must stay out of git.
- Supabase service-role keys must never be exposed in browser variables.
- Rotate API keys or OAuth secrets that were ever pasted into chat, logs, screenshots, or committed history.
- Keep Google OAuth client secrets only in Google Cloud, Supabase provider settings, or private deployment environment variables.

## License

This project is private. Add a license here before distributing or open-sourcing the code.
