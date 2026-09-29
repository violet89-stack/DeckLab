// SPDX-License-Identifier: MPL-2.0
const {chromium,launchOptions,artifactDir,isInside}=require('./scripts/test-support.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert'),crypto=require('node:crypto');
(async()=>{
 const root=__dirname,manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/elgato-colour-templates/index.json')));
 assert.equal(manifest.entries.length,38);assert.equal(new Set(manifest.entries.map(e=>e.id)).size,38);assert.equal(manifest.license,'CC-BY-4.0');
 for(const e of manifest.entries)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,e.path))).digest('hex'),e.sha256);
 const browser=await chromium.launch(launchOptions());
 try{const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://decklab.test/**',async r=>{const p=decodeURIComponent(new URL(r.request().url()).pathname),f=path.resolve(root,'.'+(p==='/'?'/index.html':p));if(!isInside(root,f)||!fs.existsSync(f)||fs.statSync(f).isDirectory())return r.fulfill({status:404,body:'Not found'});await r.fulfill({body:fs.readFileSync(f),contentType:({'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.gif':'image/gif'})[path.extname(f)]||'application/octet-stream'});});
 await page.addInitScript(()=>{if(window===window.top)localStorage.setItem('decklab.onboarding.v10','complete')});
 await page.goto('http://decklab.test/');await page.waitForFunction(()=>document.getElementById('templateDialog'));
 await page.evaluate(async()=>{switchMode('profile');resetProfileSession({target:'standard'});const i=profileAvailableActions().findIndex(a=>a.UUID==='com.decklab.visual');const p=await createProfileActionPlacement(i,'Keypad',0,0);renderProfileLab();selectProfilePlacement(p);DeckLabVisuals.commit(p,{title:'Keep title',showTitle:true});});
 const before=await page.evaluate(()=>({action:selectedProfilePlacement().action,settings:JSON.stringify(selectedProfilePlacement().settings)}));
 await page.locator('#openColourTemplates').click();await page.waitForFunction(()=>!document.getElementById('templateApply').disabled);
 assert.equal(await page.locator('#templateColour option').count(),9);assert(await page.locator('#templateLayout').isDisabled());
 await page.locator('#templateStyle').selectOption('Stroke');await page.waitForFunction(()=>!document.getElementById('templateApply').disabled);
 await page.locator('#templateColour').selectOption('stroke-purple');await page.waitForFunction(()=>!document.getElementById('templateApply').disabled);
 // Correct the atlas filename mismatch without recolouring original pixels.
 const colour=await page.locator('#templatePreview').evaluate(async im=>{await im.decode();const c=document.createElement('canvas');c.width=c.height=144;const x=c.getContext('2d');x.drawImage(im,0,0);return [...x.getImageData(70,70,1,1).data]});assert(colour[2]>colour[0]&&colour[0]>colour[1]);
 await page.locator('#templateApply').click();assert.equal(await page.evaluate(()=>selectedProfilePlacement().customVisual.title),'Keep title');assert.deepEqual(await page.evaluate(()=>({action:selectedProfilePlacement().action,settings:JSON.stringify(selectedProfilePlacement().settings)})),before);
 assert.equal(await page.evaluate(()=>selectedProfilePlacement().customVisual.template.license),'CC-BY-4.0');
 await page.evaluate(()=>profileUndo());assert.equal(await page.evaluate(()=>!!selectedProfilePlacement()?.customVisual?.image),false);
 // Save to the existing library, retaining attribution.
 await page.locator('#openColourTemplates').click();await page.waitForFunction(()=>!document.getElementById('templateSave').disabled);await page.locator('#templateSave').click();await page.waitForFunction(()=>document.getElementById('templateStatus').textContent.includes('Saved'));await page.locator('#templateClose').click();
 await page.locator('#openArtworkLibrary').click();await page.waitForFunction(()=>document.querySelector('.artwork-use'));assert((await page.locator('.artwork-use').first().evaluate(n=>n.title||n.dataset.dlTip||'')).includes('Elgato and Will Johnson'));await page.locator('#artworkClose').click();
 // Every supplied sheet and tone decodes and crops within the intended key square.
 const count=await page.evaluate(async()=>{const d=await DeckLabTemplates.load();let n=0;for(const e of d.entries)for(let t=0;t<e.tones.length;t++){const r=await DeckLabTemplates.compose(e.id,t,'auto',{w:144,h:144,key:true});const im=new Image();im.src=r.data;await im.decode();if(im.width!==144||im.height!==144)throw Error('Unexpected key size');n++;}return n;});assert.equal(count,93);
 // Full LCD layouts use native canvas dimensions; all three families retain portable images.
 for(const [device,w,h] of [['plus',800,100],['plusxl',1200,100],['galleon',400,200]]){
  await page.evaluate(device=>{DeckLabUX11.selectStudioDevice(device);resetProfileSession({target:device});document.getElementById('displayArtworkEditor').open=true;},device);
  await page.locator('#displayPart').selectOption('full');await page.locator('#displayTemplates').click();await page.waitForFunction(()=>!document.getElementById('templateApply').disabled);
  await page.locator('#templateStyle').selectOption('Glass');await page.locator('#templateColour').selectOption('glass-cyan');await page.waitForFunction(()=>!document.getElementById('templateApply').disabled);
  const size=await page.locator('#templatePreview').evaluate(async im=>{await im.decode();return [im.naturalWidth,im.naturalHeight]});assert.deepEqual(size,[w,h]);
  if(device==='plusxl')await page.screenshot({path:path.join(artifactDir,'colour-templates-plusxl.png')});
  await page.locator('#templateApply').click();assert(await page.evaluate(()=>DeckLabDisplayArtwork.config().full.image.startsWith('data:image/png')));
  const data=await page.evaluate(()=>profileSerializableData());await page.evaluate(async d=>{await importDeckLabProfileData(d);renderProfileLab()},data);assert.equal(await page.evaluate(()=>DeckLabDisplayArtwork.config().full.template.license),'CC-BY-4.0');
 }
 // Bottom row is independent, and stale selection cannot overwrite another surface.
 await page.evaluate(()=>document.getElementById('displayArtworkEditor').open=true);await page.locator('#displayPart').selectOption('segment-3');await page.locator('#displayTemplates').click();await page.waitForFunction(()=>!document.getElementById('templateApply').disabled);await page.locator('#templateApply').click();assert(await page.evaluate(()=>!!DeckLabDisplayArtwork.config()['segment-3'].image));assert.equal(await page.evaluate(()=>!!DeckLabDisplayArtwork.config()['segment-2']?.image),false);
 await page.locator('#displayTemplates').click();await page.waitForFunction(()=>!document.getElementById('templateApply').disabled);await page.evaluate(()=>{document.getElementById('displayPart').value='segment-0'});await page.locator('#templateApply').click();assert((await page.locator('#templateStatus').innerText()).includes('Selection changed'));assert.equal(await page.evaluate(()=>!!DeckLabDisplayArtwork.config()['segment-0']?.image),false);await page.locator('#templateClose').click();
 await page.evaluate(async()=>{DeckLabUX11.selectStudioDevice('neo');resetProfileSession({target:'neo'});const i=profileAvailableActions().findIndex(a=>(a.Controllers||[]).includes('Neo'));const p=await createProfileActionPlacement(i,'Neo',0,0);renderProfileLab();selectProfilePlacement(p)});
 await page.locator('#openColourTemplates').click();await page.waitForFunction(()=>!document.getElementById('templateApply').disabled);assert.deepEqual(await page.locator('#templatePreview').evaluate(async im=>{await im.decode();return [im.naturalWidth,im.naturalHeight]}),[232,50]);await page.locator('#templateClose').click();
 const bad=await page.evaluate(async()=>{try{await DeckLabTemplates.compose('flat-cyan',99,'auto',{w:144,h:144,key:true});return false}catch(_){return true}});assert(bad);
 assert.deepEqual(errors,[]);console.log('PASS colour templates: 38 sheets / 93 tone crops, corrected hue labels, preserved action/title, undo, library attribution, +/+XL/GALLEON dimensions, region independence, persistence and stale-selection protection.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
