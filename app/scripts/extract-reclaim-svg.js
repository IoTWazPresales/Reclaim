const fs = require('fs');
const path = require('path');

const desktop = process.env.USERPROFILE
  ? path.join(process.env.USERPROFILE, 'Desktop', 'Reclaim.svg')
  : path.join(process.env.HOME || '', 'Desktop', 'Reclaim.svg');

const svg = fs.readFileSync(desktop, 'utf8');
const vbMatch = svg.match(/viewBox="([^"]+)"/);
const dMatch = svg.match(/\s+d="([^"]*)"/);

const viewBox = vbMatch ? vbMatch[1].split(/\s+/).map(Number) : [0, 0, 210, 297];
const pathD = dMatch ? dMatch[1].trim() : '';

const outDir = path.join(__dirname, '..', 'src', 'lib');
const outPath = path.join(outDir, 'reclaimSvgPath.ts');

const content = `/**
 * Path data from Reclaim.svg (Desktop). Single path — draw as white stroke only.
 * viewBox: ${viewBox.join(' ')}
 */
export const RECLAIM_VIEWBOX: [number, number, number, number] = [${viewBox.join(', ')}];
export const RECLAIM_PATH_D = \`${pathD}\`;
`;

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, content, 'utf8');
console.log('Wrote', outPath, 'path length', pathD.length);
