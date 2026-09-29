// SPDX-License-Identifier: MPL-2.0
const path=require('node:path'),{spawnSync}=require('node:child_process');
const {root,pythonCommand}=require('./test-support.cjs');
let result=spawnSync(process.execPath,['scripts/check-release.cjs'],{cwd:root,stdio:'inherit'});
if(result.status!==0)process.exit(result.status||1);
const py=pythonCommand();
result=spawnSync(py.command,[...py.args,path.join('scripts','package_release.py')],{cwd:root,stdio:'inherit'});
process.exitCode=result.status||0;
