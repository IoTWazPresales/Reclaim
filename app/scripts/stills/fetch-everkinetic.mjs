/**
 * Everkinetic / OpenTraining exercise stills — list, download (mapped), convert to WebP.
 *
 * Source: https://github.com/chaosbastler/opentraining-exercises (CC BY-SA 3.0, Everkinetic)
 * Fetch via GitHub Contents API + raw download URLs — no git clone.
 *
 * Usage (from app/):
 *   node scripts/stills/fetch-everkinetic.mjs              # list + scaffold + convert mapped
 *   node scripts/stills/fetch-everkinetic.mjs --list-only  # available.json + mapping scaffold only
 */
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..');
const APP_ROOT = join(__dirname, '..', '..');
const MANIFEST_PATH = join(
  APP_ROOT,
  'src',
  'lib',
  'training',
  'catalog',
  'exerciseIllustrations.v1.json',
);
const MAPPING_PATH = join(__dirname, 'mapping.json');
const TMP_ROOT = join(REPO_ROOT, '.tmp', 'stills');
const AVAILABLE_PATH = join(TMP_ROOT, 'available.json');
const RAW_DIR = join(TMP_ROOT, 'raw');
const WEBP_DIR = join(TMP_ROOT, 'webp');

const REPO = 'chaosbastler/opentraining-exercises';
const BRANCH = 'master';
const API_ROOT = `https://api.github.com/repos/${REPO}/contents`;
const EXPECTED_LICENSE_SNIPPET = 'Creative Commons Attribution-ShareAlike 3.0';
const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|svg)$/i;

const LIST_DIRS = ['', 'svg', 'still_unsorted', 'old'];

const listOnly = process.argv.includes('--list-only');

async function githubJson(url) {
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'reclaim-exercise-stills-tooling',
    },
  });
  if (res.status === 404) {
    throw new Error(`GitHub source 404: ${url}`);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GitHub API ${res.status} for ${url}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function verifyLicenseOrStop() {
  const readmeUrl = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/README.md`;
  const res = await fetch(readmeUrl, {
    headers: { 'User-Agent': 'reclaim-exercise-stills-tooling' },
  });
  if (res.status === 404) {
    console.error('STOP: README.md 404 — cannot verify CC BY-SA 3.0 licence text.');
    process.exit(2);
  }
  if (!res.ok) {
    console.error(`STOP: failed to fetch README for licence check (${res.status}).`);
    process.exit(2);
  }
  const text = await res.text();
  if (!text.includes(EXPECTED_LICENSE_SNIPPET)) {
    console.error(
      'STOP: in-repo licence text does not match expected CC BY-SA 3.0 (Attribution-ShareAlike 3.0).',
    );
    console.error('Do not substitute another source. Inspect README and re-evaluate.');
    process.exit(2);
  }
  console.log('Licence OK: README cites Creative Commons Attribution-ShareAlike 3.0 (Everkinetic).');
}

async function listImageDirectory(dirPath) {
  const url =
    dirPath === ''
      ? `${API_ROOT}?ref=${BRANCH}`
      : `${API_ROOT}/${encodeURIComponent(dirPath)}?ref=${BRANCH}`;
  const listing = await githubJson(url);
  if (!Array.isArray(listing)) {
    throw new Error(`Unexpected contents response for ${dirPath || '/'}: ${JSON.stringify(listing)}`);
  }
  const images = [];
  for (const entry of listing) {
    if (entry.type !== 'file') continue;
    if (!IMAGE_EXT_RE.test(entry.name)) continue;
    images.push({
      name: entry.name,
      path: entry.path,
      dir: dirPath || '.',
      size: entry.size ?? null,
      download_url: entry.download_url,
      sha: entry.sha,
    });
  }
  return images;
}

async function writeAvailableJson(allImages) {
  await mkdir(TMP_ROOT, { recursive: true });
  const payload = {
    fetchedAt: new Date().toISOString(),
    source: `https://github.com/${REPO}`,
    branch: BRANCH,
    license: 'CC BY-SA 3.0 (Everkinetic) — per upstream README',
    count: allImages.length,
    files: allImages.sort((a, b) => a.path.localeCompare(b.path)),
  };
  await writeFile(AVAILABLE_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${AVAILABLE_PATH} (${payload.count} image filenames).`);
}

async function upsertMappingScaffold() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  const ids = Object.keys(manifest);
  let existing = {};
  try {
    existing = JSON.parse(await readFile(MAPPING_PATH, 'utf8'));
  } catch (err) {
    if (err && err.code !== 'ENOENT') throw err;
  }
  const next = {};
  for (const id of ids) {
    const prev = existing[id];
    next[id] = typeof prev === 'string' && prev.trim() ? prev.trim() : null;
  }
  await writeFile(MAPPING_PATH, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  const filled = ids.filter((id) => next[id] != null).length;
  console.log(
    `Mapping scaffold ${MAPPING_PATH}: ${ids.length} ids from manifest (${filled} mapped, ${ids.length - filled} null).`,
  );
  return { manifest, mapping: next };
}

function resolveMappedSource(availableFiles, sourceName) {
  const exact = availableFiles.filter((f) => f.name === sourceName || f.path === sourceName);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) {
    // Prefer root / svg over still_unsorted when ambiguous by name-only.
    const preferred = exact.find((f) => f.dir === '.' || f.dir === 'svg') ?? exact[0];
    return preferred;
  }
  return null;
}

async function downloadFile(downloadUrl, destPath) {
  const res = await fetch(downloadUrl, {
    headers: { 'User-Agent': 'reclaim-exercise-stills-tooling' },
  });
  if (res.status === 404) {
    throw new Error(`Download 404: ${downloadUrl}`);
  }
  if (!res.ok) {
    throw new Error(`Download failed ${res.status}: ${downloadUrl}`);
  }
  if (!res.body) {
    throw new Error(`Download had empty body: ${downloadUrl}`);
  }
  await mkdir(dirname(destPath), { recursive: true });
  await pipeline(Readable.fromWeb(res.body), createWriteStream(destPath));
  const buf = await readFile(destPath);
  return buf.length;
}

async function convertToWebp(rawPath, outPath) {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch (err) {
    throw new Error(
      `sharp is required for conversion. Install with: npm install --save-dev sharp\n${err}`,
    );
  }
  await mkdir(dirname(outPath), { recursive: true });
  const info = await sharp(rawPath)
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: 82 })
    .toFile(outPath);
  return info.size ?? (await readFile(outPath)).length;
}

function printSummary(rows) {
  const col = (s, w) => String(s).padEnd(w).slice(0, w);
  console.log('');
  console.log(
    `${col('exerciseId', 24)} | ${col('source file', 40)} | ${col('in', 8)} | ${col('out', 8)} | status`,
  );
  console.log(`${'-'.repeat(24)}-+-${'-'.repeat(40)}-+-${'-'.repeat(8)}-+-${'-'.repeat(8)}-+--------`);
  for (const r of rows) {
    console.log(
      `${col(r.exerciseId, 24)} | ${col(r.source ?? '—', 40)} | ${col(r.bytesIn ?? '—', 8)} | ${col(r.bytesOut ?? '—', 8)} | ${r.status}`,
    );
  }
}

async function main() {
  await verifyLicenseOrStop();
  await mkdir(TMP_ROOT, { recursive: true });

  const allImages = [];
  for (const dir of LIST_DIRS) {
    console.log(`Listing images in ${dir || '(repo root)'}…`);
    const batch = await listImageDirectory(dir);
    console.log(`  → ${batch.length} image files`);
    allImages.push(...batch);
  }
  // Dedupe by path
  const byPath = new Map();
  for (const img of allImages) byPath.set(img.path, img);
  const unique = [...byPath.values()];
  await writeAvailableJson(unique);

  const { mapping } = await upsertMappingScaffold();

  if (listOnly) {
    console.log('--list-only: skipping download/convert.');
    return;
  }

  await mkdir(RAW_DIR, { recursive: true });
  await mkdir(WEBP_DIR, { recursive: true });

  const rows = [];
  for (const [exerciseId, sourceName] of Object.entries(mapping)) {
    if (sourceName == null || sourceName === '') {
      rows.push({ exerciseId, source: null, status: 'MISSING' });
      continue;
    }
    const source = resolveMappedSource(unique, sourceName);
    if (!source) {
      rows.push({
        exerciseId,
        source: sourceName,
        status: 'MISSING_SOURCE (not in available.json)',
      });
      continue;
    }
    const rawPath = join(RAW_DIR, `${exerciseId}__${basename(source.name)}`);
    const webpPath = join(WEBP_DIR, `${exerciseId}.webp`);
    try {
      const bytesIn = await downloadFile(source.download_url, rawPath);
      const bytesOut = await convertToWebp(rawPath, webpPath);
      rows.push({
        exerciseId,
        source: source.path,
        bytesIn,
        bytesOut,
        status: 'OK',
      });
    } catch (err) {
      rows.push({
        exerciseId,
        source: source.path,
        status: `ERROR: ${err instanceof Error ? err.message : String(err)}`,
      });
      console.error(`[fetch-everkinetic] failed ${exerciseId}:`, err);
    }
  }

  printSummary(rows);
  const missing = rows.filter((r) => String(r.status).startsWith('MISSING'));
  const ok = rows.filter((r) => r.status === 'OK');
  console.log(`\nDone: ${ok.length} converted, ${missing.length} missing/unmapped (non-fatal).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
