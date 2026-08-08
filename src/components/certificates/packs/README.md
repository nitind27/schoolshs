# Certificate packs (per school code)

Super Admin can assign **any** pack to **any** school (`moduleFormats.certificates`).
Letterhead (name / DISE) comes from the school profile at print time; layout comes from the pack.

## Registered packs

| Pack id | Leaving Certificate layout |
|---|---|
| `default` | Secondary / HSC-style LC |
| `24261004405` | Songadh secondary LC |
| `24261004403` | **Upper Primary scan LC** (APAAR, bank, native place, …) |
| `24261004404` | **Upper Primary scan LC** (same format) |

## Add a new school format

1. Create folder `src/components/certificates/packs/<SCHOOL_CODE>/`
2. Export views from `index.ts` (use `leaving-certificate-upper-primary` or `leaving-certificate`)
3. Register in `packs-registry.ts` + `resolve-pack.ts` + brand in `school-brand.ts`
4. Super Admin → Formats / Panel Access → assign pack
