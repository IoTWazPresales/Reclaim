/**
 * Upload converted WebP stills from .tmp/stills/webp/ to Supabase Storage
 * bucket `exercise-stills` (public), using filenames from the illustrations manifest.
 *
 * Credentials (required — never hardcoded):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage (from app/):
 *   node scripts/stills/upload-supabase.mjs
 */
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = join(__dirname, '..', '..');
const REPO_ROOT = join(__dirname, '..', '..', '..');
const MANIFEST_PATH = join(
  APP_ROOT,
  'src',
  'lib',
  'training',
  'catalog',
  'exerciseIllustrations.v1.json',
);
const WEBP_DIR = join(REPO_ROOT, '.tmp', 'stills', 'webp');
const BUCKET = 'exercise-stills';

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    console.error(`Refusing to run: missing required env ${name}.`);
    process.exit(2);
  }
  return String(value).trim().replace(/\/$/, '');
}

async function main() {
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  // Never log the key.

  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  let files;
  try {
    files = (await readdir(WEBP_DIR)).filter((f) => f.toLowerCase().endsWith('.webp'));
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      console.error(`No webp directory at ${WEBP_DIR}. Run fetch-everkinetic.mjs first.`);
      process.exit(1);
    }
    throw err;
  }

  if (files.length === 0) {
    console.error(`No .webp files in ${WEBP_DIR}.`);
    process.exit(1);
  }

  console.log(`Uploading ${files.length} object(s) to bucket "${BUCKET}"…`);

  for (const file of files) {
    const exerciseId = basename(file, '.webp');
    const expectedName = manifest[exerciseId];
    if (!expectedName) {
      console.warn(`SKIP ${file}: exercise id not in manifest`);
      continue;
    }
    if (expectedName !== file) {
      console.warn(
        `WARN ${exerciseId}: manifest expects "${expectedName}" but local file is "${file}" — uploading as "${expectedName}".`,
      );
    }

    const body = await readFile(join(WEBP_DIR, file));
    const objectPath = expectedName;
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${BUCKET}/${objectPath}`;

    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        'Content-Type': 'image/webp',
        'x-upsert': 'true',
      },
      body,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`FAIL ${objectPath}: HTTP ${res.status} ${text.slice(0, 300)}`);
      continue;
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${objectPath}`;
    console.log(`OK  ${objectPath}`);
    console.log(`    ${publicUrl}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
