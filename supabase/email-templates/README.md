# Supabase Auth Email Templates

Paste each HTML file into Supabase Dashboard > Authentication > Email Templates.

Before testing auth emails, set these in Supabase Dashboard > Authentication > URL Configuration:

- Site URL: `https://sq.zahidp.com`
- Redirect URLs:
  - `https://sq.zahidp.com/auth`
  - `https://sq.zahidp.com/reset-password`
  - `https://sq.zahidp.com/dashboard`
  - `https://sq.zahidp.com/settings`

Recommended subjects:

- Confirm sign up: `Confirm your Operation Global Scholar account`
- Invite user: `You are invited to Operation Global Scholar`
- Magic link or OTP: `Your Operation Global Scholar sign-in code`
- Change email address: `Confirm your new Operation Global Scholar email`
- Reset password: `Reset your Operation Global Scholar password`
- Reauthentication: `Verify this sensitive action`
- Password changed: `Your password was changed`
- Email address changed: `Your email address was changed`
- Phone number changed: `Your phone number was changed`
- Sign-in method linked: `A sign-in method was linked`
- Sign-in method removed: `A sign-in method was removed`
- Verification method added: `A verification method was added`
- Verification method removed: `A verification method was removed`

These templates use Supabase Go template variables documented by Supabase, including
`{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .SiteURL }}`, `{{ .Email }}`,
`{{ .NewEmail }}`, `{{ .OldEmail }}`, `{{ .Phone }}`, `{{ .OldPhone }}`,
`{{ .Provider }}`, and `{{ .FactorType }}`.

Keep API keys out of templates. These files are safe because they only include Supabase
runtime placeholders.
