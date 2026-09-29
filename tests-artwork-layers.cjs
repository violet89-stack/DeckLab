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
   await route.fulfill({body:fs.readFileSync(file),contentType:({'.js':'application/javascript','.html':'text/html','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'application/octet-stream'});
  });
  await page.addInitScript(()=>{if(window===window.top)localStorage.setItem('decklab.onboarding.v10','complete')});
  await page.goto('http://decklab.test/');await page.waitForFunction(()=>document.getElementById('artworkSource'));
  const create=async(device='standard',controller='Keypad')=>page.evaluate(async({device,controller})=>{
   switchMode('profile');DeckLabUX11.selectStudioDevice(device);resetProfileSession({target:device});
   const p=await createProfileActionPlacement(profileAvailableActions().findIndex(a=>a.UUID==='com.decklab.visual'),controller,0,0);
   renderProfileLab();selectProfilePlacement(p);DeckLabVisuals.commit(p,{title:'',showTitle:false});
  },{device,controller});
  const template=async(button='openColourTemplates')=>{
   await page.locator('#'+button).click();await page.waitForFunction(()=>!document.getElementById('templateApply').disabled);
   await page.locator('#templateStyle').selectOption('Flat');await page.locator('#templateColour').selectOption('flat-cyan');
   await page.waitForFunction(()=>!document.getElementById('templateApply').disabled);await page.locator('#templateApply').click();
  };
  const icon=async(button='openArtworkLibrary')=>{
   await page.locator('#'+button).click();await page.locator('#artworkSource').selectOption('elgato');await page.locator('#artworkSearch').fill('camera');
   await page.waitForFunction(()=>document.querySelector('.elgato-icon-card .artwork-use')?.dataset.iconId.includes('camera'));
   await page.locator('.elgato-icon-card .artwork-use').first().click();await page.waitForFunction(()=>!document.getElementById('artworkDialog').open);
  };
  const visual=()=>page.evaluate(()=>DeckLabVisuals.visual(selectedProfilePlacement()));
  await create();const identity=await page.evaluate(()=>({action:selectedProfilePlacement().actionUuid,settings:selectedProfilePlacement().settings}));
  await template();const background=(await visual()).background;await icon();let v=await visual();
  assert.deepEqual(v.background,background);assert(v.image.startsWith('data:image/png'));assert.equal(v.artworkCredit.license,'MIT');assert.equal(v.background.template.license,'CC-BY-4.0');
  assert.deepEqual(await page.evaluate(()=>({action:selectedProfilePlacement().actionUuid,settings:selectedProfilePlacement().settings})),identity);
  const foreground=v.image;
  const face=page.locator('#profileDeck .profile-slot .profile-action-face').first();
  assert.equal(await face.locator('img').count(),2);assert.equal(await face.locator('.artwork-background').evaluate(n=>getComputedStyle(n).zIndex),'0');
  await face.locator('img').evaluateAll(images=>Promise.all(images.map(im=>im.decode())));
  // Compare rendered pixels: transparent corners expose the cyan template; white icon pixels remain visible.
  const png=await face.screenshot();
  const pixels=await page.evaluate(async png=>{const im=new Image();im.src='data:image/png;base64,'+png;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);const d=x.getImageData(0,0,c.width,c.height).data;let cyan=0,white=0;for(let i=0;i<d.length;i+=4){if(d[i+1]>d[i]+25&&d[i+2]>d[i]+25)cyan++;if(d[i]>235&&d[i+1]>235&&d[i+2]>235)white++;}return {cyan,white}},png.toString('base64'));
  assert(pixels.cyan>100&&pixels.white>15,JSON.stringify(pixels));
  await page.screenshot({path:path.join(artifactDir,'artwork-layers.png')});
  await page.locator('#visualRemoveBackground').click();assert.equal((await visual()).background,null);assert.equal((await visual()).image,foreground);
  await page.evaluate(()=>profileUndo());assert.deepEqual((await visual()).background,background);
  await page.locator('#visualRemoveImage').click();assert.equal((await visual()).image,null);assert.deepEqual((await visual()).background,background);assert.equal(await face.locator('img').count(),1);
  await page.evaluate(()=>profileUndo());assert.equal((await visual()).image,foreground);await page.evaluate(()=>profileRedo());assert.equal((await visual()).image,null);
  // Reverse selection order must produce the same two-layer composition.
  await page.locator('#visualReset').click();await icon();await template();v=await visual();assert.equal(v.image,foreground);assert.deepEqual(v.background,background);
  const saved=await page.evaluate(()=>profileSerializableData());
  await page.evaluate(async data=>{await importDeckLabProfileData(data);renderProfileLab();selectProfilePlacement(profileState.placements[0])},saved);
  assert.equal((await visual()).image,foreground);assert.deepEqual((await visual()).background,background);assert((await visual()).artworkCredit.licenseText.includes('THE SOFTWARE IS PROVIDED'));
  // Legacy template-only files retain their appearance and become editable layers on first edit.
  await page.evaluate(({background})=>{selectedProfilePlacement().customVisual={image:background.image,template:background.template,showTitle:false};renderProfileDeck()}, {background});
  assert.equal(await face.locator('img').count(),1);await icon();assert.equal((await visual()).background.image,background.image);assert.equal((await visual()).image,foreground);const migratedBackground=(await visual()).background;
  // A/B foreground overrides remain independent of the background.
  await page.evaluate(()=>{const p=selectedProfilePlacement();p.customVisual.states={0:{image:p.customVisual.image},1:{image:null}};p.state=1;renderProfileDeck()});
  await icon();assert.equal((await visual()).image,foreground);await page.locator('#visualRemoveImage').click();
  assert.equal(await page.evaluate(()=>selectedProfilePlacement().customVisual.states[0].image),foreground);assert.deepEqual((await visual()).background,migratedBackground);assert.equal(await page.evaluate(()=>DeckLabVisuals.visual({...selectedProfilePlacement(),state:0}).artworkCredit.license),'MIT');
  // Saved templates keep their background role when reused from My artwork.
  await page.locator('#openColourTemplates').click();await page.waitForFunction(()=>!document.getElementById('templateSave').disabled);await page.locator('#templateSave').click();await page.waitForFunction(()=>document.getElementById('templateStatus').textContent.includes('Saved'));await page.locator('#templateClose').click();
  await icon();await page.locator('#openArtworkLibrary').click();await page.locator('#artworkSource').selectOption('mine');await page.locator('#artworkSearch').fill('');await page.waitForFunction(()=>document.querySelector('.artwork-use'));await page.locator('.artwork-use').first().click();assert.equal((await visual()).image,foreground);assert((await visual()).background.artworkCredit.license.includes('CC-BY-4.0'));
  // State creator starts with a transparent foreground and preserves the editable template on Apply.
  const bgBeforeCreator=(await visual()).background;await page.locator('#openAssetCreator').click();assert(await page.locator('#creator-transparent').isChecked());await page.locator('#creator-text').fill('A');await page.locator('#creatorApply').click();assert.deepEqual((await visual()).background,bgBeforeCreator);
  const gif='data:image/gif;base64,'+fs.readFileSync(path.join(root,'examples/live-plugin/com.decklab.live.sdPlugin/images/animated.gif')).toString('base64');
  await page.evaluate(data=>DeckLabVisuals.commit(selectedProfilePlacement(),{image:data}),gif);assert.equal((await visual()).image,gif);assert.deepEqual((await visual()).background,bgBeforeCreator);
  assert.equal(await face.locator('.artwork-foreground').getAttribute('src'),gif);
  await page.evaluate(async()=>{DeckLabUX11.selectStudioDevice('plus');resetProfileSession({target:'plus'});const p=await createProfileActionPlacement(profileAvailableActions().findIndex(a=>a.UUID==='com.decklab.demo.volume'),'Encoder',0,0);renderProfileLab();selectProfilePlacement(p)});
  await template();await page.locator('.lcd-demo .artwork-background').waitFor({state:'visible'});assert.equal(await page.locator('.lcd-demo .artwork-background').count(),1);
  const beforeDial=await page.locator('.lcd-demo-value').innerText();await page.evaluate(()=>profileRunBuiltin(selectedProfilePlacement(),'dialRotate',{ticks:3}));assert.notEqual(await page.locator('.lcd-demo-value').innerText(),beforeDial);
  for(const [device,controller] of [['plus','Encoder'],['neo','Neo']]){await create(device,controller);await template();await icon();v=await visual();assert(v.background.image&&v.image);}
  // Full LCD, split and independent bottom-row artwork use the same foreground picker.
  for(const [device,mode,part] of [['plus','full','full'],['plusxl','segments','segment-5'],['galleon','horizontal','horizontal-1'],['galleon','segments','segment-3']]){
   await page.evaluate(device=>{DeckLabUX11.selectStudioDevice(device);resetProfileSession({target:device});document.getElementById('displayArtworkEditor').open=true},device);
   await page.locator('#displayBuildMode').selectOption(mode);await page.locator('#displayPart').selectOption(part);
   await template('displayTemplates');await icon('displayChooseImage');
   const config=await page.evaluate(part=>DeckLabDisplayArtwork.config()[part],part);assert(config.image&&config.background.image);assert.equal(config.artworkCredit.license,'MIT');
   const layer=page.locator('.display-art-layer[data-display-part="'+part+'"]');assert.equal(await layer.locator('img').count(),2);
   await page.locator('#displayRemoveBackground').click();assert.equal(await layer.locator('img').count(),1);await page.evaluate(()=>profileUndo());
   const data=await page.evaluate(()=>profileSerializableData());await page.evaluate(async data=>{await importDeckLabProfileData(data);renderProfileLab()},data);
   assert.equal(await page.evaluate(part=>DeckLabDisplayArtwork.config()[part].background.template.license,part),'CC-BY-4.0');
  }
  assert.deepEqual(errors,[]);
  console.log('PASS artwork layers: rendered transparency, both picker orders, separate removal, Undo/Redo, legacy migration, A/B state isolation, library roles, creator, portable dual attribution, key/Encoder/Neo and full/split/segment LCD persistence.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
