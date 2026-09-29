// SPDX-License-Identifier: MPL-2.0
const vm=require('vm'),fs=require('fs'),assert=require('assert');
let socket;const sent=[],timers=new Map();let id=0;
class WS{static OPEN=1;constructor(){socket=this;this.readyState=1}send(m){sent.push(JSON.parse(m))}}
vm.runInNewContext(fs.readFileSync('examples/live-plugin/com.decklab.live.sdPlugin/bin/plugin.js','utf8'),{WebSocket:WS,process:{argv:[],on(){},exit(){}},console,setInterval(f){timers.set(++id,f);return id},clearInterval(i){timers.delete(i)},setTimeout,encodeURIComponent});
const send=m=>socket.onmessage({data:JSON.stringify(m)}),appear=c=>send({event:'willAppear',context:c,action:'com.decklab.hostdemo.cpu'});
appear('a');appear('a');assert.equal(timers.size,1);appear('b');
send({event:'dialRotate',context:'a',payload:{ticks:5}});assert.deepEqual(sent.at(-1).payload,{value:'47%',load:47});
for(const f of timers.values())f();assert.equal(sent.filter(m=>m.context==='a').length,1);assert.equal(sent.at(-1).context,'b');
send({event:'dialRotate',context:'a',payload:{ticks:-999}});assert.equal(sent.at(-1).payload.load,0);send({event:'dialRotate',context:'a',payload:{ticks:999}});assert.equal(sent.at(-1).payload.load,100);
send({event:'willDisappear',context:'a'});assert.equal(timers.size,1);send({event:'deviceDidDisconnect'});assert.equal(timers.size,0);console.log('PASS live demo: accumulating feedback, bounds, timer ownership, context isolation, lifecycle cleanup.');
