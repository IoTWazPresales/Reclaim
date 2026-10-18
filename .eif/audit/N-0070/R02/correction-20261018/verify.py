from pathlib import Path
import subprocess,json,time
out=Path('C:/Reclaim/.eif/audit/N-0070/R02/correction-20261018')
cwd='C:/Reclaim-R02-correction-20261018/app'
checks=[('focused-final',['cmd','/c','npx vitest run src/lib/training/preview/__tests__ src/lib/training/__tests__/experienceLevelLoads.test.ts src/lib/training/__tests__/trainingMode.test.ts --reporter=verbose']),('typecheck-final',['cmd','/c','npm run typecheck']),('full-vitest',['cmd','/c','npm test -- --reporter=verbose'])]
results=[]
for name,cmd in checks:
    started=time.time()
    with (out/(name+'.txt')).open('wb') as f: r=subprocess.run(cmd,cwd=cwd,stdout=f,stderr=subprocess.STDOUT)
    results.append(dict(check=name,command=cmd,exit_code=r.returncode,seconds=round(time.time()-started,2)))
    (out/'checks.json').write_text(json.dumps(results,indent=2)+'\n')
    print(name,r.returncode,flush=True)
    if name!='full-vitest' and r.returncode: break
