// SPDX-License-Identifier: MPL-2.0
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const input=(process.argv[2]||'').replace(/^https:\/\/github\.com\//,'').replace(/\/$/,'');
if(!/^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_.-]+$/.test(input)||input.endsWith('/..')){
 console.error('Usage: npm run configure:github -- OWNER/REPOSITORY');process.exit(1);
}
const file=path.join(root,'community-config.json'),config=JSON.parse(fs.readFileSync(file));
const url='https://github.com/'+input;
Object.assign(config,{repositoryUrl:url,issuesUrl:url+'/issues',projectHomepage:url,securityUrl:url+'/security/policy'});
fs.writeFileSync(file,JSON.stringify(config,null,2)+'\n');
console.log('Configured '+url+'. This does not create a repository or enable private vulnerability reporting.');
