"""Explicit one-time public EIF operations for the R04 checkpoint only."""
from pathlib import Path
import datetime as dt
import json
import os
import subprocess
import sys

ROOT = Path('C:/Reclaim')
OUT = Path(__file__).resolve().parent
RUN = 'R20261018R04PROVENANCE'

def public(name, *args):
    command = [sys.executable, '-B', 'scripts/eif_node.py', *args]
    result = subprocess.run(command, cwd=ROOT, env={**os.environ, 'EIF_RUN': RUN},
                            capture_output=True, text=True, encoding='utf-8')
    record = dict(utc=dt.datetime.now(dt.timezone.utc).isoformat(), run=RUN,
                  command=command, exit_code=result.returncode, stdout=result.stdout, stderr=result.stderr)
    (OUT / (name + '.json')).write_text(json.dumps(record, indent=2) + '\n', encoding='utf-8')
    if result.returncode:
        raise RuntimeError(f'STOP {name}: {result.stderr or result.stdout}')
    return record

def status(name):
    record = public(name, 'status', '--node', 'N-0069')
    return json.loads('{' + record['stdout'].split('\n{', 1)[1])

if __name__ == '__main__':
    if sys.argv[1] == 'lease':
        node = status('ownership-before')
        assert node['revision'] == 4 and node['acceptance_state'] == 'pending'
        old = node['lease']
        assert old['run'] == 'R20261016EVIDRECOVERYA'
        assert dt.datetime.fromisoformat(old['expires_at'].replace('Z', '+00:00')) < dt.datetime.now(dt.timezone.utc)
        # Current operator explicitly authorizes legitimate recovery of this expired lease.
        # Use our fresh identity, never impersonate the old owner.
        public('ownership-release', 'release', 'N-0069')
        assert status('ownership-released')['lease'] is None
        public('ownership-acquire', 'lease', 'N-0069')
        after = status('ownership-acquired')
        assert after['lease']['run'] == RUN and after['revision'] == 6
        for key in node:
            if key not in ('lease', 'revision'):
                assert node[key] == after[key], key
        print('Public release/acquire succeeded under fresh identity; revision 6; nonownership fields unchanged.')
    elif sys.argv[1] == 'attach':
        node = status('attachment-precheck')
        assert node['lease']['run'] == RUN
        assert dt.datetime.fromisoformat(node['lease']['expires_at'].replace('Z', '+00:00')) > dt.datetime.now(dt.timezone.utc)
        receipt = public('evidence-attachment', 'evidence', 'N-0069', '--commit',
            'b40fa80f32a2b035f830d3e563055b93c083137a', '--path',
            '.eif/audit/N-0069/R04/provenance-20261018/result.md', '--note',
            'R04 supplemental provenance: 13 exact committed blobs, fresh separate source review and independent focused rerun; historical fingerprint reproduced as CRLF plus trailing blank line; no criterion acceptance or node completion')
        print(receipt['stdout'])
        after = status('attachment-replay')
        assert after == node, 'Evidence registration unexpectedly changed node fields'
    else:
        raise RuntimeError('Choose explicit lease or attach phase')
