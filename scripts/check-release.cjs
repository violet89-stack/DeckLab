// SPDX-License-Identifier: MPL-2.0
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');let errors=[];
const read=f=>fs.readFileSync(path.join(root,f),'utf8'),json=f=>JSON.parse(read(f));
const check=(condition,message)=>{if(!condition)errors.push(message);};
try{
 const version=read('BUILD.txt').trim(),pkg=json('package.json'),config=json('community-config.json');
 check(version===pkg.version&&version===config.version&&version===json('package-lock.json').version,'Release versions disagree.');
 for(const file of ['index.html','decklab_host.py'])check(read(file).includes(version),file+' lacks current release version.');
 for(const file of ['README.md','SECURITY.md','PRIVACY.md','TESTING.md','COMMUNITY-ALPHA.md','LICENSE-NOTICE.md','THIRD-PARTY-NOTICES.md','.github/workflows/tests.yml'])check(fs.existsSync(path.join(root,file)),file+' missing.');
 check(read('community101.js').includes("const COMMUNITY_BUILD = '"+config.build+"'"),'Runtime build label disagrees with configuration.');
 const sources=fs.readdirSync(root).filter(f=>/\.(js|cjs)$/.test(f));
 for(const file of sources){
  const result=spawnSync(process.execPath,['--check',file],{cwd:root,encoding:'utf8'});
  check(result.status===0,'Syntax error: '+file+' '+result.stderr);
  if(file.startsWith('tests-'))check(!/CODEX_PRIMARY_RUNTIME|\/workspace\/|\/tmp\/chromium/.test(read(file)),'Environment-specific test path: '+file);
 }
 for(const file of fs.readdirSync(path.join(root,'scripts')).filter(f=>f.endsWith('.cjs'))){
  const result=spawnSync(process.execPath,['--check',path.join('scripts',file)],{cwd:root,encoding:'utf8'});check(result.status===0,'Script syntax error: '+file);
 }
 const html=read('index.html'),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 check(ids.length===new Set(ids).size,'Duplicate HTML IDs.');
 for(const m of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
  const target=m[1].split('?')[0];if(!/^(?:[a-z]+:|\/\/)/i.test(target))check(fs.existsSync(path.join(root,target)),'Missing page asset: '+target);
 }
 const manifest=json('assets/elgato/provenance.json');
 const actual=fs.readdirSync(path.join(root,'assets/elgato')).filter(f=>f.endsWith('.png')).sort();
 check(JSON.stringify(actual)===JSON.stringify(manifest.files.map(f=>f.name).sort()),'Product artwork inventory disagrees.');
 for(const f of manifest.files)check(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'assets/elgato',f.name))).digest('hex')===f.sha256,'Product artwork hash changed: '+f.name);
 const templates=json('assets/elgato-colour-templates/index.json');
 check(templates.license==='CC-BY-4.0'&&templates.creator==='Elgato and Will Johnson','Template attribution is incomplete.');
 for(const f of templates.entries)check(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f.path))).digest('hex')===f.sha256,'Template source hash changed: '+f.path);
 const icons=json('assets/elgato-icons/index.json');
 check(icons.license==='MIT'&&icons.entries.length===1241&&icons.licenseText.trim()===read('assets/elgato-icons/LICENSE').trim(),'Icon licence or inventory disagrees.');
 for(const e of icons.entries)check(crypto.createHash('sha256').update(e.svg).digest('hex')===e.sha256,'Icon source hash changed: '+e.id);
 const samples=json('assets/samples/index.json');
 for(const e of samples.entries){
  const bytes=fs.readFileSync(path.join(root,e.path));
  check(crypto.createHash('sha256').update(bytes).digest('hex')===e.sha256,'Sample artwork hash changed: '+e.id);
  if(e.mime==='image/gif')check(/^GIF8[79]a$/.test(bytes.subarray(0,6).toString())&&bytes.readUInt16LE(6)===e.width&&bytes.readUInt16LE(8)===e.height,'Sample GIF size or format changed: '+e.id);
 }
 check(pkg.license==='MPL-2.0'&&json('package-lock.json').packages[''].license==='MPL-2.0','Source licence metadata disagrees.');
 check(read('LICENSE').startsWith('Mozilla Public License Version 2.0'),'Official source licence text is missing.');
 if(process.argv.includes('--publish')){
  check(pkg.license!=='UNLICENSED'&&fs.existsSync(path.join(root,'LICENSE')),'Choose the source licence and add LICENSE before public release.');
  check(/^https:\/\/github\.com\/[^/]+\/[^/]+$/.test(config.repositoryUrl),'Configure the real GitHub repository.');
  check(manifest.licenseEvidence.status==='verified'&&Boolean(manifest.licenseEvidence.sourceUrl),'Verify the product artwork licence and record its source.');
 }
 if(errors.length)throw Error(errors.join('\n'));
 console.log('PASS release consistency, source syntax, browser assets, portable tests and product artwork inventory.');
 if(!process.argv.includes('--publish'))console.log('Use --publish for publication metadata; remote settings and CI are checked separately.');
}catch(e){console.error(e.message);process.exitCode=1;}
