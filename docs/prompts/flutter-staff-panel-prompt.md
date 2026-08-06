# Prompt: Flutter Teacher Staff Panel — UI Refresh + Full Feature Parity

Use this prompt when **modifying an existing Flutter app** to match the SHS Scholarship Portal **Teacher (Staff) web panel** — proper UI, color palette, and all current features wired to live APIs.

> **Scope:** Mobile app = **Teacher + Student login only**. Clerk / School Admin / Super Admin are **web-only** (`403` on mobile login). This document focuses on the **Teacher Staff Panel**.

---

## Product context

- Backend: Next.js Scholarship Portal (same APIs as web).
- Web teacher home: `/teacher`
- Teacher sees **only assigned classes** (`classTeacherId = staffId`).
- Attendance codes: **`P`** Present · **`A`** Absent · **`L`** Leave · **`H`** Half-day
- Languages: **English + Gujarati** (locale switch like web).

---

## Your task (modify, do NOT rebuild)

You already have a Flutter teacher app. **Refactor and extend it** — do not start from scratch.

1. Replace ad-hoc colors with the **design tokens** below (match web `teacher-portal.css`).
2. Align **every screen** 1:1 with web teacher routes (see Navigation).
3. Wire all screens to **Bearer token APIs** (see Auth + API catalog).
4. Add missing features: dashboard detail modals, export XLSX/PDF, roll numbers, exam seats, results hub, board records, holidays, profile/password.
5. Polish mobile UX: pull-to-refresh, skeleton loaders, offline error banners, bottom nav or drawer matching web sidebar groups.
6. Support **EN + GU** strings (mirror web i18n keys under `teacherNav.*`, `teacherPortal.*`, `rollNumbers.*`, `examSeats.*`, `results.*`, `attendance.*`).

---

## Backend configuration

```dart
// lib/core/config/api_config.dart
class ApiConfig {
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000', // Android emulator → localhost
  );
}
```

All requests (except login/captcha):

```
Authorization: Bearer <token>
Content-Type: application/json
Accept: application/json
```

Token TTL: **7 days** (`expiresIn: 604800`). Persist securely (`flutter_secure_storage`).

---

## Design system — Teacher theme (match web)

### Color tokens

| Token | Hex | Usage |
|-------|-----|--------|
| `primary` | `#0D9488` | Buttons, active nav, icons |
| `primaryDark` | `#0F766E` | Hero gradient end, pressed states |
| `primaryLight` | `#CCFBF1` | Badges, chip backgrounds |
| `accent` | `#6366F1` | Academics section (results, marks) |
| `warm` | `#D97706` | Schedule / amber highlights |
| `pageBg` | `#F0FDFA` → `#ECFEFF` → `#F8FAFC` | Screen background gradient |
| `surface` | `#FFFFFF` | Cards |
| `heroGradient` | `#042F2E` → `#134E4A` → `#0F766E` → `#0D9488` → `#14B8A6` | Dashboard hero |
| `sidebarGradient` | `#020617` → `#042F2E` → `#1E1B4B` | Drawer / bottom bar dark strip |
| `textPrimary` | `#0F172A` | Headings |
| `textMuted` | `#64748B` | Subtitles |
| `border` | `#E2E8F0` | Card borders |
| `success` | `#059669` | Saved / published |
| `warning` | `#D97706` | Pending attendance |
| `danger` | `#DC2626` | Errors, absent |

### Attendance cell colors

| Code | Background | Text |
|------|------------|------|
| P | `#D1FAE5` | `#065F46` |
| A | `#FEE2E2` | `#991B1B` |
| L | `#FEF3C7` | `#92400E` |
| H | `#E0E7FF` | `#3730A3` |
| empty | `#F8FAFC` | `#94A3B8` |

### Typography

- **English:** Inter or system default.
- **Gujarati:** Noto Sans Gujarati — apply when `locale == gu` (same as web `globals.css`).
- Card radius: **16px**; buttons: **12px**; chips: **999px**.

### Shared components to build/refactor

| Widget | Spec |
|--------|------|
| `TeacherHero` | Gradient header, school name, teacher name, live clock, academic year badge |
| `MetricCard` | Icon circle (teal/indigo/amber), KPI value, subtitle, tap → detail sheet |
| `TeacherSectionCard` | White card, subtle border, section title + optional "View all" |
| `ClassCard` | Standard-section, student count, boys/girls split, today attendance badge, exam published chip |
| `TeacherPrimaryButton` | Teal filled + shadow |
| `TeacherOutlineButton` | Teal border |
| `StatusChip` | Published (teal) / Draft (slate) / Pending (amber) |
| `EmptyState` | Icon + message + CTA (e.g. "Contact admin — staff not linked") |
| `ExportBottomSheet` | Choose XLSX or PDF, then share via `share_plus` / save via `path_provider` |

---

## Navigation structure

Mirror web `teacher-sidebar.tsx` groups:

### Group: Overview
| Screen | Web route | Flutter route |
|--------|-----------|---------------|
| Dashboard | `/teacher` | `/teacher` or `/home` |

### Group: My Work
| Screen | Web route | Flutter route |
|--------|-----------|---------------|
| Student Attendance | `/teacher/attendance` | `/teacher/attendance` |
| My Timetable | `/teacher/timetable` | `/teacher/timetable` |
| Students | `/teacher/students` | `/teacher/students` |
| Roll Numbers | `/teacher/roll-numbers` | `/teacher/roll-numbers` |
| Exam Seat Numbers | `/teacher/exam-seat-numbers` | `/teacher/exam-seat-numbers` |

### Group: Academics
| Screen | Web route | Flutter route |
|--------|-----------|---------------|
| Results Hub | `/results` | `/teacher/results` |
| Term Marks Entry | `/results/term` | `/teacher/results/term` |
| Marks Sheet | `/results/marks-sheet` | `/teacher/results/marks-sheet` |
| Class Results | `/results/class` | `/teacher/results/class` |
| Board Records | `/teacher/board-records` | `/teacher/board-records` |
| Holiday Calendar | `/staff/holidays` | `/teacher/holidays` |

### Global
| Screen | Web route | Flutter route |
|--------|-----------|---------------|
| Profile / Change Password | `/profile` | `/profile` |

**Mobile nav pattern:** Bottom bar (Dashboard · Attendance · Results · More) + drawer for full list. "More" opens drawer with Academics group.

---

## Auth flow

### 1. Captcha

```
GET /api/auth/captcha
```

Response:

```json
{
  "captchaToken": "<signed-token>",
  "imageSvg": "<svg string>",
  "expiresIn": 300
}
```

- Render SVG with `flutter_svg`.
- Refresh captcha on tap / after failed login.

### 2. Mobile login (Teacher only for staff panel)

```
POST /api/auth/mobile/login
```

Body:

```json
{
  "email": "teacher@school.local",
  "password": "***",
  "captchaToken": "...",
  "captchaAnswer": "ABC123",
  "latitude": 23.0,
  "longitude": 72.6,
  "accuracyM": 50
}
```

Success **200**:

```json
{
  "user": { "userId", "email", "name", "role": "teacher", "schoolId", "schoolName", "staffId", ... },
  "token": "<jwt>",
  "expiresIn": 604800
}
```

Errors:
| Status | Body | UI action |
|--------|------|-----------|
| 400 | `captchaRequired` / `captchaInvalid` | Refresh captcha |
| 403 | `Mobile app supports Teacher and Student login only` | Show message (clerk/admin cannot use app) |
| 403 | `studentSetupRequired` | Redirect to student OTP setup flow (separate module) |
| 423 | account locked | Show lockout timer |

### 3. Session check

```
GET /api/auth/me
Authorization: Bearer <token>
```

On **401** → clear token → login screen.

### 4. Change password

```
PATCH /api/account/password
{ "currentPassword", "newPassword", "confirmPassword" }
```

---

## Screen specifications

### 1. Login

- School-branded card on mint gradient background.
- Email, password, captcha (SVG), show/hide password.
- Loading state on submit; inline field errors.
- Optional: remember email (not password).

---

### 2. Dashboard (`GET /api/teacher/dashboard`)

**Hero:** Welcome `{teacherName}`, `{schoolName}`, designation, `{academicYear}`, live date/time.

**KPI row (4 cards — tap opens bottom sheet / modal with full list):**

| Card | Stat | Detail kind |
|------|------|-------------|
| My Classes | `stats.totalClasses` | Class list with attendance % |
| Students | `stats.totalStudents` | Full student roster preview |
| Month Attendance | `stats.monthAttendancePct` | Per-class summary |
| Today's Periods | `stats.todayPeriods` | Schedule list |

**Alerts:**
- `quickHints.noStaffLink` → banner: staff profile not linked.
- `stats.attendancePendingToday > 0` → amber chip linking to attendance.

**My Classes grid:** Each `ClassCard`:
- Name, student count, boys/girls, `attendancePct`, `markedToday` / `unmarkedToday`
- Chips: `examPublished` → Published (teal) / Draft
- Actions: **Mark Attendance**, **Enter Marks**, **View Roster**

**Today's Schedule:** Period list from `todaySchedule[]` — subject, class, room, time.

**Quick Actions row:** Attendance · Students · Results · Timetable · Export

**Export (dashboard):**

```
GET /api/teacher/export?type=dashboard&format=xlsx|pdf
Authorization: Bearer <token>
```

Download bytes → save/share. Show filename from `Content-Disposition` if present.

**Pull-to-refresh** reloads dashboard.

---

### 3. Student Attendance

**Filters:** Class picker (teacher classes only), month, year.

**Load:**

```
GET /api/attendance?classId={id}&month={m}&year={y}
```

**Grid UX (mobile-optimized):**
- Sticky header: student name + roll.
- Horizontal scroll for day columns OR compact "today only" mode with expand to full month.
- Tap cell → cycle `empty → P → A → L → H → empty`.
- Long-press → pick from bottom sheet.
- Show month summary: present count per student.
- **Save:**

```
PUT /api/attendance
{
  "classId": "...",
  "month": 8,
  "year": 2026,
  "rows": [{ "studentId": "...", "attendance": ["P","A",null,...] }]
}
```

- View filters (optional parity): day range, show only absent/unmarked (mirror web `attendance-view-filters`).
- **Export:**

```
GET /api/teacher/export?type=attendance&format=xlsx|pdf&classId=&month=&year=
```

---

### 4. My Timetable (read-only)

```
GET /api/timetable/my?academicYear=2025-26
```

- Weekly grid: Mon–Sat rows × period columns.
- Cell: subject, class name, room.
- Highlight **today's column**.
- Empty state if timetable not released.

---

### 5. Students

**Load assigned classes + students:**

```
GET /api/teacher
```

**Filters:** Search (name, roll, GR, mobile, father), class, gender, status, category.

**List item:** Avatar initial, name (GU name if locale=gu), roll, GR, class, gender, mobile, board seat if set.

**Tap student → detail bottom sheet:** DOB, father/mother, category, caste, links to attendance/results for that class.

**Export roster:**

```
GET /api/teacher/export?type=roster&format=xlsx|pdf&classId={optional}
```

**GR quick search:**

```
GET /api/teacher/students/search?grNumber=1234
```

---

### 6. Roll Numbers

```
GET /api/roll-numbers?classId={id}
PATCH /api/roll-numbers
{ "classId", "updates": [{ "studentId", "rollNumber" }] }
```

- Class dropdown (teacher-scoped classes).
- Editable roll field per student.
- **Auto Assign** button → fills 1, 2, 3… in list order.
- Validate unique non-empty rolls before save.
- Show board seat column (read-only) if available.

---

### 7. Exam Seat Numbers

```
GET /api/exam-seat-numbers?classId={id}&examId={id}
PATCH /api/exam-seat-numbers
{ "classId", "examId", "updates": [{ "studentId", "seatNumber" }] }
```

- Class + exam selectors.
- Generator panel: prefix (auto from class, e.g. `10A`), start at → **Generate** → `10A-1`, `10A-2`…
- Manual edit; duplicate check on save.
- Publish toggle if API returns publish state (mirror web publish/unpublish).

---

### 8. Results Hub

**Class overview:**

```
GET /api/results/class-overview?academicYear=2025-26
```

- Academic year picker.
- Group classes by standard.
- Each class card: student count, published badge, links → Term Marks / Marks Sheet / Class Results.

**Sub-screens:**

#### 8a. Term Marks Entry (`/results/term`)

```
GET /api/results/term-marks?classId={id}&term={mid|final|...}
POST /api/results/term-marks
```

**Save body (`action: save_marks`):**

```json
{
  "action": "save_marks",
  "examId": "...",
  "classId": "...",
  "term": "mid1",
  "students": [{
    "studentId": "...",
    "subjectMarks": [{
      "subjectCode": "GUJ",
      "termValue": 45,
      "internalValue": 18
    }]
  }]
}
```

**Paper (external) field aliases accepted by API:**  
`termValue`, `externalValue`, `external`, `paperValue`, `paperMarks`, `paper`, `marks`, `value`

**Internal (teacher) field aliases accepted by API:**  
`internalValue`, `internal`, `internalMarks`, `teacherMarks`, `teacherValue`, `teacher`

**GET response** also returns `externalValue` + `internal` aliases, plus `paperMax` and `internalMax` per subject.

- Term tabs (Mid, Final, etc. from `termMeta`).
- Grid: students × subjects; **both paper + internal** columns when `internalMax > 0`.
- Show locked/published state — disable edit when locked.
- Save batch marks; show completion % per term.

#### 8b. Marks Sheet

```
GET /api/results/marks-sheet?classId={id}
POST /api/results/marks-sheet
```

- Read-only consolidated view + optional remark columns.

#### 8c. Class Results / Print

```
GET /api/results/class-overview?classId={id}
GET /api/results/print?classId={id}&...
```

- Summary stats, rank list; share PDF if API returns file.

---

### 9. Board Records (Class 10 / 12)

Teacher-scoped, class-filtered (mirror `/teacher/board-records`):

```
GET /api/board-records/overview
GET /api/board-records/entry?classId=&standard=10|12
PATCH /api/board-records/entry
GET /api/board-records/exam-result-sheet?...
GET /api/board-records/result-list?...
```

**UI tabs:**
1. **Overview** — completion stats per class.
2. **Student Entry** — editable board fields per student.
3. **Exam Result Sheet** — marks/grades grid.
4. **Result List** — school result list view.

- Read-only where web is read-only for teachers.
- Standard filter: 10 / 12 only for assigned classes.

---

### 10. Holiday Calendar (read-only for teacher)

**Preferred (Flutter staff panel):**

```
GET /api/teacher/holidays?year=2026&month=8
Authorization: Bearer <token>
```

**Also accepted (aliases — same data):**

```
GET /api/holidays?year=2026&month=8
GET /api/staff/holidays?year=2026&month=8
```

Response:

```json
{
  "year": 2026,
  "month": 8,
  "holidays": [
    {
      "id": "...",
      "date": "2026-08-15",
      "name": "Independence Day",
      "nameGu": "સ્વતંત્રતા દિવસ",
      "type": "public",
      "academicYear": "2026-27",
      "description": null
    }
  ]
}
```

- Month calendar heatmap or list.
- Holiday name, date, type (public/school).
- No create/edit (teacher = GET only).
- If you see `Access denied`, use `/api/teacher/holidays` (not a write endpoint).

---

### 11. Profile

- Show name, email, school, role, designation.
- Change password form → `PATCH /api/account/password`.
- Language toggle EN / GU (persist locally).
- Logout → clear secure storage.

---

## API quick reference (Teacher mobile)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/auth/captcha` | Login captcha |
| POST | `/api/auth/mobile/login` | Login |
| GET | `/api/auth/me` | Session |
| PATCH | `/api/account/password` | Password |
| GET | `/api/teacher` | Classes + students |
| GET | `/api/teacher/dashboard` | Dashboard aggregate |
| GET | `/api/teacher/export?type=&format=` | XLSX/PDF export |
| GET | `/api/teacher/students/search?grNumber=` | GR lookup |
| GET/PUT | `/api/attendance?classId&month&year` | Attendance |
| GET | `/api/timetable/my?academicYear=` | Timetable |
| GET/PATCH | `/api/roll-numbers?classId=` | Roll numbers |
| GET/PATCH | `/api/exam-seat-numbers?classId&examId=` | Exam seats |
| GET | `/api/results/class-overview?academicYear=` | Results hub |
| GET/POST | `/api/results/term-marks?classId&term=` | Term marks |
| GET/POST | `/api/results/marks-sheet?classId=` | Marks sheet |
| GET | `/api/results/print?...` | Print/PDF |
| GET/PATCH | `/api/board-records/*` | Board records |
| GET | `/api/teacher/holidays?year=&month=` | Holidays (preferred for Flutter) |
| GET | `/api/holidays?year=&month=` | Holidays (shared) |
| GET | `/api/staff/holidays?year=&month=` | Holidays (alias) |

---

## Export handling (Flutter)

```dart
// After GET export with format=xlsx|pdf
final bytes = response.bodyBytes;
final dir = await getTemporaryDirectory();
final ext = format == 'pdf' ? 'pdf' : 'xlsx';
final file = File('${dir.path}/teacher_export.$ext');
await file.writeAsBytes(bytes);
await Share.shareXFiles([XFile(file.path)]);
```

Use `dio` with `responseType: ResponseType.bytes` for binary exports.

---

## Error & edge states

| Condition | UX |
|-----------|-----|
| `staffId == null` / `no_staff` | Full-width info banner on dashboard; disable class actions |
| Class not assigned | 403 → "Class not assigned to you" |
| Network error | Retry button + cached last data if available |
| Token expired | Redirect login |
| Empty class | Illustration + "No students in this class" |
| Locked exam term | Read-only grid + lock icon |

---

## Suggested Flutter folder structure

```
lib/
  core/
    config/api_config.dart
    theme/teacher_theme.dart
    network/api_client.dart
    auth/auth_repository.dart
  features/
    login/
    dashboard/
    attendance/
    timetable/
    students/
    roll_numbers/
    exam_seats/
    results/
    board_records/
    holidays/
    profile/
  shared/
    widgets/teacher_hero.dart
    widgets/metric_card.dart
    widgets/class_card.dart
    widgets/export_sheet.dart
  l10n/   # EN + GU
```

---

## Acceptance checklist

- [ ] Login with captcha works for **teacher** role
- [ ] Clerk/admin login shows clear **web-only** message
- [ ] Theme matches teal/indigo/amber web palette
- [ ] Gujarati locale renders Noto Sans Gujarati
- [ ] Dashboard KPIs, class cards, schedule, quick actions
- [ ] Dashboard export XLSX + PDF share
- [ ] Attendance grid P/A/L/H + save + export
- [ ] Timetable read-only weekly view
- [ ] Students list with search/filters + export
- [ ] Roll numbers auto-assign + save
- [ ] Exam seat generator + save
- [ ] Results hub + term marks entry + marks sheet
- [ ] Board records tabs (teacher-scoped)
- [ ] Holiday calendar read-only
- [ ] Profile password change + logout
- [ ] Pull-to-refresh on main screens
- [ ] 401 → auto logout

---

## Test credentials (local seed)

| Role | Email | Password |
|------|-------|----------|
| Teacher | (seed teacher email) | (seed password) |
| School | SCH00001 | — |

Run web seed: `npm run db:seed-mega` in scholarship-portal.

---

## Copy-paste prompt for Cursor (Flutter project)

```
Modify my existing Flutter SHS Teacher Staff Panel app — do NOT rebuild from scratch.

Match the web Teacher Portal at /teacher with full feature parity and this design:
- Primary #0D9488, Accent #6366F1, Warm #D97706, page bg mint gradient #F0FDFA
- Hero gradient teal, cards 16px radius, attendance colors P/A/L/H
- EN + GU (Noto Sans Gujarati for gu)

Auth: GET /api/auth/captcha (render SVG), POST /api/auth/mobile/login with captchaToken+captchaAnswer, store Bearer token 7 days. Only teacher role for staff panel.

Implement/refactor these screens with live APIs:
1. Dashboard — GET /api/teacher/dashboard, KPI cards with detail sheets, class cards, today schedule, quick actions, export GET /api/teacher/export?type=dashboard&format=xlsx|pdf
2. Attendance — GET/PUT /api/attendance, monthly grid P/A/L/H, export type=attendance
3. Timetable — GET /api/timetable/my (read-only)
4. Students — GET /api/teacher, filters, GR search /api/teacher/students/search, export type=roster
5. Roll Numbers — GET/PATCH /api/roll-numbers, auto-assign 1,2,3
6. Exam Seats — GET/PATCH /api/exam-seat-numbers, prefix generator
7. Results — class-overview, term-marks GET/POST, marks-sheet, print
8. Board Records — overview, entry, exam-result-sheet, result-list (teacher-scoped)
9. Holidays — GET /api/teacher/holidays (or /api/holidays / /api/staff/holidays) read-only
10. Profile — GET /api/auth/me, PATCH /api/account/password

Use bottom nav (Dashboard, Attendance, Results, More) + drawer for full nav groups (Overview, My Work, Academics).

Handle no_staff link banner, 401 logout, export via dio bytes + share_plus.

Reference backend prompt doc: docs/prompts/flutter-staff-panel-prompt.md in scholarship-portal repo.
```

---

## Related docs

- Login / OTP flows: `docs/prompts/login-otp-flow-prompt.md`
- Web teacher CSS: `src/components/teacher/teacher-portal.css`
- Web teacher theme tokens: `src/components/teacher/teacher-theme.ts`
- Web sidebar nav: `src/components/layout/teacher-sidebar.tsx`
