// SPDX-License-Identifier: MPL-2.0
const {chromium,launchOptions,artifactDir,isInside}=require('./scripts/test-support.cjs');const fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{const browser=await chromium.launch(launchOptions());const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.stack));
const root=__dirname;
await page.route('http://decklab.test/**',async r=>{const p=decodeURIComponent(new URL(r.request().url()).pathname);const f=path.resolve(root,'.'+(p==='/'?'/index.html':p));if(!isInside(root,f)||!fs.existsSync(f)||fs.statSync(f).isDirectory())return r.fulfill({status:404,body:'Not found'});const mime={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.gif':'image/gif'}[path.extname(f)]||'application/octet-stream';await r.fulfill({body:fs.readFileSync(f),contentType:mime});});
await page.addInitScript(()=>{if(window===window.top)localStorage.setItem('decklab.onboarding.v10','complete')});
await page.goto('http://decklab.test/',{waitUntil:'load'});await page.evaluate(()=>{switchMode('profile');});


await page.waitForFunction(()=>document.getElementById('displayBuildMode'));
const checked=[];
const values=()=>page.evaluate(()=>profileState.placements.filter(p=>p.controller==='Encoder').map(p=>p.settings.value));
const actionIndex=uuid=>page.evaluate(uuid=>profileAvailableActions().findIndex(a=>a.UUID===uuid),uuid);
const setup=async device=>page.evaluate(async device=>{DeckLabUX11.selectStudioDevice(device);await buildProfileDemo();DeckLabUX11.goStudio('build')},device);
for(const [device,slots] of [['plus',4],['plusxl',6],['galleon',4],['studio',2]]){
 await setup(device);
 for(let n=0;n<slots;n++){
  const column=device==='galleon'?Math.floor(n/2):n,row=device==='galleon'?n%2:0;
  if(device==='galleon')await page.locator(`[data-lcd-region="segment-${n}"]`).click();
  const dial=page.locator('#profileDeck .profile-dial-control').nth(column);
  await dial.click();
  assert.deepEqual(await page.evaluate(()=>{const p=selectedProfileInstance();return [p.column,p.row]}),[column,row],device+' selected slot '+n);
  if(device!=='studio')assert.equal(await page.locator('#displayPart').inputValue(),'segment-'+n,device+' LCD editor selected wrong dial');
  const selector=device==='studio'?'#visualAction':'#displayAction';
  await page.locator(selector).selectOption(String(await actionIndex('com.decklab.demo.volume')));
  assert.equal(await page.evaluate(([c,r])=>profilePlacementAt('Encoder',c,r).actionUuid,[column,row]),'com.decklab.demo.volume');
  const before=await values(),angle=Number(await page.locator('#profileDeck .ds-dial').nth(column).getAttribute('data-dial-angle'));
  await dial.focus();await page.keyboard.press('ArrowUp');
  const after=await values();assert.equal(after[n],before[n]+1,device+' dial '+n+' did not update its value');assert.deepEqual(after.filter((_,i)=>i!==n),before.filter((_,i)=>i!==n),'other dial changed');
  assert.equal(Number(await page.locator('#profileDeck .ds-dial').nth(column).getAttribute('data-dial-angle')),angle+15,'visual rotation');
  await dial.dispatchEvent('wheel',{deltaY:100});assert.deepEqual(await values(),before,'wheel reversal');
  await dial.focus();await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(([c,r])=>profilePlacementAt('Encoder',c,r).settings.active,[column,row]),false,'press did not toggle');
  if(device!=='studio')await page.waitForFunction(n=>document.querySelector(`[data-lcd-region="segment-${n}"]`).textContent.includes('OFF'),n);
  // Replacing a built-in with a plugin encoder must retain a visible live layout.
  await page.evaluate(([c,r])=>selectProfilePlacement(profilePlacementAt('Encoder',c,r)),[column,row]);
  await page.locator('#visualAction').selectOption(String(await actionIndex('com.decklab.hostdemo.cpu')));
  assert(await page.evaluate(([c,r])=>{const p=profilePlacementAt('Encoder',c,r);return p.layout&&!p.customVisual&&!p.previewLayout},[column,row]),'stale visual hid replacement feedback');
  if(device!=='studio')await page.locator(`[data-lcd-region="segment-${n}"] .layout-item`).first().waitFor({state:'visible'});
  await dial.focus();await page.keyboard.press('ArrowUp');
  assert.equal(await page.evaluate(([c,r])=>profilePlacementAt('Encoder',c,r).layout.items.find(i=>i.key==='load').value,[column,row]),43);
  // A library drop on an occupied encoder replaces it instead of silently failing.
  await page.evaluate(async({column,row})=>{
   const actionIndex=profileAvailableActions().findIndex(a=>a.UUID==='com.decklab.demo.volume');
   const dt=new DataTransfer();dt.setData('application/x-decklab',JSON.stringify({source:'library',kind:'action',actionIndex}));
   const target=document.querySelectorAll('#profileDeck .profile-dial-slot')[column];
   target.dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:dt}));
  },{column,row});
  await page.waitForFunction(([c,r])=>profilePlacementAt('Encoder',c,r)?.actionUuid==='com.decklab.demo.volume',[column,row]);
  checked.push(device+' slot '+(n+1)+': select, replace, rotate, press, wheel, feedback, occupied drop');
 }
 const saved=await page.evaluate(()=>profileSerializableData());await page.evaluate(async data=>{await importDeckLabProfileData(data);renderProfileLab()},saved);
 assert.equal(await page.evaluate(()=>profileState.placements.filter(p=>p.controller==='Encoder'&&p.actionUuid==='com.decklab.demo.volume').length),slots,'assignments lost on reload');
 await page.evaluate(()=>DeckLabUX11.goStudio('preview'));
 for(let n=0;n<slots;n++){
  const column=device==='galleon'?Math.floor(n/2):n,row=device==='galleon'?n%2:0;
  if(device==='galleon')await page.locator(`[data-lcd-region="segment-${n}"]`).click();
  const dial=page.locator('#profileDeck .profile-dial-control').nth(column),before=await values();
  await dial.focus();await page.keyboard.press('ArrowUp');
  assert.deepEqual(await values(),before.map((v,i)=>v+(i===n?1:0)),device+' live dial '+n);
  await dial.dispatchEvent('wheel',{deltaY:100});assert.deepEqual(await values(),before);
  const b=await dial.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();
  assert((await page.locator('#profileDeck .ds-dial').nth(column).getAttribute('class')).includes('ds-dial-pressed'));
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2-24);await page.mouse.up();
  assert.deepEqual(await values(),before.map((v,i)=>v+(i===n?3:0)),device+' live drag '+n);
  if(device==='plus'||device==='plusxl'){
   const active=await page.evaluate(column=>profilePlacementAt('Encoder',column,0).settings.active,column);
   await page.locator('#profileDeck .lcd-touch-hit').nth(column).click();
   assert.equal(await page.evaluate(column=>profilePlacementAt('Encoder',column,0).settings.active,column),!active,'touch zone '+n);
  }
 }
}
// GALLEON: both rows are accessible in Live Preview; clicks select a dial set,
// never synthesize touchscreen input on this non-touch device.
await setup('galleon');
for(let n=0;n<4;n++){
 await page.locator(`[data-lcd-region="segment-${n}"]`).click();
 await page.locator('#displayAction').selectOption(String(await actionIndex('com.decklab.demo.volume')));
}
await page.evaluate(()=>{DeckLabUX11.goStudio('preview');DeckLabProtocolRuntime.engine.trace=[]});
for(const n of [0,1,2,3]){
 const col=Math.floor(n/2),row=n%2,region=page.locator(`[data-lcd-region="segment-${n}"]`);
 await region.click();
 assert.equal(await page.evaluate(col=>DeckLabDisplayControls.active(col),col),row);
 assert.equal(await region.getAttribute('aria-pressed'),'true');
 const before=await values(),dial=page.locator('#profileDeck .profile-dial-control').nth(col);
 await dial.focus();await page.keyboard.press('ArrowRight');
 assert.deepEqual(await values(),before.map((v,i)=>v+(i===n?1:0)),'GALLEON lower-row input routing');
}
assert.equal(await page.evaluate(()=>DeckLabProtocolRuntime.engine.trace.filter(t=>t.packet.event==='touchTap').length),0,'GALLEON generated touchTap');
// Keyboard selection of the lower-left region and physical long-hold switching.
await page.locator('[data-lcd-region="segment-0"]').focus();await page.keyboard.press('Enter');
await page.locator('[data-lcd-region="segment-1"]').focus();await page.keyboard.press('Space');
assert.equal(await page.evaluate(()=>DeckLabDisplayControls.active(0)),1);
await page.locator('#profileDeck .profile-dial-control').first().focus();await page.keyboard.down('Space');await page.waitForTimeout(3050);await page.keyboard.up('Space');
assert.equal(await page.evaluate(()=>DeckLabDisplayControls.active(0)),0);
assert.equal(await page.evaluate(()=>DeckLabDisplayControls.active(1)),1,'left hold switched right set');
const beforeDrag=await values(),dragDial=page.locator('#profileDeck .profile-dial-control').first();
const db=await dragDial.boundingBox();await page.mouse.move(db.x+db.width/2,db.y+db.height/2);await page.mouse.down();await page.mouse.move(db.x+db.width/2,db.y+db.height/2-24);await page.mouse.up();
assert.deepEqual(await values(),beforeDrag.map((v,i)=>v+(i===0?3:0)),'GALLEON pointer drag');
checked.push('GALLEON: every live region, keyboard selection, independent dial sets, long hold and pointer drag; no touchTap');
await page.mouse.move(0,0);await page.waitForTimeout(180);await page.locator('#profileDeck .ds-surface').screenshot({path:artifactDir+'/repaired-galleon-lcd.png'});
// Selecting an unrelated dial must not rewrite a full-screen composition.
await setup('plus');await page.locator('#displayArtworkEditor').evaluate(n=>n.open=true);
await page.locator('#displayBuildMode').selectOption('full');await page.locator('#displaySource').selectOption('0');
await page.locator('#profileDeck .profile-dial-control').nth(3).click();
assert.equal(await page.locator('#displayArtworkEditor').evaluate(n=>n.open),false,'unrelated LCD inspector should close');
await page.locator('#visualAction').selectOption(String(await actionIndex('com.decklab.demo.brightness')));
assert(await page.evaluate(()=>DeckLabDisplayArtwork.config().mode==='full'&&DeckLabDisplayControls.source('full')===0&&profilePlacementAt('Encoder',3,0).actionUuid==='com.decklab.demo.brightness'));
await page.locator('#displayArtworkEditor').evaluate(n=>n.open=true);await page.locator('#displayBuildMode').selectOption('segments');
await page.evaluate(()=>{profilePage().displayArtwork.plus.sources['segment-3']=0;renderProfileDeck()});
await page.locator('#profileDeck .profile-dial-control').nth(3).click();assert.equal(await page.locator('#displaySource').inputValue(),'3','legacy mapping overrode physical segment');
checked.push('Full-screen composition preserved while changing dial 4; legacy segment source cannot retarget it');
// The illuminated reference rectangles, not the glass, define the rendered/hit area.
// Compare against the original glass and assert the independently supplied 2:1 ratio.
for(const [device,colours] of [['plus',['black','white']],['plusxl',['black']]]){
 for(const colour of colours){
  await setup(device);await page.evaluate(({device,colour})=>DeckLabAppearance.select(device,colour),{device,colour});if(device==='plus')assert.equal(await page.evaluate(device=>DeckLabAppearance.selected(device)[0],device),colour);
  for(const zoom of [1,1.5]){
   await page.evaluate(zoom=>DeckLabGuidance112.setZoom(zoom),zoom);
   const dims=await page.evaluate(()=>{const s=document.querySelector('#profileDeck .ds-surface'),image=s.querySelector('.ds-official-artwork').getBoundingClientRect();return [...s.querySelectorAll('.lcd-build-region')].map(n=>{const r=n.getBoundingClientRect();return {x:(r.x-image.x)/image.width,y:(r.y-image.y)/image.height,w:r.width/image.width,h:r.height/image.height,ratio:r.width/r.height}})});
   assert.equal(dims.length,device==='plus'?4:6);
   for(const d of dims)assert(Math.abs(d.ratio-2)<.04,'200×100 segment stretched '+device+' '+colour);
   const size=device==='plus'?[1024,972]:[1472,1320],glass=device==='plus'?[68,412,888,188]:[100,688,1272,172];
   assert(dims[0].x>glass[0]/size[0]&&dims[0].y>glass[1]/size[1]);
   assert(dims.at(-1).x+dims.at(-1).w<(glass[0]+glass[2])/size[0]);
   assert(dims[0].y+dims[0].h<(glass[1]+glass[3])/size[1]);
   await page.locator('#displayArtworkEditor').evaluate(n=>n.open=true);
   await page.locator('#displayBuildMode').selectOption('full');
   const fullRatio=await page.locator('.lcd-build-region').evaluate(n=>{const r=n.getBoundingClientRect();return r.width/r.height});
   assert(Math.abs(fullRatio-(device==='plus'?8:12))<.05,'full strip canvas stretched');
   for(const mode of ['vertical','horizontal','segments'])await page.locator('#displayBuildMode').selectOption(mode);
  }
  await page.evaluate(()=>DeckLabGuidance112.setZoom(1));
  await page.mouse.move(0,0);await page.waitForTimeout(180);await page.locator('#profileDeck .ds-surface').screenshot({path:`${artifactDir}/repaired-${device}-${colour}.png`});
  checked.push(device+' '+colour+': inset active screen, segments, full/split modes, two zooms');
 }
}
assert.deepEqual(errors,[]);
fs.writeFileSync(path.join(artifactDir,'dial-display-test-results.json'),JSON.stringify({build:fs.readFileSync(path.join(root,'BUILD.txt'),'utf8').trim(),date:new Date().toISOString(),checked,pageErrors:errors,hardwareValidated:false},null,2));
await browser.close();console.log('PASS dial/display repair: '+checked.length+' scenarios across all four dial devices.');
})().catch(e=>{console.error(e);process.exit(1)});
