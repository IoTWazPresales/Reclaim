/**
 * Reads path909.svg from Desktop, extracts path d and SVG metadata,
 * writes app/src/lib/reclaimLogoPaths.ts
 */
const fs = require('fs');
const path = require('path');

const desktop = process.env.USERPROFILE
  ? path.join(process.env.USERPROFILE, 'Desktop', 'path909.svg')
  : path.join(process.env.HOME || '', 'Desktop', 'path909.svg');

let svg;
try {
  svg = fs.readFileSync(desktop, 'utf8');
} catch (e) {
  console.error('Could not read path909.svg from Desktop:', e.message);
  process.exit(1);
}

const viewBoxMatch = svg.match(/viewBox="([^"]+)"/);
const transformMatch = svg.match(/transform="translate\(([^)]+)\)"/);
const dMatch = svg.match(/\s+d="([^"]*)"/);

if (!dMatch || !dMatch[1]) {
  console.error('Could not find path d in SVG');
  process.exit(1);
}

const d = dMatch[1].trim();
const viewBox = viewBoxMatch ? viewBoxMatch[1].split(/\s+/) : ['0', '0', '146.33965', '138.02119'];
const translate = transformMatch ? transformMatch[1].split(',').map((s) => s.trim()) : ['-36.66014', '-67.144884'];

const LOGO_W = parseFloat(viewBox[2]) || 146.33965;
const LOGO_H = parseFloat(viewBox[3]) || 138.02119;
const LOGO_OX = Math.abs(parseFloat(translate[0])) || 36.66014;
const LOGO_OY = Math.abs(parseFloat(translate[1])) || 67.144884;

const outPath = path.join(__dirname, '..', 'src', 'lib', 'reclaimLogoPaths.ts');
const outDir = path.dirname(outPath);
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const content = `/**
 * Reclaim logo path data from path909.svg (trace).
 * Source: path909.svg — viewBox 0 0 ${LOGO_W} ${LOGO_H}, group translate(-${LOGO_OX}, -${LOGO_OY}).
 * Fill in SVG was #000000; we use splash colours in ReclaimLogo.
 */

export const LOGO_W  = ${LOGO_W};
export const LOGO_H  = ${LOGO_H};
export const LOGO_OX  = ${LOGO_OX};
export const LOGO_OY  = ${LOGO_OY};

export const LOGO_PATH_D = \`${d}\`;
`;

fs.writeFileSync(outPath, content, 'utf8');
console.log('Wrote', outPath, 'path length', d.length);
console.log('LOGO_W', LOGO_W, 'LOGO_H', LOGO_H, 'LOGO_OX', LOGO_OX, 'LOGO_OY', LOGO_OY);
