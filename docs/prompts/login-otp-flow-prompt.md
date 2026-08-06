# Prompt: Login Portal — Staff / Student + First-Time Email OTP

Use this prompt when working on `/login`, auth APIs, student first-login OTP, or school-admin email verification.

---

## Product context

Scholarship Portal uses **one shared login page** (`/login`) for all roles. There is no separate “staff login” vs “student login” page. Role is decided from the user account after credentials succeed.

Optional query params:
- `/login?portal=ca` — CA branding (no school-code field)
- `/login?school=CODE` — prefill school branding
- `/login?next=…` — preferred redirect (role home still wins on success)
- `/login?reason=session_revoked` — show session-revoked banner

---

## Roles & homes

| Role | Home after login | Login OTP gate? |
|------|------------------|-----------------|
| `student` | `/student` | **Yes** — first time: email OTP + change temp password `123456` |
| `school_admin` | `/dashboard` | **Yes** — if email not verified: email OTP only (no password change) |
| `teacher` | `/teacher` | No OTP |
| `clerk` | `/clerk` | No OTP (may hit multi-device modal) |
| `super_admin` | `/admin` | No OTP (may hit multi-device modal) |
| `ca` | `/ca` | No OTP |

Multi-device web gate (409 choose keep/logout others): `super_admin`, `school_admin`, `clerk`.

---

## Student — first-time login (must implement / preserve)

### Account state when created/synced
- Temporary password: `123456`
- `emailVerified: false`
- `mustChangePassword: true`

### Detection
After password is correct:
```
role === "student" && (mustChangePassword || !emailVerified)
```

### User journey
1. Student opens `/login`.
2. Enters **email** + temp password **`123456`** + captcha → `POST /api/auth/login`.
3. Server does **not** create a session.
4. Server sends (or reuses active) **6-digit email OTP** (TTL ~10 minutes).
5. Response **403** with `studentSetupRequired: true` (+ `otpSent` / user info).
6. UI shows **first-login setup panel**:
   - Email / password / captcha locked
   - OTP input (6 digits)
   - New password + confirm password
   - Resend OTP (60s cooldown)
7. Submit → `POST /api/auth/student-first-login`  
   Body: `email`, `currentPassword`, `otp`, `newPassword`, `confirmPassword`
8. On success:
   - Mark `emailVerified = true`
   - Set new password hash
   - `mustChangePassword = false`
   - Clear OTP fields
   - Revoke old sessions
   - **Still no session** — show success message
9. Student must **sign in again** with the **new password** + captcha → then go to `/student`.

### Password rules (student first login)
- Min 8 characters
- At least one letter and one number
- Must not be `123456`
- Must differ from current password
- Confirm must match

### Resend
`POST /api/auth/student-first-login/resend`  
Body: `email`, `currentPassword` — 60s cooldown → 429 if too soon.

### Mobile
`POST /api/auth/mobile/login` — if student still needs setup, **block** and tell them to complete first-login on **web**.

---

## Student — returning login (already verified)

1. Email + own password + captcha → `POST /api/auth/login`.
2. No OTP panel.
3. Session cookie set → redirect `/student`.
4. Failed attempts may lock account (423). Captcha always required.

---

## School admin — email verification OTP (not password change)

1. Login with email + password + captcha.
2. If `!emailVerified` and email/SMTP enabled → **403** `emailNotVerified: true`.
3. UI shows amber OTP panel (or `/verify-email` page).
4. Verify: `POST /api/auth/verify-otp` (`email`, `password`, `otp`) — **school_admin only**.
5. Resend: `POST /api/auth/resend-verification` — school_admin only.
6. After verify: message “you can sign in” — **login again** (no auto session) → `/dashboard`.

---

## Staff (teacher / clerk / CA / super_admin) — normal login

1. Same `/login` form (CA uses `?portal=ca`).
2. Email + password + captcha → `POST /api/auth/login`.
3. No email OTP on this path.
4. If multi-device conflict → 409 device choice modal → retry with `sessionAction`.
5. Success → role home.

---

## Shared login requirements (always)

- Captcha required on login submit
- Account lock after threshold failures
- School inactive checks where applicable
- Remember-me / branding / lock banner as existing UI
- i18n: English + Gujarati (`login.*` keys)

---

## Key files (do not invent new paths unless extending)

| Area | Path |
|------|------|
| Login page | `src/app/login/page.tsx` |
| Login UI hub | `src/components/auth/education-login-hub.tsx` |
| Login API | `src/app/api/auth/login/route.ts` |
| Auth core | `src/lib/auth-login.ts` |
| Student first-login lib | `src/lib/student-first-login.ts` |
| Student account sync | `src/lib/student-account.ts` |
| Student setup API | `src/app/api/auth/student-first-login/route.ts` |
| Student OTP resend | `src/app/api/auth/student-first-login/resend/route.ts` |
| Admin verify OTP | `src/app/api/auth/verify-otp/route.ts` |
| Admin resend | `src/app/api/auth/resend-verification/route.ts` |
| Verify-email page | `src/app/verify-email/page.tsx` |
| Roles / homes | `src/lib/roles.ts` |
| i18n | `src/i18n/messages/en.ts`, `gu.ts` (`login.*`) |

---

## UI / UX expectations for student first-login OTP panel

- Clear title: first-time setup / secure account
- Hint: OTP sent to `{{email}}`; check inbox + spam
- OTP: 6-digit input (reuse `otp-input` component)
- New password + confirm with visible rules
- Primary CTA: Verify OTP & set password
- Secondary: Resend OTP (disabled during cooldown)
- After success: green completion state; force re-login with new password
- Do **not** auto-login after first-time setup
- Mobile responsive; Gujarati typography rules apply

---

## Acceptance checklist

- [ ] First-time student with `123456` gets OTP email and setup panel (no session)
- [ ] Wrong OTP fails with clear error
- [ ] Valid OTP + valid new password completes setup and requires re-login
- [ ] Returning student never sees OTP if already verified + password changed
- [ ] School admin unverified sees email OTP verify (not password change)
- [ ] Teacher/clerk login has no email OTP
- [ ] Captcha required; resend respects cooldown
- [ ] EN + GU strings for all setup / OTP states

---

## Short copy-paste prompt (for Cursor chat)

```text
Work on Scholarship Portal login at /login (shared for all roles — no separate staff/student pages).

Student FIRST login:
- Temp password 123456, emailVerified=false, mustChangePassword=true
- POST /api/auth/login → do NOT create session; send 6-digit email OTP; return 403 studentSetupRequired
- UI: OTP + new password + confirm; resend via /api/auth/student-first-login/resend (60s cooldown)
- Complete via POST /api/auth/student-first-login → verify email, set password, clear mustChangePassword, revoke sessions, still NO session
- User must sign in again with new password → /student

Returning student: normal login, no OTP.

School admin unverified: email OTP only via verify-otp / resend-verification, then login again → /dashboard.

Teacher/clerk/CA/super_admin: no login email OTP (device-choice modal may apply for some roles).

Preserve captcha, locks, EN/GU i18n, and existing files under src/components/auth and src/lib/student-first-login.ts / auth-login.ts.
```
