# Spec: Google Login with Email Verification

## Overview

Users can click **Login with Google** on the login page or **Sign up with Google** on the register page. A Google account picker popup appears. After they select an account, WatchAgent sends a 6-digit verification code to that account's email address. The user enters the code to complete sign-in or account creation.

This flow uses Google solely as an account picker (no passwords to remember, familiar UX) while verifying inbox access via OTP rather than trusting the Google ID token alone.

---

## User Flows

### New user — Sign up with Google (register page)

1. User lands on `/register`
2. Clicks **Sign up with Google**
3. Google popup opens showing accounts already signed in on the device
4. User selects an account (e.g. jane@gmail.com)
5. Popup closes; page shows: *"We sent a 6-digit code to jane@gmail.com"*
6. User checks email, enters code in the verification field
7. No existing WatchAgent account found → account is created:
   - `username` defaults to the part before `@` in their email, sanitised to alphanumeric + underscores, suffixed with 4 random digits if already taken (e.g. `jane` → `jane4821`)
   - After account creation the user is shown a **"Choose your username"** prompt (see UI below) before continuing to onboarding — they can accept the default or type a new one
   - `fullName` pre-filled from Google profile name if provided
   - Google profile photo downloaded and stored in S3; URL saved as `avatarUrl`
   - `emailVerified` set to `true`
8. User completes the username prompt → sent to onboarding

### New user — Login with Google on login page (no account exists)

1. User lands on `/login`
2. Clicks **Login with Google**, selects an account
3. OTP sent; user enters code
4. No existing account found → **do not create an account**; show inline message:
   > *"No WatchAgent account found for jane@gmail.com. [Sign up instead →]*"
5. Clicking the link sends the user to `/register` with the Google flow pre-triggered (idToken preserved in sessionStorage so they don't have to pick the account again)

### Returning user — Login with Google on existing Google-linked account

1. User lands on `/login`
2. Clicks **Login with Google**, selects account, enters OTP
3. Existing account found by `googleId` → logged in, redirected to home

### Returning user — Login with Google on an email/password account with the same email

1. User lands on `/login`
2. Clicks **Login with Google**, selects account (same email as their password account), enters OTP
3. Existing account found by email (no `googleId` yet):
   - `googleId` linked to the account
   - `emailVerified` set to `true`
   - Toast shown: *"Your Google account has been linked. You can now use either method to log in."*
4. User logged in, redirected to home
5. Password-based login continues to work for this account

### Returning user — wrong or expired code

- Code is valid for **10 minutes**
- After 3 failed attempts, the code is invalidated and the user must restart
- "Resend code" link appears after 60 seconds

---

## Out of Scope

- Removing a Google account link once added
- Logging in with multiple Google accounts for one WatchAgent account
- Google One Tap (the inline credential prompt)
- Replacing email/password login — it stays as-is alongside Google login

---

## UI Changes

### Login page (`/app/(auth)/login/page.tsx`)

Add below the existing login form:

```
─────── or ───────

[ G  Login with Google ]
```

The divider and button sit between the password field and the "Don't have an account?" link. On mobile the button is full width.

### Register page (`/app/(auth)/register/page.tsx`)

Add above the existing register form (Google signup as the faster path):

```
[ G  Sign up with Google ]

─────── or ───────
```

### New: OTP verification modal

Shown as a modal overlay (not a new page) after the user picks a Google account. The rest of the login/register page is visible but blurred behind it.

```
┌─────────────────────────────────────┐
│                                     │
│   Check your email                  │
│                                     │
│   We sent a 6-digit code to         │
│   jane@gmail.com                    │
│                                     │
│   [ _ ][ _ ][ _ ][ _ ][ _ ][ _ ]   │
│                                     │
│   Resend code (available in 0:45)   │
│                                     │
│              [ Verify ]             │
│                                     │
│   Not your account? Go back         │
│                                     │
└─────────────────────────────────────┘
```

- Six individual single-character inputs; focus auto-advances on each digit entry
- Paste into any box fills all six
- "Resend code" is disabled for 60 s, then becomes a link
- Error state: inputs shake + red border + message ("Incorrect code. X attempts remaining")
- Loading state on Verify button while the API call is in flight

### New: Username prompt (register flow only)

Shown immediately after a successful OTP verify when `isNewUser: true`, before the user reaches onboarding.

```
┌─────────────────────────────────────┐
│                                     │
│   Choose your username              │
│                                     │
│   [ jane4821_________________ ]     │
│   3–50 characters, letters,         │
│   numbers, underscores only         │
│                                     │
│   ✓ jane4821 is available           │
│                                     │
│         [ Continue  →  ]            │
│                                     │
└─────────────────────────────────────┘
```

- Pre-filled with the auto-generated default
- Live availability check: debounced `GET /api/v1/auth/check-username?username=...` as the user types (existing or new endpoint)
- Confirm button disabled until username is valid and available
- Username saved via `PATCH /api/v1/users/me` before the onboarding redirect

---

## Backend Changes

### New environment variables

```bash
GOOGLE_CLIENT_ID=          # from Google Cloud Console OAuth 2.0 credentials
GOOGLE_CLIENT_SECRET=      # same (not used server-side for token verify, but needed for Google Cloud project)
EMAIL_FROM_ADDRESS=noreply@watchagent.tapaskroy.me
EMAIL_FROM_NAME=WatchAgent  # display name in email clients: "WatchAgent <noreply@...>"
# AWS SES — already in the account, preferred over SMTP:
AWS_SES_REGION=us-east-1   # verify tapaskroy.me sending domain in SES before deploy
# S3 bucket for user avatars (reuse existing infra or create watchagent-{env}-avatars):
AVATAR_S3_BUCKET=watchagent-prod-avatars
AVATAR_S3_PREFIX=avatars/google/
```

### Database changes

**`users` table — two new columns:**

| Column | Type | Notes |
|---|---|---|
| `googleId` | `varchar(255)` nullable, unique | Google's `sub` claim from the ID token |
| `passwordHash` | already exists | make nullable — Google-only users have no password |

**New table: `email_verifications`**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `email` | varchar(255) | the address the code was sent to |
| `code` | varchar(6) | bcrypt-hashed 6-digit code |
| `googleId` | varchar(255) | Google `sub` from the token, tied to this verification |
| `attempts` | integer default 0 | incremented on each wrong guess |
| `expiresAt` | timestamp | `now + 10 minutes` |
| `usedAt` | timestamp nullable | set when successfully redeemed |
| `createdAt` | timestamp | |

Index on `(email, usedAt, expiresAt)` for fast lookup.

> OTP codes are short-lived. Redis with a 10-minute TTL is an acceptable alternative to a DB table if the team prefers to avoid the migration. The DB table is specified here for auditability.

### New API endpoints

#### `POST /api/v1/auth/google/initiate`

Called by the frontend after the user picks a Google account. Receives the Google ID token, verifies it, and sends the OTP.

**Request:**
```json
{ "idToken": "eyJhbGci..." }
```

**Processing:**
1. Verify `idToken` with Google's tokeninfo endpoint (`https://oauth2.googleapis.com/tokeninfo?id_token=...`) or `google-auth-library`
2. Confirm `aud` matches `GOOGLE_CLIENT_ID`
3. Extract `sub` (googleId), `email`, `name`, `picture` from the verified payload
4. Generate a random 6-digit code
5. Hash the code with bcrypt (10 rounds) and insert into `email_verifications`
6. Send the plain-text code to the email via SES/SMTP
7. Return success — do **not** return the code or any user info

**Response 200:**
```json
{ "success": true, "data": { "email": "jane@gmail.com", "expiresIn": 600 } }
```

**Response 400** — invalid or expired Google token:
```json
{ "success": false, "error": { "code": "INVALID_GOOGLE_TOKEN", "message": "Google token verification failed" } }
```

**Rate limit:** 3 requests per email per 10 minutes (prevent code-flooding an inbox).

---

#### `POST /api/v1/auth/google/verify`

Called when the user submits their 6-digit code. Completes login or account creation.

**Request:**
```json
{ "idToken": "eyJhbGci...", "code": "482910" }
```

**Processing:**
1. Re-verify `idToken` (same as above — prevents replay with a stolen code)
2. Extract `sub`, `email`, `name`, `picture`
3. Find the most recent unused, unexpired `email_verifications` row for this email + googleId
4. If not found or expired → 400
5. If found: compare submitted code against stored bcrypt hash
6. If wrong: increment `attempts`; if `attempts >= 3` mark row as used (invalidate); return 400 with remaining attempts
7. If correct: mark row as `usedAt = now`
8. Upsert the user:
   - **Existing user by `googleId`** → update `updatedAt`, proceed
   - **Existing user by `email` (no googleId)** → link: set `googleId`, set `emailVerified = true`; response includes `linkedExistingAccount: true` so frontend can show the linking toast
   - **No user found (register flow)** → create new user:
     - Auto-generate username from email prefix, sanitised, suffixed with 4 random digits if taken
     - Set `emailVerified = true`, `passwordHash = null`
     - Download `picture` URL from Google, upload to S3 at `{AVATAR_S3_BUCKET}/{AVATAR_S3_PREFIX}{userId}.jpg`, store S3 URL as `avatarUrl`
     - Pre-fill `fullName` from Google `name` claim if present
   - **No user found (login flow)** → return 404 `ACCOUNT_NOT_FOUND`; frontend handles redirect to register
9. Create a session (same as existing login flow), return access + refresh tokens

**Response 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "expiresIn": 900,
    "isNewUser": true,
    "linkedExistingAccount": false
  }
}
```

- `isNewUser: true` → frontend shows username prompt then redirects to onboarding
- `linkedExistingAccount: true` → frontend shows toast: *"Your Google account has been linked. You can now use either method to log in."*
- Both `false` → redirect to home as normal

**Response 400 — wrong code:**
```json
{ "success": false, "error": { "code": "INVALID_CODE", "message": "Incorrect code. 2 attempts remaining." } }
```

**Response 400 — expired or already used:**
```json
{ "success": false, "error": { "code": "CODE_EXPIRED", "message": "This code has expired. Please try again." } }
```

---

#### `POST /api/v1/auth/google/resend`

Resends a new code. Invalidates any previous code for the same email.

**Request:**
```json
{ "idToken": "eyJhbGci..." }
```

**Processing:** Same as `initiate` — re-verifies the Google token, generates a new code, marks all prior codes for this email as used, sends new email.

**Rate limit:** 1 resend per 60 seconds per email (enforced server-side, not just client-side).

---

### Email template

Sent via AWS SES from `WatchAgent <noreply@watchagent.tapaskroy.me>`.

**Subject:** `Your WatchAgent verification code`

```
Your verification code is:

  4 8 2 9 1 0

This code expires in 10 minutes. If you didn't request this,
you can ignore this email.

— WatchAgent
```

Plain text only. No HTML needed for a 6-digit code.

> **Pre-deploy requirement:** verify `watchagent.tapaskroy.me` (or `tapaskroy.me`) as a sending domain in AWS SES and move the account out of sandbox mode if not already done.

---

## Frontend Changes

### New dependency

`@react-oauth/google` — wraps Google Identity Services, handles the popup lifecycle, returns an `idToken` credential.

### Flow

**Login page:**
```
"Login with Google" onClick
  → useGoogleLogin popup
  → onSuccess → POST /auth/google/initiate
  → show OtpModal
  → OtpModal submit → POST /auth/google/verify
    → ACCOUNT_NOT_FOUND: save idToken to sessionStorage, redirect to /register
                         (register page reads sessionStorage to skip re-picking account)
    → linkedExistingAccount: store tokens, show linking toast, redirect to home
    → success (existing user): store tokens, redirect to home
```

**Register page:**
```
"Sign up with Google" onClick
  → check sessionStorage for idToken from login redirect; if present skip popup
  → else useGoogleLogin popup
  → onSuccess → POST /auth/google/initiate
  → show OtpModal
  → OtpModal submit → POST /auth/google/verify
    → isNewUser: store tokens, show UsernamePrompt modal
      → UsernamePrompt submit → PATCH /api/v1/users/me { username }
      → redirect to onboarding
    → existing user (account found on register page): store tokens, redirect to home
```

The `idToken` is kept in component state between `initiate` and `verify`. It is also written to `sessionStorage` only in the login→register redirect case, and cleared immediately after use.

### New components

```
apps/web/src/components/auth/
  GoogleLoginButton.tsx   — branded button per Google guidelines (white bg, G logo, 40px min height)
  OtpModal.tsx            — 6-input OTP, paste support, resend timer, attempt error display
  UsernamePrompt.tsx      — username input with live availability check, confirm button
```

---

## Security Considerations

| Risk | Mitigation |
|---|---|
| Stolen Google ID token used to trigger OTP | Token verified server-side on both `initiate` and `verify`; token `aud` checked against `GOOGLE_CLIENT_ID` |
| Attacker brute-forces the 6-digit code | 3 attempt limit then code invalidated; 10-minute expiry |
| Code-flooding a victim's inbox | Rate limit: 3 initiations per email per 10 minutes |
| Replay attack (code intercepted, used twice) | `usedAt` set on first successful redemption; subsequent use rejected |
| OTP stored in plaintext | Stored as bcrypt hash; only the emailed plain-text is the secret |
| Account takeover via Google account linking | Only links `googleId` to existing account after the email OTP is verified — Google token alone is not enough |
| Google token clock skew | `google-auth-library` handles `iat`/`exp` validation with a 5-minute clock skew window |

---

## Decisions

| # | Decision |
|---|---|
| 1 | Email sent from `WatchAgent <noreply@watchagent.tapaskroy.me>` via AWS SES. Verify sending domain in SES before deploy. |
| 2 | Username defaults to email prefix (sanitised). User is shown a **Choose your username** prompt after OTP verify and before onboarding — they can accept the default or change it. |
| 3 | When Google login links to an existing email/password account, show toast: *"Your Google account has been linked. You can now use either method to log in."* |
| 4 | Login page button **does not create accounts** — if no account found, show a link to `/register`. Register page button creates accounts. If user reaches register page via the login→redirect flow, the idToken is preserved in `sessionStorage` so they don't re-pick the account. |
| 5 | Download Google profile photo at account creation time and store in S3 (`watchagent-{env}-avatars/avatars/google/{userId}.jpg`). Store the S3 URL as `avatarUrl`, not the Google URL. |
