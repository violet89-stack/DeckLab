// SPDX-License-Identifier: MPL-2.0
/* Local, deterministic demo actions; no hardware monitoring or system control. */
(function(){
 const specs=DECKLAB_BUILTINS.filter(a=>a.DeckLabDemo);
 const tracks=['Midnight Drive','Neon Skyline','After Hours'];
 const demo=p=>profileActionFor(p)?.demo;
 const face=profileActionFace;
 profileActionFace=function(p,opts){const spec=demo(p);if(!spec||p.customVisual?.image||p.customVisual?.states||window.DeckLabCreator?.isPreview(p)||opts?.inputOnly)return face(p,opts);
  const s=p.settings||{},value=Number(s.value)||0,active=s.active!==false,d=document.createElement('div');d.className='profile-action-face lcd-demo';d.style.setProperty('--demo-accent',spec.colour);d.title=spec.hint;
  const label=document.createElement('span');label.className='lcd-demo-label';label.textContent=profileActionFor(p).Name;
  const read=document.createElement('strong');read.className='lcd-demo-value';read.textContent=spec.id==='media'?(active?'▶':'Ⅱ'):String(value)+(spec.id==='counter'?'':'%');
  const detail=document.createElement('span');detail.className='lcd-demo-detail';detail.textContent=spec.id==='media'?tracks[((value%3)+3)%3]:!active?'OFF':spec.id==='cpu'||spec.id==='memory'?'SAMPLE DATA':spec.id==='counter'?'TAP +1':'LEVEL';
  const bar=document.createElement('div');bar.className='lcd-demo-track';const fill=document.createElement('i');fill.style.width=(active?Math.max(0,Math.min(100,spec.id==='media'?65:spec.id==='counter'?value%101:value)):0)+'%';bar.append(fill);d.append(label,read,detail,bar);if(p.customVisual){const title=face(p,opts).querySelector('.profile-action-title');if(title)d.append(title);}return d;
 };
 // Only the bundled CPU sample gets an offline simulation. Imported plugins
 // retain their own runtime semantics, and a connected plugin owns feedback.
 function cpuFeedback(instance,event,extra){
  if(event!=='dialRotate'||liveState.pluginConnected||!instance.layout)return false;
  const item=instance.layout.items?.find(i=>i.key==='load');
  const value=Math.max(0,Math.min(100,(Number(item?.value)||0)+(Number(extra.ticks)||0)));
  mergeHostFeedback(instance.layout,{value:value+'%',load:value});return true;
 }
 const emit=profileEmitInput;
 profileEmitInput=function(p,event,extra={}){emit(p,event,extra);if(profileState.connected&&p.actionUuid==='com.decklab.hostdemo.cpu'&&cpuFeedback(p,event,extra)){refreshProfileInstance(p.context);profileScheduleAutosave();}};
 const hostEmit=emitHostInteraction;
 emitHostInteraction=function(event,extra={}){hostEmit(event,extra);if(hostState.connected&&hostState.placed&&hostAction()?.UUID==='com.decklab.hostdemo.cpu'&&cpuFeedback(hostState,event,extra))renderHostSurface();};
 const builtin=profileRunBuiltin;
 profileRunBuiltin=function(p,event,extra={}){const spec=demo(p);if(!spec)return builtin(p,event,extra);if(!['dialRotate','dialUp','keyUp','touchTap'].includes(event))return true;
  const s=p.settings||{},delta=event==='dialRotate'?Number(extra.ticks)||0:1;let value=Number(s.value)||0,active=s.active!==false;
  if(spec.id==='media'){if(event==='dialRotate')value=((value+delta)%3+3)%3;else active=!active;}
  else if(['volume','brightness'].includes(spec.id)&&event!=='dialRotate')active=!active;
  else value=spec.id==='counter'?Math.max(0,value+delta):Math.max(0,Math.min(100,value+delta*(event==='dialRotate'?1:7)));
  p.settings={...s,value,active};refreshProfileInstance(p.context);profileScheduleAutosave();return true;
 };
 const settings=renderBuiltinSettings;
 renderBuiltinSettings=function(){settings();const p=selectedProfileInstance(),spec=p&&demo(p);if(!spec)return;const h=document.getElementById('builtinActionSettings');h.replaceChildren();const n=document.createElement('p');n.className='hint';n.textContent='Interactive demo · '+spec.hint;h.append(n);};
 window.DeckLabDemos={specs};
})();
