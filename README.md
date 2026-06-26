# Scholar Quest

Scholar Quest is a full-stack study abroad command center for students preparing fully funded scholarship applications. It combines application planning, IELTS tracking, document management, professor outreach, finance planning, gamified progress, and an AI mentor into one focused dashboard.

The live production domain is intended to be:

```txt
https://sq.zahidp.com
```

## Features

- Scholarship target tracking with application status and deadlines
- University shortlist management with country, program, ranking, tuition, and notes
- IELTS target planning, mock score logging, and progress insights
- Document checklist with Supabase Storage-backed uploads
- Professor outreach CRM for supervisors and research contacts
- Finance tracker for savings, expenses, and budget goals
- Daily mission tasks, XP, streaks, achievements, and analytics
- AI Mentor powered by Gemini or OpenAI with server-side daily usage limits
- Supabase authentication with email/password, Google OAuth, password reset, and themed email templates
- SEO-ready public metadata for the landing experience

## Tech Stack

- React 19
- TanStack Start, TanStack Router, and TanStack Query
- Vite
- Tailwind CSS
- Supabase Auth, Database, Storage, and RLS
- Gemini API and OpenAI API for AI Mentor
- Vercel deployment via Nitro

## Getting Started

Install dependencies:

```bash
npm install
```

Create a local env file:

```bash
cp .env.example .env
```

Fill in the Supabase and AI provider values in `.env`, then start development:

```bash
npm run dev
```

## Environment Variables

Required public/client-safe values:

```txt
VITE_SUPABASE_PROJECT_ID
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_URL
VITE_APP_URL
```

Required server-side values:

```txt
SUPABASE_PROJECT_ID
SUPABASE_PUBLISHABLE_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
APP_URL
```

AI Mentor values:

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

Only variables with the `VITE_` prefix are exposed to the browser. Never put private API keys or service-role keys in `VITE_` variables.

## Supabase Setup

Apply database migrations:

```bash
supabase db push
```

Auth URL configuration for production:

```txt
Site URL: https://sq.zahidp.com
Redirect URLs:
https://sq.zahidp.com/auth
https://sq.zahidp.com/reset-password
https://sq.zahidp.com/dashboard
https://sq.zahidp.com/settings
```

For Google OAuth, configure the Google provider in Supabase Auth and use this Google Cloud authorized redirect URI:

```txt
https://loifcjcwufznobnsxywv.supabase.co/auth/v1/callback
```

The Supabase email templates live in:

```txt
supabase/email-templates
```

## AI Mentor

The mentor runs through server functions only. It can read the authenticated user's tracked app data, including profile, scholarships, universities, document metadata, IELTS scores, finance entries, professors, deadlines, tasks, achievements, and XP.

The daily quota is stored in Supabase in `mentor_usage_daily` and consumed through an atomic Postgres function, so users can see how many messages remain and cannot bypass the limit by refreshing the page.

Uploaded file text extraction is not enabled yet; the mentor can currently use uploaded document metadata and status, not the contents inside PDFs or DOCX files.

## Vercel Deployment

This project is Vercel-ready through Nitro.

Vercel settings:

```txt
Framework Preset: TanStack Start
Build Command: npm run build
Install Command: npm install
```

Set the same environment variables from `.env.example` in Vercel Project Settings. Keep `.env` private and never commit it.

After connecting the GitHub repository to Vercel, every push to the main branch can trigger a production deployment.

## Scripts

```bash
npm run dev       # Start local dev server
npm run build     # Production build
npm run preview   # Preview production build locally
npm run lint      # ESLint
npm run format    # Prettier
```

## Security Notes

- `.env` and credential JSON files are ignored by git.
- Rotate any API keys or OAuth client secrets that were ever pasted into chat, logs, screenshots, or committed history.
- Supabase service-role keys must stay server-only.
- Google OAuth client secrets must be stored only in Google Cloud, Supabase provider settings, or private deployment environment variables.

