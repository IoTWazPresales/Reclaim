import subprocess,time,json,hashlib,os
from pathlib import Path
root=Path('C:/Reclaim');out=root/'.eif/audit/N-0070/R07';verify=Path('C:/Reclaim-R07-verify-20261015')
manifest=json.loads((out/'source-manifest.json').read_text())
def fingerprint():
 return all(hashlib.sha256((verify/p).read_bytes()).hexdigest()==h for p,h in manifest['files'].items())
files=[
'src/lib/training/__tests__/autoregulationOverlay.test.ts',
'src/lib/training/__tests__/sessionAdjustment.test.ts',
'src/lib/training/__tests__/trainingNotificationWorkPlan.test.ts',
'src/lib/training/runtime/__tests__/autoregulation.test.ts',
'src/lib/training/__tests__/scheduleGuidedTrainingNextSetFromDb.test.ts',
'src/lib/training/__tests__/scheduleGuidedTrainingAfterSetPersist.cursor.test.ts',
'src/lib/training/__tests__/guidedWearDelivery.simulation.test.ts',
'src/lib/notifications/__tests__/guidedTrainingNotificationActions.persistence.test.ts',
'src/lib/training/__tests__/performanceHistory.test.ts',
'src/lib/training/__tests__/performanceHistoryApi.test.ts',
'src/lib/training/__tests__/doubleProgression.test.ts']
commands=[('focused-isolated','npx vitest run '+' '.join(files)+' --reporter=verbose'),('typecheck-isolated','npm run typecheck'),('full-isolated','npm test -- --reporter=verbose')]
results=[]
for name,cmd in commands:
 before=fingerprint();start=time.monotonic();last=start;size=-1;stopped=None
 log=out/(name+'.txt')
 with log.open('wb') as f:
  env=dict(os.environ,EIF_RUN='R20261015R07')
  proc=subprocess.Popen(['cmd','/c',cmd],cwd=verify/'app',stdout=f,stderr=subprocess.STDOUT,env=env)
  while proc.poll() is None:
   now=time.monotonic();newsize=log.stat().st_size
   if newsize!=size:size=newsize;last=now
   if now-last>180 or now-start>600:
    stopped='no output for 180s' if now-last>180 else '600s bound'
    subprocess.run(['taskkill','/PID',str(proc.pid),'/T','/F'],stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
    proc.wait();break
   time.sleep(2)
 results.append({'name':name,'command':cmd,'cwd':str(verify/'app'),'pid':proc.pid,'exit':proc.returncode,'seconds':round(time.monotonic()-start,2),'stopped':stopped,'source_matches_before':before,'source_matches_after':fingerprint()})
 (out/'gate-results.json').write_text(json.dumps(results,indent=2)+'\n')
 print(json.dumps(results[-1]),flush=True)
