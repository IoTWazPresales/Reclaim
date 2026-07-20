# Exercise stills (Layer 2) — upload checklist

Remote WebP/PNG stills for top lifts. **Not** shipped in the APK.

## Bucket

Create a **public** Supabase Storage bucket named:

```text
exercise-stills
```

Object paths must match `app/src/lib/training/catalog/exerciseIllustrations.v1.json` filenames, e.g.:

```text
exercise-stills/squat.webp
exercise-stills/deadlift.webp
exercise-stills/barbell_bench_press.webp
…
```

Public URL shape (default in app):

```text
{EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/exercise-stills/{file}
```

Override with `EXPO_PUBLIC_EXERCISE_STILLS_BASE_URL` (no trailing slash required).

## Asset guidelines

- Format: **WebP** preferred (or PNG); ~512×512; under **~80 KB** each
- Content: clear form photo or simple line art for that exercise only
- No text overlays that fight dark/light theme
- Until a file is uploaded, the app shows the stick-pattern diagram (safe offline fallback)

## Mapped exercises (current)

See `exerciseIllustrations.v1.json` (~25 money lifts). Expand the JSON + upload when ready — no app rebuild required if the bucket URL is already baked into the binary (Supabase URL is).
