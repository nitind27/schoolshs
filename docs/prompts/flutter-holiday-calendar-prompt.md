# Prompt: Flutter — Holiday Calendar (fix Access Denied)

Paste this into your **Flutter project** Cursor chat. Backend is already fixed — use these APIs only.

---

## Copy-paste prompt

```
Fix Holiday Calendar in my existing Flutter SHS Teacher/Staff app.

BUG: App shows "Access denied" when opening Holiday Calendar.
ROOT CAUSE: Wrong API path or missing Bearer token. Do NOT call write/POST endpoints.

=== REQUIRED API (use this first) ===

GET {BASE_URL}/api/teacher/holidays?year=2026
Authorization: Bearer <token>
Accept: application/json

Optional month filter:
GET {BASE_URL}/api/teacher/holidays?year=2026&month=8

Fallback aliases (same data, if first fails):
1) GET /api/holidays?year=2026
2) GET /api/staff/holidays?year=2026

NEVER use POST /api/holidays from teacher app (create/edit is admin/clerk only → 403).

=== SUCCESS RESPONSE ===

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

type values: "public" | "school" | "optional"

=== IMPLEMENTATION STEPS ===

1) Create/update HolidayRepository:
   - Method: Future<List<Holiday>> fetchHolidays({required int year, int? month})
   - Try endpoints in order: /api/teacher/holidays → /api/holidays → /api/staff/holidays
   - Always send Authorization: Bearer <secure_storage_token>
   - On 401 → logout / go to login
   - On 403 → retry next alias; if all fail show clear message (do not show raw "Access denied" only)
   - Parse holidays list safely (null-safe)

2) Holiday model:
   - id, date (YYYY-MM-DD), name, nameGu, type, academicYear, description
   - displayName(locale): if gu use nameGu if not empty else name

3) UI screen: Teacher Holidays (read-only)
   - Theme: primary #0D9488, accent #6366F1, page bg mint #F0FDFA
   - Year dropdown (current year ± 1)
   - Toggle: Calendar view | List view
   - Calendar month grid:
     - Today = orange border
     - Sunday = red text
     - Holiday dates = green filled chip/dot
   - Tap day with holiday → bottom sheet (name, nameGu, type, description)
   - List view: sorted by date, upcoming first, type chip (public/school/optional)
   - Pull-to-refresh
   - Empty state: "No holidays for this year"
   - Loading skeleton
   - Error banner with Retry

4) Navigation:
   - Add "Holidays" under Academics / More drawer
   - Route: /teacher/holidays
   - Icon: calendar

5) Do NOT add Add/Edit/Delete for teacher role (read-only).

6) EN + GU:
   - Title: Holiday Calendar / રજા કૅલેન્ડર
   - Use Noto Sans Gujarati when locale == gu

=== ACCEPTANCE ===

- [ ] Teacher login → Holidays opens without Access denied
- [ ] Uses GET /api/teacher/holidays with Bearer token
- [ ] Year change reloads data
- [ ] Calendar marks holiday days in green
- [ ] List shows name + type
- [ ] Gujarati locale shows nameGu when available
- [ ] 401 clears session
- [ ] No create/edit buttons for teacher
```

---

## Short version (agar chhota prompt chahiye)

```
Flutter SHS Teacher app me Holiday Calendar fix karo.

Access denied aa raha hai — galat API / missing token.

Use ONLY:
GET /api/teacher/holidays?year=YYYY
Header: Authorization: Bearer <token>

Fallback: /api/holidays then /api/staff/holidays
Never POST.

Show read-only calendar + list (teal theme #0D9488).
Green = holiday, orange = today, red = Sunday.
EN+GU (nameGu). Pull-to-refresh. Route /teacher/holidays.
```
