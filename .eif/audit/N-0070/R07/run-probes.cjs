const fs=require('fs'),cp=require('child_process'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'../../../..');process.chdir(root);
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'source-manifest.json')));
for(const [p,h] of Object.entries(manifest.files)){if(crypto.createHash('sha256').update(cp.execFileSync('git',['show',':'+p])).digest('hex')!==h)throw Error('staged hash mismatch: '+p);}
const esbuild=require(path.join(root,'app/node_modules/esbuild'));
(async()=>{const artifact=path.join(__dirname,'verify-probes.cjs');await esbuild.build({entryPoints:[path.join(__dirname,'verify-probes.ts')],outfile:artifact,bundle:true,platform:'node',format:'cjs',tsconfig:'app/tsconfig.json',logLevel:'silent',plugins:[{name:'staged-source',setup(b){b.onLoad({filter:/[\\/]app[\\/]src[\\/].*\.(ts|tsx|json)$/},args=>{const p=path.relative(root,args.path).split(path.sep).join('/');return{contents:cp.execFileSync('git',['show',':'+p],{encoding:'utf8',maxBuffer:4194304}),loader:path.extname(p).slice(1)};});}}]});
const run=cp.spawnSync(process.execPath,[artifact],{encoding:'utf8'});fs.writeFileSync(path.join(__dirname,'independent-probes.json'),run.stdout);console.log(run.stdout);if(run.status)process.exitCode=run.status;})();
