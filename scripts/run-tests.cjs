// SPDX-License-Identifier: MPL-2.0
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const {root,artifactDir,pythonCommand}=require('./test-support.cjs');
(async()=>{
 const mode=process.argv[2]||'--all';if(!['--all','--core','--browser','--security'].includes(mode))throw Error('Use --core, --browser or --security.');
 const files=fs.readdirSync(root).filter(n=>/^tests-.*\.(cjs|js|py)$/.test(n)).sort();
 const selected=files.filter(n=>{
  const browser=/chromium/.test(fs.readFileSync(path.join(root,n),'utf8'));
  if(mode==='--security')return n==='tests-companion-security.py'||n==='tests-companion-smoke.cjs';
  return mode==='--all'||(mode==='--browser'?browser:!browser);
 });
 const results=[];
 for(const name of selected){
  const py=name.endsWith('.py')?pythonCommand():null,command=py?.command||process.execPath,args=[...(py?.args||[]),name];
  const result=await new Promise(resolve=>{
   const p=spawn(command,args,{cwd:root,env:process.env,stdio:['ignore','pipe','pipe']});let output='',timedOut=false;
   const timer=setTimeout(()=>{timedOut=true;p.kill();},180000);
   p.stdout.on('data',x=>output+=x);p.stderr.on('data',x=>output+=x);
   p.on('error',e=>output+=e.stack);
   p.on('close',code=>{clearTimeout(timer);resolve({test:name,exitCode:timedOut?124:code??1,output});});
  });
  fs.writeFileSync(path.join(artifactDir,name+'.log'),result.output);
  console.log((result.exitCode===0?'PASS ':'FAIL ')+name);
  if(result.exitCode!==0)console.error(result.output.slice(-6000));
  results.push({test:name,exitCode:result.exitCode});
 }
 const report={build:fs.readFileSync(path.join(root,'BUILD.txt'),'utf8').trim(),date:new Date().toISOString(),platform:process.platform,node:process.version,results,passed:results.filter(r=>r.exitCode===0).length,total:results.length,hardwareValidated:false};
 fs.writeFileSync(path.join(artifactDir,'release-test-results.json'),JSON.stringify(report,null,2)+'\n');
 console.log(`${report.passed}/${report.total} suites passed. Logs: ${path.relative(root,artifactDir)}`);
 if(!report.total||report.passed!==report.total)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
