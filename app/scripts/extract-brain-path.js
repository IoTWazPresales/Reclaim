const fs = require('fs');
const svg = fs.readFileSync('./assets/brain.svg', 'utf8');
const pathMatch = svg.match(/<path[^>]+d="(m [^"]+)"/);
if (pathMatch) {
  const path = pathMatch[1];
  const escaped = path.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
  const tsContent = `/** Auto-generated from assets/brain.svg - do not edit */\nexport const BRAIN_SVG_PATH = \`${escaped}\`;\n`;
  fs.writeFileSync('./src/components/dashboard/brainPath.ts', tsContent);
  console.log('Path length:', path.length);
} else {
  console.log('No match');
}
