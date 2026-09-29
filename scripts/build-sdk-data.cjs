// SPDX-License-Identifier: MPL-2.0
const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..'),contract=JSON.parse(fs.readFileSync(path.join(root,'sdk-contract.json'))),ids=contract.apis.flatMap(a=>a.fixtures);
if(new Set(ids).size!==ids.length)throw Error('Duplicate fixture id');
const fixtures=ids.map(id=>JSON.parse(fs.readFileSync(path.join(root,'fixtures/protocol',id+'.json'))));
fs.writeFileSync(path.join(root,'fixtures/protocol/index.json'),JSON.stringify(fixtures,null,2)+'\n');
fs.writeFileSync(path.join(root,'sdk-data.generated.js'),'// SPDX-License-Identifier: MPL-2.0\n// Generated; edit sdk-contract.json and individual fixtures, then run scripts/build-sdk-data.cjs.\nwindow.DECKLAB_SDK_CONTRACT='+JSON.stringify(contract)+';\nwindow.DECKLAB_SDK_FIXTURES='+JSON.stringify(fixtures)+';\n');
console.log('Built browser data from canonical contract and '+fixtures.length+' fixtures.');
