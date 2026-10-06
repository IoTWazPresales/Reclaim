/**
 * Before Metro starts, point a running Android emulator at 127.0.0.1:8081.
 *
 * The emulator NAT (10.0.2.2) drops bytes out of a large bundle. adb reverse
 * does not. React Native otherwise picks 10.0.2.2 on a stock emulator
 * (AndroidInfoHelpers). debug_http_host overrides that for this install.
 * No emulator, or adb missing: exit 0 so `npm start` still runs.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const adb = path.join(
  process.env.LOCALAPPDATA || '',
  'Android',
  'Sdk',
  'platform-tools',
  'adb.exe',
);
if (!fs.existsSync(adb)) process.exit(0);

function adbRun(args) {
  return execFileSync(adb, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

let devices = '';
try {
  devices = adbRun(['devices']);
} catch {
  process.exit(0);
}
const serial = devices.match(/emulator-\d+\s+device/)?.[0]?.split(/\s+/)[0];
if (!serial) process.exit(0);

try {
  adbRun(['-s', serial, 'reverse', 'tcp:8081', 'tcp:8081']);
} catch (error) {
  console.warn(`adb reverse failed: ${error.message}`);
}

const pkg = 'com.fissioncorporation.reclaim';
const prefsPath = 'shared_prefs/com.fissioncorporation.reclaim_preferences.xml';
let prefs = '';
try {
  prefs = adbRun(['-s', serial, 'shell', 'run-as', pkg, 'cat', prefsPath]);
} catch {
  prefs = '';
}
if (prefs.includes('>127.0.0.1:8081<')) process.exit(0);
if (prefs.includes('<map') && !prefs.includes('debug_http_host')) {
  console.warn(
    'Reclaim already has preferences without debug_http_host. Left that file alone.',
  );
  process.exit(0);
}

const xml = `<?xml version='1.0' encoding='utf-8' standalone='yes' ?>
<map>
    <string name="debug_http_host">127.0.0.1:8081</string>
</map>
`;
const tmp = path.join(os.tmpdir(), 'reclaim_debug_http_host.xml');
fs.writeFileSync(tmp, xml);
try {
  adbRun(['-s', serial, 'push', tmp, '/data/local/tmp/reclaim_prefs.xml']);
  adbRun(['-s', serial, 'shell', 'run-as', pkg, 'mkdir', '-p', 'shared_prefs']);
  adbRun([
    '-s',
    serial,
    'shell',
    `cat /data/local/tmp/reclaim_prefs.xml | run-as ${pkg} sh -c 'cat > ${prefsPath}'`,
  ]);
  console.log(
    'Set the emulator debug server to 127.0.0.1:8081. Reopen Reclaim if it is already on screen.',
  );
} catch (error) {
  console.warn(`Could not set debug_http_host: ${error.message}`);
}
