"""List direct native-related imports/bridges; source inventory, not execution proof."""
import argparse
import json
from pathlib import Path
import re

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1] / 'app'
packages, bridges = {}, {}
for file in [root / 'App.tsx', *sorted((root / 'src').rglob('*.ts')), *sorted((root / 'src').rglob('*.tsx'))]:
    if '__tests__' in file.parts or '.test.' in file.name or '.spec.' in file.name:
        continue
    source = file.read_text(encoding='utf-8-sig')
    relative = file.relative_to(root.parent).as_posix()
    for specifier in re.findall(r'''(?:from\s*|(?:require|import)\s*\(\s*|import\s*)['"]([^'"]+)['"]''', source):
        if specifier.startswith(('.', '@/')):
            continue
        package = '/'.join(specifier.split('/')[:2]) if specifier.startswith('@') else specifier.split('/')[0]
        if package.startswith(('expo', 'react-native', '@sentry', '@shopify', '@react-native', '@expo')):
            packages.setdefault(package, set()).add(relative)
    for bridge in re.findall(r'NativeModules\.(\w+)', source):
        bridges.setdefault(bridge, set()).add(relative)
result = {'scope': 'Direct source scan, excluding tests; includes mobile routes outside Lite. Not a transitive bundle or runtime inventory.',
          'packages': {name: sorted(paths) for name, paths in sorted(packages.items())},
          'bridges': {name: sorted(paths) for name, paths in sorted(bridges.items())}}
output = json.dumps(result, indent=2) + '\n'
if args.output:
    args.output.write_text(output, encoding='utf-8')
else:
    print(output, end='')
