"""Explicit public-wrapper phases for this R02 checkpoint, never runtime internals."""
from pathlib import Path
import datetime as dt
import json,os,subprocess,sys
ROOT=Path('C:/Reclaim')
OUT=Path(__file__).resolve().parent
RUN='R20261018R02CORRECTION'
NODE='N-0070'
SOURCE='b7644d14e593712e333ab330cb4105a83ba17d6a'
def public(name,*args):
    command=[sys.executable,'-B','scripts/eif_node.py',*args]
    result=subprocess.run(command,cwd=ROOT,env={**os.environ,'EIF_RUN':RUN},capture_output=True,text=True,encoding='utf-8')
    record=dict(utc=dt.datetime.now(dt.timezone.utc).isoformat(),run=RUN,command=command,exit_code=result.returncode,stdout=result.stdout,stderr=result.stderr)
    (OUT/(name+'.json')).write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
    if result.returncode: raise RuntimeError(result.stdout+result.stderr)
    return record

def status(name,node=NODE):
    raw=public(name,'status','--node',node)['stdout']
    return json.loads(raw[raw.index('\n{')+1:])

def own(node):
    assert node['lease']['run']==RUN,node.get('lease')
    assert dt.datetime.fromisoformat(node['lease']['expires_at'].replace('Z','+00:00'))>dt.datetime.now(dt.timezone.utc)
    assert node['status']=='in_progress' and node['acceptance_state']=='pending'

phase=sys.argv[1]
if phase=='lease':
    assert (OUT/'reviewer.md').is_file(), 'Fresh source review must be approved before this phase is invoked.'
    before=status('ownership-before')
    assert before['status']=='in_progress' and before['acceptance_state']=='pending'
    assert before['lease']['run']=='R20261016EVIDRECOVERYA',before['lease']
    assert dt.datetime.fromisoformat(before['lease']['expires_at'].replace('Z','+00:00'))<dt.datetime.now(dt.timezone.utc)
    public('ownership-release-expired','release',NODE)
    public('ownership-acquire','lease',NODE)
    after=status('ownership-acquired'); own(after)
    assert {k:v for k,v in before.items() if k not in ('revision','lease')}=={k:v for k,v in after.items() if k not in ('revision','lease')}
    print('Expired lease publicly released; fresh legitimate ownership verified. No acceptance/status changes.')
elif phase=='attach':
    before=status('attachment-precheck'); own(before)
    record=public('evidence-attachment','evidence',NODE,'--commit',SOURCE,'--path','.eif/audit/N-0070/R02/correction-20261018/result.md','--note','R02 corrected committed-source contract and fresh separate model review; exact original ten plus added panel test fingerprints; focused42, types, dual31, catalogue357/0, wrapper14 pass; full1385 pass/4 exact baseline failures; no criterion acceptance, visual approval, policy approval or node completion')
    after=status('attachment-replay'); assert before==after
    print(record['stdout'])
elif phase=='queue':
    own(status('queue-precheck'))
    public('human-check','human-check',NODE,'--steps',str(OUT/'visual-steps.md'))
    public('await-approval','await-approval',NODE,'--renders','.eif/audit/N-0070/R02/correction-20261018')
    after=status('ownership-released')
    assert after.get('lease') is None and after['status']=='in_progress' and after['acceptance_state']=='pending'
    print('Visual/manual checks queued as UNABLE_TO_VERIFY, no approval; fresh lease released.')
else: raise ValueError('Choose explicit lease, attach or queue phase')
