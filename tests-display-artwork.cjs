// SPDX-License-Identifier: MPL-2.0
const {chromium,launchOptions,artifactDir,isInside}=require('./scripts/test-support.cjs');const fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{const browser=await chromium.launch(launchOptions());const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.stack));
const root=__dirname;
await page.route('http://decklab.test/**',async r=>{const p=decodeURIComponent(new URL(r.request().url()).pathname);const f=path.resolve(root,'.'+(p==='/'?'/index.html':p));if(!isInside(root,f)||!fs.existsSync(f)||fs.statSync(f).isDirectory())return r.fulfill({status:404,body:'Not found'});const mime={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.gif':'image/gif'}[path.extname(f)]||'application/octet-stream';await r.fulfill({body:fs.readFileSync(f),contentType:mime});});
await page.addInitScript(()=>{if(window===window.top)localStorage.setItem('decklab.onboarding.v10','complete')});
await page.goto('http://decklab.test/',{waitUntil:'load'});await page.evaluate(()=>{switchMode('profile');});

await page.waitForFunction(()=>document.getElementById('displayBuildMode'));
await page.evaluate(()=>{DeckLabUX11.selectStudioDevice('plus');resetProfileSession({target:'plus'});});
await page.locator('#displayArtworkEditor summary').click();assert.equal(await page.locator('#displayPart option').count(),9);
// Select the full background explicitly; the editor now follows the active segment.
await page.locator('#displayPart').selectOption('full');
const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=800;c.height=100;const x=c.getContext('2d');x.fillStyle='#933dcc';x.fillRect(0,0,800,100);return c.toDataURL()});
await page.locator('#displayImageInput').setInputFiles({name:'strip.png',mimeType:'image/png',buffer:Buffer.from(png.split(',')[1],'base64')});await page.waitForFunction(()=>!!DeckLabDisplayArtwork.config().full?.image);
await page.locator('#displayPart').selectOption('segment-1');await page.locator('#displayOpaque').check();await page.locator('#displayFeedback').uncheck();assert.equal(await page.locator('#profileDeck [data-display-part="segment-1"]').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(0, 0, 0)');
await page.evaluate(()=>DeckLabUX11.goStudio('preview'));assert.equal(await page.locator('#profileDeck .display-art-layer').count(),5);const saved=await page.evaluate(()=>profileSerializableData());await page.evaluate(async s=>{await importDeckLabProfileData(s);renderProfileLab()},saved);assert(await page.evaluate(()=>DeckLabDisplayArtwork.config()['segment-1'].opaque));
await page.evaluate(()=>{DeckLabUX11.goStudio('build');DeckLabUX11.selectStudioDevice('plusxl')});assert.equal(await page.locator('#displayPart option').count(),11);assert.equal(await page.locator('#profileDeck .display-art-layer').count(),7);
await page.evaluate(()=>DeckLabUX11.selectStudioDevice('galleon'));assert.equal(await page.locator('#displayPart option').count(),9);const r=await page.evaluate(()=>DeckLabDisplayArtwork.rects(document.querySelector('#profileDeck .ds-surface')));assert(r.segments[0].x===r.segments[1].x&&r.segments[2].x===r.segments[3].x&&r.segments[1].y>r.segments[0].y);
await page.locator('#displayPart').selectOption('full');await page.locator('#displayImageInput').setInputFiles({name:'screen.png',mimeType:'image/png',buffer:Buffer.from(png.split(',')[1],'base64')});await page.waitForFunction(()=>!!DeckLabDisplayArtwork.config().full?.image);await page.locator('#displayPart').selectOption('segment-1');await page.locator('#displayOpaque').check();await page.screenshot({path:artifactDir+'/display-artwork.png'});
await page.evaluate(()=>DeckLabUX11.selectStudioDevice('standard'));assert.deepEqual(await page.locator('#studioAppearanceSelect option').allTextContents(),['Black','White','Wild Lavender','Pink Petal','Glacier Ice','Forest Green','Atomic Purple']);assert(await page.locator('#displayArtworkEditor').evaluate(n=>n.hidden));
assert.deepEqual(errors,[]);await browser.close();console.log('PASS display artwork: full/segments, opacity, feedback, live preview, profile round trip, +/XL/Galleon layouts and MK.2 colour names.');
})().catch(e=>{console.error(e);process.exit(1)});
