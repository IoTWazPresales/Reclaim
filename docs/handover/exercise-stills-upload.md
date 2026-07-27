# Exercise stills (Layer 2) — Everkinetic acquisition + upload

Remote WebP stills for top lifts. **Not** shipped in the APK. Bucket `exercise-stills` is public on Supabase; the app resolves URLs via `resolveExerciseIllustrationUrl` + `exerciseIllustrations.v1.json`.

## Source & licence

- Repo: [chaosbastler/opentraining-exercises](https://github.com/chaosbastler/opentraining-exercises)
- Illustrations: **Everkinetic**, **CC BY-SA 3.0** (confirmed in upstream README)
- In-app attribution: About screen (`app/src/screens/AboutScreen.tsx`) — “Exercise illustrations by Everkinetic, CC BY-SA 3.0” → http://creativecommons.org/licenses/by-sa/3.0/

Do **not** substitute another image source if GitHub 404s or the licence text changes — stop and re-evaluate.

## Three-step process

Run from `app/` (Node 18+). Requires `sharp` (`npm install --save-dev sharp` once).

### 1) Fetch listing + scaffold mapping

```bash
node scripts/stills/fetch-everkinetic.mjs --list-only
```

- Verifies CC BY-SA 3.0 in upstream README (exits if mismatch / 404)
- Lists image filenames from GitHub Contents API (root, `svg/`, `still_unsorted/`, `old/`) — **no git clone**
- Writes real names to **`.tmp/stills/available.json`** (gitignored)
- Upserts **`scripts/stills/mapping.json`**: keys = the 25 ids from `exerciseIllustrations.v1.json`, values `null` unless already filled (never drift from manifest; never wipe human mappings)

### 2) Map (human)

Open `.tmp/stills/available.json` and fill `scripts/stills/mapping.json`:

```json
{
  "squat": "Squats-1.png",
  "deadlift": null
}
```

- Value = exact **source filename** (or path) from `available.json`
- `null` = skip (reported as MISSING; does not fail the script)

Then download + convert mapped rows:

```bash
node scripts/stills/fetch-everkinetic.mjs
```

- Downloads only mapped files → `.tmp/stills/raw/`
- Converts with sharp → `.tmp/stills/webp/{exerciseId}.webp` (512×512 contain, transparent bg, quality 82)
- Prints summary: `exerciseId | source file | bytes in | bytes out | status`

### 3) Upload to Supabase

```bash
# PowerShell example — never commit these values
$env:SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
node scripts/stills/upload-supabase.mjs
```

- Reads `.tmp/stills/webp/*.webp`
- Upserts into bucket `exercise-stills` at the **manifest** filename (e.g. `squat.webp`)
- `contentType: image/webp`, `x-upsert: true`
- Prints each public URL for browser spot-check
- Refuses to run if `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing; never logs the key

## URL shape

```text
{EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/exercise-stills/{file}
```

Override base with `EXPO_PUBLIC_EXERCISE_STILLS_BASE_URL` if needed.

## Constraints

- `.tmp/` is gitignored — never commit raw/webp/available.json
- No stills in the APK / repo — storage only
- Do not edit the manifest, resolver, or illustration component for routine uploads
