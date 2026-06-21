# Add phone sign-in alongside email

## Goal
Let people sign in / sign up with a phone number as a **second option** next to the existing email code flow. Phone users can sign up with just a phone number and add an email later; existing email users can link a phone (and vice-versa).

## How it works (the important difference)
- The **email** code flow is special: it routes through your custom email pipeline and maps a 6-digit display code to the real token via a server function.
- The **phone** flow is simpler. Because the SMS sender is already configured in the backend, the verification text is sent directly by the backend and the code in the SMS *is* the real token. So phone sign-in is handled entirely in the app with the built-in auth client — no custom server function or email-pipeline plumbing needed.

## What changes

### 1. Sign-in screen (`src/routes/auth.tsx`)
- Add a small **Email / Phone** toggle at the top of the sign-in card. Email stays exactly as it is today.
- **Phone path:**
  - Step 1 — phone number input (formatted to E.164, e.g. `+44…`), with light client-side validation.
  - Send the code via the auth client (`signInWithOtp` with the phone, `shouldCreateUser: true`).
  - Step 2 — reuse the existing 6-slot code UI; verify with the auth client (`verifyOtp`, type `sms`). On success the session is set and we navigate home — same destination logic as email today.
  - Same resend cooldown, error messaging, and "use a different number" back action as the email flow.

### 2. "Email later" for phone-only accounts
- Phone sign-ups land with **no email on file**. Per your choice (phone first, email later), we add a gentle prompt rather than blocking them.
- On the profile page (`src/routes/_authenticated/profile.tsx`), add a small **Account / Contact details** card showing the email and phone currently on the account, with:
  - **Add email** (shown when missing) → sets the email on the account; the backend sends a confirmation link to finalise it.
  - **Add phone** (shown when missing) → sends an SMS code and verifies it, linking the number to the existing account.
- A subtle one-line nudge appears for phone-only users ("Add an email so you never lose access") linking to that card.

### 3. Linking (existing accounts)
- The same Add email / Add phone controls let an existing **email** user attach a phone, and a **phone** user attach an email — all on the same account, no separate accounts created.

## Notes / assumptions
- No database schema changes: email and phone live on the auth account, not the `profiles` table.
- This assumes phone auth + an SMS sender are already enabled in the backend (you confirmed this). If the backend isn't actually sending SMS yet, the "Send code" step will return an error — we'll surface that message cleanly so it's obvious if provider setup is incomplete.
- If you later decide phone codes should be exactly 6 digits, that's a backend OTP-length setting; the UI already expects 6.

## Technical summary
- `auth.tsx`: add `method: "email" | "phone"` toggle state and a parallel phone send/verify flow using `supabase.auth.signInWithOtp({ phone })` and `supabase.auth.verifyOtp({ phone, token, type: "sms" })`. Reuse `InputOTP` and existing layout/animation.
- `profile.tsx`: add a contact-details card; read current email/phone from `supabase.auth.getUser()`; **Add email** → `updateUser({ email })`; **Add phone** → `updateUser({ phone })` then `verifyOtp({ phone, token, type: "phone_change" })`.
- No new server functions, migrations, or secrets.
