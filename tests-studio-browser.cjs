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


await page.waitForTimeout(250);
await page.locator('#studioAppearanceSelect').selectOption('pink');
assert((await page.locator('#profileDeck .ds-official-artwork').getAttribute('src')).includes('mk2-pink'));
const before=await page.evaluate(()=>JSON.stringify(profileState.placements));
await page.locator('[data-studio-mode="preview"]').click();
await page.waitForTimeout(100);
assert(await page.locator('body').evaluate(e=>e.classList.contains('studio-live-preview')));
assert.equal(await page.locator('.builder-library-panel').isVisible(),false);
const nextID=await page.evaluate(()=>profileState.placements.find(p=>p.actionUuid?.endsWith('page.next')).id);
await page.locator(`[data-profile-id="${nextID}"]`).click();
await page.waitForTimeout(120);
assert.equal(await page.evaluate(()=>profilePage().name),'More actions');
await page.keyboard.press('Delete');
assert.equal(await page.evaluate(()=>JSON.stringify(profileState.placements)),before);

await page.locator('[data-studio-mode="build"]').click();
assert(await page.locator('.builder-library-panel').isVisible());

await page.evaluate(()=>DeckLabUX11.selectStudioDevice('neo'));
await page.locator('#studioAppearanceSelect').selectOption('white');
assert((await page.locator('#profileDeck .ds-official-artwork').getAttribute('src')).includes('neo-white'));
await page.evaluate(()=>DeckLabUX11.selectStudioDevice('standard'));
assert.equal(await page.locator('#studioAppearanceSelect').inputValue(),'pink');
await page.evaluate(()=>DeckLabUX11.selectStudioDevice('mini'));
assert.equal(await page.locator('#studioAppearanceWrap').isVisible(),false);
assert.deepEqual(errors,[]);console.log('PASS: colour persistence across models, single-colour hidden, Build/Live shared profile, single-click navigation, editing disabled in Live, no page errors.');
await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
