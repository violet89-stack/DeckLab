// SPDX-License-Identifier: MPL-2.0
const {chromium,launchOptions,artifactDir,isInside}=require('./scripts/test-support.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch(launchOptions());
 try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.stack));
  await page.route('http://decklab.test/**',async route=>{
   const pathname=decodeURIComponent(new URL(route.request().url()).pathname),file=path.resolve(__dirname,'.'+(pathname==='/'?'/index.html':pathname));
   if(!isInside(__dirname,file)||!fs.existsSync(file)||fs.statSync(file).isDirectory())return route.fulfill({status:404,body:'Not found'});
   const mime={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.gif':'image/gif','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream';
   await route.fulfill({body:fs.readFileSync(file),contentType:mime});
  });
  await page.addInitScript(()=>{if(window===window.top)localStorage.setItem('decklab.onboarding.v10','complete');});
  async function ready(){await page.waitForFunction(()=>document.getElementById('saveIconDesign')&&document.getElementById('openProfileBuilds'));await page.evaluate(()=>DeckLabUX11.goStudio('build'));}
  await page.goto('http://decklab.test/');await ready();
  const gif=fs.readFileSync(path.join(__dirname,'assets/samples/neo-dino-runner.gif')).toString('base64');
  await page.evaluate(async gif=>{
   resetProfileSession({target:'standard'});
   const index=profileAvailableActions().findIndex(a=>a.UUID==='com.decklab.visual');
   const p=await createProfileActionPlacement(index,'Keypad',0,0);selectProfilePlacement(p);
   const c=document.createElement('canvas');c.width=c.height=144;const ctx=c.getContext('2d');ctx.fillStyle='#8844cc';ctx.fillRect(0,0,144,144);
   DeckLabVisuals.commit(p,{background:{image:c.toDataURL(),fit:'cover',artworkCredit:{author:'Test background',license:'CC-BY-4.0'}},image:'data:image/gif;base64,'+gif,title:'Run',showTitle:true,fit:'contain'});
  },gif);
  await page.locator('#saveIconDesign').click();await page.locator('#iconDesignName').fill('Purple Dino');await page.locator('#iconDesignSave').click();await page.waitForFunction(()=>!document.getElementById('iconDesignDialog').open);
  await page.locator('#openArtworkLibrary').click();await page.locator('#artworkSearch').fill('Purple Dino');assert.equal(await page.locator('.artwork-use').count(),1);
  const pngDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Download Purple Dino as PNG',exact:true}).click();const png=await pngDownload;const pngPath=path.join(artifactDir,'saved-dino.png');await png.saveAs(pngPath);assert.equal(fs.readFileSync(pngPath).subarray(1,4).toString(),'PNG');
  await page.locator('#artworkClose').click();
  await page.evaluate(async()=>{const p=await createProfileActionPlacement(profileAvailableActions().findIndex(a=>a.UUID==='com.decklab.demo.counter'),'Keypad',1,0);p.settings={value:27};selectProfilePlacement(p);});
  await page.locator('#openArtworkLibrary').click();await page.locator('.artwork-use').click();await page.waitForFunction(()=>!document.getElementById('artworkDialog').open);
  let applied=await page.evaluate(()=>({visual:selectedProfilePlacement().customVisual,settings:selectedProfilePlacement().settings,uuid:selectedProfilePlacement().actionUuid}));
  assert(applied.visual.states[0].image.startsWith('data:image/gif;'));assert(applied.visual.states[0].background.image);assert.equal(applied.visual.states[0].title,'Run');assert.equal(applied.settings.value,27);assert.equal(applied.uuid,'com.decklab.demo.counter');
  await page.locator('#visualTitle').fill('Edited');assert.equal(await page.evaluate(()=>DeckLabVisuals.visual(selectedProfilePlacement()).title),'Edited',JSON.stringify(await page.evaluate(()=>({value:document.getElementById('visualTitle').value,state:selectedProfilePlacement().state,root:selectedProfilePlacement().customVisual.title,states:Object.fromEntries(Object.entries(selectedProfilePlacement().customVisual.states||{}).map(([k,v])=>[k,v.title]))}))));await page.locator('#visualShowTitle').uncheck();assert.equal(await page.evaluate(()=>DeckLabVisuals.visual(selectedProfilePlacement()).showTitle),false);
  // Creator designs keep both editable recipes and independent template backgrounds.
  await page.locator('#openAssetCreator').click();await page.locator('#creator-text').fill('State A');await page.locator('#creatorState').selectOption('1');await page.locator('#creator-text').fill('State B');await page.locator('#creatorSave').click();await page.locator('#iconDesignName').fill('Two states');await page.locator('#iconDesignSave').click();await page.waitForFunction(()=>!document.getElementById('iconDesignDialog').open);await page.locator('#creatorCancel').click();
  await page.locator('#openArtworkLibrary').click();await page.locator('#artworkSearch').fill('Two states');await page.locator('.artwork-use').click();await page.waitForFunction(()=>!document.getElementById('artworkDialog').open);await page.locator('#openAssetCreator').click();assert.equal(await page.locator('#creator-text').inputValue(),'State A');await page.locator('#creatorState').selectOption('1');assert.equal(await page.locator('#creator-text').inputValue(),'State B');await page.locator('#creatorCancel').click();
  // A portable artwork backup survives a new browser context, including editable recipes and GIF bytes.
  await page.locator('#openArtworkLibrary').click();const backupPromise=page.waitForEvent('download');await page.locator('#artworkExport').click();const backup=await backupPromise,backupPath=path.join(artifactDir,'saved-artwork.json');await backup.saveAs(backupPath);const library=JSON.parse(fs.readFileSync(backupPath));assert.equal(library.images.filter(i=>i.role==='design').length,2);await page.locator('#artworkClose').click();
  // Full profile: folder artwork, sequences, Galleon bottom-row LCD placement, full and split artwork.
  await page.evaluate(async()=>{
   DeckLabUX11.selectStudioDevice('galleon');document.getElementById('profileName').value='LCD and icons';
   const folder=createProfileFolder(2,0);folder.customVisual=structuredClone(profileState.placements[0].customVisual);
   const multi=createProfileMulti('multi-switch',0,1);multi.sequences.A.push({kind:'wait',id:'wait-1',duration:350});multi.sequences.B.push(createMultiActionStep(profileAvailableActions().findIndex(a=>a.SupportedInMultiActions===true),multi,'B'));
   const bottom=await createProfileActionPlacement(profileAvailableActions().findIndex(a=>a.UUID==='com.decklab.demo.volume'),'Encoder',1,1);bottom.settings={value:64};
   profilePage().displayArtwork={galleon:{layoutVersion:2,mode:'horizontal',feedback:false,full:{image:profileState.placements[0].customVisual.image},'horizontal-1':{opaque:true}}};
   profileState.globalSettings={secret:'must stay local'};
  });
  const expected=await page.evaluate(()=>profileSerializableData());
  await page.locator('#openProfileBuilds').click();await page.locator('#profileBuildName').fill('LCD and icons');await page.locator('#profileBuildSave').click();await page.waitForFunction(()=>document.getElementById('profileBuildStatus').textContent.includes('Saved “'));
  const builds=await page.evaluate(()=>DeckLabProfileBuilds.getAll());assert.equal(builds.length,1);assert(!Object.hasOwn(builds[0].profile,'globalSettings'));
  const profilePromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download LCD and icons',exact:true}).click();const profileDownload=await profilePromise,profilePath=path.join(artifactDir,'saved-profile.json');await profileDownload.saveAs(profilePath);const portable=JSON.parse(fs.readFileSync(profilePath));assert.deepEqual(portable,builds[0].profile);
  await page.screenshot({path:path.join(artifactDir,'saved-profile-builds.png')});
  await page.getByRole('button',{name:'Duplicate LCD and icons',exact:true}).click();await page.getByRole('button',{name:'Open LCD and icons copy',exact:true}).waitFor();
  page.once('dialog',dialog=>dialog.accept('Alternate build'));await page.getByRole('button',{name:'Rename LCD and icons copy',exact:true}).click();await page.getByRole('button',{name:'Open Alternate build',exact:true}).waitFor();
  await page.evaluate(()=>{profileState.placements[0].settings.savedBuildCheck='updated';});page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Update Alternate build',exact:true}).click();await page.waitForFunction(()=>document.getElementById('profileBuildStatus').textContent.includes('Updated'));
  const updated=await page.evaluate(async()=>{const rows=await DeckLabProfileBuilds.getAll();return {current:rows.find(row=>row.name==='Alternate build').profile.placements[0].settings.savedBuildCheck,previous:rows.find(row=>row.id==='recovery').profile.placements[0].settings.savedBuildCheck||null};});assert.deepEqual(updated,{current:'updated',previous:null});
  page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Delete Alternate build',exact:true}).click();await page.waitForFunction(()=>document.getElementById('profileBuildStatus').textContent.includes('Saved build deleted'));assert.equal((await page.evaluate(()=>DeckLabProfileBuilds.getAll())).filter(row=>row.name==='Alternate build').length,0);
  await page.locator('#profileBuildClose').click();
  await page.reload();await ready();await page.locator('#openProfileBuilds').click();await page.getByRole('button',{name:'Open LCD and icons',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Open LCD and icons',exact:true}).count(),1);await page.locator('#profileBuildClose').click();
  await page.evaluate(()=>{resetProfileSession({target:'neo'});document.getElementById('profileName').value='Unsaved work';});
  await page.locator('#openProfileBuilds').click();await page.getByRole('button',{name:'Open LCD and icons',exact:true}).click();await page.waitForFunction(()=>!document.getElementById('profileBuildsDialog').open);
  const restored=await page.evaluate(()=>profileSerializableData());assert.equal(restored.target,expected.target);assert.deepEqual(restored.pages,expected.pages);assert.equal(restored.placements.length,expected.placements.length);assert.deepEqual(restored.placements.map(p=>p.customVisual),expected.placements.map(p=>p.customVisual));assert.equal(restored.placements.find(p=>p.controller==='Encoder').row,1);assert.equal(restored.placements.find(p=>p.kind==='multi-switch').sequences.A[0].duration,350);
  const recovery=await page.evaluate(async()=>(await DeckLabProfileBuilds.getAll()).find(row=>row.id==='recovery'));assert.equal(recovery.profile.target,'neo');
  // Restored IDs with gaps must not collide with the next new folder or sequence.
  const counters=await page.evaluate(async()=>{const data=profileSerializableData(),folder=data.placements.find(p=>p.kind==='folder'),multi=data.placements.find(p=>p.kind==='multi-switch');folder.id='folder-9';multi.id='multi-switch-7';await importDeckLabProfileData(data);const nextFolder=createProfileFolder(1,2),nextMulti=createProfileMulti('multi',2,2);return {folder:nextFolder.id,multi:nextMulti.id};});assert.deepEqual(counters,{folder:'folder-10',multi:'multi-8'});
  // Invalid batch must not write a valid first entry or change the open deck.
  const rejected=await page.evaluate(async()=>{const before=await DeckLabProfileBuilds.getAll(),profile=profileSerializableData();let failed=false;try{await DeckLabProfileBuilds.importData({format:'DeckLabProfileBuilds',version:1,builds:[profile,{...profile,pages:[profile.pages[0],profile.pages[0]]}]});}catch(_){failed=true;}return {failed,unchanged:JSON.stringify(before)===JSON.stringify(await DeckLabProfileBuilds.getAll())};});assert.deepEqual(rejected,{failed:true,unchanged:true});
  // Open recovery toggles safely and preserves the profile we are leaving.
  await page.evaluate(async()=>DeckLabProfileBuilds.openBuild((await DeckLabProfileBuilds.getAll()).find(row=>row.id==='recovery')));assert.equal(await page.evaluate(()=>profileState.target),'neo');
  // A fresh context can import both backups without the original browser database.
  const fresh=await chromium.launch(launchOptions()),other=await fresh.newPage();await other.route('http://decklab.test/**',async route=>{const file=path.resolve(__dirname,'.'+(new URL(route.request().url()).pathname==='/'?'/index.html':new URL(route.request().url()).pathname));if(!isInside(__dirname,file)||!fs.existsSync(file)||fs.statSync(file).isDirectory())return route.fulfill({status:404});await route.fulfill({path:file});});await other.addInitScript(()=>{if(window===window.top)localStorage.setItem('decklab.onboarding.v10','complete');});await other.goto('http://decklab.test/');await other.waitForFunction(()=>document.getElementById('openProfileBuilds'));await other.evaluate(()=>DeckLabUX11.goStudio('build'));
  await other.locator('#buildAssets').click();await other.locator('#artworkBackup').setInputFiles(backupPath);await other.waitForFunction(()=>document.getElementById('artworkStatus').textContent.includes('Artwork imported'));assert.equal(await other.locator('.artwork-use').count(),2);await other.locator('#artworkClose').click();await other.locator('#openProfileBuilds').click();await other.waitForFunction(()=>document.getElementById('profileBuildsDialog').getAttribute('aria-busy')!=='true');await other.locator('#profileBuildFile').setInputFiles(profilePath);await other.waitForFunction(()=>document.getElementById('profileBuildStatus').textContent.includes('Imported 1'));await other.getByRole('button',{name:'Open LCD and icons',exact:true}).click();await other.waitForFunction(()=>!document.getElementById('profileBuildsDialog').open);assert.deepEqual(await other.evaluate(()=>profileSerializableData().pages),expected.pages);
  assert.deepEqual(errors,[]);await fresh.close();
  console.log('PASS saved designs/builds: layered GIF reuse, PNG download, editable A/B recipes, profile persistence, portable fresh-browser imports, recovery and atomic invalid-batch rejection.');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
