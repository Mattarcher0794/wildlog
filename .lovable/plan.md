## Goal

Make the sign-in email show the **6-digit code** instead of the "Log In" magic-link button. The in-app screens already accept and verify a 6-digit code correctly — the only thing wrong is the email content, which is still Lovable's default magic-link template.

## Why this is happening

- `signInWithOtp` sends one auth email. The same email event carries **both** a magic link **and** a 6-digit code (`{{ .Token }}`).
- Right now the project uses Lovable's **default** auth email template, which displays the link as a "Log In" button and never prints the code.
- The default template can't be edited in place. To put the code in the email, the project needs its own auth email templates, and sending custom auth emails requires a verified sending domain.

This is possible. It needs one setup step from you (connecting a sending domain), then template changes from me.

## Steps

1. **Set up an email sending domain.** I'll open the email setup dialog. You already own `wildlog.life`, so we can send from that (e.g. a subdomain like `mail.wildlog.life`). This adds a few DNS records; sending activates once DNS verifies.

2. **Scaffold custom auth email templates.** This generates branded, editable email templates plus the hook that delivers them.

3. **Rewrite the sign-in email to lead with the code.** I'll edit the magic-link and signup templates so the email prominently shows the **6-digit code** (large, centered, monospace), with on-voice Wildlog copy ("Enter this code to sign in"), the cream/moss/plum brand styling, and the Wildlog wordmark. The link button is removed (or demoted to a small fallback) so the code is the clear primary action — matching the in-app "Check your email" screen.

4. **Deploy and verify.** Deploy the email hook, then I'll confirm a real sign-in email renders the code. Final activation depends on DNS verification, which you can monitor in Cloud → Emails.

## Notes / trade-offs

- Until the new sending domain's DNS verifies, emails continue via the current default template. Once verified, the code-based email takes over automatically.
- No app code changes are needed for the OTP flow itself — it already calls `verifyOtp({ type: "email" })`. This is purely an email-template fix.
- No new tables or schema changes.

## Technical detail

- Uses `email_domain--scaffold_auth_email_templates`, which creates `supabase/functions/auth-email-hook/` and React Email templates under `supabase/functions/_shared/email-templates/`.
- The auth hook payload exposes `email_data.token` (the 6-digit OTP); the magic-link/signup templates will render that value as the headline code.
- Brand tokens pulled from `src/styles.css`; email `Body` background stays white per email-client constraints, with brand colors on the inner card.
