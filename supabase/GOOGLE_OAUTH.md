# Google OAuth Setup

The app already enables Google sign up and sign in through Supabase:

- Sign in/up button: `src/routes/auth.tsx`
- Provider call: `supabase.auth.signInWithOAuth({ provider: "google" })`
- Production app URL: `https://sq.zahidp.com`

## Supabase Dashboard

Go to Authentication > Sign In / Providers > Google:

- Enable Google provider.
- Paste the Google OAuth Client ID.
- Paste the Google OAuth Client Secret.
- Save.

Go to Authentication > URL Configuration:

- Site URL: `https://sq.zahidp.com`
- Redirect URLs:
  - `https://sq.zahidp.com/auth`
  - `https://sq.zahidp.com/settings`
  - `https://sq.zahidp.com/reset-password`
  - `https://sq.zahidp.com/dashboard`

## Google Cloud Console

For the web OAuth client:

- Authorized JavaScript origin:
  - `https://sq.zahidp.com`
- Authorized redirect URI:
  - `https://loifcjcwufznobnsxywv.supabase.co/auth/v1/callback`

Use the callback URL shown in Supabase's Google provider panel if it ever differs.

## Public Repo Safety

Do not commit downloaded Google OAuth JSON files or client secrets. Keep them outside the repo, or in private deployment environment variables where needed. If a secret was ever committed or shared, rotate it in Google Cloud Console.
