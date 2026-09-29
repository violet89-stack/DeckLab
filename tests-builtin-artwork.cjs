// SPDX-License-Identifier: MPL-2.0
const {chromium,launchOptions,artifactDir,isInside}=require('./scripts/test-support.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert');
(async()=>{
 const root=__dirname,browser=await chromium.launch(launchOptions());
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1100}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://decklab.test/**',async route=>{
   const pathname=decodeURIComponent(new URL(route.request().url()).pathname),file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
   if(!isInside(root,file)||!fs.existsSync(file)||fs.statSync(file).isDirectory())return route.fulfill({status:404,body:'Not found'});
   await route.fulfill({body:fs.readFileSync(file),contentType:({'.js':'application/javascript','.html':'text/html','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.gif':'image/gif'})[path.extname(file)]||'application/octet-stream'});
  });
  await page.addInitScript(()=>{if(window===window.top)localStorage.setItem('decklab.onboarding.v10','complete')});
  await page.goto('http://decklab.test/');
  await page.waitForFunction(()=>document.querySelector('#artworkSource option[value="samples"]'));
  const create=()=>page.evaluate(async()=>{
   switchMode('profile');DeckLabUX11.selectStudioDevice('neo');resetProfileSession({target:'neo'});
   const p=await createProfileActionPlacement(profileAvailableActions().findIndex(a=>a.UUID==='com.decklab.visual'),'Neo',0,0);
   renderProfileLab();selectProfilePlacement(p);DeckLabVisuals.commit(p,{title:'',showTitle:false});
  });
  await create();
  const openSamples=async()=>{
   await page.locator('#openArtworkLibrary').click();
   await page.locator('#artworkSource').selectOption('samples');
   await page.locator('#artworkSearch').fill('');
   await page.locator('[data-sample-id="neo-dino-runner"]').waitFor();
  };
  await openSamples();
  assert(await page.locator('#artworkUpload').isHidden());
  assert(await page.locator('#artworkFilter').isHidden());
  assert.equal(await page.locator('.builtin-artwork-card .artwork-remove').count(),0);
  await page.locator('#artworkSearch').fill('missing sample');assert.equal(await page.locator('.builtin-artwork-card').count(),0);
  await page.locator('#artworkSearch').fill('neo dino');await page.locator('.builtin-artwork-card').waitFor();
  const thumbnail=page.locator('.builtin-artwork-card img');await thumbnail.evaluate(im=>im.decode());
  assert.deepEqual(await thumbnail.evaluate(im=>[im.naturalWidth,im.naturalHeight]),[232,50]);
  await page.screenshot({path:path.join(artifactDir,'builtin-dino-library.png')});
  const gif='data:image/gif;base64,'+fs.readFileSync(path.join(root,'assets/samples/neo-dino-runner.gif')).toString('base64');
  await page.locator('[data-sample-id="neo-dino-runner"]').click();
  await page.waitForFunction(()=>!document.getElementById('artworkDialog').open);
  assert.equal(await page.evaluate(()=>DeckLabVisuals.visual(selectedProfilePlacement()).image),gif);
  const bar=page.locator('#profileDeck .profile-neo-slot');
  const before=await bar.screenshot();
  await page.waitForTimeout(350);
  assert(!before.equals(await bar.screenshot()),'GIF must animate in the rendered Neo Infobar');
  const saved=await page.evaluate(()=>profileSerializableData());
  await page.evaluate(async data=>{await importDeckLabProfileData(data);selectProfilePlacement(profileState.placements[0])},saved);
  assert.equal(await page.evaluate(()=>DeckLabVisuals.visual(selectedProfilePlacement()).image),gif);
  await page.locator('#profileDeck .ds-surface').screenshot({path:path.join(artifactDir,'builtin-dino-neo.png')});
  // Reuse in My artwork keeps the original bytes and enables favourites.
  await openSamples();
  await page.getByRole('button',{name:'Save Neo Dino Runner to My artwork',exact:true}).click();
  await page.waitForFunction(()=>document.getElementById('artworkStatus').textContent.startsWith('Saved'));
  await page.locator('#artworkSource').selectOption('mine');await page.locator('#artworkSearch').fill('');
  assert.equal(await page.locator('.artwork-use').count(),1);
  await page.getByRole('button',{name:'Favourite Neo Dino Runner',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.artwork-favourite')?.getAttribute('aria-pressed')==='true');
  await page.locator('#artworkFilter').selectOption('favourites');assert.equal(await page.locator('.artwork-use').count(),1);
  // Drag a bundled sample onto a completely empty Infobar.
  await page.locator('#artworkSource').selectOption('samples');
  await page.locator('#artworkDock').click();
  await page.evaluate(()=>{
   resetProfileSession({target:'neo'});renderProfileLab();
   const from=document.querySelector('[data-sample-id="neo-dino-runner"]'),to=document.querySelector('#profileDeck .profile-neo-slot'),dataTransfer=new DataTransfer();
   from.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer}));
   to.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer}));
  });
  await page.waitForFunction(()=>profileState.placements.length===1&&profileState.placements[0].customVisual?.image);
  assert.equal(await page.evaluate(()=>profileState.placements[0].controller),'Neo');
  assert.equal(await page.evaluate(()=>profileState.placements[0].customVisual.image),gif);
  await page.locator('#artworkClose').click();
  // Applying a foreground sample preserves the existing background and action.
  await page.locator('#openColourTemplates').click();await page.waitForFunction(()=>!document.getElementById('templateApply').disabled);
  await page.locator('#templateApply').click();
  const bg=await page.evaluate(()=>DeckLabVisuals.visual(selectedProfilePlacement()).background);
  await openSamples();await page.locator('[data-sample-id="neo-dino-runner"]').click();
  assert.deepEqual(await page.evaluate(()=>DeckLabVisuals.visual(selectedProfilePlacement()).background),bg);
  // Built-in artwork remains available after deleting the optional saved copy.
  await openSamples();await page.locator('#artworkSource').selectOption('mine');await page.locator('.artwork-remove').click();
  await page.waitForFunction(()=>document.querySelectorAll('.artwork-use').length===0);
  await page.locator('#artworkSource').selectOption('samples');await page.locator('[data-sample-id="neo-dino-runner"]').waitFor();
  assert.deepEqual(errors,[]);
  console.log('PASS built-in samples: offline catalogue, search, GIF thumbnail/playback, click/drag placement, original-byte profile round trip, background preservation, optional favourites, persistent bundled availability.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
