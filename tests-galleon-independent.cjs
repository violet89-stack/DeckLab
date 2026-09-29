// SPDX-License-Identifier: MPL-2.0
const {chromium,launchOptions,artifactDir,isInside}=require('./scripts/test-support.cjs');const fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{const browser=await chromium.launch(launchOptions());const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.stack));
const root=__dirname;
await page.route('http://decklab.test/**',async r=>{const p=decodeURIComponent(new URL(r.request().url()).pathname);const f=path.resolve(root,'.'+(p==='/'?'/index.html':p));if(!isInside(root,f)||!fs.existsSync(f)||fs.statSync(f).isDirectory())return r.fulfill({status:404,body:'Not found'});const mime={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.gif':'image/gif'}[path.extname(f)]||'application/octet-stream';await r.fulfill({body:fs.readFileSync(f),contentType:mime});});
await page.addInitScript(()=>{if(window===window.top)localStorage.setItem('decklab.onboarding.v10','complete')});
await page.goto('http://decklab.test/',{waitUntil:'load'});await page.evaluate(()=>{switchMode('profile');});


await page.waitForFunction(()=>document.getElementById('displayContent'));
await page.evaluate(()=>{DeckLabUX11.selectStudioDevice('galleon');resetProfileSession({target:'galleon'});document.getElementById('displayArtworkEditor').open=true;});
await page.evaluate(()=>{profilePage().displayArtwork={galleon:{mode:'full',sources:{full:1}}};renderProfileDeck();if(DeckLabDisplayControls.source('full')!==2)throw Error('old right dial migration');renderProfileDeck();if(DeckLabDisplayControls.source('full')!==2)throw Error('migration repeated');});
for(let i=0;i<4;i++){
 await page.locator('#displayPart').selectOption('segment-'+i);
 const idx=await page.evaluate(i=>profileAvailableActions().findIndex(a=>a.UUID==='com.decklab.demo.'+['volume','brightness','cpu','memory'][i]),i);
 await page.locator('#displayAction').selectOption(String(idx));
}
const initial=await page.evaluate(()=>Array.from({length:4},(_,n)=>{const p=DeckLabDisplayControls.instance(n);return {context:p.context,col:p.column,row:p.row,value:p.settings.value}}));
assert.equal(new Set(initial.map(p=>p.context)).size,4);assert.deepEqual(initial.map(p=>[p.col,p.row]),[[0,0],[0,1],[1,0],[1,1]]);
// Editing a region now activates its dial set; explicitly start this hold test at the top.
await page.evaluate(()=>{DeckLabDisplayControls.setActive(0,0);DeckLabDisplayControls.setActive(1,0);DeckLabUX11.goStudio('preview')});
await page.locator('#profileDeck .profile-dial-control').first().focus();await page.keyboard.press('ArrowUp');
assert.deepEqual(await page.evaluate(()=>Array.from({length:4},(_,i)=>DeckLabDisplayControls.instance(i).settings.value)),initial.map((p,i)=>p.value+(i===0?1:0)));
await page.keyboard.down('Space');await page.waitForTimeout(3100);await page.keyboard.up('Space');
assert.equal(await page.evaluate(()=>DeckLabDisplayControls.active(0)),1);
await page.locator('#profileDeck .profile-dial-control').first().focus();await page.keyboard.press('ArrowUp');
assert.equal(await page.evaluate(()=>DeckLabDisplayControls.instance(1).settings.value),initial[1].value+1);
assert.equal(await page.evaluate(()=>DeckLabDisplayControls.instance(2).settings.value),initial[2].value);
await page.evaluate(()=>DeckLabUX11.goStudio('build'));
for(const [mode,count] of [['full',1],['vertical',2],['horizontal',2],['segments',4]]){
 await page.locator('#displayBuildMode').selectOption(mode);assert.equal(await page.locator('.lcd-build-region').count(),count);
 const parts=await page.locator('.lcd-build-region').evaluateAll(ns=>ns.map(n=>n.dataset.lcdRegion));
 for(let i=0;i<parts.length;i++){
  await page.locator('#displayPart').selectOption(parts[i]);await page.locator('#displayContent').selectOption('widget');
  await page.locator('#displayWidget').selectOption('com.decklab.demo.cpu');await page.locator('#displayWidgetValue').fill(String(11+i*13));await page.locator('#displayWidgetValue').dispatchEvent('change');
 }
 await page.waitForFunction(()=>document.querySelector('.lcd-build-region').textContent.includes('11%'));
 if(count>1)assert((await page.locator('.lcd-build-region').nth(1).innerText()).includes('24%'));
 if(mode==='horizontal'){
  const boxes=await page.locator('.lcd-build-region').evaluateAll(ns=>ns.map(n=>({x:n.offsetLeft,y:n.offsetTop,w:n.offsetWidth,h:n.offsetHeight})));
  assert.equal(boxes[0].x,boxes[1].x);assert(boxes[1].y>boxes[0].y);
 }
}
await page.locator('#displayWidgetValue').fill('87');await page.locator('#displayWidgetValue').dispatchEvent('change');
await page.evaluate(()=>profileUndo());assert.equal(await page.locator('#displayWidgetValue').inputValue(),'50');
// Updating an action must not replace independent widget content.
await page.evaluate(()=>profileEmitInput(DeckLabDisplayControls.instance(0),'dialRotate',{ticks:3}));
await page.waitForFunction(()=>document.querySelector('.lcd-build-region').textContent.includes('11%'));
await page.locator('#displayBuildMode').selectOption('vertical');await page.locator('#displayPart').selectOption('vertical-1');await page.locator('#displayContent').selectOption('artwork');
const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=10;c.getContext('2d').fillRect(0,0,10,10);return c.toDataURL()});
await page.locator('#displayImageInput').setInputFiles({name:'right.png',mimeType:'image/png',buffer:Buffer.from(png.split(',')[1],'base64')});
await page.waitForFunction(()=>!!DeckLabDisplayArtwork.config()['vertical-1'].image);
assert.equal(await page.locator('[data-lcd-region="vertical-1"] .lcd-demo').count(),0);
const data=await page.evaluate(()=>profileSerializableData());await page.evaluate(async d=>{await importDeckLabProfileData(d);renderProfileLab()},data);
assert.equal(await page.locator('.lcd-build-region').count(),2);assert.equal(await page.evaluate(()=>profileState.placements.filter(p=>p.controller==='Encoder').length),4);
await page.locator('#displayBuildMode').selectOption('horizontal');await page.screenshot({path:artifactDir+'/galleon-independent.png'});
for(const target of ['plus','plusxl']){await page.evaluate(t=>DeckLabUX11.selectStudioDevice(t),target);for(const [mode,count] of [['full',1],['vertical',2],['horizontal',2],['segments',target==='plus'?4:6]]){await page.locator('#displayBuildMode').selectOption(mode);assert.equal(await page.locator('.lcd-build-region').count(),count);}}
assert.deepEqual(errors,[]);await browser.close();console.log('PASS independent GALLEON actions, dial-set long hold, all four composition modes, independent widgets/artwork, feedback isolation and persistence.');
})().catch(e=>{console.error(e);process.exit(1)});
