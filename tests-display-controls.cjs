// SPDX-License-Identifier: MPL-2.0
const {chromium,launchOptions,artifactDir,isInside}=require('./scripts/test-support.cjs');const fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{const browser=await chromium.launch(launchOptions());const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.stack));
const root=__dirname;
await page.route('http://decklab.test/**',async r=>{const p=decodeURIComponent(new URL(r.request().url()).pathname);const f=path.resolve(root,'.'+(p==='/'?'/index.html':p));if(!isInside(root,f)||!fs.existsSync(f)||fs.statSync(f).isDirectory())return r.fulfill({status:404,body:'Not found'});const mime={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.gif':'image/gif'}[path.extname(f)]||'application/octet-stream';await r.fulfill({body:fs.readFileSync(f),contentType:mime});});
await page.addInitScript(()=>{if(window===window.top)localStorage.setItem('decklab.onboarding.v10','complete')});
await page.goto('http://decklab.test/',{waitUntil:'load'});await page.evaluate(()=>{switchMode('profile');});


await page.waitForFunction(()=>document.getElementById('displayBuildMode'));
for(const [device,count] of [['plus',4],['plusxl',6]]){
 await page.evaluate(key=>{DeckLabUX11.selectStudioDevice(key);resetProfileSession({target:key});document.getElementById('displayArtworkEditor').open=true;},device);
 assert.equal(await page.locator('.lcd-build-region').count(),count);
 await page.locator('.lcd-build-region').last().click();
 assert.equal(await page.locator('#displayPart').inputValue(),'segment-'+(count-1));
 const index=await page.evaluate(()=>profileAvailableActions().findIndex(a=>a.UUID==='com.decklab.demo.volume'));
 await page.locator('#displayAction').selectOption(String(index));
 const dial=device==='galleon'?1:count-1;
 assert.equal(await page.evaluate(i=>profilePlacementAt('Encoder',i,0).actionUuid,dial),'com.decklab.demo.volume');
 await page.evaluate(i=>profileEmitInput(profilePlacementAt('Encoder',i,0),'dialRotate',{ticks:2}),dial);
 await page.waitForFunction(()=>[...document.querySelectorAll('.lcd-build-region')].some(n=>n.textContent.includes('70%')));
 await page.locator('#displayBuildMode').selectOption('full');assert.equal(await page.locator('.lcd-build-region').count(),1);
 await page.locator('#displaySource').selectOption(String(dial));
 await page.waitForFunction(()=>document.querySelector('.lcd-build-region').textContent.includes('70%'));
 await page.evaluate(()=>DeckLabUX11.goStudio('preview'));
 assert.equal(await page.locator('.lcd-build-region').evaluate(n=>getComputedStyle(n).pointerEvents),'none');
 await page.locator('#profileDeck .profile-dial-control').nth(dial).focus();await page.keyboard.press('ArrowUp');
 await page.waitForFunction(()=>document.querySelector('.lcd-build-region').textContent.includes('71%'));
 if(device!=='galleon'){
  const touch=page.locator('.lcd-native-hit').nth(dial);await touch.click();
  assert.equal(await page.evaluate(i=>profilePlacementAt('Encoder',i,0).settings.active,dial),false);
 }
 const data=await page.evaluate(()=>profileSerializableData());await page.evaluate(async data=>{await importDeckLabProfileData(data);renderProfileLab()},data);
 assert.equal(await page.locator('.lcd-build-region').count(),1);
 assert.equal(await page.locator('.lcd-build-region').getAttribute('data-source-dial'),String(dial));
 await page.evaluate(()=>DeckLabUX11.goStudio('build'));
 await page.locator('#displayBuildMode').selectOption('segments');assert.equal(await page.locator('.lcd-build-region').count(),count);
 if(device==='galleon'){
  await page.evaluate(()=>{const dt=new DataTransfer();dt.setData('application/x-decklab',JSON.stringify({source:'library',kind:'action',actionIndex:profileAvailableActions().findIndex(a=>a.UUID==='com.decklab.demo.brightness')}));document.querySelector('[data-lcd-region="segment-1"]').dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:dt}));});
  await page.waitForFunction(()=>profilePlacementAt('Encoder',0,0)?.actionUuid==='com.decklab.demo.brightness');
  await page.locator('[data-lcd-region="segment-1"]').click();
  assert.equal(await page.locator('#displaySource').inputValue(),'0');
  await page.locator('#displaySource').selectOption('1');
  assert.equal(await page.locator('[data-lcd-region="segment-1"]').getAttribute('data-source-dial'),'1');
  await page.evaluate(()=>profileUndo());
  assert.equal(await page.locator('[data-lcd-region="segment-1"]').getAttribute('data-source-dial'),'0');
 }
 if(device==='galleon')await page.screenshot({path:artifactDir+'/lcd-build-regions.png'});
}
assert.deepEqual(errors,[]);await browser.close();console.log('PASS LCD build: segment selection, action assignment, full display source, dial feedback, original touch routing, persistence, 4/6 touch-strip regions.');
})().catch(e=>{console.error(e);process.exit(1)});
