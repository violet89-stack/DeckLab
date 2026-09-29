// SPDX-License-Identifier: MPL-2.0
const {chromium,launchOptions,artifactDir,isInside}=require('./scripts/test-support.cjs');const fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{const browser=await chromium.launch(launchOptions());const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.stack));
const root=__dirname;
await page.route('http://decklab.test/**',async r=>{const p=decodeURIComponent(new URL(r.request().url()).pathname);const f=path.resolve(root,'.'+(p==='/'?'/index.html':p));if(!isInside(root,f)||!fs.existsSync(f)||fs.statSync(f).isDirectory())return r.fulfill({status:404,body:'Not found'});const mime={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.gif':'image/gif'}[path.extname(f)]||'application/octet-stream';await r.fulfill({body:fs.readFileSync(f),contentType:mime});});
await page.addInitScript(()=>{if(window===window.top)localStorage.setItem('decklab.onboarding.v10','complete')});
await page.goto('http://decklab.test/',{waitUntil:'load'});await page.evaluate(()=>{switchMode('profile');});
await page.locator('#profileImportInput').setInputFiles(root+'/examples/builtin-actions.streamDeckProfile');await page.locator('#nativeImportSummary[open]').waitFor();assert((await page.locator('#nativeImportSummary').innerText()).includes('8 placements'));await page.locator('#nativeImportSummary button').click();
let count=await page.evaluate(()=>profileState.placements.length);assert.equal(count,8);
await page.evaluate(async()=>{const next=profileState.placements.find(p=>p.actionUuid?.endsWith('page.next'));await profileRunAction(next);});assert.equal(await page.evaluate(()=>profilePage().name),'More actions');
await page.evaluate(async()=>{const home=profileState.pages.find(p=>p.name==='Home');await navigateProfilePage(home.id);const text=profileState.placements.find(p=>p.actionUuid?.endsWith('system.text'));selectProfilePlacement(text);await profileRunAction(text);});assert((await page.locator('#builtinSimulationNotice').innerText()).includes('Hello from DeckLab'));



await page.waitForTimeout(300);
await page.evaluate(()=>DeckLabUX11.goStudio('build'));
assert.equal(await page.locator('.studio-asset-preview').count(),0);
assert.equal(await page.locator('#studioAdvanced [data-studio-mode="test"]').isVisible(),false);
await page.evaluate(()=>{const p=profileState.placements.find(p=>p.actionUuid.endsWith('system.text'));selectProfilePlacement(p);});
await page.locator('#visualTitle').fill('');
assert.equal(await page.locator('#profileDeck .profile-slot.selected .profile-action-title').textContent(),'');
await page.locator('#visualTitle').fill('Visible title');await page.locator('#visualShowTitle').uncheck();
assert.equal(await page.locator('#profileDeck .profile-slot.selected .profile-action-title').isVisible(),false);
await page.locator('#visualShowTitle').check();
await page.locator('#visualTitle').fill('My design');await page.locator('#visualTitle').press('Tab');
await page.locator('#visualImageInput').setInputFiles(root+'/assets/elgato/mk2-pink.png');
await page.waitForFunction(()=>selectedProfilePlacement().customVisual?.image?.startsWith('data:image/png'));
const original=await page.evaluate(()=>selectedProfilePlacement().customVisual);
await page.evaluate(()=>profileDuplicateSelected());assert.deepEqual(await page.evaluate(()=>selectedProfilePlacement().customVisual),original);
await page.evaluate(()=>profileUndo());assert.equal(await page.evaluate(()=>profileState.placements.length),8);
await page.evaluate(()=>{const p=profileState.placements.find(p=>p.customVisual);selectProfilePlacement(p);});
const visualIdx=await page.evaluate(()=>profileAvailableActions().findIndex(a=>a.UUID==='com.decklab.visual'));
await page.locator('#visualAction').selectOption(String(visualIdx));
assert.deepEqual(await page.evaluate(()=>selectedProfilePlacement().customVisual),original);
const target=await page.evaluate(()=>profileState.target);
await page.locator('[data-studio-mode="preview"]').click();
assert.equal(await page.evaluate(()=>profileState.target),target);
assert(await page.locator('#profileDeck').innerText().then(t=>t.includes('My design')));
await page.locator('[data-studio-mode="build"]').click();
await page.evaluate(async()=>{const data=profileSerializableData();await importDeckLabProfileData(data);selectProfilePlacement(profileState.placements.find(p=>p.customVisual));});
assert.deepEqual(await page.evaluate(()=>selectedProfilePlacement().customVisual),original);
await page.locator('#visualReset').click();assert.equal(await page.evaluate(()=>!!selectedProfilePlacement().customVisual),false);
await page.evaluate(()=>profileUndo());assert.deepEqual(await page.evaluate(()=>selectedProfilePlacement().customVisual),original);

assert.deepEqual(errors,[]);console.log('PASS unified Build: image and title edits, action reassignment retains visuals, duplicate, undo, export/reimport, reset, shared live preview, no page errors.');await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
