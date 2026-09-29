// SPDX-License-Identifier: MPL-2.0
const argv = process.argv.slice(2);
const arg = (name, fallback='') => { const i=argv.indexOf(name); return i>=0 ? argv[i+1] : fallback; };
const port = arg('-port');
const pluginUUID = arg('-pluginUUID','com.decklab.hostdemo');
const registerEvent = arg('-registerEvent','registerPlugin');
if (!globalThis.WebSocket) {
  console.error('Bundled DeckLab demo needs a Node version with global WebSocket support (Node 22+ recommended).');
  process.exit(2);
}
const ws = new WebSocket(`ws://127.0.0.1:${port}`);
const instances = new Map();
const timers = new Map();
let phase=0;
function send(m){ if(ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify(m)); }
function stopContext(ctx){ const t=timers.get(ctx); if(t){ clearInterval(t); timers.delete(ctx); } instances.delete(ctx); }
function svgFrame(n){
  const a=(n%36)*10; const x=72+40*Math.cos(a*Math.PI/180); const y=72+40*Math.sin(a*Math.PI/180);
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 144"><defs><linearGradient id="g"><stop stop-color="#8fe9ff"/><stop offset="1" stop-color="#c7a3ff"/></linearGradient></defs><rect width="144" height="144" rx="28" fill="#070b11"/><circle cx="72" cy="72" r="42" fill="none" stroke="#26364b" stroke-width="5"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="10" fill="#8fe9ff"/><path d="M53 72l13 13 27-31" fill="none" stroke="url(#g)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return 'data:image/svg+xml,'+encodeURIComponent(svg);
}
function startFor(msg){
  const ctx=msg.context, action=msg.action; stopContext(ctx); instances.set(ctx,{action,value:42,manual:false});
  if(action==='com.decklab.hostdemo.toggle'){
    let n=0;
    const t=setInterval(()=>{
      n++; send({event:'setImage',context:ctx,payload:{image:svgFrame(n),target:0}});
      send({event:'setTitle',context:ctx,payload:{title:`LIVE ${String(n%100).padStart(2,'0')}`,target:0}});
    },100);
    timers.set(ctx,t);
  } else if(action==='com.decklab.hostdemo.cpu'){
    const state=instances.get(ctx);
    const t=setInterval(()=>{ if(state.manual)return; state.value=(state.value+7)%101; send({event:'setFeedback',context:ctx,payload:{title:'CPU',value:`${state.value}%`,load:state.value}}); },350);
    timers.set(ctx,t);
  } else if(action==='com.decklab.hostdemo.neo'){
    let v=45;
    const t=setInterval(()=>{ v=(v+9)%101; send({event:'setFeedback',context:ctx,payload:{title:'DECKLAB',status:`LIVE · ${new Date().toLocaleTimeString()}`,level:v}}); },900);
    timers.set(ctx,t);
  }
}
ws.onopen=()=>{ send({event:registerEvent,uuid:pluginUUID}); console.log(`Registered ${pluginUUID} on port ${port}`); };
ws.onmessage=(ev)=>{
  let m; try{m=JSON.parse(ev.data);}catch{return;}
  if(m.event==='willAppear') startFor(m);
  else if(m.event==='willDisappear') stopContext(m.context);
  else if(m.event==='keyDown'){
    send({event:'showOk',context:m.context,payload:{}});
    send({event:'setTitle',context:m.context,payload:{title:'PRESSED',target:0}});
  } else if(m.event==='dialRotate'){
    const state=instances.get(m.context);
    if(state?.action==='com.decklab.hostdemo.cpu'){state.manual=true;state.value=Math.max(0,Math.min(100,state.value+(Number(m.payload?.ticks)||0)));send({event:'setFeedback',context:m.context,payload:{value:`${state.value}%`,load:state.value}});}
  } else if(m.event==='sendToPlugin'){
    const text=m.payload?.text || m.payload?.label || 'PI message';
    send({event:'setTitle',context:m.context,payload:{title:String(text).slice(0,18),target:0}});
    send({event:'sendToPropertyInspector',action:m.action,context:m.context,payload:{received:text}});
  } else if(m.event==='deviceDidDisconnect'){
    for(const ctx of [...timers.keys()]) stopContext(ctx);
  }
};
ws.onclose=()=>{ for(const ctx of [...timers.keys()]) stopContext(ctx); process.exit(0); };
ws.onerror=(e)=>console.error('WebSocket error', e?.message || e);
process.on('SIGTERM',()=>{ try{ws.close();}catch{} setTimeout(()=>process.exit(0),50); });
