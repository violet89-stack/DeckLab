// SPDX-License-Identifier: MPL-2.0
const {chromium,launchOptions,artifactDir,isInside}=require('./scripts/test-support.cjs');const fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{const browser=await chromium.launch(launchOptions());const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.stack));
const root=__dirname;
await page.route('http://decklab.test/**',async r=>{const p=decodeURIComponent(new URL(r.request().url()).pathname);const f=path.resolve(root,'.'+(p==='/'?'/index.html':p));if(!isInside(root,f)||!fs.existsSync(f)||fs.statSync(f).isDirectory())return r.fulfill({status:404,body:'Not found'});const mime={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.gif':'image/gif'}[path.extname(f)]||'application/octet-stream';await r.fulfill({body:fs.readFileSync(f),contentType:mime});});
await page.addInitScript(()=>{if(window===window.top)localStorage.setItem('decklab.onboarding.v10','complete')});
await page.goto('http://decklab.test/',{waitUntil:'load'});await page.evaluate(()=>{switchMode('profile');});


await page.waitForFunction(()=>window.DeckLabDemos);
await page.evaluate(async()=>{DeckLabUX11.selectStudioDevice('plus');await loadSamplePlugin();resetProfileSession({target:'plus'});await buildProfileDemo();DeckLabUX11.goStudio('preview');});
await page.waitForSelector('#profileDeck .profile-dial-control');
for(const device of ['plus','plusxl','galleon','studio']){
 await page.evaluate(key=>DeckLabUX11.selectStudioDevice(key),device);
 const before=await page.evaluate(()=>profilePlacementAt('Encoder',0,0).layout.items.find(x=>x.key==='load').value);
 const dial=page.locator('#profileDeck .profile-dial-control').first();await dial.focus();await page.keyboard.press('ArrowUp');
 assert.equal(await page.evaluate(()=>profilePlacementAt('Encoder',0,0).layout.items.find(x=>x.key==='load').value),Math.min(100,before+1));
 await dial.dispatchEvent('wheel',{deltaY:100});
 assert.equal(await page.evaluate(()=>profilePlacementAt('Encoder',0,0).layout.items.find(x=>x.key==='load').value),before);
}
await page.evaluate(()=>{const p=profilePlacementAt('Encoder',0,0);profileEmitInput(p,'dialRotate',{ticks:999});if(p.layout.items.find(x=>x.key==='load').value!==100)throw Error('upper bound');profileEmitInput(p,'dialRotate',{ticks:-999});if(p.layout.items.find(x=>x.key==='load').value!==0)throw Error('lower bound');liveState.pluginConnected=true;profileEmitInput(p,'dialRotate',{ticks:5});if(p.layout.items.find(x=>x.key==='load').value!==0)throw Error('live feedback ownership');liveState.pluginConnected=false;profileState.connected=false;profileEmitInput(p,'dialRotate',{ticks:5});if(p.layout.items.find(x=>x.key==='load').value!==0)throw Error('disconnected mutation');profileState.connected=true;});
await page.evaluate(()=>{DeckLabUX11.selectStudioDevice('plus');renderProfileLab();});
await page.screenshot({path:artifactDir+'/encoder-review.png'});
await page.evaluate(()=>{pluginState.selectedActionIndex=pluginState.manifest.Actions.findIndex(a=>a.UUID==='com.decklab.hostdemo.cpu');hostState.controller='Encoder';hostState.placed=true;hostState.connected=true;hostState.layout=deepClone(SAMPLES.encoder);simulateHostDialRotate(4);if(hostState.layout.items.find(i=>i.key==='load').value!==46)throw Error('host inspector feedback');hostState.placed=false;});
await page.evaluate(()=>DeckLabUX11.openDevicePicker());
assert.equal(await page.locator('#devicePickerGroups section').getByText('Stream Deck Mobile Pro',{exact:true}).count(),0);
assert.equal(await page.locator('#devicePickerGroups details').getByText('Stream Deck Mobile Pro',{exact:true}).count(),1);
assert.deepEqual(errors,[]);await browser.close();console.log('PASS encoder samples: four device targets, keyboard/wheel, bounds, live ownership, disconnected guard, Mobile optional.');
})().catch(e=>{console.error(e);process.exit(1)});
