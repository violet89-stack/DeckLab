// SPDX-License-Identifier: MPL-2.0
const fs=require('node:fs'),path=require('node:path'),{spawn,spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const artifactDir=path.resolve(process.env.DECKLAB_TEST_ARTIFACTS||path.join(root,'test-results'));
fs.mkdirSync(artifactDir,{recursive:true});
function launchOptions(){return {headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})};}
function isInside(parent,file){const rel=path.relative(parent,file);return rel!==''&&!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel);}
function pythonCommand(){
 const candidates=process.env.PYTHON?[[process.env.PYTHON]]:process.platform==='win32'?[['py','-3'],['python'],['python3']]:[['python3'],['python']];
 for(const [command,...args] of candidates){const r=spawnSync(command,[...args,'-c','import sys;sys.exit(sys.version_info<(3,10))'],{stdio:'ignore'});if(r.status===0)return {command,args};}
 throw Error('Python 3.10 or newer is required. Set PYTHON to its executable if necessary.');
}
function spawnPython(args,options={}){const p=pythonCommand();return spawn(p.command,[...p.args,...args],{cwd:root,...options});}
module.exports={root,artifactDir,launchOptions,isInside,pythonCommand,spawnPython,get chromium(){return require('playwright').chromium;}};
