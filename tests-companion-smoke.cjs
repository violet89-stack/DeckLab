// SPDX-License-Identifier: MPL-2.0
const assert=require('node:assert'),net=require('node:net'),fs=require('node:fs');
const {chromium,launchOptions,spawnPython,root}=require('./scripts/test-support.cjs');
(async()=>{
 const reservation=net.createServer();await new Promise(r=>reservation.listen(0,'127.0.0.1',r));const port=reservation.address().port;await new Promise(r=>reservation.close(r));
 const server=spawnPython(['decklab_host.py','--port',String(port),'--no-browser'],{stdio:'ignore'});
 let browser,plugin;
 try{
  let response;for(let i=0;i<60;i++){try{response=await fetch(`http://127.0.0.1:${port}/`);break}catch(_){await new Promise(r=>setTimeout(r,100))}}
  assert(response?.ok,'Companion did not start');const version=fs.readFileSync(root+'/BUILD.txt','utf8').trim();assert((await response.text()).includes(version));
  for(const name of ['sdk-visuals.js','plugin-settings.js','build-refinement.js'])assert((await fetch(`http://127.0.0.1:${port}/${name}?build=${version}`)).ok);
  browser=await chromium.launch(launchOptions());const page=await browser.newPage();
  await page.addInitScript(()=>localStorage.setItem('decklab.onboarding.v10','complete'));
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction(()=>liveState.companionConnected);
  // The actual UI connects with its browser Origin; native plugins omit Origin.
  plugin=new WebSocket(`ws://127.0.0.1:${port}/`);
  await new Promise((ok,no)=>{plugin.onopen=ok;plugin.onerror=no});
  plugin.send(JSON.stringify({event:'registerPlugin',uuid:'com.decklab.smoke'}));
  await page.waitForFunction(()=>liveState.pluginConnected);
  const receive=(predicate)=>new Promise((ok,no)=>{const timer=setTimeout(()=>{plugin.removeEventListener('message',h);no(Error('WebSocket response timeout'))},4000);function h(ev){const msg=JSON.parse(ev.data);if(predicate(msg)){clearTimeout(timer);plugin.removeEventListener('message',h);ok(msg)}}plugin.addEventListener('message',h)});
  await page.evaluate(()=>{window.smokePacket=null;liveState.ws.addEventListener('message',ev=>{const m=JSON.parse(ev.data);if(m.type==='pluginMessage'&&m.message.id==='request-1')window.smokePacket=m.message;});});
  plugin.send(JSON.stringify({event:'getSettings',context:'smoke-context',id:'request-1'}));
  await page.waitForFunction(()=>window.smokePacket?.id==='request-1');
  const outgoing=receive(m=>m.event==='didReceiveSettings'&&m.id==='manual-response');
  await page.evaluate(()=>liveControl('sendToPlugin',{message:{event:'didReceiveSettings',context:'smoke-context',id:'manual-response',payload:{settings:{smoke:true}}}}));
  assert.equal((await outgoing).payload.settings.smoke,true);
  // A distinct website and an opaque sandbox have no bridge access.
  const alien=await browser.newPage();await alien.route('http://unrelated.invalid/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Unrelated site</title>'}));await alien.goto('http://unrelated.invalid/');
  const connect=port=>new Promise(resolve=>{const w=new WebSocket(`ws://127.0.0.1:${port}/`);const timer=setTimeout(()=>{w.close();resolve('timeout')},3000);w.onopen=()=>{clearTimeout(timer);w.close();resolve('opened')};w.onerror=()=>{clearTimeout(timer);resolve('rejected')};});
  assert.equal(await alien.evaluate(connect,port),'rejected');
  const opaque=await browser.newPage();await opaque.goto('data:text/html,<title>Opaque origin</title>');assert.equal(await opaque.evaluate(connect,port),'rejected');
  console.log('PASS actual companion: browser UI + native plugin, correlated bidirectional packets, rejected unrelated/opaque origins.');
 }finally{plugin?.close();await browser?.close();server.kill('SIGTERM');}
})().catch(e=>{console.error(e);process.exitCode=1});
