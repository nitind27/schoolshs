# Certificate packs (per school code)

Super Admin assigns one pack per school (`moduleFormats.certificates`).

## Add a new school format

1. Create folder:
   `src/components/certificates/packs/<SCHOOL_CODE>/`
2. Add `index.ts` that exports the same views as `default/` (copy first, then customize).
3. Register in `src/lib/certificates/packs-registry.ts`:
   - `id` = school code (e.g. `24261004405`)
   - `schoolCode` = same code
   - `folder` = same code
4. Optionally map runtime module in `src/lib/certificates/resolve-pack.ts` (`PACK_MODULES`).
5. In Super Admin → **Formats** or school **Panel Access**, assign that pack to the school.
6. Enable the **Certificates** feature for that school.

Only schools assigned that pack id will render those layouts.
