# Digital Gujarat Scholarship Portal

Bulk scholarship form management system — 100+ students ka data ek saath manage aur submit karein.

## Features

- **Dashboard** — Total students, status overview, category breakdown
- **Student Management** — Add, edit, view, delete students with full form wizard
- **Bulk Import** — CSV/Excel se 100+ students ek saath import
- **Bulk Submit** — Sab ready students ek click me submit
- **Export** — CSV format me data download
- **Validation** — Aadhaar, mobile, IFSC, pincode automatic validation

## Quick Start

```bash
cd scholarship-portal
npm install
npx prisma migrate dev
npm run db:seed    # Optional: 3 sample students
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Bulk Import Steps

1. **Import** page pe jao
2. CSV ya Excel template download karo
3. Apne 100 students ka data template me bharein
4. File upload karo aur **Import All Students** dabao

## Form Fields (Digital Gujarat compatible)

| Section | Fields |
|---------|--------|
| Personal | Name, Aadhaar, DOB, Gender, Mobile, Category |
| Family | Father/Mother name, Income, Occupation |
| Address | Current & Permanent address, District, Pincode |
| Academic | Scholarship scheme, Course, Institution, 10th/12th marks |
| Bank | Bank name, Account, IFSC, Holder name |

## Tech Stack

- Next.js 16 + TypeScript
- Tailwind CSS 4
- Prisma + SQLite
- PapaParse (CSV) + SheetJS (Excel)
