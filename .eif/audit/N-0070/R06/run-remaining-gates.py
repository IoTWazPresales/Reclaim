from pathlib import Path
import hashlib, json, re, subprocess, time
root=Path('C:/Reclaim'); audit=root/'.eif/audit/N-0070/R06'; workspace=Path('C:/Reclaim-R06-verify-20261015')
manifest=json.loads((audit/'source-manifest.json').read_text())
log=(audit/'full-isolated-final.txt').read_text(encoding='utf-8')
completed=sorted(set(re.findall(r'^\s*[\u2713\u00d7] (src/\S+\.(?:test|spec)\.tsx?) >',log,re.M)))
all_files=sorted(p.relative_to(workspace/'app').as_posix() for p in (workspace/'app/src').rglob('*') if p.is_file() and re.search(r'\.(test|spec)\.tsx?$',p.name))
remaining=sorted(set(all_files)-set(completed))
packet={'canonical_run':'incomplete; worker stalled','completed_output_files':completed,'all_files':all_files,'remaining_files':remaining,'batches':[]}
print('Completed output:',len(completed),'remaining:',len(remaining),'all:',len(all_files),flush=True)
for index in range(0,len(remaining),35):
    files=remaining[index:index+35]; number=index//35+1
    expected={row['path']:row['sha256'] for row in manifest}
    before={path:hashlib.sha256((workspace/path).read_bytes()).hexdigest() for path in expected}
    assert before==expected
    start=time.monotonic()
    command=['cmd','/c','npx','vitest','run',*files,'--reporter=verbose']
    with (audit/f'remaining-{number}.txt').open('wb') as output:
        process=subprocess.run(command,cwd=workspace/'app',stdout=output,stderr=subprocess.STDOUT)
    after={path:hashlib.sha256((workspace/path).read_bytes()).hexdigest() for path in expected}
    packet['batches'].append({'number':number,'files':files,'exit_code':process.returncode,'duration_seconds':round(time.monotonic()-start,2),'source_stable_and_matches_manifest':after==before==expected})
    (audit/'remaining-gates.json').write_text(json.dumps(packet,indent=2)+'\n')
    print('Batch',number,'exit',process.returncode,'stable',after==before==expected,flush=True)
