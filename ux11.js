// SPDX-License-Identifier: MPL-2.0
/* DeckLab 1.1.2 — Interaction-first Device Studio shell.
   Keeps legacy workspaces available internally, but presents one selected-device workflow:
   Preview · Build · Test · Inspect. */
(function(){
  'use strict';

  const UX_VERSION='1.3.9-alpha.31';
  const CHOSEN_KEY='decklab.studio.deviceChosen.v11';
  const INSPECT_KEY='decklab.studio.inspectTool.v11';
  const PRIMARY=['mini','standard','xl','neo','plus','plusxl','studio','galleon'];
  const OTHER=['mobile','xeneon','virtual'];
  const INPUT_ONLY=['scimitar','pedal'];
  let auxMode=null;
  let autoPickerDone=false;
  let lastInspect='plugin';
  try{lastInspect=localStorage.getItem(INSPECT_KEY)||'plugin';}catch(_){ }
  if(!['plugin','host'].includes(lastInspect))lastInspect='plugin';

  function byId(id){return document.getElementById(id);}
  function safeText(v){return String(v??'');}
  function studioInternalMode(){
    if(currentMode==='device')return 'artwork';
    if(currentMode==='profile')return window.decklabLivePreview?'preview':'build';
    if(currentMode==='test')return 'test';
    if(currentMode==='layout')return 'build';
    if(['plugin','host'].includes(currentMode))return 'inspect';
    return null;
  }
  function shellForCurrent(){
    if(auxMode)return auxMode;
    if(currentMode==='project')return 'project';
    if(studioInternalMode())return 'studio';
    return 'project';
  }
  function canonicalPickerKey(key){return key==='scissor'?'standard':key;}

  function hideAux(){
    auxMode=null;
    byId('reportsMode')?.classList.add('hidden');
    byId('helpMode')?.classList.add('hidden');
  }
  function hideKnownModes(){
    ['projectMode','deviceMode','layoutMode','pluginMode','hostMode','profileMode','testMode'].forEach(id=>byId(id)?.classList.add('hidden'));
    ['projectToolbar','deviceToolbar','layoutToolbar','pluginToolbar','hostToolbar','profileToolbar','testToolbar'].forEach(id=>byId(id)?.classList.add('hidden'));
  }
  function showAux(name){
    auxMode=name;
    currentMode=name;
    hideKnownModes();
    byId('reportsMode')?.classList.toggle('hidden',name!=='reports');
    byId('helpMode')?.classList.toggle('hidden',name!=='help');
    byId('studioMasterToolbar')?.classList.add('hidden');
    renderShellState();
    if(name==='reports')renderReports();
    try{localStorage.setItem('decklab.lastWorkspace.v11',name);}catch(_){ }
  }
  function goLegacy(mode){
    hideAux();
    switchMode(mode);
    renderShellState();
    if(['test','plugin','layout','host'].includes(mode))requestAnimationFrame(renderContextDeviceDock);
    try{localStorage.setItem('decklab.lastWorkspace.v11',mode);}catch(_){ }
  }
  function goStudio(submode){
    window.decklabLivePreview=submode==='preview';
    document.body.classList.toggle('studio-live-preview',window.decklabLivePreview);
    if(submode==='preview'||submode==='build')goLegacy('profile');
    else if(submode==='artwork')goLegacy('profile');
    else if(submode==='test')goLegacy('test');
    else if(submode==='inspect')goLegacy(lastInspect);
  }

  function setProfileTargetPreserve(key){
    if(typeof profileState==='undefined')return;
    if(profileState.target===key)return;
    try{if(profileState.connected)profileSendVisibleDisappear('target device changed');}catch(_){ }
    profileState.target=key;
    profileState.rows=null; profileState.cols=null;
    profileState.deviceId=`decklab-profile-${key}-${String(Date.now()).slice(-5)}`;
    try{if(profileState.connected){profileSendDeviceConnect();profileSendVisibleAppear('target device changed');}}catch(_){ }
    try{renderProfileLab();profileScheduleAutosave();}catch(_){ }
  }

  function selectStudioDevice(key,{enter=false}={}){
    key=canonicalPickerKey(key);
    if(!DEVICES[key])return;
    const old=currentDeviceKey;
    currentDeviceKey=key;
    if(deviceSelect){deviceSelect.value=key;selected=null;}
    if(typeof profileState!=='undefined' && profileState.target!==key){
      if(profileState.placements?.length){setProfileTargetPreserve(key);}else{
        try{resetProfileSession({target:key,emit:true});}catch(_){profileState.target=key;}
      }
    }
    const pt=byId('profileTargetDevice');if(pt)pt.value=key;
    try{if(currentMode==='device')renderDevice({logConnect:old!==key});}catch(_){ }
    try{if(currentMode==='profile')renderProfileLab();}catch(_){ }
    try{localStorage.setItem(CHOSEN_KEY,'1');}catch(_){ }
    closeDevicePicker();renderShellState();renderContextDeviceDock();
    if(enter)goStudio(window.decklabLivePreview?'preview':'build');
  }

  function makeDeviceCard(key){
    const d=DEVICES[key],art=DeckLabSurface.OFFICIAL_ARTWORK?.[key];
    const btn=document.createElement('button');btn.type='button';btn.className='device-picker-item';btn.dataset.deviceKey=key;
    const visual=document.createElement('span');visual.className='device-picker-visual';
    if(art){const img=document.createElement('img');img.src=art.src;img.alt='';img.draggable=false;visual.appendChild(img);}else{
      const mini=document.createElement('span');mini.className=`device-picker-glyph shape-${d.hardwareShape||d.family||'deck'}`;
      mini.textContent=d.inputOnly?'⌁':d.hardwareShape==='pedal'?'▰':d.hardwareShape==='galleon'?'⌨':d.hardwareShape==='xeneon'?'▭':'▦';visual.appendChild(mini);
    }
    const meta=document.createElement('span');meta.className='device-picker-meta';
    meta.innerHTML=`<strong>${safeText(d.name)}</strong><small>${d.rows} × ${d.cols}${d.dials?` · ${d.dials} dial${d.dials===1?'':'s'}`:''}${d.neo?' · Infobar':''}${d.inputOnly?' · input only':''}</small>`;
    btn.append(visual,meta);btn.addEventListener('click',()=>selectStudioDevice(key,{enter:true}));return btn;
  }
  function makeGroup(title,keys,{collapsible=false,open=true,description=''}={}){
    const wrap=document.createElement(collapsible?'details':'section');wrap.className='device-picker-group';if(collapsible)wrap.open=open;
    const head=collapsible?document.createElement('summary'):document.createElement('div');head.className='device-picker-group-title';
    head.innerHTML=`<span><strong>${title}</strong>${description?`<small>${description}</small>`:''}</span><em>${keys.length}</em>`;wrap.appendChild(head);
    const grid=document.createElement('div');grid.className='device-picker-grid';keys.forEach(k=>grid.appendChild(makeDeviceCard(k)));wrap.appendChild(grid);return wrap;
  }
  function renderDevicePicker(){
    const host=byId('devicePickerGroups');if(!host)return;host.innerHTML='';
    host.appendChild(makeGroup('Stream Deck devices',PRIMARY,{description:'The main design and preview targets'}));
    host.appendChild(makeGroup('Other surfaces',OTHER,{collapsible:true,open:false,description:'Useful for compatibility and alternate display surfaces'}));
    host.appendChild(makeGroup('Input-only integrations',INPUT_ONLY,{collapsible:true,open:false,description:'Supported for triggering/testing without pretending they are LCD decks'}));
  }
  function openDevicePicker(){renderDevicePicker();byId('devicePickerOverlay')?.classList.remove('hidden');}
  function closeDevicePicker(){byId('devicePickerOverlay')?.classList.add('hidden');}

  function renderContextDeviceDock(){
    const key=currentDeviceKey||'standard',d=DEVICES[key];
    if(currentMode==='test'){
      const host=byId('testStudioDeviceDock');if(host){
        if(host.dataset.renderedDevice===key)return;host.dataset.renderedDevice=key;
        DeckLabSurface.render(host,{deviceKey:key,mode:'compat',maxWidth:d.hardwareShape==='studio'?740:410,factories:{
          key:(i)=>{const el=document.createElement('div');el.className='dock-key-face';el.textContent=String(i+1);return el;},
          dial:(i)=>{const el=document.createElement('div');el.className='dock-dial-face';el.textContent='';return el;},
          touch:()=>document.createElement('div'),neo:()=>{const e=document.createElement('div');e.className='dock-display-face';e.textContent='INFOBAR';return e;}
        }});
        byId('testStudioDeviceName').textContent=d.name;
      }
    }
    if(['plugin','layout','host'].includes(currentMode))ensureInspectDock(key,d);
  }
  function ensureInspectDock(key,d){
    const map={plugin:'pluginMode',layout:'layoutMode',host:'hostMode'};const section=byId(map[currentMode]);if(!section)return;
    const main=section.querySelector('main');if(!main)return;
    let card=section.querySelector('.inspect-device-dock-card');
    if(!card){card=document.createElement('section');card.className='runtime-card inspect-device-dock-card';card.innerHTML='<div class="studio-device-dock-head"><div><div class="tiny-label">SELECTED DEVICE</div><h3 class="inspect-device-dock-name">—</h3></div><button class="secondary inspect-change-device" type="button">Change device</button></div><div class="inspect-device-dock"></div>';(currentMode==='layout'?section.querySelector('.layout-code-panel'):main).prepend(card);card.querySelector('.inspect-change-device').addEventListener('click',openDevicePicker);}
    card.querySelector('.inspect-device-dock-name').textContent=d.name;
    const dock=card.querySelector('.inspect-device-dock');if(dock.dataset.renderedDevice===key)return;dock.dataset.renderedDevice=key;
    DeckLabSurface.render(card.querySelector('.inspect-device-dock'),{deviceKey:key,mode:'compat',maxWidth:currentMode==='layout'?Math.min(180,140*DeckLabSurface.geometryFor(key).w/DeckLabSurface.geometryFor(key).h):d.hardwareShape==='studio'?720:390,factories:{key:(i)=>{const e=document.createElement('div');e.className='dock-key-face';e.textContent=String(i+1);return e;},dial:()=>document.createElement('div'),touch:()=>document.createElement('div'),neo:()=>{const e=document.createElement('div');e.className='dock-display-face';e.textContent='INFOBAR';return e;}}});
  }

  function renderReports(){
    const hist=(typeof project10State!=='undefined'&&Array.isArray(project10State.qaHistory))?project10State.qaHistory:[];
    const h=byId('reportsQaHeading'),t=byId('reportsQaText');if(h)h.textContent=hist.length?`${hist.length} QA run${hist.length===1?'':'s'} saved`:'No QA runs yet';
    if(t){if(hist.length){const s=hist.at(-1)?.report?.summary||{};t.textContent=`Latest: ${s.pass||0} pass · ${s.warn||0} warnings · ${s.fail||0} failures · ${s.skip||0} skipped.`;}else t.textContent='Run a plugin test from Device Studio → Test and the result will appear here.';}
  }

  function updateInspectTool(){const sel=byId('studioInspectTool');if(sel)sel.value=lastInspect;}
  function renderShellState(){
    if(currentMode==='profile'&&typeof profileState!=='undefined'&&DEVICES[profileState.target]){currentDeviceKey=profileState.target;if(deviceSelect)deviceSelect.value=currentDeviceKey;}
    const shell=shellForCurrent();
    document.querySelectorAll('.shell-tab').forEach(b=>b.classList.toggle('active',b.dataset.shell===shell));
    const studio=studioInternalMode();const tb=byId('studioMasterToolbar');if(tb)tb.classList.toggle('hidden',shell!=='studio');
    document.querySelectorAll('.studio-shell-mode').forEach(b=>b.classList.toggle('active',b.dataset.studioMode===studio));
    const key=currentDeviceKey||'standard',d=DEVICES[key]||DEVICES.standard;
    if(byId('studioDeviceLabel'))byId('studioDeviceLabel').textContent=d.name;
    window.DeckLabAppearance?.syncPicker(key);
    document.body.classList.toggle('studio-live-preview',currentMode==='profile'&&!!window.decklabLivePreview);
    window.DeckLabBuildTools?.sync();
    const iw=byId('inspectToolWrap');if(iw)iw.classList.toggle('hidden',studio!=='inspect');
    updateInspectTool();
    const hint=byId('studioContextHint');if(hint){hint.textContent=studio==='preview'?'Click keys to run · scroll dials to rotate':studio==='build'?'Drag actions onto the device · select to configure':studio==='test'?'Run QA while keeping the target device in view':studio==='inspect'?'Advanced package and protocol tools':'Choose a device to begin';}
  }

  function wire(){
    document.querySelectorAll('.shell-tab').forEach(b=>b.addEventListener('click',()=>{
      const s=b.dataset.shell;if(s==='project')goLegacy('project');else if(s==='studio'){
        let chosen=false;try{chosen=localStorage.getItem(CHOSEN_KEY)==='1';}catch(_){ }
        goStudio(studioInternalMode()||'build');if(!chosen)setTimeout(openDevicePicker,50);
      }else showAux(s);
    }));
    document.querySelectorAll('.studio-shell-mode').forEach(b=>b.addEventListener('click',()=>goStudio(b.dataset.studioMode)));
    byId('studioChooseDeviceBtn')?.addEventListener('click',openDevicePicker);
    byId('devicePickerCloseBtn')?.addEventListener('click',closeDevicePicker);
    byId('devicePickerOverlay')?.addEventListener('click',e=>{if(e.target===byId('devicePickerOverlay'))closeDevicePicker();});
    byId('studioAppearanceSelect')?.addEventListener('change',e=>window.DeckLabAppearance?.select(currentDeviceKey,e.target.value));
    byId('studioInspectTool')?.addEventListener('change',e=>{lastInspect=e.target.value;try{localStorage.setItem(INSPECT_KEY,lastInspect);}catch(_){ }goLegacy(lastInspect);});
    byId('testChangeDeviceBtn')?.addEventListener('click',openDevicePicker);
    byId('reportsOpenTestBtn')?.addEventListener('click',()=>goStudio('test'));
    byId('reportsCompareBtn')?.addEventListener('click',()=>{goStudio('test');try{renderQaHistory();renderQaComparison();}catch(_){ }});
    byId('reportsCompatBtn')?.addEventListener('click',()=>{goStudio('build');setTimeout(()=>{try{toggleProfileCompatibility(true);}catch(_){ }},40);});
    byId('reportsBugBtn')?.addEventListener('click',()=>{if(typeof createCommunityBugReport==='function')createCommunityBugReport();else byId('communityBugBtn')?.click();});
    byId('reportsProjectBtn')?.addEventListener('click',()=>{if(typeof exportDeckLabProject==='function')exportDeckLabProject();});
    document.querySelectorAll('[data-help-task]').forEach(b=>b.addEventListener('click',()=>goStudio(b.dataset.helpTask)));
    byId('helpTourBtn')?.addEventListener('click',()=>{if(typeof openOnboarding==='function')openOnboarding();});
    document.querySelectorAll('[data-inspect-tool]').forEach(b=>b.addEventListener('click',()=>{lastInspect=b.dataset.inspectTool;goLegacy(lastInspect);}));
    // Existing Profile target selector now preserves the profile instead of wiping it.
    const pt=byId('profileTargetDevice');if(pt){
      const clone=pt.cloneNode(true);pt.parentNode.replaceChild(clone,pt);
      clone.addEventListener('change',e=>selectStudioDevice(e.target.value));
    }
    // Existing preview device selector remains a compatibility mirror, but the master picker is primary.
    if(deviceSelect)deviceSelect.addEventListener('change',()=>{currentDeviceKey=deviceSelect.value;renderShellState();renderContextDeviceDock();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDevicePicker();});
  }

  function patchLabels(){
    const p=byId('projectOpenPluginBtn');if(p)p.textContent='Inspect plugin';
    const q=byId('projectOpenQaBtn');if(q)q.textContent='Open Test';
    const l=byId('openLayoutLabBtn');if(l)l.textContent='Edit layout';
    const ta=byId('testActionSelect');if(ta)ta.title='Actions from the currently loaded plugin';
  }

  function updateVersionText(){
    document.title='DeckLab 1.3.9 Community Alpha — Interactive Stream Deck Simulator & Plugin QA Studio';
    document.querySelectorAll('.eyebrow').forEach(e=>{if(e.textContent.includes('1.'))e.textContent='INTERACTION & GUIDANCE · DEVICE STUDIO · STREAM DECK SIMULATOR · 1.3.9 COMMUNITY ALPHA';});
  }

  function boot(){
    updateVersionText();patchLabels();renderDevicePicker();wire();renderShellState();renderContextDeviceDock();
    // Device Studio is the natural first working surface for a fresh session; project remains available one click away.
    setInterval(()=>{if(auxMode&&currentMode!==auxMode){byId('reportsMode')?.classList.add('hidden');byId('helpMode')?.classList.add('hidden');auxMode=null;}renderShellState();if(studioInternalMode()&&['test','plugin','layout','host'].includes(currentMode))renderContextDeviceDock();if(auxMode==='reports')renderReports();let chosen=false;try{chosen=localStorage.getItem(CHOSEN_KEY)==='1';}catch(_){ }if(currentMode==='device'&&!chosen&&!autoPickerDone){autoPickerDone=true;openDevicePicker();}},900);
    let chosen=false;try{chosen=localStorage.getItem(CHOSEN_KEY)==='1';}catch(_){ }if(currentMode==='device'&&!chosen){autoPickerDone=true;setTimeout(openDevicePicker,180);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,40));else setTimeout(boot,40);

  window.DeckLabUX11={version:UX_VERSION,openDevicePicker,selectStudioDevice,goStudio,showAux,openLayout:()=>{window.decklabLivePreview=false;goLegacy('layout');}};
})();
