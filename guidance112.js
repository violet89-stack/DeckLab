// SPDX-License-Identifier: MPL-2.0
/* DeckLab 1.1.2 — Interaction & Guidance layer.
   Discoverability and usability only: tooltips, smart empty states, command palette,
   contextual help, Beginner/Developer presentation, right-click actions, zoom/fit,
   status feedback and inline drag compatibility guidance. */
(function(){
  'use strict';
  const UX_VERSION='1.3.9-alpha.31';
  const PREF_KEY='decklab.experience.v112';
  const ZOOM_KEY='decklab.deviceZoom.v112';
  let experience='beginner';
  let zoom=1;let refreshObserver=null;
  let tooltipTarget=null;
  let paletteIndex=0;
  let buildCoachDismissed=false;
  const surfaceBases=new WeakMap();

  const $=id=>document.getElementById(id);
  const $$=(sel,root=document)=>[...root.querySelectorAll(sel)];
  const typingTarget=el=>['INPUT','TEXTAREA','SELECT'].includes(el?.tagName)||el?.isContentEditable;
  const getCurrentMode=()=>typeof currentMode!=='undefined'?currentMode:null;
  const getCurrentDevice=()=>typeof currentDeviceKey!=='undefined'?currentDeviceKey:'standard';
  const modeName=()=>({project:'Project',device:'Artwork',profile:window.decklabLivePreview?'Live Preview':'Build',test:'Test',plugin:'Inspect · Plugin',layout:'Inspect · Layout',host:'Inspect · Runtime',reports:'Reports',help:'Help'}[getCurrentMode()]||'DeckLab');
  const studioMode=()=>({device:'preview',profile:window.decklabLivePreview?'preview':'build',test:'test',plugin:'inspect',layout:'inspect',host:'inspect'}[getCurrentMode()]||null);

  function notify(message,{kind='info',timeout=2200}={}){
    const host=$('uxToastRegion');if(!host)return;
    const toast=document.createElement('div');toast.className=`ux-toast ${kind}`;toast.textContent=message;host.appendChild(toast);
    requestAnimationFrame(()=>toast.classList.add('show'));
    setTimeout(()=>{toast.classList.remove('show');setTimeout(()=>toast.remove(),180);},timeout);
  }

  function setExperience(next,{announce=true}={}){
    experience=next==='developer'?'developer':'beginner';
    document.body.classList.toggle('ux-developer-mode',experience==='developer');
    document.body.classList.toggle('ux-beginner-mode',experience!=='developer');
    const sel=$('experienceModeSelect');if(sel)sel.value=experience;
    try{localStorage.setItem(PREF_KEY,experience);}catch(_){ }
    if(announce)notify(experience==='developer'?'Developer view enabled · SDK details visible':'Beginner view enabled · advanced SDK detail tucked away',{kind:'good'});
    refreshStatus();
  }

  function tipText(el){
    if(!el)return '';
    return el.dataset?.dlTip||el.getAttribute?.('aria-description')||'';
  }
  function decorateTips(root=document){
    const staticTips={
      commandPaletteBtn:'Search almost anything in DeckLab · Ctrl+K',
      studioChooseDeviceBtn:'Change the hardware target without leaving Device Studio',
      studioAppearanceSelect:'Switch the 15-key hardware appearance while keeping the same functional layout',
      studioInspectTool:'Choose which advanced developer inspector to open',
      profileCompatToggleBtn:'See how this exact profile adapts to every supported device',
      profileUndoBtn:'Undo the last profile edit · Ctrl+Z',profileRedoBtn:'Redo the last profile edit · Ctrl+Y',
      profileCopyBtn:'Copy the selected placement · Ctrl+C',profilePasteBtn:'Paste into a compatible empty slot · Ctrl+V',
      profileDuplicateBtn:'Duplicate the selected item into the first compatible empty slot',profileRemoveSelectedBtn:'Delete the selected placement · Delete',
      profileActionSearch:'Search actions by friendly name, plugin ID, or controller type',
      testRunBtn:'Run the selected static and live checks. Live checks activate only when a trusted plugin is already connected.',
      projectExportBtn:'Save the current DeckLab project as a portable JSON file',
      reportsBugBtn:'Create a sanitized diagnostic ZIP suitable for attaching to a community issue'
    };
    Object.entries(staticTips).forEach(([id,text])=>{const el=$(id);if(el)el.dataset.dlTip=text;});
    $$('.studio-shell-mode',root).forEach(b=>b.dataset.dlTip=({preview:'Interact with the selected hardware',build:'Drag actions onto the same hardware surface',test:'Run plugin QA while keeping the target device visible',inspect:'Open package, layout and runtime developer tools'}[b.dataset.studioMode]||''));
    $$('.shell-tab',root).forEach(b=>b.dataset.dlTip=({project:'Project files, notes and recent state',studio:'Preview, build, test and inspect around one selected device',reports:'QA history, compatibility and bug reports',help:'Task help, tour and advanced developer shortcuts'}[b.dataset.shell]||''));
    $$('.profile-slot',root).forEach(el=>{el.dataset.dlTip=window.decklabLivePreview?(el.classList.contains('occupied')?'Click to run':'Empty key · add actions in Build'):el.classList.contains('occupied')?'Click to select · double-click to run · drag to move · right-click for actions':'Empty key · drag a compatible action here, or click after choosing an action';});
    $$('.profile-touch-slot',root).forEach(el=>{el.dataset.dlTip=window.decklabLivePreview?(el.classList.contains('occupied')?'Click to run':'Empty key · add actions in Build'):el.classList.contains('occupied')?'Encoder display/touch action · click to select · drag to move':'Drop an Encoder action here';});
    $$('.profile-dial-control',root).forEach(el=>{if(!el.dataset.dlTip)el.dataset.dlTip='Mouse wheel rotates the dial · press/hold simulates dial press';});
    $$('.profile-neo-touch-point',root).forEach(el=>{if(!el.dataset.dlTip)el.dataset.dlTip=el.title||'Neo hardware page navigation';});
    $$('.builder-action-controller',root).forEach(el=>{el.dataset.dlTip=`${el.textContent.trim()} controller${el.classList.contains('incompatible')?' · not available on the selected device':''}`;});
    $$('.profile-compat-target',root).forEach(el=>{if(!el.dataset.dlTip){const name=el.querySelector('.compat-target-name')?.textContent||'Target';const status=el.querySelector('.compat-target-status')?.textContent||'';const lines=$$('.compat-target-line',el).map(x=>x.textContent).join(' · ');el.dataset.dlTip=`${name} · ${status}${lines?` · ${lines}`:''}`;}});
    $$('[title]',root).forEach(el=>{if(!el.dataset.dlTip&&el.title){el.dataset.dlTip=el.title;el.dataset.nativeTitle=el.title;el.removeAttribute('title');}});
  }
  function showTooltip(target,e){
    const text=tipText(target);if(!text)return;const tip=$('uxTooltip');if(!tip)return;tooltipTarget=target;tip.textContent=text;tip.classList.remove('hidden');positionTooltip(e||null,target);
  }
  function positionTooltip(e,target){const tip=$('uxTooltip');if(!tip||tip.classList.contains('hidden'))return;const margin=12;let x,y;if(e?.clientX){x=e.clientX+14;y=e.clientY+18;}else{const r=target.getBoundingClientRect();x=r.left+r.width/2;y=r.bottom+8;}const w=tip.offsetWidth||260,h=tip.offsetHeight||40;x=Math.min(window.innerWidth-w-margin,Math.max(margin,x));y=Math.min(window.innerHeight-h-42,Math.max(margin,y));tip.style.left=`${x}px`;tip.style.top=`${y}px`;}
  function hideTooltip(){tooltipTarget=null;$('uxTooltip')?.classList.add('hidden');}

  function setZoom(next,{announce=false}={}){
    zoom=Math.max(.65,Math.min(1.5,Math.round(next*20)/20));try{localStorage.setItem(ZOOM_KEY,String(zoom));}catch(_){ }
    applyZoom();const label=$('studioZoomLabel');if(label)label.textContent=`${Math.round(zoom*100)}%`;
    if(announce)notify(zoom===1?'Device fit reset':`Device zoom ${Math.round(zoom*100)}%`);
  }
  function applyZoom(root=document){
    $$('.mode-view:not(.hidden) .device-surface-host .ds-surface',root).forEach(s=>{
      let base=surfaceBases.get(s);if(!base){base=Number(s.dataset.baseWidth)||parseFloat(s.style.maxWidth)||760;surfaceBases.set(s,base);}s.style.maxWidth=`${Math.round(base*zoom)}px`;
    });
  }

  function selectedProfileContext(){
    try{return typeof selectedProfilePlacement==='function'?selectedProfilePlacement():null;}catch(_){return null;}
  }
  function contextMenuItems(target){
    const items=[];
    const pid=target?.closest?.('[data-profile-id]')?.dataset.profileId;
    let p=null;try{if(pid&&typeof profilePlacementById==='function')p=profilePlacementById(pid);}catch(_){ }
    if(p){
      try{selectProfilePlacement(p,{render:false});}catch(_){ }
      if(p.kind==='action')items.push({label:'Test action',hint:'Double-click',run:()=>{try{profileRunAction(p);}catch(_){ }}});
      items.push({label:'Copy',hint:'Ctrl+C',run:()=>{try{profileCopySelected();notify('Copied placement',{kind:'good'});}catch(_){ }}});
      items.push({label:'Duplicate',run:async()=>{try{await profileDuplicateSelected();notify('Duplicated placement',{kind:'good'});}catch(_){ }}});
      items.push({sep:true});
      items.push({label:'Delete',danger:true,hint:'Delete',run:()=>{try{removeSelectedProfilePlacement();notify('Removed placement');}catch(_){ }}});
    }else if((typeof profileState!=='undefined'&&profileState?.clipboard)){items.push({label:'Paste',hint:'Ctrl+V',run:()=>{try{profilePasteMode();notify('Paste mode active');}catch(_){ }}});}
    return items;
  }
  function showContextMenu(x,y,items){const menu=$('uxContextMenu');if(!menu||!items.length)return;menu.innerHTML='';items.forEach(item=>{if(item.sep){const hr=document.createElement('div');hr.className='ux-context-separator';menu.appendChild(hr);return;}const b=document.createElement('button');b.type='button';b.className=item.danger?'danger':'';b.innerHTML=`<span>${item.label}</span>${item.hint?`<kbd>${item.hint}</kbd>`:''}`;b.addEventListener('click',async()=>{hideContextMenu();await item.run?.();refreshAll();});menu.appendChild(b);});menu.classList.remove('hidden');menu.style.left=`${Math.min(x,window.innerWidth-210)}px`;menu.style.top=`${Math.min(y,window.innerHeight-menu.offsetHeight-44)}px`;}
  function hideContextMenu(){$('uxContextMenu')?.classList.add('hidden');}

  function commandCatalog(){
    const go=s=>()=>window.DeckLabUX11?.goStudio?.(s);
    const shell=s=>()=>document.querySelector(`.shell-tab[data-shell="${s}"]`)?.click();
    const list=[
      {name:'Preview selected device',group:'Device Studio',keys:'P',terms:'device preview interact',run:go('preview')},
      {name:'Build profile',group:'Device Studio',keys:'B',terms:'profile edit drag actions',run:go('build')},
      {name:'Test plugin',group:'Device Studio',keys:'T',terms:'qa validation checks',run:go('test')},
      {name:'Inspect plugin / SDK',group:'Device Studio',terms:'manifest layout protocol runtime advanced',run:go('inspect')},
      {name:'Choose device…',group:'Device Studio',terms:'hardware switch target',run:()=>window.DeckLabUX11?.openDevicePicker?.()},
      {name:'Fit device to workspace',group:'View',keys:'Ctrl 0',terms:'zoom reset',run:()=>setZoom(1,{announce:true})},
      {name:'Zoom device in',group:'View',keys:'Ctrl +',terms:'bigger scale',run:()=>setZoom(zoom+.1,{announce:true})},
      {name:'Zoom device out',group:'View',keys:'Ctrl -',terms:'smaller scale',run:()=>setZoom(zoom-.1,{announce:true})},
      {name:'Beginner view',group:'View',terms:'simple hide sdk details',run:()=>setExperience('beginner')},
      {name:'Developer view',group:'View',terms:'advanced sdk uuid protocol details',run:()=>setExperience('developer')},
      {name:'Project',group:'Navigate',terms:'save notes dashboard',run:shell('project')},
      {name:'Reports',group:'Navigate',terms:'qa compatibility history regression',run:shell('reports')},
      {name:'Help',group:'Navigate',terms:'tour guide documentation',run:shell('help')},
      {name:'Load built-in demo plugin',group:'Quick actions',terms:'sample actions',run:async()=>{if(typeof loadSamplePlugin==='function'){await loadSamplePlugin();notify('Demo plugin loaded',{kind:'good'});refreshAll();}}},
      {name:'Build demo profile',group:'Quick actions',terms:'sample profile populate',run:async()=>{window.DeckLabUX11?.goStudio?.('build');setTimeout(async()=>{if(typeof buildProfileDemo==='function'){await buildProfileDemo();notify('Demo profile built',{kind:'good'});}},80);}},
      {name:'Import plugin folder…',group:'Quick actions',terms:'sdplugin load package',run:()=>{$('pluginFolderInput')?.click();}},
      {name:'Compare current profile across devices',group:'Quick actions',terms:'compatibility adapt degraded',run:()=>{window.DeckLabUX11?.goStudio?.('build');setTimeout(()=>{try{toggleProfileCompatibility(true);}catch(_){ }},80);}},
      {name:'Save DeckLab project',group:'Quick actions',terms:'export json project',run:()=>$('projectExportBtn')?.click()},
      {name:'Create sanitized bug report',group:'Quick actions',terms:'diagnostic issue community report',run:()=>$('reportsBugBtn')?.click()},
      {name:'Quick tour',group:'Help',terms:'onboarding intro',run:()=>$('openTourBtn')?.click()}
    ];
    const primary=['mini','standard','xl','neo','plus','plusxl','mobile','studio','galleon'];
    primary.forEach(key=>{const d=(typeof DEVICES!=='undefined'?DEVICES?.[key]:null)||window.DeckLabSurface?.DEVICES?.[key];if(d)list.push({name:`Switch device · ${d.name}`,group:'Devices',terms:`hardware ${key}`,run:()=>window.DeckLabUX11?.selectStudioDevice?.(key,{enter:true})});});
    return list;
  }
  function scoreCommand(c,q){if(!q)return 1;const h=`${c.name} ${c.group} ${c.terms||''}`.toLowerCase();const words=q.toLowerCase().split(/\s+/).filter(Boolean);if(!words.every(w=>h.includes(w)))return -1;let score=words.reduce((n,w)=>n+(c.name.toLowerCase().startsWith(w)?8:c.name.toLowerCase().includes(w)?4:1),0);return score;}
  function renderPalette(){const input=$('commandPaletteInput'),host=$('commandPaletteResults');if(!input||!host)return;const q=input.value.trim();const items=commandCatalog().map(c=>({c,s:scoreCommand(c,q)})).filter(x=>x.s>=0).sort((a,b)=>b.s-a.s||a.c.group.localeCompare(b.c.group)||a.c.name.localeCompare(b.c.name)).slice(0,16);paletteIndex=Math.max(0,Math.min(paletteIndex,Math.max(0,items.length-1)));host.innerHTML='';if(!items.length){host.innerHTML='<div class="command-palette-empty">No matching command. Try a device name, “test”, “zoom” or “report”.</div>';return;}items.forEach(({c},i)=>{const b=document.createElement('button');b.type='button';b.className=`command-palette-result ${i===paletteIndex?'selected':''}`;b.setAttribute('role','option');b.innerHTML=`<span><small>${c.group}</small><strong>${c.name}</strong></span>${c.keys?`<kbd>${c.keys}</kbd>`:''}`;b.addEventListener('mouseenter',()=>{paletteIndex=i;renderPalette();});b.addEventListener('click',async()=>{closePalette();await c.run?.();refreshAll();});host.appendChild(b);});host._items=items.map(x=>x.c);}
  function openPalette(){const o=$('commandPaletteOverlay');if(!o)return;o.classList.remove('hidden');paletteIndex=0;const input=$('commandPaletteInput');input.value='';renderPalette();setTimeout(()=>input.focus(),10);}
  function closePalette(){$('commandPaletteOverlay')?.classList.add('hidden');}
  async function runPaletteSelection(){const host=$('commandPaletteResults'),items=host?._items||[];const c=items[paletteIndex];if(!c)return;closePalette();await c.run?.();refreshAll();}

  const coachContent={
    preview:{title:'Preview the real interaction',body:'<p>Press LCD keys, scroll over dials to rotate them, click/hold dials to press, and interact with touch surfaces.</p><div class="coach-shortcuts"><span>Click <b>press</b></span><span>Wheel <b>rotate</b></span><span>Device ▾ <b>switch hardware</b></span></div>'},
    build:{title:'Build directly on the device',body:'<p>Drag compatible actions from the library onto highlighted slots. Click a placement to configure it; double-click to test it; right-click for copy, duplicate and delete.</p><div class="coach-shortcuts"><span>Ctrl+Z <b>undo</b></span><span>Ctrl+C/V <b>copy/paste</b></span><span>Delete <b>remove</b></span></div>'},
    test:{title:'Test without losing device context',body:'<p>Static QA works immediately. Live lifecycle/input checks activate only after you explicitly start a trusted plugin and it connects to DeckLab.</p><div class="coach-shortcuts"><span>PASS <b>valid behaviour</b></span><span>WARN <b>degraded/attention</b></span><span>SKIP <b>not applicable</b></span></div>'},
    inspect:{title:'Advanced developer inspection',body:'<p>Inspect manifests, Property Inspectors, runtime contexts and raw SDK traffic. Switch to Developer view for maximum technical detail.</p><div class="coach-shortcuts"><span>Plugin <b>package</b></span><span>Runtime <b>protocol</b></span></div>'}
  };
  function showModeCoach(){const m=studioMode()||'preview',c=coachContent[m]||coachContent.preview;$('modeCoachTitle').textContent=c.title;$('modeCoachBody').innerHTML=c.body;$('modeCoach').classList.remove('hidden');}
  function closeModeCoach(){$('modeCoach')?.classList.add('hidden');}

  function updateBuildCoach(){
    const card=document.querySelector('#profileMode .profile-stage-card');if(!card)return;
    let coach=card.querySelector('.ux-build-empty-coach');
    const empty=!window.decklabLivePreview&&getCurrentMode()==='profile'&&Array.isArray((typeof profileState!=='undefined'?profileState?.placements:null))&&profileState.placements.length===0&&!buildCoachDismissed;
    if(!empty){coach?.remove();return;}
    if(coach)return;
    coach=document.createElement('div');coach.className='ux-build-empty-coach';coach.innerHTML='<button class="ux-coach-dismiss" type="button" aria-label="Dismiss">×</button><div><strong>Start by dragging an action onto the device</strong><span>Compatible actions are shown first. Incompatible actions stay visible so you can understand what the selected hardware supports.</span></div><div class="ux-build-coach-actions"><button class="primary" data-coach="demo" type="button">Build demo</button><button class="secondary" data-coach="plugin" type="button">Import plugin</button></div>';
    coach.querySelector('.ux-coach-dismiss').addEventListener('click',()=>{buildCoachDismissed=true;coach.remove();});
    coach.querySelector('[data-coach="demo"]').addEventListener('click',async()=>{if(typeof buildProfileDemo==='function')await buildProfileDemo();notify('Demo profile built',{kind:'good'});});
    coach.querySelector('[data-coach="plugin"]').addEventListener('click',()=>$('pluginFolderInput')?.click());card.prepend(coach);
  }
  function updateTestCoach(){
    const card=$('testStudioDeviceDockCard');if(!card)return;let coach=card.querySelector('.ux-test-coach');const need=getCurrentMode()==='test'&&!(typeof pluginState!=='undefined'?pluginState?.manifest:null);
    if(!need){coach?.remove();return;}if(coach)return;
    coach=document.createElement('div');coach.className='ux-test-coach';coach.innerHTML='<strong>No plugin loaded yet</strong><span>You can load the built-in sample or import an .sdPlugin folder. Static QA never executes imported plugin code.</span><div><button class="secondary" data-test-coach="demo" type="button">Load demo</button><button class="secondary" data-test-coach="import" type="button">Import plugin</button></div>';
    coach.querySelector('[data-test-coach="demo"]').addEventListener('click',async()=>{if(typeof loadSamplePlugin==='function')await loadSamplePlugin();notify('Demo plugin loaded',{kind:'good'});refreshAll();});coach.querySelector('[data-test-coach="import"]').addEventListener('click',()=>$('pluginFolderInput')?.click());card.prepend(coach);
  }

  function dragFeedback(ev){
    if(getCurrentMode()!=='profile'||!(typeof profileState!=='undefined'?profileState?.dragDescriptor:null))return;
    const control=ev.target.closest?.('.ds-control');if(!control)return;
    const kind=control.dataset.surfaceKind,idx=Number(control.dataset.surfaceIndex)||0,d=typeof profileDevice==='function'?profileDevice():null;if(!d)return;
    let controller=null,c=0,r=0;if(kind==='key'){controller='Keypad';c=idx%d.cols;r=Math.floor(idx/d.cols);}else if(['touch','display','dial'].includes(kind)){controller='Encoder';c=idx;}else if(kind==='neo'){controller='Neo';}
    if(!controller)return;
    let ok=false;try{ok=profileDragCompatible(profileState.dragDescriptor,controller,c,r);}catch(_){ }
    const desc=profileState.dragDescriptor;let label='item';if(desc.kind==='action')label=pluginState?.manifest?.Actions?.[desc.actionIndex]?.Name||'action';else if(desc.kind)label=desc.kind.replaceAll('-',' ');
    const msg=ok?`Drop ${label} here · ${controller} compatible`:`${label} cannot use this ${controller} surface`;
    const hint=$('statusHint');if(hint)hint.innerHTML=`<span>${ok?'Drop':'Cannot drop'}</span><strong>${msg}</strong>`;
    const ph=$('profilePlacementHint');if(ph)ph.textContent=msg;
  }
  function resetDragFeedback(){const hint=$('statusHint');if(hint)hint.innerHTML='<span>Tip</span><strong>Ctrl+K opens commands</strong>';try{if(getCurrentMode()==='profile'&&typeof setProfilePending==='function')setProfilePending(profileState.pending);}catch(_){ }}

  function qaWarningCount(){try{const hist=(typeof project10State!=='undefined'?project10State?.qaHistory:null)||[];const s=hist.at(-1)?.report?.summary||{};return Number(s.warn||0)+Number(s.fail||0);}catch(_){return 0;}}
  function profileWarningCount(){try{if(getCurrentMode()==='profile'&&typeof analyzeProfileForTarget==='function'){const a=analyzeProfileForTarget(profileState.target);return (a.issues||[]).filter(i=>i.kind==='warn'||i.kind==='bad').length;}}catch(_){ }return 0;}
  function refreshStatus(){
    const d=(typeof DEVICES!=='undefined'?DEVICES?.[getCurrentDevice()]:null)||window.DeckLabSurface?.DEVICES?.[getCurrentDevice()]||window.DeckLabSurface?.DEVICES?.standard;
    const device=$('statusDevice');if(device)device.querySelector('strong').textContent=d?.name||'Choose device';
    const mode=$('statusMode');if(mode)mode.querySelector('strong').textContent=modeName();
    const plug=$('statusPlugin');if(plug){const online=!!(typeof liveState!=='undefined'&&liveState?.pluginConnected);plug.querySelector('.ux-status-dot')?.classList.toggle('good',online);const span=plug.querySelector('span:last-child');if(span)span.textContent=online?'Plugin connected':'Plugin offline';}
    const warn=profileWarningCount()||qaWarningCount(),w=$('statusWarnings');if(w)w.querySelector('strong').textContent=String(warn);
    const save=$('statusSave');if(save){const text=$('projectSaveStatusTop')?.textContent||$('profileAutosaveBadge')?.textContent||'Autosave ready';const span=save.querySelector('span:last-child');if(span)span.textContent=text.replace(/^Project\s*/i,'').trim();}
    const label=$('studioZoomLabel');if(label)label.textContent=`${Math.round(zoom*100)}%`;
  }

  function refreshAll(){refreshObserver?.disconnect();try{decorateTips();applyZoom();updateBuildCoach();updateTestCoach();refreshStatus();}finally{refreshObserver?.observe(document.body,{childList:true,subtree:true});}}

  function wire(){
    $('experienceModeSelect')?.addEventListener('change',e=>setExperience(e.target.value));
    $('commandPaletteBtn')?.addEventListener('click',openPalette);
    $('commandPaletteInput')?.addEventListener('input',()=>{paletteIndex=0;renderPalette();});
    $('commandPaletteInput')?.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();paletteIndex++;renderPalette();}else if(e.key==='ArrowUp'){e.preventDefault();paletteIndex=Math.max(0,paletteIndex-1);renderPalette();}else if(e.key==='Enter'){e.preventDefault();runPaletteSelection();}else if(e.key==='Escape')closePalette();});
    $('commandPaletteOverlay')?.addEventListener('click',e=>{if(e.target===$('commandPaletteOverlay'))closePalette();});
    $('studioZoomOutBtn')?.addEventListener('click',()=>setZoom(zoom-.1,{announce:true}));$('studioZoomInBtn')?.addEventListener('click',()=>setZoom(zoom+.1,{announce:true}));$('studioFitBtn')?.addEventListener('click',()=>setZoom(1,{announce:true}));
    $('studioModeHelpBtn')?.addEventListener('click',showModeCoach);$('modeCoachClose')?.addEventListener('click',closeModeCoach);
    $('statusDevice')?.addEventListener('click',()=>window.DeckLabUX11?.openDevicePicker?.());$('statusMode')?.addEventListener('click',openPalette);$('statusPlugin')?.addEventListener('click',()=>{if(getCurrentMode()!=='host')window.DeckLabUX11?.goStudio?.('inspect');});$('statusWarnings')?.addEventListener('click',()=>{if(getCurrentMode()==='profile'){try{toggleProfileCompatibility(true);}catch(_){ }}else document.querySelector('.shell-tab[data-shell="reports"]')?.click();});$('statusHint')?.addEventListener('click',showModeCoach);
    document.addEventListener('mouseover',e=>{const t=e.target.closest?.('[data-dl-tip]');if(t)showTooltip(t,e);});document.addEventListener('mousemove',e=>{if(tooltipTarget)positionTooltip(e,tooltipTarget);});document.addEventListener('mouseout',e=>{if(tooltipTarget&&(!e.relatedTarget||!tooltipTarget.contains(e.relatedTarget)))hideTooltip();});document.addEventListener('focusin',e=>{const t=e.target.closest?.('[data-dl-tip]');if(t)showTooltip(t,null);});document.addEventListener('focusout',hideTooltip);
    document.addEventListener('contextmenu',e=>{if(getCurrentMode()!=='profile'||window.decklabLivePreview)return;const t=e.target.closest?.('.profile-slot,.profile-touch-slot,.profile-dial-slot,.profile-neo-slot');if(!t)return;const items=contextMenuItems(t);if(items.length){e.preventDefault();showContextMenu(e.clientX,e.clientY,items);}});
    document.addEventListener('pointerdown',e=>{if(!e.target.closest?.('#uxContextMenu'))hideContextMenu();});
    document.addEventListener('dragover',dragFeedback,true);document.addEventListener('drop',resetDragFeedback,true);document.addEventListener('dragend',resetDragFeedback,true);
    document.addEventListener('keydown',e=>{
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openPalette();return;}
      if(e.key==='Escape'){hideContextMenu();hideTooltip();closeModeCoach();if(!$('commandPaletteOverlay')?.classList.contains('hidden'))closePalette();}
      if(typingTarget(e.target))return;
      if((e.ctrlKey||e.metaKey)&&(['=','+'].includes(e.key))){e.preventDefault();setZoom(zoom+.1,{announce:true});}
      else if((e.ctrlKey||e.metaKey)&&e.key==='-'){e.preventDefault();setZoom(zoom-.1,{announce:true});}
      else if((e.ctrlKey||e.metaKey)&&e.key==='0'){e.preventDefault();setZoom(1,{announce:true});}
    });
  }

  function boot(){
    try{experience=localStorage.getItem(PREF_KEY)||'beginner';zoom=parseFloat(localStorage.getItem(ZOOM_KEY)||'1')||1;}catch(_){ }
    setExperience(experience,{announce:false});setZoom(zoom);
    document.title='DeckLab 1.3.9 Community Alpha — Interactive Stream Deck Simulator & Plugin QA Studio';
    $$('.eyebrow').forEach(e=>{if(e.textContent.includes('1.1.'))e.textContent='INTERACTION & GUIDANCE · DEVICE STUDIO · STREAM DECK SIMULATOR · 1.3.9 COMMUNITY ALPHA';});
    wire();decorateTips();refreshAll();
    refreshObserver=new MutationObserver(()=>{clearTimeout(refreshObserver._t);refreshObserver._t=setTimeout(refreshAll,35);});refreshObserver.observe(document.body,{childList:true,subtree:true});
    setInterval(refreshAll,700);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,120));else setTimeout(boot,120);
  window.DeckLabGuidance112={version:UX_VERSION,notify,openPalette,setExperience,setZoom,refresh:refreshAll,get zoom(){return zoom;}};
})();
