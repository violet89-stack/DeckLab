// SPDX-License-Identifier: MPL-2.0
const fs=require('fs'),assert=require('assert');
const {unzip,convert,pageUUID}=require('./native-profile.js');
(async()=>{
 const bytes=fs.readFileSync(__dirname+'/examples/builtin-actions.streamDeckProfile'),entries=await unzip(bytes),data=convert(entries);
 assert.equal(data.target,'standard');assert.equal(data.pages.length,3);assert.equal(data.placements.length,8);
 const folder=data.placements.find(p=>p.kind==='folder');assert(data.pages.some(p=>p.id===folder.childPageId&&p.parentPageId===folder.pageId));
 assert(data.placements.some(p=>p.actionUuid==='com.example.not-installed'&&p.settings.value===42));
 assert.equal(pageUUID('WIKRPB7W1T6CR20HJBRDODGG60Z'),'fca9bcac-ff0f-4ccd-8811-9af6dc361030');
 const broken=Buffer.from(bytes);broken[100]^=1;await assert.rejects(()=>unzip(broken));
 await assert.rejects(()=>unzip(bytes.subarray(0,100)));
 console.log('PASS native profile: complete ZIP, folder links, settings, unknown actions, encoded IDs, corruption and truncation rejection.');
})().catch(e=>{console.error(e);process.exitCode=1});
