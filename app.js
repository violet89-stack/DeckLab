// SPDX-License-Identifier: MPL-2.0
const DEVICES = DeckLabSurface.DEVICES;

const GLYPHS = ['◉','⌁','♪','●','☀','✦','⌘','▣','◫','↻','⌕','⏱','≋','⌂','★','⚙','↯','⬢','◇','◌','◈','✣','☁','⌁','✦','◎','▤','◍','↗','⌨','♬','◆','⬡','✺','▦','✧','◐','◒'];
const DEMO_TITLES = ['Mute','Scene','Music','Chat','Camera','Timer','CPU','GPU','Notes','Lights','Search','Stream','Record','Mic','Volume','Save'];
const SVG_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#8fe9ff"/><stop offset="1" stop-color="#c7a3ff"/></linearGradient></defs><path fill="url(#g)" d="M32 5a27 27 0 1 0 0 54 27 27 0 0 0 0-54Zm0 8 8 13h-6v18h-4V26h-6l8-13Z"/></svg>`;

const SAMPLES = {
  encoder: {
    '$schema': 'https://schemas.elgato.com/streamdeck/plugins/layout.json',
    id: 'decklab.cpu-monitor',
    controller: 'Encoder',
    items: [
      { type:'pixmap', key:'icon', rect:[8,18,34,34], value:SVG_ICON, zOrder:1 },
      { type:'text', key:'title', rect:[50,8,142,22], value:'CPU', alignment:'left', color:'#ffffff', font:{size:18,weight:700}, zOrder:1 },
      { type:'text', key:'value', rect:[50,31,142,26], value:'42%', alignment:'left', color:'#8fe9ff', font:{size:22,weight:800}, zOrder:1 },
      { type:'bar', key:'load', rect:[50,65,142,16], value:42, range:{min:0,max:100}, subtype:4, bar_bg_c:'#18202b', bar_border_c:'#4e5c70', bar_fill_c:'0:#8fe9ff,1:#c7a3ff', border_w:1, zOrder:1 }
    ]
  },
  neo: {
    '$schema': 'https://schemas.elgato.com/streamdeck/plugins/layout.json',
    id: 'decklab.neo-status',
    controller: 'Neo',
    items: [
      { type:'pixmap', key:'leading', rect:[8,11,28,28], value:SVG_ICON, zOrder:1 },
      { type:'text', key:'title', rect:[43,5,123,20], value:'STREAM', alignment:'left', color:'#ffffff', font:{size:14,weight:800}, zOrder:1 },
      { type:'text', key:'status', rect:[43,25,123,18], value:'LIVE · 01:24:18', alignment:'left', color:'#8fe9ff', font:{size:11,weight:600}, zOrder:1 },
      { type:'bar', key:'level', rect:[174,14,50,20], value:68, range:{min:0,max:100}, subtype:4, bar_bg_c:'#17202b', bar_border_c:'#4e5c70', bar_fill_c:'0:#c7a3ff,1:#8fe9ff', border_w:1, zOrder:1 }
    ]
  },
  gbar: {
    '$schema': 'https://schemas.elgato.com/streamdeck/plugins/layout.json',
    id: 'decklab.audio-pan',
    controller: 'Encoder',
    items: [
      { type:'text', key:'title', rect:[8,7,184,20], value:'PAN', alignment:'center', color:'#ffffff', font:{size:15,weight:800}, zOrder:1 },
      { type:'text', key:'value', rect:[8,28,184,20], value:'R 24', alignment:'center', color:'#8fe9ff', font:{size:16,weight:700}, zOrder:1 },
      { type:'gbar', key:'pan', rect:[14,57,172,30], value:24, range:{min:-100,max:100}, subtype:4, bar_h:9, bar_bg_c:'0:#c7a3ff,0.5:#232b38,1:#8fe9ff', bar_border_c:'#667387', bar_fill_c:'#ffffff', border_w:1, zOrder:1 }
    ]
  }
};

let currentMode = 'project';
let lastDeviceStudioMode = 'device';
let currentDeviceKey = 'plus';
let selected = null;
let events = [];
let state = {};
let activeLayout = null;
let baseLayout = deepClone(SAMPLES.encoder);
let currentLayout = deepClone(SAMPLES.encoder);
let selectedLayoutKey = currentLayout.items?.[0]?.key ?? null;
let layoutEvents = [];

const $ = (id) => document.getElementById(id);
const deck = $('deck');
const deviceSelect = $('deviceSelect');
const eventLog = $('eventLog');
const layoutCanvas = $('layoutCanvas');

Object.entries(DEVICES).forEach(([key,d]) => {
  const o = document.createElement('option');
  o.value = key;
  o.textContent = d.name;
  if (key === currentDeviceKey) o.selected = true;
  deviceSelect.appendChild(o);
});

function deepClone(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return JSON.parse(JSON.stringify(value));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function downloadText(filename, text, type='application/json') {
  const b = new Blob([text], {type});
  const a = document.createElement('a');
  const url = URL.createObjectURL(b);
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/* ------------------------------ DEVICE PREVIEW ------------------------------ */

function keyFor(type, index) {
  return `${currentDeviceKey}:${type}:${index}`;
}

function ensureState(type,index) {
  const k = keyFor(type,index);
  if (!state[k]) {
    state[k] = {
      title: type === 'key' ? (DEMO_TITLES[index % DEMO_TITLES.length] || `Key ${index+1}`) : type === 'dial' ? `Dial ${index+1}` : type === 'touch' ? `Touch ${index+1}` : 'Now Playing',
      value: type === 'dial' || type === 'touch' ? `${35 + (index*13)%60}%` : type === 'infobar' ? 'DeckLab preview' : '',
      stateA: 'OFF', stateB: 'ON', active: false, progress: 35 + (index*13)%60, mode:'toggle', icon:null
    };
  }
  return state[k];
}

function logEvent(event, payload={}) {
  const d = DEVICES[currentDeviceKey];
  const item = { t: new Date().toISOString().slice(11,23), event, device: currentDeviceKey, deviceType:d.type, ...payload };
  events.unshift(item);
  events = events.slice(0,100);
  eventLog.textContent = events.map(e => JSON.stringify(e)).join('\n\n');
}

function syncCustomGridControls() {
  const d = DEVICES[currentDeviceKey];
  const wrap = $('customGridControls');
  if (!wrap) return;
  wrap.classList.toggle('hidden', !d.customGrid);
  if (!d.customGrid) return;
  const rows = $('gridRowsInput');
  const cols = $('gridColsInput');
  rows.max = String(d.maxRows || 8);
  cols.max = String(d.maxCols || 8);
  rows.value = String(d.rows);
  cols.value = String(d.cols);
}


function makeNeoPreviewPoint(side) {
  const b=document.createElement('button');
  b.type='button'; b.className=`neo-preview-touch-point ${side}`;
  b.setAttribute('aria-label',side==='left'?'Previous page touch point':'Next page touch point');
  b.title=side==='left'?'Neo previous-page Touch Point':'Neo next-page Touch Point';
  b.innerHTML=side==='left'?'<span>‹</span>':'<span>›</span>';
  b.addEventListener('click',()=>logEvent('neoTouchPoint',{direction:side==='left'?'previous':'next',note:'Device Studio models this as hardware page navigation; no plugin touch event is emitted.'}));
  return b;
}

function renderDevice({logConnect=false, reselect=null}={}) {
  const d = DEVICES[currentDeviceKey];
  const keepSelected = reselect || selected;
  selected = null;
  syncEditor();
  syncCustomGridControls();
  $('deviceName').textContent = d.name;
  const surfaceMeta = d.neo ? ' · 232×50 SDK Infobar canvas · 248×58 artwork surface' : d.touch ? ' · 200×100 SDK canvas per dial' : '';
  const inputMeta = d.inputOnly ? ' · input-only controls' : '';
  const displayMeta = d.infoDisplay ? ' · integrated non-touch info display' : '';
  const proMeta = d.requiresPro ? ' · Pro feature' : '';
  const hostMeta = d.streamDeckApp === false ? ` · ${d.specialHost || 'separate host'}` : '';
  const artworkMeta=DeckLabSurface.OFFICIAL_ARTWORK?.[currentDeviceKey]?' · Elgato preview artwork':'';
  const physicalMeta=d.physical?.widthMm?` · ${d.physical.widthMm} mm chassis width · unified surface`:' · unified surface';
  $('deviceMeta').textContent = `${d.rows} × ${d.cols} ${d.inputOnly ? 'controls' : 'keys'}${d.dials ? ` · ${d.dials} dials` : ''}${surfaceMeta}${displayMeta}${inputMeta}${proMeta}${hostMeta}${artworkMeta}${physicalMeta} · SDK device type ${d.type}`;
  $('deviceNote').textContent = d.note || '';
  deck.className='deck unified-device-host';
  DeckLabSurface.render(deck,{
    deviceKey:currentDeviceKey,device:d,mode:'preview',
    factories:{
      key:(i)=>makeKey(i),
      touch:(i)=>makeTouch(i),
      encoderDisplay:(i)=>makeGalleonEncoderDisplay(i),
      dial:(i)=>makeDial(i),
      neo:()=>makeInfoBar(),
      neoPrev:()=>makeNeoPreviewPoint('left'),
      neoNext:()=>makeNeoPreviewPoint('right')
    }
  });

  if (keepSelected) {
    const el = deck.querySelector(`[data-kind="${keepSelected.kind}"][data-index="${keepSelected.index}"]`);
    if (el) selectElement(keepSelected.kind, keepSelected.index, el);
  }

  if (logConnect) {
    logEvent('deviceDidConnect',{ device:`decklab-${currentDeviceKey}`, deviceInfo:{ name:d.name, size:{columns:d.cols,rows:d.rows}, type:d.type } });
  }
  syncActiveLayoutCard();
}

function makeKey(i) {
  const s=ensureState('key',i);
  const d=DEVICES[currentDeviceKey];
  const b=document.createElement('button');
  b.className=`key interactive ${d.inputOnly?'input-only-key':''}`;
  b.dataset.kind='key';
  b.dataset.index=i;
  const face=document.createElement('div');
  face.className=`key-face ${s.active?'on':''} ${d.inputOnly?'input-only-face':''}`;

  if (d.inputOnly) {
    const hardwareLabel=document.createElement('div');
    hardwareLabel.className='hardware-key-label';
    hardwareLabel.textContent=d.hardwareLabels?.[i] ?? `${d.buttonPrefix || 'K'}${i+1}`;
    face.appendChild(hardwareLabel);
  } else if(s.icon) {
    const img=new Image(); img.src=s.icon; face.appendChild(img);
  } else {
    const g=document.createElement('div'); g.className='glyph'; g.textContent=GLYPHS[i%GLYPHS.length]; face.appendChild(g);
  }

  const title=document.createElement('div'); title.className='key-title'; title.textContent=s.title; face.appendChild(title);
  if (!d.inputOnly) {
    const tag=document.createElement('div'); tag.className='state-tag'; tag.textContent=s.active?s.stateB:s.stateA; face.appendChild(tag);
  }
  b.appendChild(face);
  b.title=s.title;
  b.addEventListener('mousedown',()=>{
    selectElement('key',i,b);
    logEvent('keyDown',{ action:`demo.key.${i}`, context:`key-${i}`, payload:{controller:'Keypad',coordinates:{column:i%DEVICES[currentDeviceKey].cols,row:Math.floor(i/DEVICES[currentDeviceKey].cols)}, state:s.active?1:0} });
    if(s.mode==='momentary') { s.active=true; renderDevice({reselect:{kind:'key',index:i}}); }
  });
  b.addEventListener('mouseup',()=>{
    if(s.mode==='toggle') s.active=!s.active; else s.active=false;
    logEvent('keyUp',{ action:`demo.key.${i}`, context:`key-${i}`, payload:{controller:'Keypad',state:s.active?1:0} });
    renderDevice({reselect:{kind:'key',index:i}});
  });
  return b;
}

function makeGalleonEncoderDisplay(i) {
  const s=ensureState('touch',i);
  const el=document.createElement('div');
  el.className='galleon-runtime-display-segment';
  el.innerHTML=`<strong>${escapeHtml(s.title)}</strong><span>${escapeHtml(s.value)}</span><div class="progress"><i style="width:${s.progress}%"></i></div>`;
  el.title='GALLEON encoder information display · non-touch';
  return el;
}

function makeTouch(i) {
  const s=ensureState('touch',i);
  const el=document.createElement('div');
  el.className='touch-segment interactive';
  el.dataset.kind='touch';
  el.dataset.index=i;

  const useCustom = i === 0 && activeLayout && resolveLayoutController(activeLayout) === 'Encoder' && !DEVICES[currentDeviceKey].experimentalScreen;
  if (useCustom) {
    const host = document.createElement('div');
    host.className = 'device-layout-host';
    el.appendChild(host);
    requestAnimationFrame(() => renderLayoutInto(host, activeLayout, {selectable:false}));
  } else {
    el.innerHTML=`<strong>${escapeHtml(s.title)}</strong><span>${escapeHtml(s.value)}</span><div class="progress"><i style="width:${s.progress}%"></i></div>`;
  }

  el.addEventListener('click',()=>{
    selectElement('touch',i,el);
    logEvent('touchTap',{ action:`demo.encoder.${i}`, context:`dial-${i}`, payload:{ controller:'Encoder', coordinates:{column:i,row:0}, tapPos:[100,50], hold:false } });
  });
  return el;
}

function makeDial(i) {
  const s=ensureState('dial',i);
  const wrap=document.createElement('div');
  wrap.className='dial-wrap';
  const el=document.createElement('div');
  el.className='dial interactive';
  el.dataset.kind='dial';
  el.dataset.index=i;
  el.style.setProperty('--rotation',`${(s.progress-50)*2.2}deg`);
  el.addEventListener('wheel',(e)=>{
    e.preventDefault();
    const ticks=e.deltaY<0?1:-1;
    DeckLabSurface.rotateDial(currentDeviceKey,i,ticks);
    s.progress=clamp(s.progress+ticks*2,0,100);
    s.value=`${s.progress}%`;
    selectElement('dial',i,el);
    logEvent('dialRotate',{action:`demo.encoder.${i}`,context:`dial-${i}`,payload:{controller:'Encoder',coordinates:{column:i,row:0},ticks,pressed:false}});
    renderDevice({reselect:{kind:'dial',index:i}});
  },{passive:false});
  el.addEventListener('pointerdown',ev=>{
    el.setPointerCapture?.(ev.pointerId);DeckLabSurface.pressDial(currentDeviceKey,i,true);
    selectElement('dial',i,el);
    logEvent('dialDown',{action:`demo.encoder.${i}`,context:`dial-${i}`,payload:{controller:'Encoder',coordinates:{column:i,row:0}}});
  });
  for(const type of ['pointerup','pointercancel'])el.addEventListener(type,()=>{DeckLabSurface.pressDial(currentDeviceKey,i,false);logEvent('dialUp',{action:`demo.encoder.${i}`,context:`dial-${i}`,payload:{controller:'Encoder',coordinates:{column:i,row:0}}});});
  const label=document.createElement('div');
  label.className='dial-label';
  label.textContent=s.title;
  wrap.append(el,label);
  return wrap;
}

function makeInfoBar() {
  const s=ensureState('infobar',0);
  const el=document.createElement('div');
  el.className='infobar interactive';
  el.dataset.kind='infobar';
  el.dataset.index=0;
  const useCustom = activeLayout && resolveLayoutController(activeLayout) === 'Neo';
  if (useCustom) {
    const host = document.createElement('div');
    host.className = 'device-layout-host';
    el.appendChild(host);
    requestAnimationFrame(() => renderLayoutInto(host, activeLayout, {selectable:false}));
  } else {
    el.innerHTML=`<span class="bar-icon">◈</span><strong>${escapeHtml(s.title)}</strong><span>${escapeHtml(s.value)}</span><div class="progress" style="width:80px"><i style="width:${s.progress}%"></i></div>`;
  }
  el.addEventListener('click',()=>{
    selectElement('infobar',0,el);
  });
  return el;
}

function selectElement(kind,index,el) {
  document.querySelectorAll('#deviceMode .selected').forEach(x=>x.classList.remove('selected'));
  if(el) el.classList.add('selected');
  selected={kind,index};
  syncEditor();
}

function syncEditor() {
  if(!selected) {
    $('editor').classList.add('hidden');
    $('selectionEmpty').classList.remove('hidden');
    return;
  }
  $('editor').classList.remove('hidden');
  $('selectionEmpty').classList.add('hidden');
  const s=ensureState(selected.kind,selected.index);
  $('elementId').value=`${selected.kind}-${selected.index}`;
  $('elementType').value=selected.kind;
  $('titleInput').value=s.title;
  $('valueInput').value=s.value;
  $('stateAInput').value=s.stateA;
  $('stateBInput').value=s.stateB;
  $('progressInput').value=s.progress;
  $('modeInput').value=s.mode;
  const isKey=selected.kind==='key';
  $('stateFields').classList.toggle('hidden',!isKey);
  $('modeWrap').classList.toggle('hidden',!isKey);
  $('progressWrap').classList.toggle('hidden',isKey);
  $('valueInput').parentElement.classList.toggle('hidden',isKey);
  const hasVisualKey = isKey && !DEVICES[currentDeviceKey].inputOnly;
  $('iconInput').parentElement.classList.toggle('hidden',!hasVisualKey);
  $('clearIconBtn').classList.toggle('hidden',!hasVisualKey);
}

function updateSelected(mutator) {
  if(!selected) return;
  const s=ensureState(selected.kind,selected.index);
  mutator(s);
  renderDevice({reselect:selected});
}

function syncActiveLayoutCard() {
  const card = $('activeLayoutCard');
  if (!activeLayout) {
    card.classList.add('hidden');
    return;
  }
  card.classList.remove('hidden');
  $('activeLayoutName').textContent = activeLayout.id || 'Unnamed layout';
  $('activeLayoutController').textContent = `${resolveLayoutController(activeLayout)} · ${resolveLayoutController(activeLayout)==='Neo'?'232×50 SDK canvas':'200×100 SDK canvas'}`;
}

/* ------------------------------- LAYOUT LAB -------------------------------- */

function resolveLayoutController(layout=currentLayout) {
  const override = $('controllerOverride')?.value;
  if (override && override !== 'auto') return override;
  return layout?.controller === 'Neo' ? 'Neo' : 'Encoder';
}

function getLogicalSize(layout=currentLayout) {
  return resolveLayoutController(layout) === 'Neo' ? {width:232,height:50} : {width:200,height:100};
}

function gradientToCss(value, fallback='transparent') {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  const v = value.trim();
  const stops = v.split(',').map(part => {
    const match = part.trim().match(/^([01](?:\.\d+)?):(.+)$/);
    if (!match) return null;
    return `${match[2].trim()} ${clamp(Number(match[1]),0,1)*100}%`;
  });
  if (stops.length > 1 && stops.every(Boolean)) return `linear-gradient(90deg, ${stops.join(', ')})`;
  return v;
}

function imageValueToSrc(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const v = value.trim();
  if (v.startsWith('data:') || v.startsWith('blob:') || v.startsWith('http://') || v.startsWith('https://') || v.startsWith('file://')) return v;
  if (v.startsWith('<svg')) return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(v)}`;
  return null;
}

const layoutResizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(entries=>{for(const {target} of entries){if(!target.isConnected){layoutResizeObserver.unobserve(target);continue;}const s=target._decklabLayout;if(s){const size=target.clientWidth+':'+target.clientHeight;if(size!==s.size)renderLayoutInto(target,s.layout,s.options);}}}):null;
function renderLayoutInto(container, layout, {selectable=false}={}) {
  if (!container || !layout) return;
  container._decklabLayout={layout,options:{selectable},size:container.clientWidth+':'+container.clientHeight};layoutResizeObserver?.observe(container);
  container.innerHTML='';
  const size = getLogicalSizeForLayout(layout, container);
  const cw = container.clientWidth || size.width;
  const ch = container.clientHeight || size.height;
  // Preserve the device canvas aspect ratio. Stream Deck layouts are rendered
  // into fixed logical canvases (Encoder 200×100, Neo 232×50); stretching X
  // and Y independently makes text/images look wrong when the host element is
  // not the same ratio. Letterbox/centre the canvas instead.
  const scale = Math.min(cw / size.width, ch / size.height);
  const sx = scale;
  const sy = scale;
  const ox = (cw - size.width * scale) / 2;
  const oy = (ch - size.height * scale) / 2;
  const issues = validateLayout(layout, resolveControllerForRender(layout, container));
  if(!selectable&&issues.some(i=>i.severity==='error')){container.dataset.layoutError=issues.filter(i=>i.severity==='error').map(i=>i.message).join('; ');return;}delete container.dataset.layoutError;
  const invalidKeys = new Set(issues.filter(x=>x.key && x.severity==='error').map(x=>x.key));
  const items = Array.isArray(layout.items) ? [...layout.items] : [];
  items.sort((a,b)=>(Number(a.zOrder)||0)-(Number(b.zOrder)||0));

  for (const item of items) {
    if (!item || !Array.isArray(item.rect) || item.rect.length !== 4) continue;
    if (item.enabled === false) continue;
    const [x,y,w,h] = item.rect.map(Number);
    if (![x,y,w,h].every(Number.isFinite)) continue;
    const el = document.createElement('div');
    el.className = `layout-item layout-${item.type || 'unknown'}`;
    if (selectable) el.classList.add('selectable');
    if (item.key === selectedLayoutKey && selectable) el.classList.add('selected');
    if (invalidKeys.has(item.key)) el.classList.add('invalid');
    el.dataset.layoutKey = item.key || '';
    el.style.left = `${ox + x*sx}px`;
    el.style.top = `${oy + y*sy}px`;
    el.style.width = `${w*sx}px`;
    el.style.height = `${h*sy}px`;
    el.style.zIndex = String((Number(item.zOrder)||0)+1);
    el.style.opacity = String(item.opacity ?? 1);
    if (item.background) el.style.background = gradientToCss(item.background);

    if (item.type === 'text') renderTextItem(el,item,sx,sy);
    else if (item.type === 'pixmap') renderPixmapItem(el,item);
    else if (item.type === 'bar' || item.type === 'gbar') renderBarItem(el,item,sx,sy);
    else {
      el.textContent = item.type || 'unknown';
      el.style.color = '#ff7f92';
      el.style.fontSize = `${9*Math.min(sx,sy)}px`;
    }

    if (selectable) el.addEventListener('click',(e)=>{
      e.stopPropagation();
      selectLayoutItem(item.key);
    });
    container.appendChild(el);
  }
}

function resolveControllerForRender(layout, container) {
  if (container === layoutCanvas) return resolveLayoutController(layout);
  return layout?.controller === 'Neo' ? 'Neo' : 'Encoder';
}

function getLogicalSizeForLayout(layout, container) {
  const controller = resolveControllerForRender(layout, container);
  return controller === 'Neo' ? {width:232,height:50} : {width:200,height:100};
}

function renderTextItem(el,item,sx,sy) {
  const scale = Math.min(sx,sy);
  if (item['text-overflow']==='ellipsis') el.classList.add('ellipsis');
  else if (item['text-overflow']==='fade') el.classList.add('fade');
  el.textContent = item.value ?? '';
  el.style.color = item.color || '#ffffff';
  el.style.fontSize = `${(item.font?.size ?? 12)*scale}px`;
  el.style.fontWeight = String(item.font?.weight ?? 500);
  el.style.textAlign = item.alignment || 'center';
  el.style.justifyContent = item.alignment === 'left' ? 'flex-start' : item.alignment === 'right' ? 'flex-end' : 'center';
  el.style.padding = `0 ${Math.max(1,2*scale)}px`;
  if (item['text-overflow'] === 'ellipsis') {
    el.style.textOverflow='ellipsis';
    el.style.whiteSpace='nowrap';
  }
}

function renderPixmapItem(el,item) {
  const src = imageValueToSrc(item.value);
  if (src) {
    const img = new Image();
    img.src = src;
    img.alt = item.key || 'pixmap';
    el.appendChild(img);
  } else {
    const ph = document.createElement('div');
    ph.className='pixmap-placeholder';
    ph.textContent = item.value ? `local: ${item.value}` : 'pixmap';
    el.appendChild(ph);
  }
}

function renderBarItem(el,item,sx,sy) {
  const range = item.range && Number.isFinite(Number(item.range.min)) && Number.isFinite(Number(item.range.max))
    ? {min:Number(item.range.min),max:Number(item.range.max)} : {min:0,max:100};
  const value = Number(item.value ?? 0);
  const pct = range.max === range.min ? 0 : clamp((value-range.min)/(range.max-range.min),0,1);
  const subtype = Number.isInteger(Number(item.subtype)) ? Number(item.subtype) : 4;
  el.classList.add(`subtype-${subtype}`);
  const shell = document.createElement('div');
  shell.className='bar-shell';
  shell.style.background = gradientToCss(item.bar_bg_c, '#353535');
  shell.style.border = `${Math.max(0,(item.border_w ?? 2)*Math.min(sx,sy))}px solid ${item.bar_border_c || '#ffffff'}`;
  const fill = document.createElement('div');
  fill.className='bar-fill';
  fill.style.width = `${pct*100}%`;
  fill.style.background = gradientToCss(item.bar_fill_c, '#ffffff');
  shell.appendChild(fill);
  el.appendChild(shell);
  if (item.type === 'gbar') {
    el.classList.add('layout-gbar');
    const indicator = document.createElement('div');
    indicator.className='gbar-indicator';
    indicator.style.left = `${pct*100}%`;
    indicator.style.color = item.bar_fill_c && !String(item.bar_fill_c).includes(':') ? item.bar_fill_c : '#ffffff';
    const indicatorHeight = (item.bar_h ?? 10) * sy;
    indicator.style.borderLeftWidth = `${Math.max(3,indicatorHeight*.55)}px`;
    indicator.style.borderRightWidth = `${Math.max(3,indicatorHeight*.55)}px`;
    indicator.style.borderTopWidth = `${Math.max(4,indicatorHeight)}px`;
    el.appendChild(indicator);
  }
}

function renderLayoutLab() {
  const controller = resolveLayoutController(currentLayout);
  const size = getLogicalSize(currentLayout);
  $('layoutName').textContent = currentLayout?.id || 'Unnamed layout';
  $('layoutMeta').textContent = `${controller} · ${size.width} × ${size.height} logical px · ${(currentLayout?.items || []).length} items`;
  layoutCanvas.className = `layout-canvas ${controller === 'Neo' ? 'neo':'encoder'}`;
  requestAnimationFrame(() => renderLayoutInto(layoutCanvas,currentLayout,{selectable:true}));
  renderLayoutItemList();
  syncLayoutItemEditor();
  renderValidation();
}

function renderLayoutItemList() {
  const list = $('layoutItemList');
  list.innerHTML='';
  const items = Array.isArray(currentLayout?.items) ? currentLayout.items : [];
  if (!items.length) {
    list.innerHTML='<div class="empty-state compact">No layout items.</div>';
    return;
  }
  for (const item of items) {
    const b=document.createElement('button');
    b.type='button';
    b.className=`item-row ${item.key===selectedLayoutKey?'active':''}`;
    b.innerHTML=`<span class="item-type">${escapeHtml((item.type||'?').slice(0,3))}</span><strong>${escapeHtml(item.key||'(no key)')}</strong><small>${escapeHtml(Array.isArray(item.rect)?item.rect.join(', '):'no rect')}</small>`;
    b.addEventListener('click',()=>selectLayoutItem(item.key));
    list.appendChild(b);
  }
}

function selectLayoutItem(key) {
  selectedLayoutKey = key;
  renderLayoutLab();
}

function getSelectedLayoutItem(layout=currentLayout) {
  return Array.isArray(layout?.items) ? layout.items.find(i=>i.key===selectedLayoutKey) : null;
}

function syncLayoutItemEditor() {
  const item = getSelectedLayoutItem();
  const form = $('layoutItemEditor');
  if (!item) {
    form.classList.add('hidden');
    $('layoutItemEmpty').classList.remove('hidden');
    return;
  }
  form.classList.remove('hidden');
  $('layoutItemEmpty').classList.add('hidden');
  $('layoutItemKey').value=item.key ?? '';
  $('layoutItemType').value=item.type ?? '';
  $('layoutOpacity').value=item.opacity ?? 1;
  $('layoutEnabled').checked=item.enabled !== false;

  const isText=item.type==='text';
  const isNumeric=item.type==='bar'||item.type==='gbar';
  const isImage=item.type==='pixmap';
  $('layoutTextValueWrap').classList.toggle('hidden',!isText);
  $('layoutNumericValueWrap').classList.toggle('hidden',!isNumeric);
  $('layoutImageValueWrap').classList.toggle('hidden',!isImage);
  $('layoutImageUploadWrap').classList.toggle('hidden',!isImage);
  $('textStyleFields').classList.toggle('hidden',!isText);
  $('barStyleFields').classList.toggle('hidden',!isNumeric);

  if (isText) {
    $('layoutTextValue').value=item.value ?? '';
    $('layoutTextColor').value=item.color ?? '#ffffff';
    $('layoutFontSize').value=item.font?.size ?? 12;
    $('layoutFontWeight').value=item.font?.weight ?? 500;
    $('layoutAlignment').value=item.alignment ?? 'center';
  }
  if (isNumeric) {
    $('layoutNumericValue').value=item.value ?? 0;
    $('layoutRangeMin').value=item.range?.min ?? 0;
    $('layoutRangeMax').value=item.range?.max ?? 100;
    $('layoutBarFill').value=item.bar_fill_c ?? '#ffffff';
  }
  if (isImage) $('layoutImageValue').value=item.value ?? '';
}

function mutateSelectedLayoutItem(mutator) {
  const currentItem = getSelectedLayoutItem(currentLayout);
  const baseItem = getSelectedLayoutItem(baseLayout);
  if (!currentItem) return;
  mutator(currentItem);
  if (baseItem) mutator(baseItem);
  updateLayoutJsonText();
  renderLayoutLab();
}

function updateLayoutJsonText() {
  $('layoutJsonInput').value = JSON.stringify(baseLayout,null,2);
}

function validateLayout(layout=currentLayout, controllerOverride=null) {
  const issues=[];
  if (!layout || typeof layout !== 'object' || Array.isArray(layout)) return [{severity:'error',message:'Layout must be a JSON object.'}];
  if (typeof layout.id !== 'string' || !layout.id.trim()) issues.push({severity:'error',message:'Layout requires a non-empty string id.'});
  if (layout.controller != null && !['Encoder','Neo'].includes(layout.controller)) issues.push({severity:'error',message:'controller must be "Encoder" or "Neo" when provided.'});
  if (!Array.isArray(layout.items)) {
    issues.push({severity:'error',message:'Layout requires an items array.'});
    return issues;
  }
  const controller = controllerOverride || resolveLayoutController(layout);
  const size = controller === 'Neo' ? {width:232,height:50} : {width:200,height:100};
  const knownTypes = new Set(['text','pixmap','bar','gbar']);
  const seen = new Set();
  const geometries=[];

  layout.items.forEach((item,index)=>{
    const prefix=`Item ${index+1}`;
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      issues.push({severity:'error',message:`${prefix} must be an object.`});
      return;
    }
    const key = typeof item.key==='string' ? item.key : null;
    if (!key || !key.trim()) issues.push({severity:'error',message:`${prefix} requires a non-empty key.`});
    else if (seen.has(key)) issues.push({severity:'error',key,message:`Duplicate item key "${key}".`});
    else seen.add(key);
    if (!knownTypes.has(item.type)) issues.push({severity:'error',key,message:`${key||prefix}: unsupported type "${item.type}". Supported: text, pixmap, bar, gbar.`});
    if (!Array.isArray(item.rect) || item.rect.length!==4 || !item.rect.every(v=>Number.isFinite(Number(v)))) {
      issues.push({severity:'error',key,message:`${key||prefix}: rect must be [x, y, width, height] using numbers.`});
    } else {
      const [x,y,w,h]=item.rect.map(Number);
      if (w<=0 || h<=0) issues.push({severity:'error',key,message:`${key||prefix}: rect width and height must be greater than zero.`});
      if (x<0 || y<0 || x+w>size.width || y+h>size.height) issues.push({severity:'error',key,message:`${key||prefix}: rect [${item.rect.join(', ')}] is outside the ${size.width}×${size.height} ${controller} canvas.`});
      geometries.push({key:key||prefix,z:Number(item.zOrder)||0,x,y,w,h});
    }
    if (item.zOrder != null && (!Number.isInteger(Number(item.zOrder)) || Number(item.zOrder)<0 || Number(item.zOrder)>700)) issues.push({severity:'error',key,message:`${key||prefix}: zOrder must be an integer from 0 to 700.`});
    if (item.opacity != null) {
      const op=Number(item.opacity);
      if (!Number.isFinite(op) || op<0 || op>1 || Math.round(op*10)!==op*10) issues.push({severity:'warning',key,message:`${key||prefix}: opacity should use 0.0–1.0 in 0.1 increments.`});
    }
    if (item.enabled != null && typeof item.enabled !== 'boolean') issues.push({severity:'warning',key,message:`${key||prefix}: enabled should be boolean.`});
    if ((item.type==='bar'||item.type==='gbar') && !Number.isFinite(Number(item.value))) issues.push({severity:'error',key,message:`${key||prefix}: ${item.type} requires a numeric value.`});
    if ((item.type==='bar'||item.type==='gbar') && item.range) {
      const min=Number(item.range.min), max=Number(item.range.max);
      if (!Number.isFinite(min)||!Number.isFinite(max)||max<=min) issues.push({severity:'error',key,message:`${key||prefix}: range requires numeric min/max with max greater than min.`});
    }
    if (item.type==='text' && item.font?.weight != null) {
      const weight=Number(item.font.weight);
      if (!Number.isInteger(weight)||weight<100||weight>1000) issues.push({severity:'warning',key,message:`${key||prefix}: font weight should be an integer from 100 to 1000.`});
    }
    if (item.type==='pixmap' && typeof item.value==='string' && item.value && !imageValueToSrc(item.value)) issues.push({severity:'warning',key,message:`${key||prefix}: local pixmap path cannot be loaded by a standalone browser file; it will render as a placeholder until plugin-folder import is added.`});
  });

  for (let i=0;i<geometries.length;i++) {
    for (let j=i+1;j<geometries.length;j++) {
      const a=geometries[i], b=geometries[j];
      if (a.z!==b.z) continue;
      const overlaps = a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
      if (overlaps) issues.push({severity:'error',key:a.key,message:`"${a.key}" overlaps "${b.key}" at zOrder ${a.z}. Elgato layouts require overlapping items to use different zOrder values.`});
    }
  }
  return issues;
}

function renderValidation() {
  const issues=validateLayout(currentLayout);
  const list=$('validationList');
  list.innerHTML='';
  const errors=issues.filter(i=>i.severity==='error').length;
  const warnings=issues.filter(i=>i.severity==='warning').length;
  const badge=$('validationBadge');
  badge.className='validation-badge';
  if (!errors && !warnings) {
    badge.classList.add('good');
    badge.textContent='Valid · no issues found';
    const ok=document.createElement('div'); ok.className='validation-entry ok'; ok.textContent='No structural issues found by DeckLab’s local validator.'; list.appendChild(ok);
    return;
  }
  if (errors) { badge.classList.add('bad'); badge.textContent=`${errors} error${errors===1?'':'s'} · ${warnings} warning${warnings===1?'':'s'}`; }
  else { badge.classList.add('warn'); badge.textContent=`${warnings} warning${warnings===1?'':'s'}`; }
  for (const issue of issues) {
    const row=document.createElement('div');
    row.className=`validation-entry ${issue.severity}`;
    row.textContent=`${issue.severity.toUpperCase()}: ${issue.message}`;
    if (issue.key) row.addEventListener('click',()=>selectLayoutItem(issue.key));
    list.appendChild(row);
  }
}

function setLayout(layout,{log=true}={}) {
  baseLayout=deepClone(layout);
  currentLayout=deepClone(layout);
  selectedLayoutKey=Array.isArray(currentLayout.items)&&currentLayout.items.length ? currentLayout.items[0].key : null;
  updateLayoutJsonText();
  $('feedbackInput').value = JSON.stringify(makeFeedbackExample(currentLayout),null,2);
  renderLayoutLab();
  if(log) logLayoutEvent('setFeedbackLayout',{layout:layout.id || '(inline JSON)',controller:resolveLayoutController(layout)});
}

function makeFeedbackExample(layout) {
  const result={};
  const items=Array.isArray(layout?.items)?layout.items:[];
  items.slice(0,4).forEach(item=>{
    if (item.type==='text') result[item.key]=item.value ?? 'Updated';
    else if (item.type==='bar'||item.type==='gbar') result[item.key]=item.value ?? 50;
  });
  return result;
}

function applyFeedback(feedback) {
  if (!feedback || typeof feedback!=='object' || Array.isArray(feedback)) throw new Error('Feedback must be a JSON object keyed by layout item key.');
  const immutable = new Set(['rect','type','key']);
  for (const [key,value] of Object.entries(feedback)) {
    const item=currentLayout.items?.find(i=>i.key===key);
    if (!item) continue;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      for (const [prop,propValue] of Object.entries(value)) {
        if (immutable.has(prop)) continue;
        if (prop==='font' && propValue && typeof propValue==='object') item.font={...(item.font||{}),...propValue};
        else if (prop==='range' && propValue && typeof propValue==='object') item.range={...(item.range||{}),...propValue};
        else item[prop]=propValue;
      }
    } else {
      item.value=value;
    }
  }
  logLayoutEvent('setFeedback',{payload:feedback});
  renderLayoutLab();
}

function logLayoutEvent(event,payload={}) {
  const item={t:new Date().toISOString().slice(11,23),event,...payload};
  layoutEvents.unshift(item);
  layoutEvents=layoutEvents.slice(0,80);
  $('layoutEventLog').textContent=layoutEvents.map(e=>JSON.stringify(e)).join('\n\n');
}

function switchMode(mode) {
  if(mode==='device'){mode='profile';window.decklabLivePreview=false;}
  currentMode=mode;
  if(mode==='device'||mode==='profile') lastDeviceStudioMode=mode;
  document.querySelectorAll('.mode-tab').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode || (mode==='profile'&&b.dataset.mode==='device')));
  $('projectMode')?.classList.toggle('hidden',mode!=='project');
  $('deviceMode').classList.toggle('hidden',mode!=='device');
  $('layoutMode').classList.toggle('hidden',mode!=='layout');
  $('pluginMode').classList.toggle('hidden',mode!=='plugin');
  $('hostMode').classList.toggle('hidden',mode!=='host');
  $('profileMode').classList.toggle('hidden',mode!=='profile');
  $('testMode').classList.toggle('hidden',mode!=='test');
  $('projectToolbar')?.classList.toggle('hidden',mode!=='project');
  $('deviceToolbar').classList.toggle('hidden',mode!=='device');
  $('layoutToolbar').classList.toggle('hidden',mode!=='layout');
  $('pluginToolbar').classList.toggle('hidden',mode!=='plugin');
  $('hostToolbar').classList.toggle('hidden',mode!=='host');
  $('profileToolbar').classList.toggle('hidden',mode!=='profile');
  $('testToolbar').classList.toggle('hidden',mode!=='test');
  if(mode==='project' && typeof renderProjectStudio === 'function') renderProjectStudio();
  if(mode==='layout') renderLayoutLab();
  if(mode==='device') renderDevice();
  if(mode==='plugin' && typeof renderPluginLab === 'function') renderPluginLab();
  if(mode==='host' && typeof renderHostLab === 'function') renderHostLab();
  if(mode==='profile' && typeof renderProfileLab === 'function') renderProfileLab();
  if(mode==='test' && typeof renderTestSuite === 'function') renderTestSuite();
  try{ localStorage.setItem('decklab.lastWorkspace.v10',mode); }catch(_){}
}

/* --------------------------------- EVENTS ---------------------------------- */

document.querySelectorAll('.mode-tab').forEach(b=>b.addEventListener('click',()=>switchMode(b.dataset.mode==='device'?lastDeviceStudioMode:b.dataset.mode)));

$('deviceStudioBuildBtn')?.addEventListener('click',()=>{
  if(profileState.placements.length===0 && profileState.target!==currentDeviceKey) resetProfileSession({target:currentDeviceKey,emit:true});
  switchMode('profile');
});
$('deviceStudioPreviewBtn')?.addEventListener('click',()=>{
  currentDeviceKey=profileState.target;
  if(deviceSelect) deviceSelect.value=currentDeviceKey;
  switchMode('device');
});

deviceSelect.addEventListener('change',e=>{
  currentDeviceKey=e.target.value;
  selected=null;
  renderDevice({logConnect:true});
  if (typeof syncPluginPreviewControls === 'function') syncPluginPreviewControls();
});


function applyCustomGridChange() {
  const d=DEVICES[currentDeviceKey];
  if (!d.customGrid) return;
  let rows=clamp(Number($('gridRowsInput').value)||1,1,d.maxRows||8);
  let cols=clamp(Number($('gridColsInput').value)||1,1,d.maxCols||8);
  const maxKeys=d.maxKeys||64;
  while (rows*cols>maxKeys && rows>1) rows--;
  while (rows*cols>maxKeys && cols>1) cols--;
  d.rows=rows; d.cols=cols;
  $('gridRowsInput').value=String(rows);
  $('gridColsInput').value=String(cols);
  selected=null;
  renderDevice({logConnect:true});
}

$('gridRowsInput').addEventListener('change',applyCustomGridChange);
$('gridColsInput').addEventListener('change',applyCustomGridChange);

$('titleInput').addEventListener('input',e=>updateSelected(s=>s.title=e.target.value));
$('valueInput').addEventListener('input',e=>updateSelected(s=>s.value=e.target.value));
$('stateAInput').addEventListener('input',e=>updateSelected(s=>s.stateA=e.target.value));
$('stateBInput').addEventListener('input',e=>updateSelected(s=>s.stateB=e.target.value));
$('progressInput').addEventListener('input',e=>updateSelected(s=>{s.progress=Number(e.target.value);s.value=`${s.progress}%`;}));
$('modeInput').addEventListener('change',e=>updateSelected(s=>s.mode=e.target.value));
$('iconInput').addEventListener('change',e=>{
  const f=e.target.files?.[0];
  if(!f||!selected)return;
  const r=new FileReader();
  r.onload=()=>updateSelected(s=>s.icon=r.result);
  r.readAsDataURL(f);
});
$('clearIconBtn').addEventListener('click',()=>updateSelected(s=>s.icon=null));
$('clearLogBtn').addEventListener('click',()=>{events=[];eventLog.textContent='';});
$('downloadLogBtn').addEventListener('click',()=>downloadText('decklab-events.json',JSON.stringify(events.slice().reverse(),null,2)));
$('resetBtn').addEventListener('click',()=>{state={};events=[];activeLayout=null;selected=null;renderDevice({logConnect:true});});
$('openLayoutLabBtn').addEventListener('click',()=>switchMode('layout'));

// Layout sources
document.querySelectorAll('.sample-layout').forEach(b=>b.addEventListener('click',()=>{
  $('controllerOverride').value='auto';
  setLayout(SAMPLES[b.dataset.sample]);
}));

$('layoutFileInput').addEventListener('change',e=>{
  const file=e.target.files?.[0];
  if(!file)return;
  const r=new FileReader();
  r.onload=()=>{
    try { setLayout(JSON.parse(r.result)); }
    catch(err) { showJsonError(`Could not parse ${file.name}: ${err.message}`); }
  };
  r.readAsText(file);
});

$('controllerOverride').addEventListener('change',()=>renderLayoutLab());

$('applyLayoutJsonBtn').addEventListener('click',()=>{
  try { setLayout(JSON.parse($('layoutJsonInput').value)); }
  catch(err) { showJsonError(`JSON parse error: ${err.message}`); }
});

$('formatLayoutJsonBtn').addEventListener('click',()=>{
  try { $('layoutJsonInput').value=JSON.stringify(JSON.parse($('layoutJsonInput').value),null,2); }
  catch(err) { showJsonError(`JSON parse error: ${err.message}`); }
});

function showJsonError(message) {
  const list=$('validationList');
  list.innerHTML=`<div class="validation-entry error">ERROR: ${escapeHtml(message)}</div>`;
  const badge=$('validationBadge');
  badge.className='validation-badge bad';
  badge.textContent='JSON error';
}

$('previewLayoutBtn').addEventListener('click',()=>{
  activeLayout=deepClone(currentLayout);
  const controller=resolveLayoutController(activeLayout);
  currentDeviceKey=controller==='Neo'?'neo':'plus';
  deviceSelect.value=currentDeviceKey;
  logEvent('setFeedbackLayout',{context:controller==='Neo'?'neo-infobar':'dial-0',payload:{layout:activeLayout.id||'(inline)'}});
  switchMode('device');
});

$('exportLayoutBtn').addEventListener('click',()=>{
  const safe=(baseLayout.id||'decklab-layout').replace(/[^a-z0-9._-]+/gi,'-');
  downloadText(`${safe}.json`,JSON.stringify(baseLayout,null,2));
});

$('applyFeedbackBtn').addEventListener('click',()=>{
  try { applyFeedback(JSON.parse($('feedbackInput').value)); }
  catch(err) { logLayoutEvent('feedbackError',{message:err.message}); }
});

$('resetFeedbackBtn').addEventListener('click',()=>{
  currentLayout=deepClone(baseLayout);
  logLayoutEvent('resetFeedback',{});
  renderLayoutLab();
});

// Item editor
$('layoutTextValue').addEventListener('input',e=>mutateSelectedLayoutItem(i=>i.value=e.target.value));
$('layoutNumericValue').addEventListener('input',e=>mutateSelectedLayoutItem(i=>i.value=Number(e.target.value)));
$('layoutImageValue').addEventListener('change',e=>mutateSelectedLayoutItem(i=>i.value=e.target.value));
$('layoutOpacity').addEventListener('input',e=>mutateSelectedLayoutItem(i=>i.opacity=Number(e.target.value)));
$('layoutEnabled').addEventListener('change',e=>mutateSelectedLayoutItem(i=>i.enabled=e.target.checked));
$('layoutTextColor').addEventListener('input',e=>mutateSelectedLayoutItem(i=>i.color=e.target.value));
$('layoutFontSize').addEventListener('input',e=>mutateSelectedLayoutItem(i=>{i.font=i.font||{};i.font.size=Number(e.target.value);}));
$('layoutFontWeight').addEventListener('input',e=>mutateSelectedLayoutItem(i=>{i.font=i.font||{};i.font.weight=Number(e.target.value);}));
$('layoutAlignment').addEventListener('change',e=>mutateSelectedLayoutItem(i=>i.alignment=e.target.value));
$('layoutRangeMin').addEventListener('input',e=>mutateSelectedLayoutItem(i=>{i.range=i.range||{min:0,max:100};i.range.min=Number(e.target.value);}));
$('layoutRangeMax').addEventListener('input',e=>mutateSelectedLayoutItem(i=>{i.range=i.range||{min:0,max:100};i.range.max=Number(e.target.value);}));
$('layoutBarFill').addEventListener('input',e=>mutateSelectedLayoutItem(i=>i.bar_fill_c=e.target.value));
$('layoutImageUpload').addEventListener('change',e=>{
  const f=e.target.files?.[0];
  if(!f)return;
  const r=new FileReader();
  r.onload=()=>mutateSelectedLayoutItem(i=>i.value=r.result);
  r.readAsDataURL(f);
});

window.addEventListener('resize',()=>{
  if(currentMode==='layout') renderLayoutLab();
  else if(activeLayout) renderDevice({reselect:selected});
});

/* --------------------------------- START ----------------------------------- */

updateLayoutJsonText();
$('feedbackInput').value=JSON.stringify(makeFeedbackExample(currentLayout),null,2);
renderLayoutLab();
renderDevice({logConnect:true});

/* ------------------------------- PLUGIN LAB -------------------------------- */

const PLUGIN_TARGET_ORDER = [
  'standard','mini','xl','neo','plus','plusxl','mobile','virtual','scimitar','xeneon','galleon','pedal','studio'
];

const pluginState = {
  manifest: null,
  files: new Map(),
  fileList: [],
  rootPrefix: '',
  rootName: '',
  selectedActionIndex: -1,
  layouts: [],
  urls: new Map(),
  warnings: [],
  importKind: 'none',
  importMessage: '',
  protectedInfo: null
};

function normalizePluginPath(value='') {
  const parts=[];
  String(value).replace(/\\/g,'/').split('/').forEach(part=>{
    if (!part || part==='.') return;
    if (part==='..') parts.pop();
    else parts.push(part);
  });
  return parts.join('/');
}

function dirname(path='') {
  const p=normalizePluginPath(path);
  const i=p.lastIndexOf('/');
  return i<0?'':p.slice(0,i);
}

function joinPluginPath(base,child) {
  return normalizePluginPath(`${base||''}/${child||''}`);
}

function pluginFilePath(file) {
  return file.webkitRelativePath || file.name || '';
}

function clearPluginUrls() {
  for (const url of pluginState.urls.values()) {
    try { URL.revokeObjectURL(url); } catch (_) {}
  }
  pluginState.urls.clear();
}

function findPluginFile(ref, baseDir='') {
  if (!ref) return null;
  const raw=String(ref).trim();
  if (!raw || raw.startsWith('data:') || raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('blob:') || raw.startsWith('<svg')) return null;
  const candidates=[];
  const direct=normalizePluginPath(raw);
  if (baseDir) candidates.push(joinPluginPath(baseDir,direct));
  candidates.push(direct);
  const hasExt=/\.[a-z0-9]{2,5}$/i.test(direct);
  const exts=['.png','.svg','.jpg','.jpeg','.webp','.gif','.json','.html','.htm'];
  if (!hasExt) {
    for (const c of [...candidates]) {
      exts.forEach(ext=>candidates.push(c+ext));
      exts.forEach(ext=>candidates.push(c+'@2x'+ext));
    }
  }
  for (const c of candidates) {
    const hit=pluginState.files.get(normalizePluginPath(c).toLowerCase());
    if (hit) return hit;
  }
  return null;
}

function pluginAssetUrl(ref, baseDir='') {
  if (!ref) return null;
  const raw=String(ref).trim();
  if (raw.startsWith('data:') || raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('blob:')) return raw;
  if (raw.startsWith('<svg')) return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(raw)}`;
  const file=findPluginFile(raw,baseDir);
  if (!file) return null;
  const rel=pluginState.fileList.find(x=>x.file===file)?.rel || file.name;
  if (!pluginState.urls.has(rel)) pluginState.urls.set(rel,URL.createObjectURL(file));
  return pluginState.urls.get(rel);
}

function getActionControllers(action) {
  const values=Array.isArray(action?.Controllers) && action.Controllers.length ? action.Controllers : ['Keypad'];
  return [...new Set(values.filter(x=>['Keypad','Encoder','Neo'].includes(x)))];
}

function compareVersions(a,b) {
  const aa=String(a||'0').split('.').map(n=>Number(n)||0);
  const bb=String(b||'0').split('.').map(n=>Number(n)||0);
  const len=Math.max(aa.length,bb.length);
  for(let i=0;i<len;i++) {
    if ((aa[i]||0)>(bb[i]||0)) return 1;
    if ((aa[i]||0)<(bb[i]||0)) return -1;
  }
  return 0;
}

async function scanPluginLayouts() {
  const layouts=[];
  for (const entry of pluginState.fileList) {
    if (!entry.rel.toLowerCase().endsWith('.json') || entry.rel.toLowerCase()==='manifest.json') continue;
    try {
      const obj=JSON.parse(await entry.file.text());
      if (obj && typeof obj==='object' && Array.isArray(obj.items) && typeof obj.id==='string') {
        layouts.push({path:entry.rel, layout:obj, controller:obj.controller || null});
      }
    } catch (_) {}
  }
  pluginState.layouts=layouts;
}

function classifyPluginManifestText(text='') {
  const raw=String(text ?? '');
  const trimmed=raw.replace(/^\uFEFF/, '').trimStart();
  if (!trimmed) return {kind:'invalid', reason:'manifest.json is empty.'};
  // Elgato Marketplace protection is intentionally not JSON. Current protected
  // manifests are recognisable by an ELGATO-prefixed envelope; keep this check
  // deliberately conservative and never attempt to decrypt it.
  if (/^ELGATO\b/i.test(trimmed) || /^ELGATO[^\[{]/i.test(trimmed)) {
    return {kind:'protected', reason:'Elgato Marketplace protection detected.'};
  }
  // Binary/protected data sometimes contains NUL/control characters before a
  // JSON opener. Treat that as protected/binary rather than presenting a JSON
  // syntax failure to the user.
  const first=trimmed[0];
  const head=trimmed.slice(0,128);
  const controls=[...head].filter(ch=>{const n=ch.charCodeAt(0);return n===0 || (n<9) || (n>13 && n<32);}).length;
  if (first!=='{' && first!=='[' && controls>0) {
    return {kind:'protected', reason:'The manifest appears to contain protected or binary data rather than plain JSON.'};
  }
  try {
    const manifest=JSON.parse(trimmed);
    if (!manifest || typeof manifest!=='object' || Array.isArray(manifest)) {
      return {kind:'invalid', reason:'manifest.json parsed, but its root is not a JSON object.'};
    }
    return {kind:'plain', manifest};
  } catch (error) {
    return {kind:'invalid', reason:`manifest.json is plain text but is not valid JSON: ${error.message}`};
  }
}

function resetPluginImportClassification(){
  pluginState.importKind='none';
  pluginState.importMessage='';
  pluginState.protectedInfo=null;
}

async function loadPluginFolder(files) {
  const list=[...files];
  if (!list.length) return;
  clearPluginUrls();
  pluginState.manifest=null;
  pluginState.files.clear();
  pluginState.fileList=[];
  pluginState.layouts=[];
  pluginState.selectedActionIndex=-1;
  pluginState.warnings=[];
  resetPluginImportClassification();
  $('pluginImportStatus').className='import-status loading';
  $('pluginImportStatus').textContent='Reading plugin package…';

  const manifests=list.filter(f=>/\bmanifest\.json$/i.test(pluginFilePath(f)));
  manifests.sort((a,b)=>pluginFilePath(a).split('/').length-pluginFilePath(b).split('/').length);
  let manifestFile=manifests.find(f=>pluginFilePath(f).toLowerCase().includes('.sdplugin/')) || manifests[0];
  if (!manifestFile) {
    $('pluginImportStatus').className='import-status error';
    $('pluginImportStatus').textContent='No manifest.json was found in the selected folder.';
    renderPluginLab();
    return;
  }

  const fullManifestPath=pluginFilePath(manifestFile).replace(/\\/g,'/');
  pluginState.rootPrefix=fullManifestPath.slice(0,fullManifestPath.length-'manifest.json'.length);
  pluginState.rootName=pluginState.rootPrefix.split('/').filter(Boolean).pop() || 'plugin.sdPlugin';

  for (const file of list) {
    const full=pluginFilePath(file).replace(/\\/g,'/');
    let rel=full.startsWith(pluginState.rootPrefix)?full.slice(pluginState.rootPrefix.length):full;
    rel=normalizePluginPath(rel);
    if (!rel) continue;
    pluginState.files.set(rel.toLowerCase(),file);
    pluginState.fileList.push({rel,file});
  }

  const manifestText=await manifestFile.text();
  const classification=classifyPluginManifestText(manifestText);
  pluginState.importKind=classification.kind;
  pluginState.importMessage=classification.reason || '';
  if (classification.kind==='protected') {
    pluginState.protectedInfo={
      rootName:pluginState.rootName,
      fileCount:pluginState.fileList.length,
      marker:manifestText.trimStart().slice(0,24).replace(/[^\x20-\x7E]/g,'·')
    };
    pluginState.warnings=[{severity:'info',message:'Marketplace-protected plugin detected. This does not indicate that the plugin is broken. Static manifest/action analysis is unavailable for this installed copy.'}];
    $('pluginImportStatus').className='import-status protected';
    $('pluginImportStatus').textContent='Marketplace-protected plugin detected. DeckLab will not attempt to decrypt it.';
    renderPluginLab();
    return;
  }
  if (classification.kind==='invalid') {
    pluginState.warnings=[{severity:'error',message:classification.reason}];
    $('pluginImportStatus').className='import-status error';
    $('pluginImportStatus').textContent=classification.reason;
    renderPluginLab();
    return;
  }
  pluginState.manifest=classification.manifest;
  pluginState.importKind='plain';
  if (typeof profileState!=='undefined') resetProfileSession({target:profileState.target,emit:false});

  await scanPluginLayouts();
  pluginState.warnings=validatePluginPackage();
  pluginState.importKind='plain';
  $('pluginImportStatus').className='import-status success';
  $('pluginImportStatus').textContent=`Loaded ${pluginState.rootName}`;
  renderPluginLab();
  const actions=pluginState.manifest?.Actions;
  if (Array.isArray(actions) && actions.length) selectPluginAction(0);
}

function validatePluginPackage() {
  if (pluginState.importKind==='protected') return [{severity:'info',message:'Marketplace-protected plugin: manifest validation is unavailable and has been skipped.'}];
  if (pluginState.importKind==='invalid') return [{severity:'error',message:pluginState.importMessage || 'Invalid manifest.'}];
  const m=pluginState.manifest || {};
  const issues=[];
  const required=['UUID','Name','Version','Actions'];
  required.forEach(key=>{
    if (m[key]===undefined || m[key]===null || m[key]==='') issues.push({severity:'error',message:`Manifest is missing required field ${key}.`});
  });
  const actions=Array.isArray(m.Actions)?m.Actions:[];
  const seen=new Set();
  actions.forEach((action,index)=>{
    const label=action.Name || action.UUID || `Action ${index+1}`;
    if (!action.UUID) issues.push({severity:'error',message:`${label}: missing UUID.`});
    else if (seen.has(action.UUID)) issues.push({severity:'error',message:`Duplicate action UUID: ${action.UUID}.`});
    else seen.add(action.UUID);
    if (!action.Name) issues.push({severity:'warning',message:`${action.UUID || `Action ${index+1}`}: missing Name.`});
    const rawControllers=Array.isArray(action.Controllers)?action.Controllers:['Keypad'];
    rawControllers.filter(x=>!['Keypad','Encoder','Neo'].includes(x)).forEach(x=>issues.push({severity:'warning',message:`${label}: unknown controller "${x}".`}));
    if (rawControllers.includes('Neo') && compareVersions(m.Software?.MinimumVersion,'7.6')<0) {
      issues.push({severity:'warning',message:`${label}: declares Neo support but Software.MinimumVersion is ${m.Software?.MinimumVersion || 'not set'}; Elgato documents Neo Infobar actions as requiring Stream Deck 7.6+.`});
    }
    if (action.PropertyInspectorPath && !findPluginFile(action.PropertyInspectorPath)) {
      issues.push({severity:'warning',message:`${label}: Property Inspector file "${action.PropertyInspectorPath}" was not found.`});
    }
    const stateImage=action.States?.[0]?.Image;
    if (stateImage && !findPluginFile(stateImage)) issues.push({severity:'warning',message:`${label}: state image "${stateImage}" was not found.`});
    if (action.Encoder?.layout && !String(action.Encoder.layout).startsWith('$') && !findPluginFile(action.Encoder.layout)) {
      issues.push({severity:'error',message:`${label}: Encoder layout "${action.Encoder.layout}" was not found.`});
    }
  });
  if (!issues.length) issues.push({severity:'ok',message:'No obvious manifest/resource issues found by DeckLab’s local package checks.'});
  return issues;
}

function renderPluginLab() {
  const m=pluginState.manifest;
  const loaded=!!m;
  $('pluginEmpty').classList.toggle('hidden',loaded);
  $('pluginContent').classList.toggle('hidden',!loaded);
  $('pluginSummary').classList.toggle('hidden',!loaded);
  if (!loaded) {
    $('pluginActions').innerHTML='';
    $('compatMatrix').innerHTML='';
    $('compatIntro').classList.remove('hidden');
    const empty=$('pluginEmpty');
    if (pluginState.importKind==='protected') {
      empty.innerHTML=`<div class="plugin-empty-icon">🔒</div><h2>Marketplace-protected plugin</h2><p>DeckLab detected an Elgato-protected installed plugin package. The plugin is not necessarily damaged; its protected <code>manifest.json</code> cannot be read as ordinary JSON.</p><div class="protected-plugin-actions"><div class="protected-plugin-note"><strong>What DeckLab can do</strong><span>Recognize the package and avoid false manifest errors.</span></div><div class="protected-plugin-note"><strong>What DeckLab will not do</strong><span>Decrypt or bypass Marketplace protection.</span></div><div class="protected-plugin-note"><strong>For full testing</strong><span>Import an unpacked development build from the plugin author.</span></div></div>`;
      renderPluginWarnings();
    } else if (pluginState.importKind==='invalid') {
      empty.innerHTML=`<div class="plugin-empty-icon">!</div><h2>Manifest needs attention</h2><p>${escapeHtml(pluginState.importMessage||'The manifest could not be read.')}</p><p class="hint">Unlike a protected Marketplace package, this appears to be plain-text manifest data that is malformed.</p>`;
      renderPluginWarnings();
    } else {
      empty.innerHTML='<div class="plugin-empty-icon">⌁</div><h2>Import an unpacked Stream Deck plugin</h2><p>Choose a development <code>.sdPlugin</code> folder to inspect actions, assets, layouts and compatibility.</p>';
    }
    return;
  }

  $('pluginName').textContent=m.Name || 'Unnamed plugin';
  $('pluginAuthor').textContent=m.Author ? `by ${m.Author}` : 'Author not specified';
  $('pluginUuid').textContent=m.UUID || '—';
  $('pluginVersion').textContent=m.Version || '—';
  $('pluginSdk').textContent=m.SDKVersion ?? '—';
  $('pluginMinSoftware').textContent=m.Software?.MinimumVersion || '—';
  $('pluginActionCount').textContent=String(Array.isArray(m.Actions)?m.Actions.length:0);
  $('pluginFileCount').textContent=String(pluginState.fileList.length);
  $('pluginActionHint').textContent=`${Array.isArray(m.Actions)?m.Actions.length:0} manifest action${m.Actions?.length===1?'':'s'} · ${pluginState.layouts.length} layout file${pluginState.layouts.length===1?'':'s'} detected`;

  const iconUrl=pluginAssetUrl(m.Icon);
  const icon=$('pluginIcon');
  if (iconUrl) { icon.src=iconUrl; icon.classList.remove('hidden'); }
  else { icon.removeAttribute('src'); icon.classList.add('hidden'); }

  renderPluginWarnings();
  renderPluginActions();
  if (pluginState.selectedActionIndex>=0) renderSelectedAction();
  if (typeof renderTestSuite === 'function') renderTestSuite();
}

function renderPluginWarnings() {
  const host=$('pluginWarnings');
  host.innerHTML='';
  for (const issue of pluginState.warnings) {
    const row=document.createElement('div');
    row.className=`validation-entry ${issue.severity==='ok'?'ok':issue.severity}`;
    row.textContent=`${issue.severity==='ok'?'OK':issue.severity.toUpperCase()}: ${issue.message}`;
    host.appendChild(row);
  }
}

function renderPluginActions() {
  const host=$('pluginActions');
  host.innerHTML='';
  const actions=Array.isArray(pluginState.manifest?.Actions)?pluginState.manifest.Actions:[];
  actions.forEach((action,index)=>{
    const card=document.createElement('button');
    card.className=`action-card ${pluginState.selectedActionIndex===index?'active':''}`;
    card.type='button';
    const iconWrap=document.createElement('div'); iconWrap.className='action-card-icon';
    const iconUrl=pluginAssetUrl(action.Icon) || pluginAssetUrl(action.States?.[0]?.Image);
    if (iconUrl) { const img=new Image(); img.src=iconUrl; img.alt=''; iconWrap.appendChild(img); }
    else iconWrap.textContent='⌁';
    const copy=document.createElement('div'); copy.className='action-card-copy';
    const h=document.createElement('strong'); h.textContent=action.Name || 'Unnamed action';
    const uuid=document.createElement('code'); uuid.textContent=action.UUID || 'No UUID';
    const badges=document.createElement('div'); badges.className='controller-badges compact';
    getActionControllers(action).forEach(c=>{
      const span=document.createElement('span'); span.className=`controller-badge ${c.toLowerCase()}`; span.textContent=c; badges.appendChild(span);
    });
    copy.append(h,uuid,badges);
    card.append(iconWrap,copy);
    card.addEventListener('click',()=>selectPluginAction(index));
    host.appendChild(card);
  });
}

function selectPluginAction(index) {
  const actions=pluginState.manifest?.Actions || [];
  if (!actions[index]) return;
  if (typeof hostState !== 'undefined' && hostState.placed && pluginState.selectedActionIndex !== index) removeHostAction({quiet:false});
  pluginState.selectedActionIndex=index;
  renderPluginActions();
  renderSelectedAction();
  if (typeof renderHostLab === 'function') renderHostLab();
  if (typeof renderProfileLab === 'function') renderProfileLab();
  if (typeof renderTestSuite === 'function') renderTestSuite();
}

function selectedPluginAction() {
  return pluginState.manifest?.Actions?.[pluginState.selectedActionIndex] || null;
}

function renderSelectedAction() {
  const action=selectedPluginAction();
  const panel=$('selectedActionPanel');
  if (!action) { panel.classList.add('hidden'); return; }
  panel.classList.remove('hidden');
  $('selectedActionName').textContent=action.Name || 'Unnamed action';
  $('selectedActionUuid').textContent=action.UUID || 'No UUID';
  const badges=$('selectedActionControllers'); badges.innerHTML='';
  getActionControllers(action).forEach(c=>{
    const span=document.createElement('span'); span.className=`controller-badge ${c.toLowerCase()}`; span.textContent=c; badges.appendChild(span);
  });
  renderActionResources(action);
  renderCompatibility(action);
  syncPluginPreviewControls();
}

function resourceRow(label,value,status='neutral') {
  const row=document.createElement('div'); row.className='resource-row';
  const l=document.createElement('span'); l.textContent=label;
  const v=document.createElement('code'); v.textContent=value || '—';
  const dot=document.createElement('i'); dot.className=`resource-status ${status}`;
  row.append(l,v,dot); return row;
}

function renderActionResources(action) {
  const host=$('selectedActionResources'); host.innerHTML='';
  const states=Array.isArray(action.States)?action.States:[];
  host.appendChild(resourceRow('States',String(states.length),'good'));
  if (states[0]?.Image) host.appendChild(resourceRow('State image',states[0].Image,findPluginFile(states[0].Image)?'good':'bad'));
  if (action.PropertyInspectorPath) host.appendChild(resourceRow('Property inspector',action.PropertyInspectorPath,findPluginFile(action.PropertyInspectorPath)?'good':'bad'));
  else host.appendChild(resourceRow('Property inspector','None','neutral'));
  if (getActionControllers(action).includes('Encoder')) {
    const layout=action.Encoder?.layout || 'Runtime/default';
    const ok=String(layout).startsWith('$') || layout==='Runtime/default' || !!findPluginFile(layout);
    host.appendChild(resourceRow('Encoder layout',layout,ok?'good':'bad'));
  }
  if (getActionControllers(action).includes('Neo')) {
    const candidates=pluginState.layouts.filter(x=>x.layout?.controller==='Neo');
    host.appendChild(resourceRow('Neo layouts found',String(candidates.length),candidates.length?'good':'neutral'));
  }
  const os=action.OS || pluginState.manifest?.OS?.map(x=>x.Platform) || [];
  if (os.length) host.appendChild(resourceRow('OS',Array.isArray(os)?os.join(', '):String(os),'neutral'));
}

function getCompatibility(action,deviceKey) {
  const d=DEVICES[deviceKey];
  const controllers=getActionControllers(action);
  if (d.streamDeckApp===false) {
    return {kind:'special',label:'Separate host',controllers:[],detail:`${d.specialHost || 'A separate host'} is used rather than normal Stream Deck app profiles.`};
  }
  const supported=controllers.filter(c=>d.controllers?.includes(c));
  if (!supported.length) {
    return {kind:'no',label:'Not on this surface',controllers:[],detail:`Action needs ${controllers.join(' / ')}; this target exposes ${d.controllers?.join(' / ') || 'no matching controller'}.`};
  }
  if (d.inputOnly) {
    return {kind:'partial',label:'Runs · no LCD feedback',controllers:supported,detail:`${supported.join(' / ')} action events are available, but this hardware has no LCD key surface for plugin imagery or titles.`};
  }
  if (deviceKey==='xeneon') {
    return {kind:'yes',label:'Supported via Stream Deck widget',controllers:supported,detail:'The XENEON EDGE Stream Deck widget is key-only; Encoder/dial actions are not available.'};
  }
  if (d.requiresPro) {
    return {kind:'yes',label:'Supported · Pro layout',controllers:supported,detail:'Stream Deck Mobile Pro unlocks custom layouts with up to 64 keys.'};
  }
  return {kind:'yes',label:'Supported',controllers:supported,detail:`Available controller${supported.length===1?'':'s'}: ${supported.join(', ')}.`};
}

function bundledProfileFor(deviceKey) {
  const d=DEVICES[deviceKey];
  const profiles=Array.isArray(pluginState.manifest?.Profiles)?pluginState.manifest.Profiles:[];
  return profiles.filter(p=>Number(p.DeviceType)===Number(d.type));
}

function renderCompatibility(action) {
  $('compatIntro').classList.add('hidden');
  const host=$('compatMatrix'); host.innerHTML='';
  for (const key of PLUGIN_TARGET_ORDER) {
    const d=DEVICES[key];
    const compat=getCompatibility(action,key);
    const profiles=bundledProfileFor(key);
    const card=document.createElement('div'); card.className=`compat-card ${compat.kind}`;
    const top=document.createElement('div'); top.className='compat-card-top';
    const name=document.createElement('strong'); name.textContent=d.name;
    const pill=document.createElement('span'); pill.className=`compat-pill ${compat.kind}`; pill.textContent=compat.label;
    top.append(name,pill);
    const controllers=document.createElement('div'); controllers.className='compat-controller-line';
    controllers.textContent=compat.controllers.length?`Controller: ${compat.controllers.join(' + ')}`:'Controller: —';
    const profile=document.createElement('div'); profile.className='compat-profile-line';
    profile.textContent=profiles.length?`Bundled profile: ${profiles.map(p=>p.Name || `DeviceType ${p.DeviceType}`).join(', ')}`:'Bundled profile: none';
    const detail=document.createElement('p'); detail.textContent=compat.detail;
    card.append(top,controllers,profile,detail);
    host.appendChild(card);
  }
}

function syncPluginPreviewControls() {
  const action=selectedPluginAction();
  const target=$('pluginPreviewTarget');
  const controller=$('pluginPreviewController');
  if (!target || !controller) return;

  const previous=target.value;
  target.innerHTML='';
  PLUGIN_TARGET_ORDER.forEach(key=>{
    const o=document.createElement('option'); o.value=key; o.textContent=DEVICES[key].name; target.appendChild(o);
  });
  if (PLUGIN_TARGET_ORDER.includes(previous)) target.value=previous;
  else if (PLUGIN_TARGET_ORDER.includes(currentDeviceKey)) target.value=currentDeviceKey;

  if (action) {
    const currentCompat=getCompatibility(action,target.value);
    if (!currentCompat.controllers.length) {
      const first=PLUGIN_TARGET_ORDER.find(k=>getCompatibility(action,k).controllers.length && DEVICES[k].streamDeckApp!==false);
      if (first) target.value=first;
    }
  }
  syncPluginPreviewControllerOptions();
}

function syncPluginPreviewControllerOptions() {
  const action=selectedPluginAction();
  const targetKey=$('pluginPreviewTarget').value;
  const d=DEVICES[targetKey];
  const controller=$('pluginPreviewController');
  controller.innerHTML='';
  const compatible=action ? getActionControllers(action).filter(c=>d.controllers?.includes(c)) : [];
  compatible.forEach(c=>{
    const o=document.createElement('option'); o.value=c; o.textContent=c; controller.appendChild(o);
  });
  const compat=action?getCompatibility(action,targetKey):null;
  $('previewPluginActionBtn').disabled=!compatible.length || d.streamDeckApp===false;
  $('openActionLayoutBtn').disabled=!action || (!getActionControllers(action).includes('Encoder') && !getActionControllers(action).includes('Neo'));
  $('pluginPreviewNote').textContent=compat ? compat.detail : '';
}

function builtInEncoderLayout(name,action,iconUrl) {
  const title=action.Name || 'Action';
  const icon=iconUrl || SVG_ICON;
  const base={ '$schema':'https://schemas.elgato.com/streamdeck/plugins/layout.json', id:`decklab.${String(name).replace('$','').toLowerCase()}`, controller:'Encoder', items:[] };
  if (name==='$X1') base.items=[
    {type:'text',key:'title',rect:[8,5,184,24],value:title,color:'#fff',font:{size:15,weight:700},zOrder:1},
    {type:'pixmap',key:'icon',rect:[70,32,60,60],value:icon,zOrder:1}
  ];
  else if (name==='$A0') base.items=[
    {type:'text',key:'title',rect:[8,5,184,20],value:title,color:'#fff',font:{size:14,weight:700},zOrder:1},
    {type:'pixmap',key:'icon',rect:[55,27,90,68],value:icon,zOrder:1}
  ];
  else if (name==='$C1') base.items=[
    {type:'text',key:'title',rect:[8,4,184,18],value:title,color:'#fff',font:{size:13,weight:700},zOrder:1},
    {type:'pixmap',key:'icon1',rect:[10,27,22,22],value:icon,zOrder:1},
    {type:'bar',key:'value1',rect:[40,29,150,16],value:62,range:{min:0,max:100},subtype:4,bar_bg_c:'#17202b',bar_fill_c:'0:#8fe9ff,1:#c7a3ff',border_w:1,zOrder:1},
    {type:'pixmap',key:'icon2',rect:[10,62,22,22],value:icon,zOrder:1},
    {type:'bar',key:'value2',rect:[40,64,150,16],value:36,range:{min:0,max:100},subtype:4,bar_bg_c:'#17202b',bar_fill_c:'0:#c7a3ff,1:#8fe9ff',border_w:1,zOrder:1}
  ];
  else {
    const withBar=name==='$B1'||name==='$B2';
    base.items=[
      {type:'text',key:'title',rect:[8,5,184,21],value:title,color:'#fff',font:{size:14,weight:700},zOrder:1},
      {type:'pixmap',key:'icon',rect:[10,34,42,42],value:icon,zOrder:1},
      {type:'text',key:'value',rect:[62,34,128,28],value:'Preview',alignment:'left',color:'#8fe9ff',font:{size:17,weight:700},zOrder:1}
    ];
    if (withBar) base.items.push({type:'bar',key:'indicator',rect:[62,68,128,14],value:58,range:{min:0,max:100},subtype:4,bar_bg_c:'#17202b',bar_fill_c:name==='$B2'?'0:#8fe9ff,1:#c7a3ff':'#8fe9ff',border_w:1,zOrder:1});
  }
  return base;
}

async function hydratePluginLayout(layout,path,controllerHint=null) {
  const result=deepClone(layout);
  if (controllerHint && !result.controller) result.controller=controllerHint;
  const base=dirname(path);
  for (const item of result.items || []) {
    if (item.type==='pixmap' && typeof item.value==='string') {
      const url=pluginAssetUrl(item.value,base) || pluginAssetUrl(item.value);
      if (url) item.value=url;
    }
  }
  return result;
}

async function getActionLayout(action,controller,requested) {
  if(requested!==undefined){
    if(typeof requested!=='string'||!requested)throw new Error('A layout path or built-in ID is required.');
    if(requested.startsWith('$')){
      if(controller!=='Encoder'||!['$X1','$A0','$A1','$B1','$B2','$C1'].includes(requested))throw new Error('Unsupported built-in layout for '+controller);
      return builtInEncoderLayout(requested,action,pluginAssetUrl(action.Encoder?.Icon||action.Icon));
    }
    const clean=normalizePluginPath(requested);
    if(clean.split('/').includes('..')||/^(?:[a-z]+:|\/)/i.test(requested))throw new Error('Layout must be inside the plugin package.');
    const hit=pluginState.layouts.find(x=>normalizePluginPath(x.path).toLowerCase()===clean.toLowerCase());
    let layout=hit?.layout;const file=!layout&&findPluginFile(clean);if(file)layout=JSON.parse(await file.text());
    if(!layout)throw new Error('Layout file not found: '+requested);
    if(layout.controller&&layout.controller!==controller)throw new Error('Layout controller does not match '+controller);
    const errors=validateLayout(layout,controller).filter(x=>x.severity==='error');if(errors.length)throw new Error(errors.map(x=>x.message).join('; '));
    return hydratePluginLayout(layout,hit?.path||clean,controller);
  }
  if (controller==='Encoder') {
    const layoutRef=action.Encoder?.layout;
    const iconUrl=pluginAssetUrl(action.Encoder?.Icon) || pluginAssetUrl(action.States?.[0]?.Image) || pluginAssetUrl(action.Icon);
    if (layoutRef && String(layoutRef).startsWith('$')) return builtInEncoderLayout(layoutRef,action,iconUrl);
    if (layoutRef) {
      const hit=pluginState.layouts.find(x=>normalizePluginPath(x.path).toLowerCase()===normalizePluginPath(layoutRef).toLowerCase());
      if (hit) return hydratePluginLayout(hit.layout,hit.path,'Encoder');
      const file=findPluginFile(layoutRef);
      if (file) {
        try { return hydratePluginLayout(JSON.parse(await file.text()),layoutRef,'Encoder'); } catch (_) {}
      }
    }
    return builtInEncoderLayout('$A1',action,iconUrl);
  }
  if (controller==='Neo') {
    const candidates=pluginState.layouts.filter(x=>x.layout?.controller==='Neo');
    if (candidates.length) return hydratePluginLayout(candidates[0].layout,candidates[0].path,'Neo');
    return {
      '$schema':'https://schemas.elgato.com/streamdeck/plugins/layout.json', id:'decklab.neo-runtime-placeholder', controller:'Neo',
      items:[
        {type:'text',key:'title',rect:[8,7,216,18],value:action.Name || 'Neo action',alignment:'center',color:'#ffffff',font:{size:14,weight:800},zOrder:1},
        {type:'text',key:'note',rect:[8,27,216,15],value:'Layout selected by plugin at runtime',alignment:'center',color:'#8fe9ff',font:{size:9,weight:500},zOrder:1}
      ]
    };
  }
  return null;
}

async function previewPluginAction() {
  const action=selectedPluginAction();
  if (!action) return;
  const targetKey=$('pluginPreviewTarget').value;
  const controller=$('pluginPreviewController').value;
  const d=DEVICES[targetKey];
  if (!controller || !d.controllers?.includes(controller) || d.streamDeckApp===false) return;
  currentDeviceKey=targetKey;
  deviceSelect.value=targetKey;
  selected=null;
  activeLayout=null;

  if (controller==='Keypad') {
    const s=ensureState('key',0);
    s.title=action.Name || 'Plugin action';
    s.icon=pluginAssetUrl(action.States?.[0]?.Image) || pluginAssetUrl(action.Icon);
    s.stateA=action.States?.[0]?.Title || 'STATE 1';
    s.stateB=action.States?.[1]?.Title || (action.States?.length>1?'STATE 2':'ACTIVE');
    s.mode=action.DisableAutomaticStates?'momentary':(action.States?.length>1?'toggle':'momentary');
    s.active=false;
  } else if (controller==='Encoder') {
    const s=ensureState('dial',0); s.title=action.Name || 'Plugin dial';
    activeLayout=await getActionLayout(action,'Encoder');
  } else if (controller==='Neo') {
    activeLayout=await getActionLayout(action,'Neo');
    const s=ensureState('infobar',0); s.title=action.Name || 'Neo action';
  }

  renderDevice({logConnect:true});
  const payload={controller};
  if (controller!=='Neo') payload.coordinates={column:0,row:0};
  logEvent('willAppear',{action:action.UUID || 'plugin.action',context:`decklab-plugin-${controller.toLowerCase()}-0`,payload});
  switchMode('device');
}

async function openSelectedActionLayout() {
  const action=selectedPluginAction();
  if (!action) return;
  const preferred=getActionControllers(action).includes('Encoder')?'Encoder':'Neo';
  const layout=await getActionLayout(action,preferred);
  if (!layout) return;
  $('controllerOverride').value='auto';
  setLayout(layout);
  switchMode('layout');
}

$('pluginFolderInput').addEventListener('change',e=>loadPluginFolder(e.target.files));
$('pluginPreviewTarget').addEventListener('change',syncPluginPreviewControllerOptions);
$('pluginPreviewController').addEventListener('change',()=>{
  const action=selectedPluginAction();
  const key=$('pluginPreviewTarget').value;
  if (action && key) $('pluginPreviewNote').textContent=getCompatibility(action,key).detail;
});
$('previewPluginActionBtn').addEventListener('click',previewPluginAction);
$('openActionLayoutBtn').addEventListener('click',openSelectedActionLayout);

// Populate Plugin Lab target selector on load.
syncPluginPreviewControls();

/* ----------------------------- DECKLAB 0.6 LIVE HOST LAB ----------------------------- */

const hostState = {
  placed:false,
  connected:false,
  context:null,
  deviceId:null,
  target:'plus',
  controller:'Keypad',
  column:0,
  row:0,
  actionSettings:{},
  globalSettings:{},
  title:null,
  image:null,
  imageRef:null,
  imageOrigin:'manifest',
  animationNote:'idle',
  frameTimes:[],
  state:0,
  layout:null,
  overlay:null,
  events:[],
  piEvents:[],
  piLoaded:false,
  instanceCounter:0
};

function hostTimestamp() { return new Date().toISOString().slice(11,23); }

function logHost(direction,event,data={}) {
  const item={t:hostTimestamp(),direction,event,...data};
  hostState.events.unshift(item);
  hostState.events=hostState.events.slice(0,180);
  const el=$('hostProtocolLog');
  if (el) el.textContent=hostState.events.map(e=>JSON.stringify(e)).join('\n\n');
  if (direction==='host→plugin') liveSendToPlugin({event,...deepClone(data)});
}

function logPi(direction,event,data={}) {
  const item={t:hostTimestamp(),direction,event,...data};
  hostState.piEvents.unshift(item);
  hostState.piEvents=hostState.piEvents.slice(0,100);
  const el=$('hostPiLog');
  if (el) el.textContent=hostState.piEvents.map(e=>JSON.stringify(e)).join('\n\n');
}

function hostAction() { return selectedPluginAction(); }

function makeHostContext() {
  hostState.instanceCounter++;
  const slug=(hostAction()?.UUID || 'action').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').slice(-34) || 'action';
  return `decklab-${slug}-${String(hostState.instanceCounter).padStart(3,'0')}`;
}

function makeHostDeviceId() {
  return `decklab-device-${hostState.target}-${String(hostState.instanceCounter||1).padStart(3,'0')}`;
}

function hostCoordinates() {
  if (hostState.controller==='Neo') return undefined;
  return {column:Number(hostState.column)||0,row:Number(hostState.row)||0};
}

function hostPayload(extra={}) {
  const payload={
    settings:deepClone(hostState.actionSettings),
    controller:hostState.controller,
    isInMultiAction:false,
    ...extra
  };
  const coords=hostCoordinates();
  if (coords) payload.coordinates=coords;
  if (hostState.controller==='Keypad') payload.state=hostState.state;
  return payload;
}

function hostWillAppearEvent() {
  const action=hostAction();
  return {action:action?.UUID || 'unknown.action',context:hostState.context,device:hostState.deviceId,event:'willAppear',payload:hostPayload()};
}

function hostInfoObject() {
  const d=DEVICES[hostState.target] || DEVICES.standard;
  return {
    application:{font:'Arial',language:'en',platform:/mac/i.test(navigator.platform||'')?'mac':'windows',platformVersion:navigator.platform || 'DeckLab',version:'DeckLab 1.3.10-alpha.32'},
    plugin:{uuid:pluginState.manifest?.UUID || 'decklab.plugin',version:pluginState.manifest?.Version || '0.0.0'},
    devices:[{id:hostState.deviceId,name:d.name,type:d.type,size:{columns:d.cols,rows:d.rows}}],
    colors:{buttonPressedBackgroundColor:'#30323d',buttonPressedBorderColor:'#64666c',buttonPressedTextColor:'#ffffff',disabledColor:'#64666c',highlightColor:'#8fe9ff',mouseDownColor:'#30323d'},
    devicePixelRatio:window.devicePixelRatio || 1
  };
}

function hostActionInfoObject() {
  const action=hostAction();
  return {
    action:action?.UUID || 'unknown.action',
    context:hostState.context,
    device:hostState.deviceId,
    payload:hostPayload()
  };
}

function hostSendToPi(message) {
  const frame=$('hostPiFrame');
  if (!frame?.contentWindow || !hostState.piLoaded) return;
  frame.contentWindow.postMessage({__decklabHost:true,message},'*');
  logPi('host→PI',message.event || 'message',{message});
}

function parseJsonEditor(id,label) {
  try {
    const obj=JSON.parse($(id).value || '{}');
    if (!obj || typeof obj!=='object' || Array.isArray(obj)) throw new Error('must be a JSON object');
    return obj;
  } catch(err) {
    logHost('DeckLab',`${label} parse error`,{error:err.message});
    alert(`${label}: ${err.message}`);
    return null;
  }
}

function compatibleHostTargets(action) {
  if (!action) return [];
  return PLUGIN_TARGET_ORDER.filter(k=>{
    const c=getCompatibility(action,k);
    return c.kind==='yes' || c.kind==='partial';
  });
}

function syncHostControls() {
  const action=hostAction();
  const loaded=!!action;
  $('hostNoAction').classList.toggle('hidden',loaded);
  $('hostActionControls').classList.toggle('hidden',!loaded);
  $('hostToolbarStatus').textContent=loaded ? `${action.Name || 'Action'} · ${getActionControllers(action).join(' / ')}` : 'Load a plugin/action in Plugin Lab to begin';
  if (!loaded) return;
  $('hostActionName').textContent=action.Name || 'Unnamed action';
  $('hostActionUuid').textContent=action.UUID || 'No UUID';

  const target=$('hostTargetDevice');
  const allowed=compatibleHostTargets(action);
  const previous=target.value || hostState.target;
  target.innerHTML='';
  for (const key of allowed) {
    const d=DEVICES[key];
    const o=document.createElement('option'); o.value=key; o.textContent=d.name; target.appendChild(o);
  }
  if (allowed.includes(previous)) target.value=previous;
  else if (allowed.length) target.value=allowed[0];
  hostState.target=target.value || hostState.target;

  const controller=$('hostController');
  const d=DEVICES[hostState.target] || DEVICES.standard;
  const available=getActionControllers(action).filter(c=>d.controllers?.includes(c));
  const oldController=controller.value || hostState.controller;
  controller.innerHTML='';
  available.forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;controller.appendChild(o);});
  if (available.includes(oldController)) controller.value=oldController;
  hostState.controller=controller.value || available[0] || 'Keypad';

  const coordsDisabled=hostState.controller==='Neo';
  $('hostColumn').disabled=coordsDisabled;
  $('hostRow').disabled=coordsDisabled;
  $('hostContext').textContent=hostState.context || '—';
  $('hostDeviceId').textContent=hostState.deviceId || '—';
  $('removeHostActionBtn').disabled=!hostState.placed;
  $('placeHostActionBtn').textContent=hostState.placed?'Replace action':'Place action';
  $('hostDeviceToggleBtn').textContent=hostState.connected?'Disconnect device':'Connect device';
  $('hostSettings').value=JSON.stringify(hostState.actionSettings,null,2);
  $('hostGlobalSettings').value=JSON.stringify(hostState.globalSettings,null,2);
}

async function placeHostAction() {
  const action=hostAction();
  if (!action) return;
  if (hostState.placed) removeHostAction({quiet:false,keepConnection:true});
  hostState.target=$('hostTargetDevice').value || hostState.target;
  hostState.controller=$('hostController').value || getActionControllers(action)[0] || 'Keypad';
  hostState.column=Number($('hostColumn').value)||0;
  hostState.row=Number($('hostRow').value)||0;
  hostState.context=makeHostContext();hostState.runtimeVisuals=null;
  hostState.deviceId=makeHostDeviceId();
  hostState.state=0;
  hostState.title=action.States?.[0]?.Title ?? '';
  hostState.imageRef=action.States?.[0]?.Image || action.Icon || null;
  hostState.image=pluginAssetUrl(hostState.imageRef) || null;
  hostState.imageOrigin='manifest';
  hostState.animationNote=manifestAnimationLabel(hostState.imageRef);
  hostState.frameTimes=[];
  hostState.overlay=null;
  hostState.layout=(hostState.controller==='Encoder'||hostState.controller==='Neo') ? await getActionLayout(action,hostState.controller) : null;
  hostState.connected=true;
  hostState.placed=true;

  const d=DEVICES[hostState.target];
  logHost('host→plugin','deviceDidConnect',{device:hostState.deviceId,deviceInfo:{name:d.name,type:d.type,size:{columns:d.cols,rows:d.rows}}});
  logHost('host→plugin','willAppear',hostWillAppearEvent());
  await loadHostPropertyInspector();
  renderHostLab();
}

function removeHostAction({quiet=false,keepConnection=false}={}) {
  if (hostState.placed) {
    const action=hostAction();
    logHost('host→plugin','willDisappear',{action:action?.UUID || 'unknown.action',context:hostState.context,device:hostState.deviceId,event:'willDisappear',payload:hostPayload()});
    hostSendToPi({action:action?.UUID || '',context:hostState.context,event:'propertyInspectorDidDisappear'});
  }
  hostState.placed=false;
  if (!keepConnection) hostState.connected=false;
  hostState.layout=null;
  hostState.overlay=null;
  unloadHostPropertyInspector();
  if (!quiet) renderHostLab();
}

function toggleHostDevice() {
  const action=hostAction();
  const d=DEVICES[hostState.target] || DEVICES.standard;
  if (hostState.connected) {
    if (hostState.placed) logHost('host→plugin','willDisappear',{action:action?.UUID || '',context:hostState.context,device:hostState.deviceId,event:'willDisappear',payload:hostPayload()});
    logHost('host→plugin','deviceDidDisconnect',{device:hostState.deviceId});
    hostState.connected=false;
  } else {
    if (!hostState.deviceId) hostState.deviceId=makeHostDeviceId();
    logHost('host→plugin','deviceDidConnect',{device:hostState.deviceId,deviceInfo:{name:d.name,type:d.type,size:{columns:d.cols,rows:d.rows}}});
    hostState.connected=true;
    if (hostState.placed) logHost('host→plugin','willAppear',hostWillAppearEvent());
  }
  renderHostLab();
}

function simulateHostNavigation() {
  if (!hostState.placed || !hostState.connected) return;
  const action=hostAction();
  logHost('host→plugin','willDisappear',{action:action?.UUID || '',context:hostState.context,device:hostState.deviceId,event:'willDisappear',payload:hostPayload(),reason:'simulated page/profile navigation'});
  setTimeout(()=>{
    logHost('host→plugin','willAppear',{...hostWillAppearEvent(),reason:'simulated page/profile navigation'});
    renderHostLab();
  },130);
}

function applyHostSettingsFromEditor() {
  const obj=parseJsonEditor('hostSettings','Action settings'); if (!obj) return;
  hostState.actionSettings=obj;
  const action=hostAction();
  logHost('host→plugin','didReceiveSettings',{action:action?.UUID || '',context:hostState.context,device:hostState.deviceId,event:'didReceiveSettings',payload:hostPayload()});
  hostSendToPi({action:action?.UUID || '',context:hostState.context,event:'didReceiveSettings',payload:hostPayload()});
  renderHostLab();
}

function applyHostGlobalFromEditor() {
  const obj=parseJsonEditor('hostGlobalSettings','Global settings'); if (!obj) return;
  hostState.globalSettings=obj;
  const m=pluginState.manifest;
  const msg={event:'didReceiveGlobalSettings',payload:{settings:deepClone(obj)}};
  logHost('host→plugin','didReceiveGlobalSettings',{context:m?.UUID || 'plugin',...msg});
  hostSendToPi({context:m?.UUID || 'plugin',...msg});
  renderHostLab();
}

function mergeHostFeedback(layout,feedback) {
  if (!layout || !feedback || typeof feedback!=='object') return;
  const immutable=new Set(['rect','type','key']);
  for (const [key,value] of Object.entries(feedback)) {
    const item=layout.items?.find(i=>i.key===key);
    if (!item) continue;
    if (value!==null && typeof value==='object' && !Array.isArray(value)) {
      for (const [prop,val] of Object.entries(value)) {
        if (immutable.has(prop)) continue;
        if ((prop==='font'||prop==='range') && val && typeof val==='object') item[prop]={...(item[prop]||{}),...val};
        else item[prop]=val;
      }
    } else item.value=value;
  }
}


function manifestAnimationLabel(ref) {
  const s=String(ref || '').toLowerCase();
  if (s.endsWith('.gif') || s.includes('.gif?') || s.startsWith('data:image/gif')) return 'manifest GIF · animated';
  if (s.endsWith('.webp') || s.includes('.webp?') || s.startsWith('data:image/webp')) return 'manifest WebP · animated-capable';
  return 'static / runtime-driven';
}

function hostImageIsAnimating() {
  if (hostState.imageOrigin==='manifest') return /animated|webp/i.test(hostState.animationNote || '');
  const now=performance.now();
  hostState.frameTimes=(hostState.frameTimes||[]).filter(t=>now-t<1100);
  return hostState.frameTimes.length>=3;
}

function recordRuntimeImageFrame() {
  const now=performance.now();
  hostState.frameTimes=hostState.frameTimes || [];
  hostState.frameTimes.push(now);
  hostState.frameTimes=hostState.frameTimes.filter(t=>now-t<1100);
  const fps=Math.max(0,hostState.frameTimes.length-1);
  hostState.animationNote=fps>=2 ? `runtime frame stream · ~${fps} fps` : 'runtime image update';
}

async function dataUrlAnimatedWebP(value) {
  const raw=String(value || '');
  if (!raw.startsWith('data:image/webp')) return false;
  try {
    const comma=raw.indexOf(',');
    if (comma<0) return false;
    const meta=raw.slice(0,comma);
    let bytes;
    if (/;base64/i.test(meta)) {
      const bin=atob(raw.slice(comma+1));
      bytes=new Uint8Array(Math.min(bin.length,300000));
      for(let i=0;i<bytes.length;i++) bytes[i]=bin.charCodeAt(i);
    } else {
      const text=decodeURIComponent(raw.slice(comma+1));
      bytes=new TextEncoder().encode(text);
    }
    const ascii=new TextDecoder('latin1').decode(bytes);
    return ascii.includes('ANIM') || ascii.includes('ANMF');
  } catch(_) { return false; }
}

async function pluginFileIsAnimatedWebP(ref) {
  const f=findPluginFile(ref);
  if (!f || !String(ref||'').toLowerCase().includes('.webp')) return false;
  try {
    const buf=await f.slice(0,300000).arrayBuffer();
    const ascii=new TextDecoder('latin1').decode(buf);
    return ascii.includes('ANIM') || ascii.includes('ANMF');
  } catch(_) { return false; }
}

async function applyRuntimeImage(rawImage) {
  if (!rawImage) {
    hostState.image=null;
    hostState.imageRef=null;
    hostState.imageOrigin='runtime';
    hostState.animationNote='runtime image cleared';
    hostState.frameTimes=[];
    return;
  }
  const raw=String(rawImage);
  const lower=raw.toLowerCase();
  const gif=lower.startsWith('data:image/gif') || /\.gif(?:$|[?#])/i.test(raw);
  const animatedWebP=await dataUrlAnimatedWebP(raw) || await pluginFileIsAnimatedWebP(raw);
  if (gif || animatedWebP) {
    hostState.animationNote=`blocked ${gif?'GIF':'animated WebP'} via setImage · SDK fidelity`;
    logHost('DeckLab','animated setImage rejected',{format:gif?'GIF':'animated WebP',reason:'Elgato setImage does not support animated image formats'});
    return;
  }
  hostState.imageRef=raw;
  hostState.image=pluginAssetUrl(raw) || raw;
  hostState.imageOrigin='runtime';
  recordRuntimeImageFrame();
}

function applyHostManifestStateVisuals() {
  const action=hostAction();
  if (!action) return;
  const states=Array.isArray(action.States)?action.States:[];
  const st=states[hostState.state] || states[0];
  if (!st) return;
  hostState.title=st.Title ?? '';
  hostState.imageRef=st.Image || action.Icon || null;
  hostState.image=pluginAssetUrl(hostState.imageRef) || hostState.image;
  hostState.imageOrigin='manifest';
  hostState.animationNote=manifestAnimationLabel(hostState.imageRef);
  hostState.frameTimes=[];DeckLabRuntimeVisuals.refresh(hostState);
}

function hostInteractionPayload(extra={}) {
  return hostPayload(extra);
}

function emitHostInteraction(event,extra={}) {
  if(event==='dialRotate')DeckLabSurface.rotateDial(currentDeviceKey,Number(hostState.column)||0,extra.ticks);
  if(event==='dialDown'||event==='dialUp')DeckLabSurface.pressDial(currentDeviceKey,Number(hostState.column)||0,event==='dialDown');
  if (!hostState.placed || !hostState.connected) return;
  const action=hostAction();
  const message={action:action?.UUID || '',context:hostState.context,device:hostState.deviceId,event,payload:hostInteractionPayload(extra)};
  logHost('host→plugin',event,message);
}

function simulateHostKeyPress() {
  const action=hostAction();
  if (!action || hostState.controller!=='Keypad') return;
  const states=Array.isArray(action.States)?action.States:[];
  if (states.length>1 && !action.DisableAutomaticStates) {
    hostState.state=hostState.state===0?1:0;
    applyHostManifestStateVisuals();
  }
  emitHostInteraction('keyDown',{});
  renderHostSurface();
  setTimeout(()=>emitHostInteraction('keyUp',{}),90);
}

function simulateHostDialRotate(ticks) {
  if (hostState.controller!=='Encoder') return;
  emitHostInteraction('dialRotate',{ticks:Number(ticks)||0,pressed:false});
}

function simulateHostDialPress() {
  if (hostState.controller!=='Encoder') return;
  emitHostInteraction('dialDown',{});
  setTimeout(()=>emitHostInteraction('dialUp',{}),100);
}

function simulateHostTouchTap() {
  if (hostState.controller!=='Encoder') return;
  emitHostInteraction('touchTap',{tapPos:[100,50],hold:false});
}

function renderHostInteractionBar() {
  const bar=$('hostInteractionBar'); if (!bar) return;
  bar.innerHTML='';
  if (!hostState.placed) return;
  const add=(label,fn)=>{const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent=label;b.addEventListener('click',fn);bar.appendChild(b);};
  if (hostState.controller==='Keypad') add('Press key',simulateHostKeyPress);
  else if (hostState.controller==='Encoder') {
    add('Rotate −1',()=>simulateHostDialRotate(-1));
    add('Press dial',simulateHostDialPress);
    add('Rotate +1',()=>simulateHostDialRotate(1));
    add('Tap touch',simulateHostTouchTap);
  } else {
    const s=document.createElement('span');s.className='display-only-note';s.textContent='Neo Infobar is display-only.';bar.appendChild(s);
  }
}

async function applyHostCommand(command,payload={}) {
  if (!hostState.placed) { logHost('DeckLab','command ignored',{command,reason:'no placed action'}); return; }
  const action=hostAction();
  logHost('plugin→host',command,{action:action?.UUID || '',context:hostState.context,payload:deepClone(payload)});
  if (command==='setTitle'||command==='setImage') await DeckLabRuntimeVisuals.command(hostState,command,payload);
  else if (command==='setState') {hostState.state=clamp(Number(payload.state)||0,0,1);applyHostManifestStateVisuals();DeckLabRuntimeVisuals.refresh(hostState);}
  else if (command==='showOk') flashHostOverlay('ok');
  else if (command==='showAlert') flashHostOverlay('alert');
  else if (command==='setFeedback') {
    if (!hostState.layout && (hostState.controller==='Encoder'||hostState.controller==='Neo')) hostState.layout=await getActionLayout(action,hostState.controller);
    mergeHostFeedback(hostState.layout,payload);
  } else if (command==='setFeedbackLayout') {
    try{hostState.layout=await getActionLayout(action,hostState.controller,payload.layout);}catch(e){logHost('DeckLab','layout rejected',{reason:e.message});}
  } else if (command==='setSettings') {
    hostState.actionSettings=deepClone(payload || {});
    logHost('host→plugin','didReceiveSettings',{action:action?.UUID || '',context:hostState.context,device:hostState.deviceId,event:'didReceiveSettings',payload:hostPayload()});
  } else if (command==='setGlobalSettings') {
    hostState.globalSettings=deepClone(payload || {});
    logHost('host→plugin','didReceiveGlobalSettings',{context:pluginState.manifest?.UUID || 'plugin',event:'didReceiveGlobalSettings',payload:{settings:deepClone(hostState.globalSettings)}});
  }
  renderHostLab();
}

function flashHostOverlay(kind) {
  hostState.overlay=kind;
  renderHostSurface();
  setTimeout(()=>{ if(hostState.overlay===kind){hostState.overlay=null;renderHostSurface();} },900);
}

async function renderHostSurface() {
  const host=$('hostSurface');
  if (!host) return;
  host.innerHTML='';
  const action=hostAction();
  if (!hostState.placed || !action) {
    host.innerHTML='<div class="host-surface-empty">Place an action to create its runtime surface.</div>';
    return;
  }
  const d=DEVICES[hostState.target] || DEVICES.standard;
  if (hostState.controller==='Keypad') {
    if (d.inputOnly) {
      const box=document.createElement('div'); box.className='host-runtime-key';
      const face=document.createElement('div'); face.className='host-runtime-key-face';
      const glyph=document.createElement('div'); glyph.className='host-runtime-glyph'; glyph.textContent=d.buttonPrefix==='P'?'PEDAL':'G'+(hostState.column+1);
      const title=document.createElement('div'); title.className='host-runtime-title'; title.textContent=`${action.Name || 'Action'} · input only`;
      face.append(glyph,title); box.appendChild(face); host.appendChild(box);
    } else {
      const box=document.createElement('div'); box.className='host-runtime-key';
      const face=document.createElement('div'); face.className=`host-runtime-key-face ${hostState.state?'on':''} ${hostImageIsAnimating()?'animating':''}`;
      if (hostState.image) { const img=document.createElement('img'); img.src=hostState.image; img.alt=''; face.appendChild(img); }
      else { const glyph=document.createElement('div'); glyph.className='host-runtime-glyph'; glyph.textContent='◈'; face.appendChild(glyph); }
      const title=document.createElement('div'); title.className='host-runtime-title'; title.textContent=hostState.title || action.Name || '';
      face.appendChild(title); box.appendChild(face); host.appendChild(box);
    }
  } else {
    if (!hostState.layout) hostState.layout=await getActionLayout(action,hostState.controller);
    const canvas=document.createElement('div');
    canvas.className=`host-layout-surface ${hostState.controller==='Neo'?'neo':'encoder'}`;
    host.appendChild(canvas);
    requestAnimationFrame(()=>renderLayoutInto(canvas,hostState.layout,{selectable:false}));
  }
  if (hostState.overlay) {
    const overlay=document.createElement('div'); overlay.className=`host-overlay ${hostState.overlay}`; overlay.textContent=hostState.overlay==='ok'?'✓':'⚠'; host.appendChild(overlay);
  }
}

function renderHostComparison() {
  const wrap=$('hostComparison'); if (!wrap) return;
  wrap.innerHTML='';
  const action=hostAction();
  if (!action) { wrap.innerHTML='<div class="empty-state compact">Select an action first.</div>'; return; }
  for (const key of compatibleHostTargets(action)) {
    const d=DEVICES[key], compat=getCompatibility(action,key);
    const card=document.createElement('div'); card.className=`host-target-card ${key===hostState.target?'current':''}`;
    const name=document.createElement('strong'); name.textContent=d.name;
    const detail=document.createElement('span'); detail.textContent=compat.controllers?.length?compat.controllers.join(' / '):compat.label;
    const btn=document.createElement('button'); btn.className='secondary'; btn.type='button'; btn.textContent=key===hostState.target?'Current target':'Use target';
    btn.disabled=key===hostState.target;
    btn.addEventListener('click',()=>{
      if (hostState.placed) removeHostAction({quiet:true,keepConnection:false});
      hostState.target=key;
      $('hostTargetDevice').value=key;
      syncHostControls(); renderHostLab();
    });
    card.append(name,detail,btn); wrap.appendChild(card);
  }
}

function renderHostLab() {
  syncHostControls();
  const action=hostAction();
  const meta=$('hostRuntimeMeta');
  if (!action) meta.textContent='No action selected.';
  else if (!hostState.placed) meta.textContent=`${action.Name || 'Action'} is ready to place.`;
  else meta.textContent=`${DEVICES[hostState.target]?.name || hostState.target} · ${hostState.controller} · ${hostState.context}`;
  $('hostConnectionStatus').classList.toggle('host-online',hostState.connected);
  $('hostConnectionStatus').classList.toggle('host-offline',!hostState.connected);
  $('hostConnectionStatus').innerHTML=`<i></i> ${hostState.connected?'device connected':'device disconnected'}`;
  $('hostStateBadge').textContent=`STATE ${hostState.state}`;
  $('hostContext').textContent=hostState.context || '—';
  $('hostDeviceId').textContent=hostState.deviceId || '—';
  renderHostSurface();
  renderHostInteractionBar();
  renderHostComparison();
  renderLiveRuntimeStatus();
  const piPath=action?.PropertyInspectorPath;
  $('hostPiTitle').textContent=piPath || 'No Property Inspector';
}

function unloadHostPropertyInspector() {
  hostState.piLoaded=false;
  const frame=$('hostPiFrame'); if (frame) { frame.classList.remove('live'); frame.srcdoc=''; }
  $('hostPiEmpty')?.classList.remove('hidden');
  $('hostPiStatus')?.classList.remove('live');
  if ($('hostPiStatus')) $('hostPiStatus').textContent='inactive';
}

function rewritePiAssetAttribute(doc,selector,attr,baseDir) {
  doc.querySelectorAll(selector).forEach(el=>{
    const ref=el.getAttribute(attr); if (!ref) return;
    if (/^(data:|blob:|https?:|#)/i.test(ref)) return;
    const url=pluginAssetUrl(ref,baseDir) || pluginAssetUrl(ref);
    if (url) el.setAttribute(attr,url);
  });
}

function propertyInspectorBridgeScript() {
  const info=JSON.stringify(JSON.stringify(hostInfoObject()));
  const actionInfo=JSON.stringify(JSON.stringify(hostActionInfoObject()));
  const context=JSON.stringify(hostState.context || 'decklab-context');
  return `\n(() => {\n  const parentPost=(payload)=>parent.postMessage({__decklabPi:true,payload}, '*');\n  const sockets=[];\n  class DeckLabWebSocket {\n    constructor(url){ this.url=url; this.readyState=0; sockets.push(this); setTimeout(()=>{this.readyState=1; if(this.onopen)this.onopen({type:'open'});},8); }\n    send(data){ parentPost({kind:'ws-send',data}); }\n    close(){ this.readyState=3; if(this.onclose)this.onclose({type:'close'}); }\n    addEventListener(type,fn){ this['on'+type]=fn; }\n    removeEventListener(type,fn){ if(this['on'+type]===fn)this['on'+type]=null; }\n    _receive(message){ const ev={data:JSON.stringify(message)}; if(this.onmessage)this.onmessage(ev); }\n  }\n  DeckLabWebSocket.OPEN=1; DeckLabWebSocket.CLOSED=3; window.WebSocket=DeckLabWebSocket;\n  window.addEventListener('message',ev=>{ if(ev.data && ev.data.__decklabHost){ sockets.forEach(s=>s._receive(ev.data.message)); } });\n  const attempt=()=>{\n    if(typeof window.connectElgatoStreamDeckSocket==='function'){\n      try { window.connectElgatoStreamDeckSocket('28196', ${context}, 'registerPropertyInspector', ${info}, ${actionInfo}); parentPost({kind:'bridge-ready'}); }\n      catch(err){ parentPost({kind:'bridge-error',error:String(err)}); }\n    } else setTimeout(attempt,40);\n  };\n  if(document.readyState==='loading') window.addEventListener('DOMContentLoaded',()=>setTimeout(attempt,20)); else setTimeout(attempt,20);\n})();\n`;
}

async function loadHostPropertyInspector() {
  unloadHostPropertyInspector();
  const action=hostAction();
  const ref=action?.PropertyInspectorPath;
  if (!ref || !hostState.placed) return;
  const file=findPluginFile(ref);
  if (!file) { logPi('DeckLab','PI missing',{path:ref}); return; }
  try {
    const html=await file.text();
    const parser=new DOMParser();
    const doc=parser.parseFromString(html,'text/html');
    const base=dirname(normalizePluginPath(ref));
    rewritePiAssetAttribute(doc,'script[src]','src',base);
    rewritePiAssetAttribute(doc,'link[href]','href',base);
    rewritePiAssetAttribute(doc,'img[src]','src',base);
    rewritePiAssetAttribute(doc,'source[src]','src',base);
    const bridge=doc.createElement('script'); bridge.textContent=propertyInspectorBridgeScript();
    (doc.head || doc.documentElement).insertBefore(bridge,(doc.head || doc.documentElement).firstChild);
    const frame=$('hostPiFrame');
    frame.srcdoc='<!doctype html>\n'+doc.documentElement.outerHTML;
    frame.classList.add('live');
    $('hostPiEmpty').classList.add('hidden');
    $('hostPiStatus').classList.add('live');
    $('hostPiStatus').textContent='sandbox loading';
    hostState.piLoaded=true;
    logPi('DeckLab','Property Inspector loaded',{path:ref});
  } catch(err) { logPi('DeckLab','PI load error',{error:err.message}); }
}

async function handlePiCommand(message) {
  if (!message || typeof message!=='object') return;
  const event=message.event || 'unknown';
  logPi('PI→host',event,{message});
  const action=hostAction();
  if (event==='registerPropertyInspector') {
    $('hostPiStatus').textContent='connected';
    $('hostPiStatus').classList.add('live');
    logHost('PI→host','registerPropertyInspector',{uuid:message.uuid});
    hostSendToPi({action:action?.UUID || '',context:hostState.context,event:'didReceiveSettings',payload:hostPayload()});
  } else if (event==='getSettings') {
    hostSendToPi({action:action?.UUID || '',context:hostState.context,event:'didReceiveSettings',payload:hostPayload()});
  } else if (event==='setSettings') {
    hostState.actionSettings=deepClone(message.payload || {});
    $('hostSettings').value=JSON.stringify(hostState.actionSettings,null,2);
    logHost('host→plugin','didReceiveSettings',{action:action?.UUID || '',context:hostState.context,device:hostState.deviceId,event:'didReceiveSettings',payload:hostPayload()});
  } else if (event==='getGlobalSettings') {
    hostSendToPi({context:pluginState.manifest?.UUID || 'plugin',event:'didReceiveGlobalSettings',payload:{settings:deepClone(hostState.globalSettings)}});
  } else if (event==='setGlobalSettings') {
    hostState.globalSettings=deepClone(message.payload || {});
    $('hostGlobalSettings').value=JSON.stringify(hostState.globalSettings,null,2);
    logHost('host→plugin','didReceiveGlobalSettings',{context:pluginState.manifest?.UUID || 'plugin',event:'didReceiveGlobalSettings',payload:{settings:deepClone(hostState.globalSettings)}});
  } else if (event==='sendToPlugin') {
    const outbound={action:message.action || action?.UUID || '',context:message.context || hostState.context,event:'sendToPlugin',payload:deepClone(message.payload)};
    logHost('PI→plugin','sendToPlugin',outbound);
    liveSendToPlugin(outbound);
  } else if (event==='openUrl') {
    logHost('PI→host','openUrl blocked in sandbox',{url:message.payload?.url || message.url || ''});
  } else if (['setTitle','setImage','setState','showOk','showAlert','setFeedback','setFeedbackLayout'].includes(event)) {
    await applyHostCommand(event,message.payload || {});
  }
  renderHostLab();
}

window.addEventListener('message',ev=>{
  const outer=ev.data;
  if (!outer || !outer.__decklabPi) return;
  const payload=outer.payload || {};
  if (payload.kind==='bridge-ready') logPi('PI','bridge-ready');
  else if (payload.kind==='bridge-error') logPi('PI','bridge-error',{error:payload.error});
  else if (payload.kind==='ws-send') {
    try { handlePiCommand(typeof payload.data==='string'?JSON.parse(payload.data):payload.data); }
    catch(err){ logPi('PI','invalid message',{raw:payload.data,error:err.message}); }
  }
});

function makeVirtualPluginFile(root,path,content,type='text/plain') {
  const name=path.split('/').pop();
  const f=new File([content],name,{type});
  try { Object.defineProperty(f,'webkitRelativePath',{value:`${root}/${path}`}); } catch(_) {}
  return f;
}

function samplePluginFiles() {
  const root='com.decklab.hostdemo.sdPlugin';
  const animatedGif=Uint8Array.from(atob('R0lGODlhkACQAIIAAI/p/8ej//90yRwqPBsiMQUIDgAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQACAAAACwAAAAAkACQAAAI/wALCBxIsKDBgwgTKlzIsKHDhxAjSpxIsaLFixgzatzIsaPHjyBDihxJsqTJkyhTqlzJsqXLlzBjypxJs6bNmzhz6tzJs6fPn0CDCh1KtKjRo0iTKl3KtKnTp0kHSJ1KtSpUllWzatV6deTWr2CpduUYdkDDsmMtfr24Ni1Erh7hulUoF2TduQOzptSLV6BVrGLn/n05+GphwoGhJqa5eOnhiGXNVnxslDLDyFsnWhba+CxmtJCnIu28EGzptg9J/1SN8O5bvg5Z75RdEDZG26elDhXtmTZF3Al5AxWeW7fIzbWN+/RdgLlG5s5h+kb+kXpz4jmxH7Refbry7N9ba//fOz65ZJy0ox8vn5e99PAG1Xt1f/18Tfr1NQZ4Dj9+//f2bfefRAEQsF9G9OGnUoIKMlQgAQYiyGCAANLV4EIPQhjhbe5dWNKEGWWo4YZsDeiXieRRSJCHCYk4IolqmchiSLLNeJCLLx4Yo4rtoWhShz42hGOOEvJ4opEoAYmkQ0O+CONvMgY5H5I2FtSkk09qFuWSJCl50ZVYZhkalVLSOGCVA4EZppivGYlmkW6WeeOadEKoo5ZxytmRlxS5KMCff2oIaKAj3jmmhVyamWdFfg4aqKOEamhom8HpSdaZlgrUKKScRmonlIsCFmpEm3baKZESEQfAqqu+ueOoD5X/auqphaZqHKu4tppoXJgaF8Cvv2L44qzEOjlpcbkmu+uevWoKLLAtOknsrMbamuy1K7En2rPczinttLSimtq15C7YK7foWhkmuOGKexa52KZYKbr0pkknu47SeSxC8JabJKb0pluAmgTg62mY+xrUb7wnaTtAwN0SDCG+dUra0MLJyisexM9qWnHB7H6ccEEY56qxgBxD63HF4Ir8UMm4nuzfwxyryzK1FY8cH8wAmLsoxN7ei7O+kPHsc6WS1YsQwabmbC3G2faadMfR3pxvnToLKNXCy17aLKlWD+r0oQXAm2mRSE/EtNhY40lQrq7umLbaVo9tK6wym8donYC2/w3q3FGT2bXNawrgt9uA+4w32B9jmTWiSA/O7OKMN26x3OJJPjnkFklcK+aZIyY4Rp6zSWnionLeucsljl4h6n0eDrrWMdV4NkFgPn7Zlpp35/qXa+qem+qvw053tRwuGbfXiPZO+KfJ/y7ThM7jfnnryt+u6PAhmk628cWDTyB/XC7ve3Ezpaf9lNmvT3771Xfpo3y8zu++/OXTD2f+8f+IH3des9/9PqQg/YEqUQZMXW8GGLldme9fDgTgmBr0QAguCziTkWACRdc116QGg5GrDItM0zwQhvAo9PsMaNrUv+npT4USXNEGbRLDmZHwgC2kYQU3MsPZ9JCHP/ThDl1xiJcaBjCHwzEi9hjIGRO+b4i7cWIGldgV1OAwiE9ZYQk92JcPwlCLXVziF5kYRhuGpYxoTKMa18jGNrrxjXCMoxznSMc62vGOeMyjHvfIxz768Y+ADKQgB7mSgAAAIfkEAQgABgAsJAAzAFkANACCj+n/x6P//3TJHCo8GyIxBQgOAAAAAAAACP8ADQgcKDCAQYMEEypcyLChw4cQHx6cGLGixYsYFU7cmLGjx48GNooESbIkQ5EoTao0iXLkypceW3KESfOiTIo1c0K8eVCnT4c8fwo92XKoUY0ujyotiHOp06cqC0iVCtXo1KsDBjC8WqDqR65YtSYE29UrxgFkpWYVKzBtWbMRs7pdW9YtVbgQ5aalawCt3bd4F9Ldq9ev3cANB5MdbNgtYoaKwTL+C/jxwMhcJ/+1rBBzWL8GNnPu3Diz3IGOR5Oeexo1WNWQWbN1PRV2Q9a2v0qenbsj197AgwsfTry4cYsAkic/XlG58+XMGz6fHn3h9OvVCV7fnl3gduzZv3Mlry4efPTy1Mmjdx5+vfLu7gF0NxB/Pn309r2Lzz/wO/+Ez0EUEAAh+QQBCAAGACwoACgATwBPAIKP6f/Ho///dMkcKjwbIjEFCA4AAAAAAAAI/wANCBxIkGCAgwcLKlzIsKHDhxALIpwYsaLFixEnasTIsaNFjSA9ihxpEGRIkig5mjyZsmXGlRRdynQIM+bMmxJrJsTJc6DOnkAFwgzqsoBRoyU3Ek15tGnSnUtJNp0aFeeAqVSruryKNatWlFy7Hv3KVKxTslLNjkU7Uu1atiLdwkVpdm5Zr3bTvs3Lt6/fv4ADCx5MuLDhw4gTK17MuLHjx5AjS55MubLly5bxPh4Q9qxjznUbc+6MlfFotZwXnzabOvFq1q0Pv+562jVprLUR3566OrHbAr19w+a6eDjx4rRBF3CMWznkpqOvDgZAnfpD4KOnV98OADL3746/iypnLL784vLjE6M3j3h9+sPuwbePv109/eqK73fPf598/PDrecdeZNyNFBAAIfkEAQgABgAsMgAkADUAWQCCj+n/x6P//3TJHCo8GyIxBQgOAAAAAAAACP8ADQgcSLBgwQAIERpcyLChw4UJIz6cSLFhxIsVM1a8yFEjxQEgCxSAyLGjx4YhRYo0WNLkSYMDVMocSbAlxpcFY86UWdNmQpwEde7kKdDnT6ACh+7saRPpQKUzD7Z0+hSqSpYuqVq9itWAQqoEt4I9CXXsy6FmcUZNy7at27dw48qdS7eu3bt48+rdy7ev37+AAwseTLiw4cOIEytezLix48eQI0ueTLmy5cuYM2vezBkxyJB9P6dcmVe0UK52RZet+3krzbmnrQIFQJv2Q9drNdbebZshbpUDPPIe7vs3SN3DiRs0frxi8ufLt5rO+Dz5QqvTnVe3XlCpadIUt3Mq7y7TtE7k4nf7Ni9UeHr1DL+jpv6+9sPTs+vXrQ/A7nu84ulVXV+8pRUQACH5BAEIAAYALCoAJAAzAFkAgo/p/8ej//90yRwqPBsiMQUIDgAAAAAAAAj/AA0IHEiwoMGDAxImPMiwocOHBSJKLPCwosWDEzNe3Fgxo0eOIA16HFkwgEmTIR2O/DjwpMuUDFdqFOiyJkyRMiXSrGnz5sCcOnkK9fkz506hL4kKlNkSaVKlBkg2dYoS6lKKEUtSrWr14dauF52C3Th0LNmnZtOqXcu2rdu3cOPKnUu3rt27ePPq3cu3r9+/gAMLHky4sOHDiBMrXsy4sePHkCNLnky5suWNADJntqu582a5nkPHDU36LenTbk+XZqsatUOFC0G2Xo0QNmyOs0XXtn37Ym7PGIFStPi7M07hwysWBxAcue/ix5Enf/i7uXTMrWNKz4qddnTnso2rGtw+Pe0A5APc8l4fuy1723Hft4fLtO5MjgEBACH5BAEIAAYALBkAKABPAE8Ago/p/8ej//90yRwqPBsiMQUIDgAAAAAAAAj/AA0IHEiwoMGDCBMqJFigYYEBCyNKnEgRocOLFTNq3GjgokeOIEMa9EhSpEmOJFOeXEkxZUmWMBW6/Biz5siZDm3qHIgz586dPX8KnSm0qEqCAZImLcqS5kClUJn+hEpVqk2qWK3CxMpV60quWb2aBFtVrEiyUc2GRKtU7Vm0bseCjXuyK926ae/q3cu3r9+/gAMLHky4sOHDiBMrXsy4sePHkCNLnkzZJIDLlyNj3py5MefPjD+LViy6dOLSow+jNm14derCrkG3jr1ZNW3MiG8DOH2bdOzQqx2j1lx74cMByCNfRM7cMUnmyRfPhK6453GIiK03xG5YO0bDA7w3JTyMXDz58trPM7eOGHp4otmvo38Z3/17n9W32y/g3KF75f7xFRAAIfkEAQgABgAsFAAzAFkANACCj+n/x6P//3TJHCo8GyIxBQgOAAAAAAAACP8ADQgcSLCgwYMIEypcmLCAQ4cMI0qcSDHiw4sVM2rcePCiR44gQ1r0+FGkyZMGSKpEyZKjSpItY1Z8WVKmzYU0Md7ciTDnQ55ADfoMSpQgzaJIBa5MmrQmQwBQoTJFGrWq1KkhA2jVetCqV6wct4ot6LUs2Ixi0w4sy/bsxLRwBbI165Yh3Ltz29ZVeBduXrp7EfZN+/drYMGDtxa2ehhx4gCLqzZ23Fdu5MkJB6+9jJnyVrKFO/Mda/Cv6JBzT5tkrLq169ewY8ue3VQnbYkvB9xmmFP3boQDevv+TXCAceHEix+naTy5UuPBkSd3CF06cerLmTt/WD3nduzRj34bL9B96Xjo4Z1OB2/euVL2tt0PBB9efk/07gMCACH5BAEIAAYALBQAKgBZADMAgo/p/8ej//90yRwqPBsiMQUIDgAAAAAAAAj/AA0IHEjQAICDBwsqXMiwocOHECMaREgRgMSLGDNmrMhRo8ePHzmKBEmyZEORKE2qVIly5MqXHlumhElTokyXNXOevFlRp8+FPHv+HCowKEWiSI1aREpUKdOkPJ8yvSn1acuqVYVi3cq1q9evYMOKHUu2YIGzZ8vSHDAArVu1Ed0WWMhW7lu4De3OJci2rd4CA/Au/LvXAOC6f9kKJkg4reG+hBUvNtwY8FnIiSULrmz5sF+9fSdz9osZtGa8oy8jNh14cWrPkU+jbiwQdubJAwnnLm1Xtmu7BXnLbY07993gn4EXz7j6+PKMcp8bCECdunSP1bNfx5i9+/aI3cN/JncYvvx4huXFn1eY3vv6gu21vycYv/p8+PHvs0+vf6H5/v7Jt1BAACH5BAEIAAYALBkAGQBPAE8Ago/p/8ej//90yRwqPBsiMQUIDgAAAAAAAAj/AA0IHEiwoEEDABImPMiwocOHECMKVEhxocSLGDMarMhRo8ePDjmKBEmSpMiTJVNmPDlSpcuHLFG+nLkxZkeaOCfarJgz506ePWn+pBgU51AARY0OTarUJlOfMZ/2ZCm1KNCqGQsM2DoAa88CWrmCLeB15lixY8mWTXl2a9qxa0m2dfsWbNyPc+vCvZsVLFq9dvlezAs4sOCIfukW7noYcdgBhcM2RvwX8NbJESvXvYwZoua3nDs/hLyYsWiIkU2fRq1X9WrHe1/Lnk27tu3buHPr3s27t+/fwIMLH068uPHjyJMrl/hWuF7ghX1HVqt7umHc1qljt747e3fu36P3MxZfO4B58wSf2z7PPn3a2+zj+45Pnzf9+7vv19etXz7//uflByB6AvY3n37A4RecfxAFBAAh+QQBCAAGACwpABQANQBZAIKP6f/Ho///dMkcKjwbIjEFCA4AAAAAAAAI/wANCBxIsKDBgwASJjzIsKHDhwYUSlwIsaLFgRMzXtzoMKNHjiAJehwZUmCBkychjvwIEqXLAQMariS50eVJmDgZzmRp0SbOnwUQ7px48eXPATYNDiXa8yZQm0ELLpXY9ChUl0qnFrV6FWXWpRefdvX6deZGnGOTCl3JEWZatWs1tnxLtiPVknTrlqz5NubekGNh/t0LNefgvygFH17MuLHjx5AjS55MubLly5gza97MubPnz6BDix5NurTp06hTq17NurXr17Bjy55Nu7bt27hz697Nu7dvyXA9X/08tvPbzXkfBwhgYLnB5I2XS3dOEPri6dir02WMvftA63+7iyP/npa7+Ozkh5s/L72g+vXsmbvH6jh+e832O7P/PB40eo4BAQAh+QQBCAAGACwyABQANQBZAIKP6f/Ho///dMkcKjwbIjEFCA4AAAAAAAAI/wANCBxIsCDBAggRGlzIsKFDgwkjKnxIsaLBARgzahxgsSPFjSAxehx5MWRIkigNYJTIcuJDADBhomxJ0+XCmDhleqxJs2HOnzt5smT4s2hHoUMNFl1qEanEm0uBNnVaAGpUqRSpVlV6FWtWpES75vRoMqNPsThHlnWINi3JjRXbAkhJUi7dumLvouyqN2XUvnfHAh5MuLDhw4gTK17MuLHjx5AjS55MubLly5gza97MubPnz6BDix5NurTp06hTq17NurXr17Bjy55NO3SA27cx495tebdvyr6DSw5OPDJx4RCr2ux7/HfBloSb8z7YE7B03NRrDr6enef248/BfhZ33l179OnhhUZ2Kln9ZPOUoV+GSzggACH5BAEIAAYALCgAGQBPAE8Ago/p/8ej//90yRwqPBsiMQUIDgAAAAAAAAj/AA0IHEiwoMGDCBMeLMCQocKHECNKhDigYsOGEzNq3DiwoscBFwtwHElyYYGPHi+WXDky5EmUGFnKlOiSIUyRM3MmrHkRps6fBXn2/Ai0qAGhIT0aBYo06YClP5smhRpVqkOqOkFaxfrTIlKuQFPWBFv0Y0iyS8U+BMCWLVqjbeO6fZtTrl26Mu3qxVtSr1++I/3uBaxR8F/CEw0PRhxR8V3GjR3HhRxZ8lzKay1jrux4M2fBniUqDp34MOnSbU+rXs26tevXsGPLnk27tu3buHPr3s27t+/fwIMLJxygeHHdxpPjTs7cNvPntJ9Lny0duuzqza9jN059+/Hu2J1XJh949vV0gWPNK0fP03ZT2ltlx489H3b91/fxf60tFHd63FpdtVpAADs='),c=>c.charCodeAt(0));
  const icon=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 144"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#8fe9ff"/><stop offset="1" stop-color="#c7a3ff"/></linearGradient></defs><rect width="144" height="144" rx="26" fill="#080b11"/><path d="M28 73h88M72 29v86" stroke="url(#g)" stroke-width="13" stroke-linecap="round"/><circle cx="72" cy="72" r="47" fill="none" stroke="url(#g)" stroke-width="7"/></svg>`;
  const manifest={SDKVersion:3,Author:'DeckLab',Name:'DeckLab Host Demo',UUID:'com.decklab.hostdemo',Version:'1.0.0',Software:{MinimumVersion:'7.6'},Icon:'images/plugin.svg',Actions:[
    {Name:'Host Toggle',UUID:'com.decklab.hostdemo.toggle',Icon:'images/action.svg',PropertyInspectorPath:'pi/index.html',Controllers:['Keypad'],States:[{Image:'images/action.svg',Title:'READY'},{Image:'images/action.svg',Title:'ACTIVE'}]},
    {Name:'Animated Manifest Key',UUID:'com.decklab.hostdemo.animated',Icon:'images/action.svg',PropertyInspectorPath:'pi/index.html',Controllers:['Keypad'],States:[{Image:'images/animated.gif',Title:'GIF'}]},
    {Name:'CPU Dial',UUID:'com.decklab.hostdemo.cpu',Icon:'images/action.svg',PropertyInspectorPath:'pi/index.html',Controllers:['Encoder'],Encoder:{layout:'layouts/encoder.json'}},
    {Name:'Neo Status',UUID:'com.decklab.hostdemo.neo',Icon:'images/action.svg',PropertyInspectorPath:'pi/index.html',Controllers:['Neo']}
  ]};
  const layout={...deepClone(SAMPLES.encoder),id:'com.decklab.hostdemo.cpu.layout'};
  const neo={...deepClone(SAMPLES.neo),id:'com.decklab.hostdemo.neo.layout'};
  const pi=`<!doctype html><html><head><meta charset="utf-8"><style>body{font:13px system-ui;margin:0;padding:16px;background:#f3f5f8;color:#172033}h2{font-size:16px;margin:0 0 6px}.sub{color:#65728a;font-size:11px;margin-bottom:16px}label{display:block;font-size:11px;font-weight:700;margin:11px 0 5px}input{width:100%;box-sizing:border-box;padding:8px;border:1px solid #cbd3df;border-radius:7px}button{margin-top:10px;width:100%;padding:9px;border:0;border-radius:7px;background:#26364f;color:white;font-weight:800}.row{display:grid;grid-template-columns:1fr 1fr;gap:8px}.msg{margin-top:12px;padding:8px;background:#e7edf6;border-radius:7px;font-size:10px;white-space:pre-wrap}</style></head><body><h2>DeckLab demo inspector</h2><div class="sub">This real HTML is running inside DeckLab's sandboxed PI bridge.</div><label>Label</label><input id="label" value="Configured in PI"><label>Step</label><input id="step" type="number" value="5"><button id="save">Save settings</button><div class="row"><button id="read">Get settings</button><button id="ping">Send to plugin</button></div><div id="msg" class="msg">Waiting for Stream Deck bridge…</div><script>let ws,ctx,action;window.connectElgatoStreamDeckSocket=(port,uuid,event,info,actionInfo)=>{ctx=uuid;const ai=JSON.parse(actionInfo);action=ai.action;ws=new WebSocket('ws://127.0.0.1:'+port);ws.onopen=()=>{ws.send(JSON.stringify({event,uuid}));document.getElementById('msg').textContent='Connected to DeckLab host';};ws.onmessage=e=>{const m=JSON.parse(e.data);document.getElementById('msg').textContent=JSON.stringify(m,null,2);if(m.event==='didReceiveSettings'){const s=m.payload.settings||{};if(s.label)document.getElementById('label').value=s.label;if(s.step)document.getElementById('step').value=s.step;}};};document.getElementById('save').onclick=()=>ws.send(JSON.stringify({event:'setSettings',context:ctx,payload:{label:document.getElementById('label').value,step:Number(document.getElementById('step').value)}}));document.getElementById('read').onclick=()=>ws.send(JSON.stringify({event:'getSettings',context:ctx}));document.getElementById('ping').onclick=()=>ws.send(JSON.stringify({event:'sendToPlugin',action,context:ctx,payload:{kind:'hello',from:'Property Inspector'}}));</script></body></html>`;
  return [
    makeVirtualPluginFile(root,'manifest.json',JSON.stringify(manifest,null,2),'application/json'),
    makeVirtualPluginFile(root,'images/plugin.svg',icon,'image/svg+xml'),
    makeVirtualPluginFile(root,'images/action.svg',icon,'image/svg+xml'),
    makeVirtualPluginFile(root,'images/animated.gif',animatedGif,'image/gif'),
    makeVirtualPluginFile(root,'layouts/encoder.json',JSON.stringify(layout,null,2),'application/json'),
    makeVirtualPluginFile(root,'layouts/neo.json',JSON.stringify(neo,null,2),'application/json'),
    makeVirtualPluginFile(root,'pi/index.html',pi,'text/html')
  ];
}

async function loadSamplePlugin() {
  await loadPluginFolder(samplePluginFiles());
  logHost('DeckLab','built-in sample loaded',{plugin:'com.decklab.hostdemo'});
}


/* ----------------------------- 0.6 LIVE COMPANION BRIDGE ----------------------------- */

const liveState = {
  ws:null,
  companionConnected:false,
  pluginConnected:false,
  processRunning:false,
  pid:null,
  reconnectTimer:null,
  processLines:[]
};

function liveWsUrl() {
  if (location.protocol==='http:' || location.protocol==='https:') {
    const scheme=location.protocol==='https:'?'wss':'ws';
    return `${scheme}://${location.host}`;
  }
  return 'ws://127.0.0.1:8975';
}

function appendLiveProcessLog(text,channel='decklab') {
  if (!text) return;
  liveState.processLines.push(`[${channel}] ${text}`);
  liveState.processLines=liveState.processLines.slice(-90);
  for (const id of ['liveProcessLog','profileProcessLog']) {
    const el=$(id); if (el) { el.textContent=liveState.processLines.join('\n'); el.scrollTop=el.scrollHeight; }
  }
}

function renderLiveRuntimeStatus() {
  const status=$('liveCompanionStatus');
  if (status) {
    status.textContent=liveState.companionConnected?'companion online':'companion offline';
    status.classList.toggle('online',liveState.companionConnected);
    status.classList.toggle('offline',!liveState.companionConnected);
  }
  if ($('liveProcessState')) $('liveProcessState').textContent=liveState.processRunning?(liveState.pid?`running · PID ${liveState.pid}`:'running'):'not running';
  if ($('livePluginSocketState')) $('livePluginSocketState').textContent=liveState.pluginConnected?'connected':'not connected';
  if ($('hostAnimationStatus')) {
    const now=performance.now();
    hostState.frameTimes=(hostState.frameTimes||[]).filter(t=>now-t<1100);
    const fps=Math.max(0,hostState.frameTimes.length-1);
    $('hostAnimationStatus').textContent=fps>=2?`runtime · ~${fps} fps`:(hostState.animationNote||'idle');
  }
  if ($('liveLaunchBtn')) $('liveLaunchBtn').disabled=true;
  if ($('liveStopBtn')) $('liveStopBtn').disabled=true;
  if ($('liveDemoBtn')) $('liveDemoBtn').disabled=true;
  if (typeof renderProfileLiveStatus==='function' && $('profileCompanionBadge')) renderProfileLiveStatus();
}

function scheduleLiveReconnect() {
  clearTimeout(liveState.reconnectTimer);
  liveState.reconnectTimer=setTimeout(connectLiveCompanion,1800);
}

function connectLiveCompanion() {
  if (liveState.ws && [WebSocket.OPEN,WebSocket.CONNECTING].includes(liveState.ws.readyState)) return;
  let ws;
  try { ws=new WebSocket(liveWsUrl()); }
  catch(_) { scheduleLiveReconnect(); return; }
  liveState.ws=ws;
  ws.onopen=()=>{
    liveState.companionConnected=true;
    appendLiveProcessLog(`Connected to DeckLab companion at ${liveWsUrl()}`);
    ws.send(JSON.stringify({event:'decklabBrowserRegister',uuid:'decklab-ui-0.9'}));
    renderLiveRuntimeStatus();
  };
  ws.onmessage=async ev=>{
    let msg;
    try { msg=JSON.parse(ev.data); } catch(_) { return; }
    if (!msg?.__decklabCompanion) return;
    await handleCompanionMessage(msg);
  };
  ws.onerror=()=>{};
  ws.onclose=()=>{
    liveState.companionConnected=false;
    liveState.pluginConnected=false;
    liveState.processRunning=false;
    liveState.pid=null;
    renderLiveRuntimeStatus();
    scheduleLiveReconnect();
  };
}

function liveControl(type,data={}) {
  if (!liveState.ws || liveState.ws.readyState!==WebSocket.OPEN || !liveState.companionConnected) return false;
  liveState.ws.send(JSON.stringify({__decklabControl:true,type,...data}));
  return true;
}

function liveSendToPlugin(message) {
  if (!liveState.pluginConnected || !message || typeof message!=='object') return false;
  return liveControl('sendToPlugin',{message});
}

function sendCurrentLifecycleToLivePlugin() {
  if (!liveState.pluginConnected) return;
  if (currentMode==='profile' && typeof profileState!=='undefined' && typeof profileAllRuntimeInstances==='function' && profileAllRuntimeInstances().length) {
    sendCurrentProfileLifecycleToLivePlugin();
    return;
  }
  if (!hostState.placed || !hostState.connected) return;
  const d=DEVICES[hostState.target] || DEVICES.standard;
  liveSendToPlugin({event:'deviceDidConnect',device:hostState.deviceId,deviceInfo:{name:d.name,type:d.type,size:{columns:d.cols,rows:d.rows}}});
  liveSendToPlugin(hostWillAppearEvent());
}

async function handleLivePluginMessage(message) {
  if (!message || typeof message!=='object') return;
  if (typeof testObservePluginMessage === 'function') {
    const testHandled=await testObservePluginMessage(message);
    if (testHandled) return;
  }
  const event=message.event || 'unknown';
  const profileInst=typeof profileInstanceByContext==='function' ? profileInstanceByContext(message.context) : null;
  if (profileInst) {
    const handled=await handleProfilePluginMessage(profileInst,message);
    if (handled) return;
  }
  if (event==='setGlobalSettings' && typeof profileState!=='undefined' && currentMode==='profile') {
    profileState.globalSettings=deepClone(message.payload || {});
    logProfile('plugin→host:setGlobalSettings',{payload:deepClone(message.payload||{})});
    if ($('profileGlobalSettings')) $('profileGlobalSettings').value=JSON.stringify(profileState.globalSettings,null,2);
    return;
  }
  if (event==='getGlobalSettings' && typeof profileState!=='undefined' && currentMode==='profile') {
    logProfile('getGlobalSettings',{context:message.context||pluginState.manifest?.UUID||'plugin',id:message.id});
    profileOutbound('didReceiveGlobalSettings',{context:message.context||pluginState.manifest?.UUID||'plugin',event:'didReceiveGlobalSettings',id:message.id,payload:{settings:deepClone(profileState.globalSettings)}});
    return;
  }
  if (['setTitle','setImage','setState','showOk','showAlert','setFeedback','setFeedbackLayout','setSettings','setGlobalSettings'].includes(event)) {
    await applyHostCommand(event,message.payload || {});
    return;
  }
  const action=hostAction();
  if (event==='getSettings') {
    logHost('plugin→host','getSettings',{action:message.action || action?.UUID || '',context:message.context || hostState.context,id:message.id});
    logHost('host→plugin','didReceiveSettings',{action:message.action || action?.UUID || '',context:message.context || hostState.context,device:hostState.deviceId,event:'didReceiveSettings',id:message.id,payload:hostPayload()});
  } else if (event==='getGlobalSettings') {
    logHost('plugin→host','getGlobalSettings',{context:message.context || pluginState.manifest?.UUID || 'plugin',id:message.id});
    logHost('host→plugin','didReceiveGlobalSettings',{context:message.context || pluginState.manifest?.UUID || 'plugin',event:'didReceiveGlobalSettings',id:message.id,payload:{settings:deepClone(hostState.globalSettings)}});
  } else if (event==='sendToPropertyInspector') {
    logHost('plugin→PI','sendToPropertyInspector',{message});
    hostSendToPi({action:message.action || action?.UUID || '',context:message.context || hostState.context,event:'sendToPropertyInspector',payload:deepClone(message.payload)});
  } else if (event==='logMessage') {
    logHost('plugin→host','logMessage',{message:message.payload?.message || message.payload || ''});
    appendLiveProcessLog(String(message.payload?.message || message.payload || ''),'plugin');
  } else if (event==='openUrl') {
    logHost('plugin→host','openUrl',{url:message.payload?.url || ''});
  } else {
    logHost('plugin→host',event,{raw:deepClone(message)});
  }
  renderHostLab();
}

async function handleCompanionMessage(msg) {
  if (msg.type==='registered') {
    liveState.companionConnected=true;
    liveState.processRunning=!!msg.running;
    liveState.pid=msg.pid || null;
    liveState.pluginConnected=Number(msg.pluginConnections||0)>0;
    appendLiveProcessLog('Companion registered browser bridge.');
  } else if (msg.type==='status' || msg.type==='pong') {
    liveState.processRunning=!!msg.running;
    liveState.pid=msg.pid || null;
    liveState.pluginConnected=Number(msg.pluginConnections||0)>0;
  } else if (msg.type==='processLog') {
    appendLiveProcessLog(msg.text,msg.channel || 'process');
  } else if (msg.type==='launchResult') {
    if (msg.ok) {
      liveState.processRunning=true; liveState.pid=msg.pid || null;
      appendLiveProcessLog(`Launched ${msg.manifest?.Name || 'plugin'}${msg.pid?` · PID ${msg.pid}`:''}.`,'decklab');
      if (pluginState.manifest?.UUID && msg.manifest?.UUID && pluginState.manifest.UUID!==msg.manifest.UUID) {
        appendLiveProcessLog(`Warning: Plugin Lab currently has ${pluginState.manifest.UUID}, but the live process is ${msg.manifest.UUID}. Import/select the matching package for accurate action surfaces.`,'decklab');
      }
    } else appendLiveProcessLog(`Launch failed: ${msg.error || 'unknown error'}`,'error');
  } else if (msg.type==='stopResult') {
    if (msg.ok) { liveState.processRunning=false; liveState.pid=null; }
    else appendLiveProcessLog(`Stop failed: ${msg.error || 'unknown error'}`,'error');
  } else if (msg.type==='processExit') {
    liveState.processRunning=false; liveState.pid=null;
    appendLiveProcessLog(`Plugin process exited with code ${msg.returncode}.`,'decklab');
  } else if (msg.type==='pluginRegistered') {
    liveState.pluginConnected=true;
    appendLiveProcessLog(`Plugin WebSocket registered${msg.registration?.uuid?`: ${msg.registration.uuid}`:''}.`,'socket');
    sendCurrentLifecycleToLivePlugin();
  } else if (msg.type==='pluginDisconnected') {
    liveState.pluginConnected=Number(msg.pluginConnections||0)>0;
    appendLiveProcessLog('Plugin WebSocket disconnected.','socket');
  } else if (msg.type==='pluginMessage') {
    await handleLivePluginMessage(msg.message);
  }
  renderLiveRuntimeStatus();
}

function launchLivePlugin(pathOverride=null) {
  if (!liveState.companionConnected) {
    appendLiveProcessLog('Live Runtime requires the localhost decklab_host.py companion. Automatic process launching is disabled in the safe build.','error');
    return;
  }
  const pluginPath=pathOverride || $('livePluginPath')?.value?.trim();
  if (!pluginPath) { appendLiveProcessLog('Enter a .sdPlugin folder path first.','error'); return; }
  const info=hostInfoObject();
  liveControl('launchPlugin',{pluginPath,nodePath:$('liveNodePath')?.value?.trim() || '',info});
}

async function launchBundledLiveDemo() {
  if (!hostAction()) {
    await loadSamplePlugin();
    selectPluginAction(0);
  }
  if (!hostState.placed) await placeHostAction();
  launchLivePlugin('__bundled_demo__');
}

/* ----------------------------- DECKLAB 0.8 PROFILE BUILDER ----------------------------- */

const profileState = {
  target:'plus', rows:null, cols:null, deviceId:'decklab-profile-plus-001', connected:true,
  pages:[{id:'page-1',name:'Page 1',parentPageId:null,folderId:null}], currentPageId:'page-1',
  placements:[], selectedId:null, selectedContext:null, pending:null, clipboard:null,
  instanceCounter:0, folderCounter:0, pageCounter:1, multiCounter:0, stepCounter:0,
  multiSequence:'A', globalSettings:{}, events:[], history:[], redo:[], restoring:false,
  autosaveTimer:null, autosaveKey:'decklab.profile.autosave.v10', legacyAutosaveKeys:['decklab.profile.autosave.v09','decklab.profile.autosave.v08','decklab.profile.autosave.v07'],
  compatOpen:false, compatTarget:'plus'
};
const profilePiState={context:null,loaded:false,path:null};

function profileDevice(){
  const base=DEVICES[profileState.target]||DEVICES.standard,d={...base};
  if(base.customGrid){d.rows=clamp(Number(profileState.rows)||base.rows,1,base.maxRows||8);d.cols=clamp(Number(profileState.cols)||base.cols,1,base.maxCols||8);if(d.rows*d.cols>(base.maxKeys||64))d.rows=Math.max(1,Math.floor((base.maxKeys||64)/d.cols));}
  return d;
}
function profilePage(id=profileState.currentPageId){return profileState.pages.find(p=>p.id===id)||profileState.pages[0];}
function profileVisiblePlacements(pageId=profileState.currentPageId){return profileState.placements.filter(p=>p.pageId===pageId);}
function profilePlacementById(id){return profileState.placements.find(p=>p.id===id)||null;}
function selectedProfilePlacement(){return profilePlacementById(profileState.selectedId);}
function selectedProfileInstance(){const p=selectedProfilePlacement();return p?.kind==='action'?p:null;}
function profileMultiSequences(p){return p?.kind==='multi-switch'?[p.sequences?.A||[],p.sequences?.B||[]]:p?.kind==='multi'?[p.sequences?.A||[]]:[];}
function profileMultiActionSteps(p){return profileMultiSequences(p).flat().filter(s=>s.kind==='action');}
function profileAllRuntimeInstances(){const out=[];for(const p of profileState.placements){if(p.kind==='action')out.push(p);else if(p.kind==='multi'||p.kind==='multi-switch')out.push(...profileMultiActionSteps(p));}return out;}
function profileVisibleRuntimeInstances(){const out=[];for(const p of profileVisiblePlacements()){if(p.kind==='action')out.push(p);else if(p.kind==='multi'||p.kind==='multi-switch')out.push(...profileMultiActionSteps(p));}return out;}
function profileInstanceByContext(context){return profileAllRuntimeInstances().find(p=>p.context===context)||null;}
function profileParentForContext(context){return profileState.placements.find(p=>(p.kind==='multi'||p.kind==='multi-switch')&&profileMultiActionSteps(p).some(s=>s.context===context))||null;}
function profileActionFor(inst){
  if(!inst)return null;const actions=profileAvailableActions();
  if(Number.isInteger(inst.actionIndex)&&actions[inst.actionIndex]?.UUID===inst.actionUuid)return actions[inst.actionIndex];
  return actions.find(a=>a.UUID===inst.actionUuid)||null;
}
function profilePlacementAt(controller,column,row,pageId=profileState.currentPageId){return profileState.placements.find(p=>p.pageId===pageId&&p.controller===controller&&Number(p.column||0)===Number(column||0)&&Number(p.row||0)===Number(row||0))||null;}
function profileTimestamp(){return new Date().toISOString().slice(11,23);}
function logProfile(event,data={}){const item={t:profileTimestamp(),event,...deepClone(data)};profileState.events.unshift(item);profileState.events=profileState.events.slice(0,300);const el=$('profileEventLog');if(el)el.textContent=profileState.events.map(x=>JSON.stringify(x)).join('\n\n');}
function profileOutbound(event,data={}){if(data.action&&profileAvailableActions().some(a=>a.UUID===data.action&&(a.DeckLabBuiltin||a.DeckLabPlaceholder)))return;logProfile(event,data);logHost('host→plugin',event,data);}
function profileMakeContext(action){profileState.instanceCounter++;const slug=(action?.UUID||'action').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').slice(-32)||'action';return `profile-${slug}-${String(profileState.instanceCounter).padStart(3,'0')}`;}
function profileCoordinates(inst){if(inst.isInMultiAction||inst.controller==='Neo')return undefined;return {column:Number(inst.column)||0,row:Number(inst.row)||0};}
function profilePayload(inst,extra={}){
  const payload={settings:deepClone(inst.settings||{}),controller:inst.isInMultiAction?'Keypad':inst.controller,isInMultiAction:!!inst.isInMultiAction,...extra};
  const c=profileCoordinates(inst);if(c)payload.coordinates=c;if((inst.controller==='Keypad'||inst.isInMultiAction)&&inst.state!==undefined)payload.state=Number(inst.state)||0;return payload;
}
function profileWillAppear(inst){return {action:inst.actionUuid,context:inst.context,device:profileState.deviceId,event:'willAppear',payload:profilePayload(inst)};}
function profileWillDisappear(inst){return {action:inst.actionUuid,context:inst.context,device:profileState.deviceId,event:'willDisappear',payload:profilePayload(inst)};}
function profileDeviceInfo(){const d=profileDevice();return {name:d.name,type:d.type,size:{columns:d.cols,rows:d.rows}};}
function profileInfoObject(){const d=profileDevice();return {application:{font:'Arial',language:'en',platform:/mac/i.test(navigator.platform||'')?'mac':'windows',platformVersion:navigator.platform||'DeckLab',version:'DeckLab 1.3.10-alpha.32'},plugin:{uuid:pluginState.manifest?.UUID||'decklab.plugin',version:pluginState.manifest?.Version||'0.0.0'},devices:[{id:profileState.deviceId,name:d.name,type:d.type,size:{columns:d.cols,rows:d.rows}}],colors:{buttonPressedBackgroundColor:'#30323d',buttonPressedBorderColor:'#64666c',buttonPressedTextColor:'#ffffff',disabledColor:'#64666c',highlightColor:'#8fe9ff',mouseDownColor:'#30323d'},devicePixelRatio:window.devicePixelRatio||1};}
function profileActionInfoObject(inst){return {action:inst.actionUuid,context:inst.context,device:profileState.deviceId,payload:profilePayload(inst)};}
function profileSendDeviceConnect(){if(profileState.connected)profileOutbound('deviceDidConnect',{device:profileState.deviceId,deviceInfo:profileDeviceInfo()});}
function profileSendVisibleAppear(reason='profile visible'){if(!profileState.connected)return;for(const inst of profileVisibleRuntimeInstances().filter(i=>!profileIsLocalAction(i))){const msg=profileWillAppear(inst);logProfile('willAppear',{reason,...deepClone(msg)});logHost('host→plugin','willAppear',msg);}}
function profileSendVisibleDisappear(reason='profile hidden'){if(!profileState.connected)return;for(const inst of profileVisibleRuntimeInstances().filter(i=>!profileIsLocalAction(i))){const msg=profileWillDisappear(inst);logProfile('willDisappear',{reason,...deepClone(msg)});logHost('host→plugin','willDisappear',msg);}}
function sendCurrentProfileLifecycleToLivePlugin(){if(!liveState.pluginConnected||!profileState.connected)return;liveSendToPlugin({event:'deviceDidConnect',device:profileState.deviceId,deviceInfo:profileDeviceInfo()});for(const inst of profileVisibleRuntimeInstances().filter(i=>!profileIsLocalAction(i)))liveSendToPlugin(profileWillAppear(inst));}

function profileHistorySnapshot(){return {nativeSource:deepClone(profileState.nativeSource||null),target:profileState.target,rows:profileState.rows,cols:profileState.cols,deviceId:profileState.deviceId,connected:profileState.connected,pages:deepClone(profileState.pages),currentPageId:profileState.currentPageId,placements:deepClone(profileState.placements),selectedId:profileState.selectedId,instanceCounter:profileState.instanceCounter,folderCounter:profileState.folderCounter,pageCounter:profileState.pageCounter,multiCounter:profileState.multiCounter,stepCounter:profileState.stepCounter,name:$('profileName')?.value||'DeckLab Profile'};}
function profilePushHistory(label='change'){if(profileState.restoring)return;profileState.history.push({label,snapshot:profileHistorySnapshot()});if(profileState.history.length>50)profileState.history.shift();profileState.redo=[];profileScheduleAutosave();}
function profileRestoreSnapshot(snap,reason='history restore'){
  if(!snap)return;profileState.restoring=true;if(profileState.connected)profileSendVisibleDisappear(reason);
  for(const k of ['nativeSource','target','rows','cols','deviceId','connected','pages','currentPageId','placements','selectedId','instanceCounter','folderCounter','pageCounter','multiCounter','stepCounter'])if(k in snap)profileState[k]=deepClone(snap[k]);
  currentDeviceKey=profileState.target;profileState.selectedContext=selectedProfileInstance()?.context||null;if($('profileName'))$('profileName').value=snap.name||'DeckLab Profile';profileState.restoring=false;if(profileState.connected)profileSendVisibleAppear(reason);renderProfileLab();profileScheduleAutosave();
}
function profileUndo(){if(!profileState.history.length)return;profileState.redo.push({label:'redo',snapshot:profileHistorySnapshot()});const h=profileState.history.pop();profileRestoreSnapshot(h.snapshot,`undo: ${h.label}`);}
function profileRedo(){if(!profileState.redo.length)return;profileState.history.push({label:'undo',snapshot:profileHistorySnapshot()});const h=profileState.redo.pop();profileRestoreSnapshot(h.snapshot,'redo');}
function profileSerializableData(){
  const serializeStep=s=>s.kind==='wait'?{kind:'wait',duration:s.duration}:{kind:'action',actionUuid:s.actionUuid,settings:deepClone(s.settings||{}),state:s.state||0,resources:deepClone(s.resources||{})};
  const placements=profileState.placements.map(p=>{
    if(p.kind==='folder')return {kind:'folder',id:p.id,name:p.name,controller:'Keypad',column:p.column,row:p.row,pageId:p.pageId,childPageId:p.childPageId,customVisual:deepClone(p.customVisual||null),resources:deepClone(p.resources||{}),nativeStates:deepClone(p.nativeStates||null),sourceAction:deepClone(p.sourceAction||null)};
    if(p.kind==='multi'||p.kind==='multi-switch')return {kind:p.kind,id:p.id,title:p.title,customVisual:deepClone(p.customVisual||null),state:p.state||0,controller:'Keypad',column:p.column,row:p.row,pageId:p.pageId,sequences:{A:(p.sequences?.A||[]).map(serializeStep),B:(p.sequences?.B||[]).map(serializeStep)}};
    return {kind:'action',actionUuid:p.actionUuid,controller:p.controller,column:p.column,row:p.row,pageId:p.pageId,settings:deepClone(p.settings||{}),state:p.state||0,customVisual:deepClone(p.customVisual||null),previewLayout:deepClone(p.previewLayout||null),resources:deepClone(p.resources||{}),nativeStates:deepClone(p.nativeStates||null),sourceAction:deepClone(p.sourceAction||null),importName:p.importName||p.title};
  });
  return {$schema:'https://decklab.local/schemas/decklab-profile.schema.json',format:'DeckLabProfile',version:'1.0',schemaVersion:'1.0',deviceGeometryVersion:profileState.target==='studio'?'studio-2x16-v1':null,name:$('profileName')?.value||'DeckLab Profile',plugin:{uuid:pluginState.manifest?.UUID||null,name:pluginState.manifest?.Name||null},target:profileState.target,rows:profileState.rows,cols:profileState.cols,pages:deepClone(profileState.pages),currentPageId:profileState.currentPageId,nativeSource:profileState.nativeSource||null,placements};
}
function profileScheduleAutosave(){DeckLabPluginSettings.sync();DeckLabPluginSettings.save();clearTimeout(profileState.autosaveTimer);profileState.autosaveTimer=setTimeout(()=>{try{localStorage.setItem(profileState.autosaveKey,JSON.stringify(profileSerializableData()));const b=$('profileAutosaveBadge');if(b){b.textContent='autosaved';b.classList.add('profile-autosave-flash');setTimeout(()=>b.classList.remove('profile-autosave-flash'),600);}}catch(e){const badge=$('profileAutosaveBadge');if(badge){badge.textContent='Export to save';badge.title='Browser storage is full or unavailable. Export this profile to save your work.';}logProfile('autosaveFailed',{error:e.message});}},250);}
function profileHasAutosave(){try{return !!localStorage.getItem(profileState.autosaveKey)||(profileState.legacyAutosaveKeys||[]).some(k=>!!localStorage.getItem(k));}catch(_){return false;}}

function resetProfileSession({target=profileState.target,emit=true,preserveHistory=false}={}){
  profileState.nativeSource=null;
  if(!preserveHistory)profilePushHistory('reset profile');if(emit&&profileState.connected&&profileState.placements.length){profileSendVisibleDisappear('profile reset');profileOutbound('deviceDidDisconnect',{device:profileState.deviceId});}
  unloadProfilePropertyInspector();profileState.target=target;profileState.rows=null;profileState.cols=null;profileState.deviceId=`decklab-profile-${target}-${String(Date.now()).slice(-5)}`;profileState.pages=[{id:'page-1',name:'Page 1',parentPageId:null,folderId:null}];profileState.currentPageId='page-1';profileState.placements=[];profileState.selectedId=null;profileState.selectedContext=null;profileState.pending=null;profileState.instanceCounter=0;profileState.folderCounter=0;profileState.pageCounter=1;profileState.multiCounter=0;profileState.stepCounter=0;profileState.connected=true;if(emit)profileSendDeviceConnect();renderProfileLab();profileScheduleAutosave();
}

function profileManifestVisuals(inst){const action=profileActionFor(inst);if(!action)return;const states=Array.isArray(action.States)?action.States:[],st=states[Number(inst.state)||0]||states[0];inst.title=st?.Title??'';inst.imageRef=st?.Image||action.Icon||null;inst.image=pluginAssetUrl(inst.imageRef)||null;inst.imageOrigin='manifest';inst.animationNote=manifestAnimationLabel(inst.imageRef);inst.frameTimes=[];profileImportedVisuals(inst);DeckLabRuntimeVisuals.refresh(inst);}
async function createProfileActionPlacement(actionIndex,controller,column,row,pageId=profileState.currentPageId,{emit=true,pushHistory=true}={}){
  const actions=profileAvailableActions(),action=actions[actionIndex];if(!action||!getActionControllers(action).includes(controller)||profilePlacementAt(controller,column,row,pageId))return null;if(pushHistory)profilePushHistory('place action');
  const inst={kind:'action',id:`action-${Date.now()}-${profileState.instanceCounter+1}`,actionIndex,actionUuid:action.UUID,controller,column,row,pageId,context:profileMakeContext(action),settings:deepClone(action.defaults||{}),state:0,title:'',image:null,imageRef:null,imageOrigin:'manifest',animationNote:'idle',frameTimes:[],layout:null,overlay:null};profileManifestVisuals(inst);if((controller==='Encoder'||controller==='Neo')&&!profileIsLocalAction(inst))inst.layout=await getActionLayout(action,controller);profileState.placements.push(inst);if(emit&&profileState.connected&&pageId===profileState.currentPageId)profileOutbound('willAppear',profileWillAppear(inst));profileScheduleAutosave();return inst;
}
function createProfileFolder(column,row,pageId=profileState.currentPageId,{pushHistory=true}={}){if(profilePlacementAt('Keypad',column,row,pageId))return null;if(pushHistory)profilePushHistory('create folder');profileState.folderCounter++;const id=`folder-${profileState.folderCounter}`,child=`folder-page-${profileState.folderCounter}`,folder={kind:'folder',id,name:`Folder ${profileState.folderCounter}`,controller:'Keypad',column,row,pageId,childPageId:child};profileState.pages.push({id:child,name:folder.name,parentPageId:pageId,folderId:id});profileState.placements.push(folder);profileScheduleAutosave();return folder;}
function createProfileMulti(kind,column,row,pageId=profileState.currentPageId,{pushHistory=true}={}){if(profilePlacementAt('Keypad',column,row,pageId))return null;if(pushHistory)profilePushHistory(`create ${kind}`);profileState.multiCounter++;const p={kind,id:`${kind}-${profileState.multiCounter}`,title:kind==='multi-switch'?'Multi Action Switch':'Multi Action',controller:'Keypad',column,row,pageId,state:0,sequences:{A:[],B:[]},runningStepId:null};profileState.placements.push(p);profileScheduleAutosave();return p;}
function createMultiActionStep(actionIndex,parent,sequence='A',raw=null){const action=profileAvailableActions()?.[actionIndex];if(!action||!getActionControllers(action).includes('Keypad')||action.SupportedInMultiActions===false)return null;profileState.stepCounter++;const st={kind:'action',id:`step-${profileState.stepCounter}`,actionIndex,actionUuid:action.UUID,context:profileMakeContext(action),controller:'Keypad',isInMultiAction:true,parentId:parent.id,sequence,resources:deepClone(raw?.resources||{}),settings:deepClone(raw?.settings||action.defaults||{}),state:Number(raw?.state)||0,title:'',image:null,imageRef:null,imageOrigin:'manifest',animationNote:'idle',frameTimes:[],overlay:null};profileManifestVisuals(st);return st;}

function placementSupportsController(p,controller){if(!p)return false;if(p.kind==='folder'||p.kind==='multi'||p.kind==='multi-switch')return controller==='Keypad';if(p.kind==='action')return getActionControllers(profileActionFor(p)).includes(controller);return false;}
function setProfilePending(pending){profileState.pending=pending;const h=$('profilePlacementHint');if(!h)return;if(!pending)h.textContent='Drag an action onto the virtual device, or click a placed item to configure it.';else if(pending.type==='paste')h.textContent='Paste mode: click an empty compatible slot.';else if(pending.type==='library')h.textContent='Placement mode: click an empty compatible slot, or drag the action directly.';}
async function profilePlaceDescriptor(desc,controller,column,row){
  const occupied=profilePlacementAt(controller,column,row);
  if(occupied){
    if(controller==='Encoder'&&occupied.kind==='action'&&desc.kind==='action'&&getActionControllers(profileAvailableActions()[desc.actionIndex]||{}).includes(controller)){
      await DeckLabVisuals.assignAction(desc.actionIndex,occupied);selectProfilePlacement(occupied);setProfilePending(null);return occupied;
    }
    return null;
  }
  let p=null;
  if(desc.kind==='action'){if(!getActionControllers(profileAvailableActions()?.[desc.actionIndex]||{}).includes(controller))return null;p=await createProfileActionPlacement(desc.actionIndex,controller,column,row);}
  else if(desc.kind==='folder'&&controller==='Keypad')p=createProfileFolder(column,row);
  else if((desc.kind==='multi'||desc.kind==='multi-switch')&&controller==='Keypad')p=createProfileMulti(desc.kind,column,row);
  else if(desc.kind==='clipboard')p=await profilePasteClipboardAt(controller,column,row);
  if(p){selectProfilePlacement(p);setProfilePending(null);renderProfileLab();}return p;
}
async function profileSlotClick(controller,column,row){const existing=profilePlacementAt(controller,column,row);if(existing){if(existing.kind==='folder'){await navigateProfilePage(existing.childPageId,'folder entered');return;}selectProfilePlacement(existing);return;}const pending=profileState.pending;if(pending?.type==='library')return profilePlaceDescriptor(pending,controller,column,row);if(pending?.type==='paste')return profilePlaceDescriptor({kind:'clipboard'},controller,column,row);logProfile('emptySlot',{controller,column,row,hint:'Drag an action here or choose one from the library first'});}

function profileDragPayload(ev,payload){profileState.dragDescriptor=deepClone(payload);try{ev.dataTransfer.setData('application/x-decklab',JSON.stringify(payload));ev.dataTransfer.setData('text/plain','DeckLab');ev.dataTransfer.effectAllowed=payload.source==='placement'?'move':'copy';}catch(_){};}
function profileReadDrag(ev){try{const raw=ev.dataTransfer?.getData('application/x-decklab');if(raw)return JSON.parse(raw);}catch(_){}return profileState.dragDescriptor||null;}
function installProfileDropTarget(el,controller,column,row){
  el.dataset.artController=controller;el.dataset.artColumn=column;el.dataset.artRow=row;
  el.addEventListener('dragover',ev=>{const data=profileReadDrag(ev);if(!data)return;ev.preventDefault();const ok=profileDragCompatible(data,controller,column,row);el.classList.toggle('drop-target',ok);el.classList.toggle('drop-invalid',!ok);ev.dataTransfer.dropEffect=data.source==='placement'?'move':'copy';});
  el.addEventListener('dragleave',()=>{el.classList.remove('drop-target','drop-invalid');});
  el.addEventListener('drop',async ev=>{ev.preventDefault();el.classList.remove('drop-target','drop-invalid');const data=profileReadDrag(ev);if(data)await handleProfileDrop(data,controller,column,row);});
}
function profileDragCompatible(data,controller,column,row){
  if(data.source==='library'){if(data.kind==='action')return getActionControllers(profileAvailableActions()?.[data.actionIndex]||{}).includes(controller);return controller==='Keypad';}
  if(data.source==='placement'){const p=profilePlacementById(data.id);if(!p||!placementSupportsController(p,controller))return false;const target=profilePlacementAt(controller,column,row);return !target||placementSupportsController(target,p.controller);}
  return false;
}
async function handleProfileDrop(data,controller,column,row){
  if(data.source==='library')return profilePlaceDescriptor(data,controller,column,row);
  if(data.source!=='placement')return;const p=profilePlacementById(data.id);if(!p)return;const target=profilePlacementAt(controller,column,row);if(target===p)return;
  if(!placementSupportsController(p,controller)){logProfile('dropRejected',{reason:'incompatible target',controller});return;}
  if(target&&!placementSupportsController(target,p.controller)){logProfile('dropRejected',{reason:'cannot swap incompatible placements'});return;}
  profilePushHistory(target?'swap placements':'move placement');if(profileState.connected&&p.pageId===profileState.currentPageId)profileLifecycleForPlacement(p,'willDisappear','drag move');if(target&&profileState.connected&&target.pageId===profileState.currentPageId)profileLifecycleForPlacement(target,'willDisappear','drag swap');
  const old={controller:p.controller,column:p.column,row:p.row,pageId:p.pageId};p.controller=controller;p.column=column;p.row=row;p.pageId=profileState.currentPageId;
  if(target){target.controller=old.controller;target.column=old.column;target.row=old.row;target.pageId=old.pageId;}
  if(profileState.connected)profileLifecycleForPlacement(p,'willAppear','drag move');if(target&&profileState.connected)profileLifecycleForPlacement(target,'willAppear','drag swap');selectProfilePlacement(p);renderProfileLab();profileScheduleAutosave();
}
function profileLifecycleForPlacement(p,event,reason=''){const instances=p.kind==='action'?[p]:(p.kind==='multi'||p.kind==='multi-switch')?profileMultiActionSteps(p):[];for(const inst of instances){if(profileIsLocalAction(inst))continue;const msg=event==='willAppear'?profileWillAppear(inst):profileWillDisappear(inst);logProfile(event,{reason,...deepClone(msg)});logHost('host→plugin',event,msg);}}

function selectProfilePlacement(p,{render=true}={}){const old=selectedProfileInstance();profileState.selectedId=p?.id||null;profileState.selectedContext=p?.kind==='action'?p.context:null;if(old?.context!==profileState.selectedContext)syncProfilePropertyInspector(old,p?.kind==='action'?p:null);if(render)renderProfileLab();else{document.querySelectorAll('#profileDeck [data-profile-id]').forEach(el=>el.classList.toggle('selected',el.dataset.profileId===profileState.selectedId));syncProfileControls();}}
function removeSelectedProfilePlacement(){const p=selectedProfilePlacement();if(!p)return;profilePushHistory('delete placement');if(profileState.connected&&p.pageId===profileState.currentPageId)profileLifecycleForPlacement(p,'willDisappear','instance removed');if(p.kind==='folder'){const childIds=new Set([p.childPageId]);let changed=true;while(changed){changed=false;for(const pg of profileState.pages){if(pg.parentPageId&&childIds.has(pg.parentPageId)&&!childIds.has(pg.id)){childIds.add(pg.id);changed=true;}}}profileState.placements=profileState.placements.filter(x=>x!==p&&!childIds.has(x.pageId));profileState.pages=profileState.pages.filter(pg=>!childIds.has(pg.id));}else profileState.placements=profileState.placements.filter(x=>x!==p);selectProfilePlacement(null);renderProfileLab();profileScheduleAutosave();}
function clearCurrentProfilePage(){const visible=profileVisiblePlacements();if(!visible.length)return;profilePushHistory('clear page');for(const p of visible)if(profileState.connected)profileLifecycleForPlacement(p,'willDisappear','page cleared');const folderIds=new Set(visible.filter(p=>p.kind==='folder').map(p=>p.id)),childPages=new Set(profileState.pages.filter(p=>folderIds.has(p.folderId)).map(p=>p.id));profileState.placements=profileState.placements.filter(p=>p.pageId!==profileState.currentPageId&&!childPages.has(p.pageId));profileState.pages=profileState.pages.filter(p=>!childPages.has(p.id));selectProfilePlacement(null);renderProfileLab();profileScheduleAutosave();}
async function navigateProfilePage(pageId,reason='page changed'){if(pageId===profileState.currentPageId||!profilePage(pageId))return;profileSendVisibleDisappear(reason);selectProfilePlacement(null,{render:false});profileState.currentPageId=pageId;profileSendVisibleAppear(reason);renderProfileLab();}
function addProfilePage(){profilePushHistory('add page');profileState.pageCounter++;const p={id:`page-${profileState.pageCounter}`,name:`Page ${profileState.pageCounter}`,parentPageId:null,folderId:null};profileState.pages.push(p);navigateProfilePage(p.id,'top-level page changed');profileScheduleAutosave();}
function renameCurrentProfilePage(){const p=profilePage();if(!p)return;const next=prompt('Page name',p.name);if(!next?.trim())return;profilePushHistory('rename page');p.name=next.trim().slice(0,32);if(p.folderId){const f=profilePlacementById(p.folderId);if(f)f.name=p.name;}renderProfileLab();profileScheduleAutosave();}
function profileBack(){const p=profilePage();if(p?.parentPageId)navigateProfilePage(p.parentPageId,'folder exited');}
function profileBreadcrumbChain(){let p=profilePage(),out=[];while(p){out.unshift(p);p=p.parentPageId?profilePage(p.parentPageId):null;}return out;}

function profileControllerCompatible(controller,action=selectedPluginAction()){return !!action&&getActionControllers(action).includes(controller);}
function profileActionFace(inst,{inputOnly=false}={}){inst=window.DeckLabVisuals?.resolve(inst)||inst;const action=profileActionFor(inst),face=document.createElement('div');face.className=`profile-action-face ${inst.state?'on':''}`;if(inputOnly){const hw=document.createElement('div');hw.className='profile-hardware-label';hw.textContent=action?.Name||inst.actionUuid;face.appendChild(hw);}else if(window.DeckLabVisuals?.appendLayers(face,{image:inst.image,background:inst.backgroundVisual,fit:inst.artworkFit||inst.customVisual?.fit})){/* Layer images preserve transparency and animation. */}else if(!inst.artworkImageHidden){const g=document.createElement('div');g.className='glyph';g.textContent='◈';face.appendChild(g);}const title=document.createElement('div');title.className='profile-action-title';title.textContent=inst.title??action?.Name??'';const appearance=inst.nativeStates?.[Number(inst.state)||0]||inst.nativeStates?.[0];if(appearance){title.hidden=appearance.ShowTitle===false;if(/^#[0-9a-f]{6,8}$/i.test(appearance.TitleColor||''))title.style.color=appearance.TitleColor;if(Number.isFinite(appearance.FontSize)&&appearance.FontSize>0)title.style.fontSize=Math.max(6,Math.min(32,appearance.FontSize))+'px';title.style.whiteSpace='pre-wrap';if(appearance.TitleAlignment==='top'){title.style.top='5px';title.style.bottom='auto';}else if(appearance.TitleAlignment==='middle'){title.style.top='50%';title.style.bottom='auto';title.style.transform='translateY(-50%)';}if(appearance.FontUnderline)title.style.textDecoration='underline';}face.appendChild(title);if(/animated|webp|runtime frame/i.test(inst.animationNote||'')){const b=document.createElement('div');b.className='profile-action-badge';b.textContent='ANIM';face.appendChild(b);}if(inst.overlay){const o=document.createElement('div');o.className=`profile-overlay ${inst.overlay}`;o.textContent=inst.overlay==='ok'?'✓':'!';face.appendChild(o);}return face;}
function profileMultiFace(p){if(p.customVisual)return profileActionFace(p);const face=document.createElement('div');face.className=`profile-action-face ${p.kind==='multi-switch'?'multi-switch-face':'multi-face'}`;const g=document.createElement('div');g.className='multi-face-glyph';g.textContent=p.kind==='multi-switch'?(p.state?'B':'A'):'⏩';face.appendChild(g);const title=document.createElement('div');title.className='profile-action-title';title.textContent=p.title||'Multi Action';face.appendChild(title);const seq=p.kind==='multi-switch'?(p.state?p.sequences.B:p.sequences.A):p.sequences.A;const count=document.createElement('div');count.className='multi-face-count';count.textContent=`${seq.length} STEP${seq.length===1?'':'S'}`;face.appendChild(count);return face;}
function attachPlacementDrag(el,p){el.draggable=true;el.dataset.profileId=p.id;el.addEventListener('dragstart',ev=>{el.classList.add('dragging');profileDragPayload(ev,{source:'placement',id:p.id});});el.addEventListener('dragend',()=>{profileState.dragDescriptor=null;el.classList.remove('dragging');document.querySelectorAll('.drop-target,.drop-invalid').forEach(n=>n.classList.remove('drop-target','drop-invalid'));});}
function makeProfileKeySlot(column,row){
  const d=profileDevice(),p=profilePlacementAt('Keypad',column,row),b=document.createElement('button');b.type='button';b.className=`profile-slot ${d.inputOnly?'input-only':''} ${p?'occupied':''}`;b.dataset.controller='Keypad';installProfileDropTarget(b,'Keypad',column,row);
  if(p&&p.id===profileState.selectedId)b.classList.add('selected');
  if(p?.kind==='folder'){if(p.nativeStates||p.customVisual){const imported={...p,importName:p.name};profileImportedVisuals(imported);b.appendChild(profileActionFace(imported,{inputOnly:!!d.inputOnly}));}const f=document.createElement('div');f.className='profile-folder-face';f.innerHTML=`<div class="profile-folder-icon">▰</div><div class="profile-folder-name">${escapeHtml(p.name)}</div>`;if(!p.nativeStates&&!p.customVisual)b.appendChild(f);attachPlacementDrag(b,p);b.addEventListener('click',()=>selectProfilePlacement(p));b.addEventListener('dblclick',()=>navigateProfilePage(p.childPageId,'folder entered'));}
  else if(p?.kind==='action'){b.appendChild(profileActionFace(p,{inputOnly:!!d.inputOnly}));attachPlacementDrag(b,p);b.addEventListener('click',()=>selectProfilePlacement(p,{render:false}));b.addEventListener('dblclick',ev=>{ev.preventDefault();profileRunAction(p);});}
  else if(p?.kind==='multi'||p?.kind==='multi-switch'){b.appendChild(profileMultiFace(p));attachPlacementDrag(b,p);b.addEventListener('click',()=>selectProfilePlacement(p));b.addEventListener('dblclick',ev=>{ev.preventDefault();executeMultiPlacement(p);});}
  else{const e=document.createElement('div');e.className='profile-empty-plus';e.textContent='+';b.appendChild(e);b.addEventListener('click',()=>profileSlotClick('Keypad',column,row));}
  return b;
}
function makeProfileEncoderDisplay(column){
  const p=profilePlacementAt('Encoder',column,0),el=document.createElement('div');
  el.className=`profile-touch-slot profile-encoder-display ${p?'occupied':''}`;
  installProfileDropTarget(el,'Encoder',column,0);
  if(p){
    if(p.id===profileState.selectedId)el.classList.add('selected');
    el.dataset.profileId=p.id;
    const host=document.createElement('div');host.className='profile-mini-layout';el.appendChild(host);
    requestAnimationFrame(()=>{if(p.layout&&!p.customVisual&&!window.DeckLabCreator?.isPreview(p))renderLayoutInto(host,p.layout,{selectable:false});else host.appendChild(profileActionFace(p));});
    attachPlacementDrag(el,p);el.addEventListener('click',()=>selectProfilePlacement(p));
  }else{
    const e=document.createElement('div');e.className='profile-empty-plus';e.textContent='+';el.appendChild(e);el.addEventListener('click',()=>profileSlotClick('Encoder',column,0));
  }
  el.title='GALLEON encoder information display · non-touch';
  return el;
}
function makeProfileEncoderTouch(column){const p=profilePlacementAt('Encoder',column,0),el=document.createElement('div');el.className=`profile-touch-slot ${p?'occupied':''}`;installProfileDropTarget(el,'Encoder',column,0);if(p){if(p.id===profileState.selectedId)el.classList.add('selected');el.dataset.profileId=p.id;const host=document.createElement('div');host.className='profile-mini-layout';el.appendChild(host);requestAnimationFrame(()=>{if(p.layout&&!p.customVisual&&!window.DeckLabCreator?.isPreview(p))renderLayoutInto(host,p.layout,{selectable:false});else host.appendChild(profileActionFace(p));});attachPlacementDrag(el,p);el.addEventListener('click',()=>selectProfilePlacement(p));el.addEventListener('dblclick',()=>profileEmitInput(p,'touchTap',{tapPos:[100,50],hold:false}));}else{const e=document.createElement('div');e.className='profile-empty-plus';e.textContent='+';el.appendChild(e);el.addEventListener('click',()=>profileSlotClick('Encoder',column,0));}return el;}
function makeProfileDial(column){const p=profilePlacementAt('Encoder',column,0),wrap=document.createElement('div');wrap.className='profile-dial-slot';installProfileDropTarget(wrap,'Encoder',column,0);if(!p){const e=document.createElement('button');e.type='button';e.className='profile-dial-control';e.title='Drop an Encoder action here. Scroll or use arrow keys to turn.';e.setAttribute('aria-label','Unassigned dial '+(column+1));e.addEventListener('wheel',ev=>{ev.preventDefault();DeckLabSurface.rotateDial(profileState.target,column,ev.deltaY<0?1:-1)},{passive:false});e.addEventListener('keydown',ev=>{if(['ArrowUp','ArrowRight','ArrowDown','ArrowLeft'].includes(ev.key)){ev.preventDefault();DeckLabSurface.rotateDial(profileState.target,column,['ArrowUp','ArrowRight'].includes(ev.key)?1:-1)}});e.addEventListener('pointerdown',ev=>{e.setPointerCapture?.(ev.pointerId);DeckLabSurface.pressDial(profileState.target,column,true)});['pointerup','pointercancel','blur'].forEach(type=>e.addEventListener(type,()=>DeckLabSurface.pressDial(profileState.target,column,false)));e.addEventListener('click',()=>profileSlotClick('Encoder',column,0));wrap.appendChild(e);return wrap;}wrap.dataset.profileId=p.id;const d=document.createElement('button');d.type='button';d.className=`profile-dial-control ${p.id===profileState.selectedId?'selected':''}`;d.addEventListener('click',()=>selectProfilePlacement(p,{render:false}));d.addEventListener('wheel',ev=>{ev.preventDefault();selectProfilePlacement(p,{render:false});profileEmitInput(p,'dialRotate',{ticks:ev.deltaY<0?1:-1,pressed:!!d._pressed});},{passive:false});d.addEventListener('pointerdown',ev=>{d._pressed=true;d._dragY=ev.clientY;d.setPointerCapture?.(ev.pointerId);profileEmitInput(p,'dialDown',{});});d.title='Scroll, drag vertically, or use arrow keys to turn. Press to activate.';d.addEventListener('pointermove',ev=>{if(!d._pressed||d._dragY==null)return;const ticks=Math.trunc((d._dragY-ev.clientY)/8);if(ticks){d._dragY-=ticks*8;profileEmitInput(p,'dialRotate',{ticks,pressed:true});}});const release=()=>{d._dragY=null;if(d._pressed){d._pressed=false;profileEmitInput(p,'dialUp',{});}};d.addEventListener('pointerup',release);d.addEventListener('pointercancel',release);d.addEventListener('blur',release);d.setAttribute('aria-label',(profileActionFor(p)?.Name||'Encoder')+' dial. Arrow keys adjust; Enter or Space presses.');d.addEventListener('keydown',ev=>{if(['ArrowUp','ArrowRight','ArrowDown','ArrowLeft'].includes(ev.key)){ev.preventDefault();profileEmitInput(p,'dialRotate',{ticks:['ArrowUp','ArrowRight'].includes(ev.key)?1:-1,pressed:!!d._pressed});}else if(['Enter',' '].includes(ev.key)){ev.preventDefault();if(!d._pressed){d._pressed=true;profileEmitInput(p,'dialDown',{});}}});d.addEventListener('keyup',ev=>{if(['Enter',' '].includes(ev.key)){ev.preventDefault();release();}});wrap.appendChild(d);return wrap;}
function profileTopLevelPages(){return profileState.pages.filter(p=>!p.parentPageId);}
function profileNeoPageState(){
  const pages=profileTopLevelPages(), current=profilePage();
  if(current?.parentPageId)return {pages,index:-1,canPrev:false,canNext:false};
  const index=pages.findIndex(p=>p.id===current?.id);
  return {pages,index,canPrev:index>0,canNext:index>=0&&index<pages.length-1};
}
async function profileNeoNavigate(delta){
  const nav=profileNeoPageState();
  if(nav.index<0){logProfile('neoTouchPoint',{direction:delta<0?'previous':'next',result:'ignored',reason:'Touch Points navigate top-level pages; currently inside a folder.'});return;}
  const target=nav.pages[nav.index+(delta<0?-1:1)];
  if(!target){logProfile('neoTouchPoint',{direction:delta<0?'previous':'next',result:'edge of page range'});return;}
  logProfile('neoTouchPoint',{direction:delta<0?'previous':'next',from:profileState.currentPageId,to:target.id});
  await navigateProfilePage(target.id,'Neo Touch Point page navigation');
}
function profileEmitInput(inst,event,extra={}){if(inst.controller==='Encoder'){if(event==='dialRotate')DeckLabSurface.rotateDial(profileState.target,inst.column,extra.ticks);if(event==='dialDown'||event==='dialUp')DeckLabSurface.pressDial(profileState.target,inst.column,event==='dialDown');}if(!profileState.connected)return;if(profileRunBuiltin(inst,event,extra))return;profileOutbound(event,{action:inst.actionUuid,context:inst.context,device:profileState.deviceId,event,payload:profilePayload(inst,extra)});}
async function profileRunAction(inst){if(!profileState.connected)return;selectProfilePlacement(profileParentForContext(inst.context)||inst,{render:false});profileEmitInput(inst,'keyDown',{});const action=profileActionFor(inst),states=Array.isArray(action?.States)?action.States:[];if(states.length>1&&!action.DisableAutomaticStates){inst.state=inst.state?0:1;profileManifestVisuals(inst);}refreshProfileInstance(inst.context);await new Promise(r=>setTimeout(r,70));profileEmitInput(inst,'keyUp',{});}


function makeProfileNeoInfoSlot(){
  const p=profilePlacementAt('Neo',0,0);
  const el=document.createElement('div');
  el.className=`profile-neo-slot ${p?'occupied':''}`;
  installProfileDropTarget(el,'Neo',0,0);
  if(p){
    if(p.id===profileState.selectedId)el.classList.add('selected');
    el.dataset.profileId=p.id;
    const host=document.createElement('div');host.className='profile-mini-layout neo';el.appendChild(host);
    requestAnimationFrame(()=>{if(p.layout&&!p.customVisual&&!window.DeckLabCreator?.isPreview(p))renderLayoutInto(host,p.layout,{selectable:false});else host.appendChild(profileActionFace(p));});
    attachPlacementDrag(el,p);el.addEventListener('click',()=>selectProfilePlacement(p));
  }else{
    const e=document.createElement('div');e.className='profile-empty-plus';e.textContent='+';el.appendChild(e);el.addEventListener('click',()=>profileSlotClick('Neo',0,0));
  }
  return el;
}
function makeProfileNeoNavPoint(side){
  const nav=profileNeoPageState(),delta=side==='left'?-1:1,enabled=side==='left'?nav.canPrev:nav.canNext;
  const b=document.createElement('button');b.type='button';b.className=`profile-neo-touch-point ${enabled?'page-active':'disabled'}`;
  b.setAttribute('aria-label',side==='left'?'Previous Neo page':'Next Neo page');b.title=enabled?(side==='left'?'Previous page':'Next page'):(side==='left'?'No previous page':'No next page');b.disabled=!enabled;b.innerHTML=side==='left'?'<span>‹</span>':'<span>›</span>';b.addEventListener('click',()=>profileNeoNavigate(delta));return b;
}

function renderProfileDeck(){
  const host=$('profileDeck');if(!host)return;const d=profileDevice();
  host.className=`profile-deck unified-device-host profile-deck-${profileState.target}`;
  host.dataset.deviceFamily=d.family||'streamdeck';host.dataset.deviceLabel=d.name;
  DeckLabSurface.render(host,{
    deviceKey:profileState.target,device:d,mode:'profile',
    factories:{
      key:(i,c,r)=>makeProfileKeySlot(c,r),
      touch:(i)=>makeProfileEncoderTouch(i),
      encoderDisplay:(i)=>makeProfileEncoderDisplay(i),
      dial:(i)=>makeProfileDial(i),
      neo:()=>makeProfileNeoInfoSlot(),
      neoPrev:()=>makeProfileNeoNavPoint('left'),
      neoNext:()=>makeProfileNeoNavPoint('right')
    }
  });
}

function renderProfileNav(){const tabs=$('profilePageTabs');tabs.innerHTML='';for(const p of profileState.pages.filter(x=>!x.parentPageId)){const b=document.createElement('button');b.type='button';b.className=`secondary profile-page-tab ${p.id===profileState.currentPageId?'active':''}`;b.textContent=p.name;b.addEventListener('click',()=>navigateProfilePage(p.id,'top-level page changed'));tabs.appendChild(b);}const crumbs=$('profileBreadcrumbs');crumbs.innerHTML='';profileBreadcrumbChain().forEach((p,i)=>{if(i){const s=document.createElement('span');s.textContent='›';crumbs.appendChild(s);}const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent=p.name;b.disabled=p.id===profileState.currentPageId;b.addEventListener('click',()=>navigateProfilePage(p.id,'breadcrumb navigation'));crumbs.appendChild(b);});$('profileBackBtn').disabled=!profilePage()?.parentPageId;}
function renderProfileActionLibrary(){
  const host=$('profileActionLibrary');if(!host)return;host.innerHTML='';
  const q=($('profileActionSearch')?.value||'').trim().toLowerCase(),d=profileDevice();
  const sys=document.createElement('div');sys.className='builder-action-group';
  const sh=document.createElement('div');sh.className='builder-action-group-title';sh.textContent='DeckLab System';sys.appendChild(sh);
  for(const item of [{kind:'folder',name:'Folder',icon:'▰',sub:'Navigate to a child page'},{kind:'multi',name:'Multi Action',icon:'⏩',sub:'Run a sequence of actions'},{kind:'multi-switch',name:'Multi Action Switch',icon:'A/B',sub:'Alternate between two sequences'}]){
    if(q&&!`${item.name} ${item.sub}`.toLowerCase().includes(q))continue;
    const card=document.createElement('div');card.className='builder-action-card builder-system-card';card.draggable=true;card.dataset.actionKind=item.kind;
    card.tabIndex=0;card.setAttribute('data-dl-tip',`${item.name} · ${item.sub}. Drag onto any LCD key.`);
    card.innerHTML=`<div class="builder-action-icon">${item.icon}</div><div class="builder-action-meta"><div class="builder-action-name">${escapeHtml(item.name)}</div><div class="builder-action-uuid">${escapeHtml(item.sub)}</div></div><div class="builder-action-controllers"><span class="builder-action-controller compatible">Keypad</span></div>`;
    card.addEventListener('dragstart',ev=>profileDragPayload(ev,{source:'library',kind:item.kind}));card.addEventListener('dragend',()=>profileState.dragDescriptor=null);card.addEventListener('click',()=>setProfilePending({type:'library',kind:item.kind,source:'library'}));sys.appendChild(card);
  }
  host.appendChild(sys);

  const actions=profileAvailableActions(),compatible=[],unavailable=[];
  actions.forEach((a,i)=>{
    if(a.VisibleInActionsList===false)return;
    const ctrls=getActionControllers(a),hay=`${a.Name||''} ${a.UUID||''} ${ctrls.join(' ')}`.toLowerCase();if(q&&!hay.includes(q))return;
    const supported=ctrls.some(c=>d.controllers?.includes(c));(supported?compatible:unavailable).push({a,i,ctrls});
  });
  function makeActionCard({a,i,ctrls},supported){
    const card=document.createElement('div');card.className=`builder-action-card ${supported?'device-compatible':'device-incompatible'}`;card.draggable=!!supported;card.dataset.actionIndex=String(i);if(profileState.pending?.actionIndex===i)card.classList.add('selected');
    const icon=pluginAssetUrl(a.Icon||a.States?.[0]?.Image),multi=a.SupportedInMultiActions===false?' · no Multi Action':'';
    const controllerHtml=ctrls.map(c=>`<span class="builder-action-controller ${d.controllers?.includes(c)?'compatible':'incompatible'}">${escapeHtml(c)}</span>`).join('');
    const reason=supported?(d.streamDeckApp===false?`${d.name} uses ${d.specialHost||'a separate host'}; DeckLab can model the surface, but standard Stream Deck app profiles do not deploy directly here.`:`Compatible with ${d.name}. Drag onto a ${ctrls.filter(c=>d.controllers?.includes(c)).join(' / ')} surface.`):`Unavailable on ${d.name}: this action requires ${ctrls.join(' / ')||'an unsupported controller'}.`;
    card.setAttribute('data-dl-tip',`${a.Name||'Action'} · ${ctrls.join(' / ')}. ${reason}`);card.tabIndex=0;
    card.innerHTML=`<div class="builder-action-icon">${icon?`<img src="${escapeHtml(icon)}" alt="">`:'◈'}</div><div class="builder-action-meta"><div class="builder-action-name">${escapeHtml(a.Name||'Unnamed action')}</div><div class="builder-action-uuid">${escapeHtml(a.UUID||'')}${multi}</div></div><div class="builder-action-controllers">${controllerHtml}</div>`;
    if(supported){card.addEventListener('dragstart',ev=>profileDragPayload(ev,{source:'library',kind:'action',actionIndex:i}));card.addEventListener('dragend',()=>profileState.dragDescriptor=null);card.addEventListener('click',()=>{setProfilePending({type:'library',source:'library',kind:'action',actionIndex:i});renderProfileActionLibrary();});}
    else card.addEventListener('click',()=>{logProfile('actionUnavailableOnDevice',{action:a.UUID,device:d.name,controllers:ctrls});window.DeckLabGuidance112?.notify?.(reason,{kind:'warn',timeout:3200});});
    return card;
  }
  function addActionGroup(title,items,supported){if(!items.length)return;const group=document.createElement('div');group.className=`builder-action-group ${supported?'recommended-actions':'unavailable-actions'}`;const gh=document.createElement('div');gh.className='builder-action-group-title';gh.innerHTML=`<span>${escapeHtml(title)}</span><small>${items.length}</small>`;group.appendChild(gh);items.forEach(x=>group.appendChild(makeActionCard(x,supported)));host.appendChild(group);}
  addActionGroup('LCD demos',compatible.filter(x=>x.a.DeckLabDemo),true);
  addActionGroup('Built-in actions · simulation',compatible.filter(x=>x.a.DeckLabBuiltin&&!x.a.DeckLabDemo),true);
  addActionGroup('Loaded plugin',compatible.filter(x=>!x.a.DeckLabBuiltin&&!x.a.DeckLabPlaceholder),true);
  addActionGroup('Preserved actions · unavailable',compatible.filter(x=>x.a.DeckLabPlaceholder),true);
  addActionGroup(`Unavailable on ${d.name}`,unavailable,false);
  if(!actions.length){
    const e=document.createElement('div');e.className='profile-action-library-empty smart-empty-state';e.innerHTML='<strong>No plugin actions loaded yet</strong><span>You can still add folders and Multi Actions, or load sample actions to try the builder.</span><div class="smart-empty-actions"><button class="secondary" type="button" data-empty-action="demo">Load demo actions</button><button class="secondary" type="button" data-empty-action="import">Import plugin</button></div>';
    e.querySelector('[data-empty-action="demo"]').addEventListener('click',async()=>{await loadSamplePlugin();renderProfileLab();});
    e.querySelector('[data-empty-action="import"]').addEventListener('click',()=>{$('pluginFolderInput')?.click();});host.appendChild(e);
  }else if(q&&!compatible.length&&!unavailable.length){const e=document.createElement('div');e.className='profile-action-library-empty';e.textContent='No actions match your search.';host.appendChild(e);}
}

function syncProfileControls(){
  renderBuiltinSettings();
  window.DeckLabVisuals?.sync();
  const target=$('profileTargetDevice');if(!target.options.length){for(const key of PLUGIN_TARGET_ORDER){if(!DEVICES[key])continue;const o=document.createElement('option');o.value=key;o.textContent=DEVICES[key].name;target.appendChild(o);}}target.value=profileState.target;const d=profileDevice(),grid=$('profileGridControls');grid.classList.toggle('hidden',!d.customGrid);if(d.customGrid){$('profileRows').max=String(d.maxRows||8);$('profileCols').max=String(d.maxCols||8);$('profileRows').value=String(d.rows);$('profileCols').value=String(d.cols);} $('profileConnectBtn').textContent=profileState.connected?'Disconnect device':'Connect device';const cb=$('profileConnectionBadge');cb.textContent=profileState.connected?'connected':'disconnected';cb.classList.toggle('online',profileState.connected);cb.classList.toggle('offline',!profileState.connected);
  const p=selectedProfilePlacement(),inst=p?.kind==='action'?p:null,empty=$('profileInstanceEmpty'),editor=$('profileInstanceEditor');empty.classList.toggle('hidden',!!p);editor.classList.toggle('hidden',!inst);$('profileRemoveSelectedBtn').disabled=!p;$('profileCopyBtn').disabled=!p;$('profileDuplicateBtn').disabled=!p;$('profilePasteBtn').disabled=!profileState.clipboard;$('profileUndoBtn').disabled=!profileState.history.length;$('profileRedoBtn').disabled=!profileState.redo.length;
  $('profileInspectorTitle').textContent=p?(p.kind==='action'?(profileActionFor(p)?.Name||'Action'):p.title||p.name||p.kind):'Nothing selected';$('profileSelectionType').textContent=p?(p.kind==='multi-switch'?'MULTI SWITCH':p.kind.toUpperCase()):'—';
  if(inst){$('profileInstanceAction').textContent=inst.actionUuid;$('profileInstanceContext').textContent=inst.context;$('profileInstanceSurface').textContent=`${inst.controller} · c${inst.column||0} r${inst.row||0}`;$('profileInstanceSettings').value=JSON.stringify(inst.settings||{},null,2);} $('profileGlobalSettings').value=JSON.stringify(profileState.globalSettings||{},null,2);$('profileToolbarStatus').textContent=`${pluginState.manifest?.Name||'No plugin loaded'} · ${profileAllRuntimeInstances().length} SDK contexts`;if($('profileRestoreAutosaveBtn'))$('profileRestoreAutosaveBtn').disabled=!profileHasAutosave();
}
function renderProfileLiveStatus(){const c=$('profileCompanionBadge'),p=$('profilePluginBadge');if(c){c.textContent=liveState.companionConnected?'companion online':'companion offline';c.classList.toggle('online',liveState.companionConnected);c.classList.toggle('offline',!liveState.companionConnected);}if(p){p.textContent=liveState.pluginConnected?'plugin socket online':'plugin socket offline';p.classList.toggle('online',liveState.pluginConnected);p.classList.toggle('offline',!liveState.pluginConnected);}const log=$('profileProcessLog');if(log){const lines=liveState.processLines.length?liveState.processLines.slice(-8).join('\n'):'Waiting for an externally launched plugin connection.';log.textContent=lines;log.scrollTop=log.scrollHeight;}}

/* ------------------------- DECKLAB 0.8 COMPATIBILITY INSPECTOR ------------------------- */
function profileCompatPlacementLabel(p){
  if(!p)return 'Empty';
  if(p.kind==='folder')return p.name||'Folder';
  if(p.kind==='multi')return p.title||'Multi Action';
  if(p.kind==='multi-switch')return p.title||'Multi Action Switch';
  return profileActionFor(p)?.Name||p.title||p.actionUuid||'Action';
}
function profileCompatSourceExtents(){
  const keys=profileState.placements.filter(p=>p.controller==='Keypad');
  return {rows:keys.length?Math.max(...keys.map(p=>Number(p.row)||0))+1:1,cols:keys.length?Math.max(...keys.map(p=>Number(p.column)||0))+1:1};
}
function profileCompatDevice(deviceKey){
  const base=DEVICES[deviceKey]||DEVICES.standard,d={...base};
  if(base.customGrid){
    if(deviceKey===profileState.target){const live=profileDevice();d.rows=live.rows;d.cols=live.cols;}
    else{
      const ext=profileCompatSourceExtents();
      d.rows=clamp(ext.rows,1,base.maxRows||base.rows||8);d.cols=clamp(ext.cols,1,base.maxCols||base.cols||8);
      const cap=base.maxKeys||64;
      if(d.rows*d.cols>cap){
        // Preserve columns first because most Stream Deck profiles are wider than tall.
        d.cols=Math.min(d.cols,base.maxCols||d.cols,cap);d.rows=Math.max(1,Math.min(d.rows,Math.floor(cap/d.cols)||1));
      }
    }
  }
  return d;
}
function profileCompatPageStats(page,d){
  const placements=profileState.placements.filter(p=>p.pageId===page.id);
  const key=placements.filter(p=>p.controller==='Keypad');
  const encoder=placements.filter(p=>p.controller==='Encoder');
  const neo=placements.filter(p=>p.controller==='Neo');
  const keyCapacity=Math.max(0,(Number(d.rows)||0)*(Number(d.cols)||0));
  const keyExact=key.filter(p=>(Number(p.column)||0)<d.cols&&(Number(p.row)||0)<d.rows);
  const encCapacity=Number(d.encoderSlots||d.dials)||0;
  const encExact=encoder.filter(p=>Number(p.column||0)<Number(d.dials||0)&&Number(p.row||0)<(d.encoderSlots?2:1));
  return {page,placements,key,encoder,neo,keyCapacity,keyExact,keyClipped:key.length-keyExact.length,keyOverflow:Math.max(0,key.length-keyCapacity),encCapacity,encExact,encClipped:encoder.length-encExact.length,encOverflow:Math.max(0,encoder.length-encCapacity)};
}
function analyzeProfileForTarget(deviceKey){
  const d=profileCompatDevice(deviceKey), pages=profileState.pages, topPages=profileTopLevelPages();
  const pageStats=pages.map(pg=>profileCompatPageStats(pg,d));
  const issues=[];let unsupported=0,reflow=0,overflow=0,visualLoss=0;
  const controllerCounts={Keypad:0,Encoder:0,Neo:0};
  for(const p of profileState.placements){if(controllerCounts[p.controller]!==undefined)controllerCounts[p.controller]++;}
  if(d.streamDeckApp===false){
    issues.push({kind:'info',title:'Separate host environment',detail:`${d.name} is represented separately because it does not use normal Stream Deck app profiles in DeckLab.`});
  }
  for(const st of pageStats){
    const pageName=st.page.name||st.page.id;
    if(st.keyOverflow){overflow+=st.keyOverflow;issues.push({kind:'bad',title:`${pageName}: ${st.keyOverflow} key placement${st.keyOverflow===1?'':'s'} exceed capacity`,detail:`This page contains ${st.key.length} Keypad placements but ${d.name} exposes ${st.keyCapacity} key slot${st.keyCapacity===1?'':'s'} in this preview.`});}
    else if(st.keyClipped){reflow+=st.keyClipped;issues.push({kind:'warn',title:`${pageName}: ${st.keyClipped} key placement${st.keyClipped===1?'':'s'} need reflow`,detail:`The actions fit by count, but their existing row/column coordinates fall outside the ${d.rows}×${d.cols} target grid.`});}
    if(st.encoder.length&&!d.controllers?.includes('Encoder')){unsupported+=st.encoder.length;issues.push({kind:'bad',title:`${pageName}: Encoder actions unavailable`,detail:`${st.encoder.length} placed dial action${st.encoder.length===1?' is':'s are'} present, but ${d.name} has no SDK Encoder surface.`});}
    else if(st.encOverflow){overflow+=st.encOverflow;issues.push({kind:'bad',title:`${pageName}: not enough dials`,detail:`${st.encoder.length} Encoder placements are present but this target exposes ${st.encCapacity}.`});}
    else if(st.encClipped){reflow+=st.encClipped;issues.push({kind:'warn',title:`${pageName}: Encoder positions need reflow`,detail:`The Encoder count fits, but ${st.encClipped} existing dial coordinate${st.encClipped===1?' is':'s are'} outside the target's dial range.`});}
    if(st.neo.length&&!d.controllers?.includes('Neo')){unsupported+=st.neo.length;issues.push({kind:'bad',title:`${pageName}: Neo Infobar action unavailable`,detail:`This page contains ${st.neo.length} Neo Infobar action${st.neo.length===1?'':'s'}, but ${d.name} has no Neo Infobar controller.`});}
  }
  if(d.inputOnly&&controllerCounts.Keypad){visualLoss=controllerCounts.Keypad;issues.push({kind:'warn',title:'Input-only hardware',detail:`${d.name} can trigger compatible key actions, but it cannot show key titles, state artwork, GIF/WebP animation, or other LCD feedback from ${controllerCounts.Keypad} placed Keypad item${controllerCounts.Keypad===1?'':'s'}.`});}
  if(topPages.length>1){
    if(d.neo)issues.push({kind:'good',title:'Page navigation has dedicated controls',detail:`Neo's two Touch Points can move through the ${topPages.length} top-level pages without consuming an LCD key.`});
    else issues.push({kind:'warn',title:`${topPages.length} top-level pages need navigation`,detail:'On non-Neo targets, page navigation normally needs page-navigation actions or another mapped navigation method; budget key/control space accordingly.'});
  }
  if(d.customGrid&&deviceKey!==profileState.target){issues.push({kind:'info',title:`Suggested grid: ${d.rows}×${d.cols}`,detail:`DeckLab selected a custom ${d.rows}×${d.cols} preview to preserve the source profile's occupied Keypad coordinates within this target's published limits.`});}
  if(!issues.length)issues.push({kind:'good',title:'No structural compatibility issues found',detail:'All placed controller types and exact coordinates fit this target in DeckLab.'});
  const total=profileState.placements.length;
  const hardLoss=Math.min(total,unsupported+overflow);
  const usable=Math.max(0,total-hardLoss);
  let status='full',label='FULL';
  if(d.streamDeckApp===false){status='separate';label='SEPARATE HOST';}
  else if(unsupported||overflow){status='partial';label='PARTIAL';}
  else if(visualLoss){status='degraded';label='DEGRADED';}
  else if(reflow||topPages.length>1&&!d.neo){status='adapt';label='ADAPT';}
  return {deviceKey,device:d,status,label,total,usable,unsupported,overflow,reflow,visualLoss,controllerCounts,pageStats,topPages:topPages.length,issues};
}
function profileCompatibilityReport(){
  const targets={};for(const key of PLUGIN_TARGET_ORDER)targets[key]=analyzeProfileForTarget(key);
  return {$schema:'https://decklab.local/schemas/decklab-compatibility-report.schema.json',format:'DeckLabCompatibilityReport',version:'1.0',schemaVersion:'1.0',generatedAt:new Date().toISOString(),profile:{name:$('profileName')?.value||'DeckLab Profile',sourceTarget:profileState.target,pages:profileState.pages.length,topLevelPages:profileTopLevelPages().length,placements:profileState.placements.length,plugin:{uuid:pluginState.manifest?.UUID||null,name:pluginState.manifest?.Name||null}},targets};
}
function profileCompatIssueEl(issue){
  const row=document.createElement('div');row.className=`compat-issue ${issue.kind||'info'}`;
  const glyph=issue.kind==='good'?'✓':issue.kind==='bad'?'!':issue.kind==='warn'?'△':'i';
  row.innerHTML=`<div class="compat-issue-icon">${glyph}</div><div><strong>${escapeHtml(issue.title||'')}</strong><span>${escapeHtml(issue.detail||'')}</span></div>`;return row;
}
function profileCompatMiniKey(p){
  const key=document.createElement('div');key.className='compat-mini-key';if(!p)return key;
  key.classList.add('filled');if(p.kind==='folder')key.classList.add('folder');if(p.kind==='multi'||p.kind==='multi-switch')key.classList.add('multi');
  const t=document.createElement('span');t.textContent=profileCompatPlacementLabel(p);key.title=t.textContent;key.appendChild(t);return key;
}

function renderProfileCompatMiniPreview(analysis){
  const host=$('profileCompatMiniPreview');if(!host)return;host.innerHTML='';const d=analysis.device,page=profilePage();
  const miniDial=(i)=>{const x=document.createElement('div');x.className='compat-unified-dial';const p=profilePlacementAt('Encoder',i,0,page.id);if(p){x.classList.add('filled');x.title=profileCompatPlacementLabel(p);}return x;};
  const miniTouch=(i)=>{const x=document.createElement('div');x.className='compat-unified-touch';const p=profilePlacementAt('Encoder',i,0,page.id);if(p){x.classList.add('filled');x.title=profileCompatPlacementLabel(p);const s=document.createElement('span');s.textContent=profileCompatPlacementLabel(p);x.appendChild(s);}return x;};
  const miniNeo=()=>{const x=document.createElement('div');x.className='compat-mini-infobar';const p=profilePlacementAt('Neo',0,0,page.id);x.textContent=p?profileCompatPlacementLabel(p):'Infobar';return x;};
  const miniNav=(side)=>{const b=document.createElement('div');b.className='compat-unified-nav';b.textContent=side==='left'?'‹':'›';return b;};
  DeckLabSurface.render(host,{deviceKey:analysis.deviceKey,device:d,mode:'compat',factories:{
    key:(i,c,r)=>profileCompatMiniKey(profilePlacementAt('Keypad',c,r,page.id)),
    touch:(i)=>miniTouch(i),encoderDisplay:(i)=>miniTouch(i),dial:(i)=>miniDial(i),neo:miniNeo,neoPrev:()=>miniNav('left'),neoNext:()=>miniNav('right')
  }});
  const st=analysis.pageStats.find(x=>x.page.id===page.id),clipped=(st?.keyClipped||0)+(st?.encClipped||0)+(st?.neo.length&&!d.neo?st.neo.length:0);
  $('profileCompatPreviewTitle').textContent=`${d.name} · ${page.name||page.id}`;
  $('profileCompatPreviewNote').innerHTML=clipped?`Exact-coordinate preview hides <span class="compat-clipped-badge">${clipped} clipped/unsupported placement${clipped===1?'':'s'}</span>. The compatibility report above explains whether reflow can recover them.`:'Every placement on this page fits the target at its current coordinates.';
}

function renderProfileCompatibility(){
  const card=$('profileCompatCard'),toggle=$('profileCompatToggleBtn');if(!card||!toggle)return;card.classList.toggle('hidden',!profileState.compatOpen);toggle.classList.toggle('active',!!profileState.compatOpen);if(!profileState.compatOpen)return;
  if(!DEVICES[profileState.compatTarget])profileState.compatTarget=profileState.target;
  const analyses=PLUGIN_TARGET_ORDER.filter(k=>DEVICES[k]).map(analyzeProfileForTarget), selected=analyses.find(a=>a.deviceKey===profileState.compatTarget)||analyses[0];
  const total=profileState.placements.length, ctrls=[...new Set(profileState.placements.map(p=>p.controller))].filter(Boolean), pages=profileTopLevelPages().length;
  $('profileCompatSummary').innerHTML=`<div class="compat-summary-stat"><span>Source device</span><strong>${escapeHtml(profileDevice().name)}</strong><small>${profileDevice().rows}×${profileDevice().cols}${profileDevice().dials?` · ${profileDevice().dials} dials`:''}${profileDevice().neo?' · Infobar':''}</small></div><div class="compat-summary-stat"><span>Placements</span><strong>${total}</strong><small>${ctrls.length?ctrls.join(' · '):'Empty profile'}</small></div><div class="compat-summary-stat"><span>Top-level pages</span><strong>${pages}</strong><small>${pages>1?'Navigation requirements are checked per target.':'Single-page profile'}</small></div><div class="compat-summary-stat"><span>Plugin</span><strong>${escapeHtml(pluginState.manifest?.Name||'No plugin')}</strong><small>${escapeHtml(pluginState.manifest?.UUID||'System items only')}</small></div>`;
  const matrix=$('profileCompatMatrix');matrix.innerHTML='';for(const a of analyses){const b=document.createElement('button');b.type='button';b.className=`profile-compat-target ${a.status} ${a.deviceKey===profileState.compatTarget?'selected':''}`;const pct=a.total?Math.round(a.usable/a.total*100):100;b.innerHTML=`<div class="compat-target-top"><div class="compat-target-name">${escapeHtml(a.device.name)}</div><span class="compat-target-status">${a.label}</span></div><div class="compat-target-line">${a.device.rows}×${a.device.cols}${a.device.dials?` · ${a.device.dials} dial${a.device.dials===1?'':'s'}`:''}${a.device.neo?' · Infobar':''}${a.device.inputOnly?' · input only':''}</div><div class="compat-target-line">${a.usable}/${a.total||0} placements structurally usable${a.reflow?` · ${a.reflow} reflow`:''}</div><div class="compat-target-meter"><span style="width:${pct}%"></span></div>`;b.addEventListener('click',()=>{profileState.compatTarget=a.deviceKey;renderProfileCompatibility();});matrix.appendChild(b);}
  $('profileCompatTargetTitle').textContent=selected.device.name;const pill=$('profileCompatTargetStatus');pill.textContent=selected.label;pill.className=`compat-pill ${selected.status==='full'?'yes':selected.status==='partial'?'no':'partial'}`;
  const m=$('profileCompatTargetMetrics');m.innerHTML=`<div class="compat-metric"><span>Key grid</span><strong>${selected.device.rows}×${selected.device.cols}</strong></div><div class="compat-metric"><span>Encoder slots</span><strong>${selected.device.dials||0}</strong></div><div class="compat-metric"><span>Infobar</span><strong>${selected.device.neo?'YES':'NO'}</strong></div><div class="compat-metric"><span>Needs reflow</span><strong>${selected.reflow}</strong></div><div class="compat-metric"><span>Unsupported</span><strong>${selected.unsupported}</strong></div><div class="compat-metric"><span>Overflow</span><strong>${selected.overflow}</strong></div>`;
  const issues=$('profileCompatIssues');issues.innerHTML='';selected.issues.forEach(i=>issues.appendChild(profileCompatIssueEl(i)));renderProfileCompatMiniPreview(selected);
}
function toggleProfileCompatibility(force){profileState.compatOpen=force===undefined?!profileState.compatOpen:!!force;if(profileState.compatOpen&&!DEVICES[profileState.compatTarget])profileState.compatTarget=profileState.target;renderProfileCompatibility();if(profileState.compatOpen)$('profileCompatCard')?.scrollIntoView({behavior:'smooth',block:'nearest'});}
function exportProfileCompatibility(){const report=profileCompatibilityReport();const name=($('profileName')?.value||'decklab-profile').replace(/[^a-z0-9-_]+/gi,'-');downloadText(`${name}.compatibility.json`,JSON.stringify(report,null,2));}

function renderProfileLab(){if(!$('profileDeck'))return;const d=profileDevice();renderProfileActionLibrary();syncProfileControls();renderProfileNav();renderProfileDeck();renderMultiActionEditor();renderProfileLiveStatus();syncProfilePropertyInspector(null,selectedProfileInstance());$('profileDeviceName').textContent=d.name;$('profileMeta').textContent=`${d.rows} × ${d.cols}${d.dials?` · ${d.dials} Encoder${d.dials===1?'':'s'}`:''}${d.neo?' · Neo Infobar':''} · SDK device type ${d.type}`;$('profileInstanceCount').textContent=`${profileAllRuntimeInstances().length} CONTEXTS`;renderProfileCompatibility();}
function refreshProfileInstance(context){const inst=profileInstanceByContext(context);if(!inst)return;const parent=profileParentForContext(context);if(parent){const node=document.querySelector(`#profileDeck [data-profile-id="${CSS.escape(parent.id)}"]`);if(node?.classList.contains('profile-slot')){node.innerHTML='';node.appendChild(profileMultiFace(parent));}renderMultiActionEditor();return;}if(inst.pageId!==profileState.currentPageId)return;const d=profileDevice(),nodes=[...document.querySelectorAll(`[data-profile-id="${CSS.escape(inst.id)}"]`)];for(const node of nodes){if(node.classList.contains('profile-slot')){node.innerHTML='';node.appendChild(profileActionFace(inst,{inputOnly:!!d.inputOnly}));node.classList.toggle('selected',inst.id===profileState.selectedId);}else if(node.classList.contains('profile-touch-slot')||node.classList.contains('profile-neo-slot')){const h=node.querySelector('.profile-mini-layout');if(h&&inst.customVisual){h.replaceChildren(profileActionFace(inst));}else if(h&&inst.layout)renderLayoutInto(h,inst.layout,{selectable:false});else if(h)h.replaceChildren(profileActionFace(inst));}}syncProfileControls();}

async function setProfileRuntimeImage(inst,rawImage){if(!rawImage){inst.image=null;inst.imageRef=null;inst.imageOrigin='runtime';inst.animationNote='runtime image cleared';inst.frameTimes=[];return;}const raw=String(rawImage),lower=raw.toLowerCase(),gif=lower.startsWith('data:image/gif')||/\.gif(?:$|[?#])/i.test(raw),animatedWebP=await dataUrlAnimatedWebP(raw)||await pluginFileIsAnimatedWebP(raw);if(gif||animatedWebP){inst.animationNote=`blocked ${gif?'GIF':'animated WebP'} via setImage · SDK fidelity`;logProfile('animatedSetImageRejected',{context:inst.context,format:gif?'GIF':'animated WebP'});return;}inst.imageRef=raw;inst.image=pluginAssetUrl(raw)||raw;inst.imageOrigin='runtime';const now=performance.now();inst.frameTimes=(inst.frameTimes||[]).filter(t=>now-t<1100);inst.frameTimes.push(now);const fps=Math.max(0,inst.frameTimes.length-1);inst.animationNote=fps>=2?`runtime frame stream · ~${fps} fps`:'runtime image update';}
async function applyProfileCommand(inst,event,payload={}){const action=profileActionFor(inst);logProfile(`plugin→host:${event}`,{context:inst.context,action:inst.actionUuid,payload:deepClone(payload)});if(event==='setTitle'||event==='setImage')await DeckLabRuntimeVisuals.command(inst,event,payload);else if(event==='setState'){inst.state=clamp(Number(payload.state)||0,0,1);profileManifestVisuals(inst);}else if(event==='showOk'||event==='showAlert'){inst.overlay=event==='showOk'?'ok':'alert';setTimeout(()=>{if(inst.overlay){inst.overlay=null;refreshProfileInstance(inst.context);}},900);}else if(event==='setFeedback'){if(!inst.layout&&(inst.controller==='Encoder'||inst.controller==='Neo'))inst.layout=await getActionLayout(action,inst.controller);mergeHostFeedback(inst.layout,payload);}else if(event==='setFeedbackLayout'){try{inst.layout=await getActionLayout(action,inst.controller,payload.layout);}catch(e){logProfile('layoutRejected',{context:inst.context,reason:e.message});}}else if(event==='setSettings'){inst.settings=deepClone(payload||{});profileOutbound('didReceiveSettings',{action:inst.actionUuid,context:inst.context,device:profileState.deviceId,event:'didReceiveSettings',payload:profilePayload(inst)});if(profilePiState.context===inst.context)profileSendToPi({action:inst.actionUuid,context:inst.context,device:profileState.deviceId,event:'didReceiveSettings',payload:profilePayload(inst)});}refreshProfileInstance(inst.context);}
async function handleProfilePluginMessage(inst,message){const event=message.event||'unknown';if(['setTitle','setImage','setState','showOk','showAlert','setFeedback','setFeedbackLayout','setSettings'].includes(event)){await applyProfileCommand(inst,event,message.payload||{});return true;}if(event==='getSettings'){profileOutbound('didReceiveSettings',{action:message.action||inst.actionUuid,context:inst.context,device:profileState.deviceId,event:'didReceiveSettings',id:message.id,payload:profilePayload(inst)});return true;}if(event==='sendToPropertyInspector'){logProfile('sendToPropertyInspector',{context:inst.context,payload:deepClone(message.payload)});if(profilePiState.context===inst.context)profileSendToPi({action:message.action||inst.actionUuid,context:inst.context,event:'sendToPropertyInspector',payload:deepClone(message.payload)});return true;}if(event==='logMessage'){logProfile('pluginLog',{context:inst.context,message:message.payload?.message||message.payload||''});return true;}if(event==='openUrl'){logProfile('openUrl',{context:inst.context,url:message.payload?.url||''});return true;}return false;}

function applyProfileGlobalSettingsFromEditor(){let obj;try{obj=JSON.parse($('profileGlobalSettings').value||'{}');if(!obj||typeof obj!=='object'||Array.isArray(obj))throw new Error('must be a JSON object');}catch(e){alert(`Global settings: ${e.message}`);return;}profilePushHistory('global settings');profileState.globalSettings=obj;profileOutbound('didReceiveGlobalSettings',{context:pluginState.manifest?.UUID||'plugin',event:'didReceiveGlobalSettings',payload:{settings:deepClone(obj)}});profileSendToPi({context:pluginState.manifest?.UUID||'plugin',event:'didReceiveGlobalSettings',payload:{settings:deepClone(obj)}});renderProfileLab();profileScheduleAutosave();}
function applyProfileInstanceSettingsFromEditor(){const inst=selectedProfileInstance();if(!inst)return;let obj;try{obj=JSON.parse($('profileInstanceSettings').value||'{}');if(!obj||typeof obj!=='object'||Array.isArray(obj))throw new Error('must be a JSON object');}catch(e){alert(`Instance settings: ${e.message}`);return;}profilePushHistory('instance settings');inst.settings=obj;profileOutbound('didReceiveSettings',{action:inst.actionUuid,context:inst.context,device:profileState.deviceId,event:'didReceiveSettings',payload:profilePayload(inst)});profileSendToPi({action:inst.actionUuid,context:inst.context,device:profileState.deviceId,event:'didReceiveSettings',payload:profilePayload(inst)});renderProfileLab();profileScheduleAutosave();}
function toggleProfileDevice(){if(profileState.connected){profileSendVisibleDisappear('device disconnected');profileOutbound('deviceDidDisconnect',{device:profileState.deviceId});profileState.connected=false;}else{profileState.connected=true;profileSendDeviceConnect();profileSendVisibleAppear('device connected');}renderProfileLab();}
function applyProfileGrid(){const d=DEVICES[profileState.target];if(!d?.customGrid)return;profilePushHistory('resize custom grid');profileState.rows=clamp(Number($('profileRows').value)||d.rows,1,d.maxRows||8);profileState.cols=clamp(Number($('profileCols').value)||d.cols,1,d.maxCols||8);if(profileState.rows*profileState.cols>(d.maxKeys||64))profileState.rows=Math.max(1,Math.floor((d.maxKeys||64)/profileState.cols));profileState.placements=profileState.placements.filter(p=>p.controller!=='Keypad'||(p.column<profileState.cols&&p.row<profileState.rows));renderProfileLab();profileScheduleAutosave();}

function profileCopySelected(){const p=selectedProfilePlacement();if(!p)return;if(p.kind==='folder'){profileState.clipboard={kind:'folder',customVisual:deepClone(p.customVisual||null),nativeStates:deepClone(p.nativeStates||null)};}else if(p.kind==='action'){profileState.clipboard=deepClone(p);}else{const ser=profileSerializableData().placements.find(x=>x.id===p.id);profileState.clipboard=deepClone(ser);}setProfilePending(null);syncProfileControls();logProfile('copied',{kind:p.kind});}
async function profilePasteClipboardAt(controller,column,row){const c=profileState.clipboard;if(!c||profilePlacementAt(controller,column,row))return null;if(c.kind==='folder'){const f=controller==='Keypad'?createProfileFolder(column,row):null;if(f){f.customVisual=deepClone(c.customVisual||null);f.nativeStates=deepClone(c.nativeStates||null);}return f;}if(c.kind==='action'){const idx=(profileAvailableActions()).findIndex(a=>a.UUID===c.actionUuid);if(idx<0||!getActionControllers(profileAvailableActions()[idx]).includes(controller))return null;const p=await createProfileActionPlacement(idx,controller,column,row);if(p){p.settings=deepClone(c.settings||{});p.state=c.state||0;p.customVisual=deepClone(c.customVisual||null);p.resources=deepClone(c.resources||{});p.nativeStates=deepClone(c.nativeStates||null);p.sourceAction=deepClone(c.sourceAction||null);p.importName=c.importName||c.title;profileManifestVisuals(p);}return p;}if((c.kind==='multi'||c.kind==='multi-switch')&&controller==='Keypad'){const p=createProfileMulti(c.kind,column,row);if(!p)return null;p.title=c.title||p.title;p.customVisual=deepClone(c.customVisual||null);p.state=c.state||0;for(const key of ['A','B'])for(const raw of c.sequences?.[key]||[]){if(raw.kind==='wait')p.sequences[key].push({kind:'wait',id:`wait-${++profileState.stepCounter}`,duration:Number(raw.duration)||0});else{const idx=(profileAvailableActions()).findIndex(a=>a.UUID===raw.actionUuid),st=createMultiActionStep(idx,p,key,raw);if(st)p.sequences[key].push(st);}}return p;}return null;}
function profilePasteMode(){if(!profileState.clipboard)return;setProfilePending({type:'paste'});}
function findFirstEmptyForPlacement(p){const d=profileDevice(),ctrl=p.kind==='action'?p.controller:'Keypad';if(ctrl==='Keypad'){for(let r=0;r<d.rows;r++)for(let c=0;c<d.cols;c++)if(!profilePlacementAt('Keypad',c,r))return {controller:'Keypad',column:c,row:r};}if(ctrl==='Encoder'&&d.dials){for(let c=0;c<d.dials;c++)if(!profilePlacementAt('Encoder',c,0))return {controller:'Encoder',column:c,row:0};}if(ctrl==='Neo'&&d.neo&&!profilePlacementAt('Neo',0,0))return {controller:'Neo',column:0,row:0};return null;}
async function profileDuplicateSelected(){const p=selectedProfilePlacement();if(!p)return;profileCopySelected();const slot=findFirstEmptyForPlacement(p);if(!slot){logProfile('duplicateFailed',{reason:'No compatible empty slot'});return;}const copy=await profilePasteClipboardAt(slot.controller,slot.column,slot.row);if(copy){selectProfilePlacement(copy);renderProfileLab();}}

function renderMultiActionEditor(){const card=$('multiActionEditorCard'),p=selectedProfilePlacement();const isMulti=p&&(p.kind==='multi'||p.kind==='multi-switch');card.classList.toggle('hidden',!isMulti);if(!isMulti)return;$('multiActionEditorTitle').textContent=p.kind==='multi-switch'?'Multi Action Switch':'Multi Action';$('multiTitleInput').value=p.title||'';const tabs=$('multiActionStateTabs');tabs.innerHTML='';if(p.kind==='multi-switch'){for(const key of ['A','B']){const b=document.createElement('button');b.type='button';b.className=`secondary ${profileState.multiSequence===key?'active':''}`;b.textContent=`State ${key}`;b.addEventListener('click',()=>{profileState.multiSequence=key;renderMultiActionEditor();});tabs.appendChild(b);}}else profileState.multiSequence='A';const sel=$('multiAddActionSelect');sel.innerHTML='';(profileAvailableActions()).forEach((a,i)=>{if(!getActionControllers(a).includes('Keypad')||a.SupportedInMultiActions===false)return;const o=document.createElement('option');o.value=String(i);o.textContent=a.Name||a.UUID;sel.appendChild(o);});const list=$('multiStepList');list.innerHTML='';const seq=p.sequences[profileState.multiSequence]||[];if(!seq.length){const e=document.createElement('div');e.className='multi-empty';e.textContent='No steps yet. Add plugin actions or wait steps above.';list.appendChild(e);}seq.forEach((st,i)=>{const row=document.createElement('div');row.className=`multi-step ${st.kind==='wait'?'wait':''} ${p.runningStepId===st.id?'running':''}`;const title=st.kind==='wait'?`Wait ${st.duration} ms`:(profileActionFor(st)?.Name||st.actionUuid);row.innerHTML=`<div class="multi-step-index">${i+1}</div><div><div class="multi-step-title">${escapeHtml(title)}</div><div class="multi-step-sub">${st.kind==='action'?escapeHtml(st.context):'DeckLab timing step'}</div></div>`;for(const [label,delta] of [['↑',-1],['↓',1]]){const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent=label;b.disabled=(delta<0&&i===0)||(delta>0&&i===seq.length-1);b.onclick=()=>moveMultiStep(p,i,i+delta);row.appendChild(b);}const del=document.createElement('button');del.type='button';del.className='secondary danger-soft';del.textContent='×';del.onclick=()=>deleteMultiStep(p,i);row.appendChild(del);list.appendChild(row);});}
function addMultiActionStepFromEditor(){const p=selectedProfilePlacement();if(!p||(p.kind!=='multi'&&p.kind!=='multi-switch'))return;const idx=Number($('multiAddActionSelect').value);if(!Number.isInteger(idx))return;profilePushHistory('add multi action step');const st=createMultiActionStep(idx,p,profileState.multiSequence);if(st){p.sequences[profileState.multiSequence].push(st);if(profileState.connected&&p.pageId===profileState.currentPageId){const msg=profileWillAppear(st);logProfile('willAppear',{reason:'multi child added',...msg});logHost('host→plugin','willAppear',msg);}}renderProfileLab();profileScheduleAutosave();}
function addMultiWaitStep(){const p=selectedProfilePlacement();if(!p||(p.kind!=='multi'&&p.kind!=='multi-switch'))return;profilePushHistory('add wait step');p.sequences[profileState.multiSequence].push({kind:'wait',id:`wait-${++profileState.stepCounter}`,duration:clamp(Number($('multiWaitMs').value)||0,0,60000)});renderProfileLab();profileScheduleAutosave();}
function moveMultiStep(p,from,to){if(to<0||to>=p.sequences[profileState.multiSequence].length)return;profilePushHistory('reorder multi action');const seq=p.sequences[profileState.multiSequence],x=seq.splice(from,1)[0];seq.splice(to,0,x);renderProfileLab();profileScheduleAutosave();}
function deleteMultiStep(p,index){const seq=p.sequences[profileState.multiSequence],st=seq[index];if(!st)return;profilePushHistory('delete multi step');if(st.kind==='action'&&profileState.connected&&p.pageId===profileState.currentPageId){const msg=profileWillDisappear(st);logProfile('willDisappear',{reason:'multi child removed',...msg});logHost('host→plugin','willDisappear',msg);}seq.splice(index,1);renderProfileLab();profileScheduleAutosave();}
async function executeMultiPlacement(p){if(p._running)return;p._running=true;const key=p.kind==='multi-switch'?(p.state?'B':'A'):'A',seq=p.sequences[key]||[];logProfile('multiActionStart',{id:p.id,sequence:key,steps:seq.length});for(const st of seq){p.runningStepId=st.id;renderMultiActionEditor();if(st.kind==='wait')await new Promise(r=>setTimeout(r,st.duration));else{profileEmitInput(st,'keyDown',{});await new Promise(r=>setTimeout(r,70));profileEmitInput(st,'keyUp',{});const a=profileActionFor(st),states=Array.isArray(a?.States)?a.States:[];if(states.length>1&&!a.DisableAutomaticStates){st.state=st.state?0:1;profileManifestVisuals(st);}}await new Promise(r=>setTimeout(r,35));}p.runningStepId=null;if(p.kind==='multi-switch')p.state=p.state?0:1;p._running=false;logProfile('multiActionComplete',{id:p.id,nextState:p.state||0});renderProfileLab();}

function unloadProfilePropertyInspector(){if(profilePiState.context){const old=profileInstanceByContext(profilePiState.context);if(old)profileOutbound('propertyInspectorDidDisappear',{action:old.actionUuid,context:old.context,device:profileState.deviceId,event:'propertyInspectorDidDisappear'});}profilePiState.context=null;profilePiState.loaded=false;profilePiState.path=null;const frame=$('profilePiFrame');if(frame){frame.classList.remove('live');frame.srcdoc='';}if($('profilePiStatus')){$('profilePiStatus').textContent='inactive';$('profilePiStatus').classList.remove('live');}if($('profilePiEmpty'))$('profilePiEmpty').classList.remove('hidden');if($('profilePiCard'))$('profilePiCard').classList.add('hidden');}
function profilePropertyInspectorBridgeScript(inst){const info=JSON.stringify(JSON.stringify(profileInfoObject())),actionInfo=JSON.stringify(JSON.stringify(profileActionInfoObject(inst))),context=JSON.stringify(inst.context);return `\n(()=>{const parentPost=payload=>parent.postMessage({__decklabProfilePi:true,payload},'*');const sockets=[];class DeckLabWebSocket{constructor(url){this.url=url;this.readyState=0;sockets.push(this);setTimeout(()=>{this.readyState=1;this.onopen&&this.onopen({type:'open'});},8)}send(data){parentPost({kind:'ws-send',data})}close(){this.readyState=3;this.onclose&&this.onclose({type:'close'})}addEventListener(type,fn){this['on'+type]=fn}removeEventListener(type,fn){if(this['on'+type]===fn)this['on'+type]=null}_receive(message){const ev={data:JSON.stringify(message)};this.onmessage&&this.onmessage(ev)}}DeckLabWebSocket.OPEN=1;DeckLabWebSocket.CLOSED=3;window.WebSocket=DeckLabWebSocket;window.addEventListener('message',ev=>{if(ev.data&&ev.data.__decklabProfileHost)sockets.forEach(s=>s._receive(ev.data.message))});const attempt=()=>{if(typeof window.connectElgatoStreamDeckSocket==='function'){try{window.connectElgatoStreamDeckSocket('28196',${context},'registerPropertyInspector',${info},${actionInfo});parentPost({kind:'bridge-ready'})}catch(err){parentPost({kind:'bridge-error',error:String(err)})}}else setTimeout(attempt,40)};if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',()=>setTimeout(attempt,20));else setTimeout(attempt,20)})();\n`;}
function profileSendToPi(message){const frame=$('profilePiFrame');if(!frame?.contentWindow||!profilePiState.loaded)return;frame.contentWindow.postMessage({__decklabProfileHost:true,message},'*');logProfile('host→PI',{context:profilePiState.context,event:message.event});}
async function loadProfilePropertyInspector(inst){const action=profileActionFor(inst),ref=action?.PropertyInspectorPath;if(!ref){$('profilePiCard').classList.remove('hidden');$('profilePiTitle').textContent='No Property Inspector';$('profilePiEmpty').classList.remove('hidden');return;}const file=findPluginFile(ref);$('profilePiCard').classList.remove('hidden');$('profilePiTitle').textContent=ref;if(!file){$('profilePiEmpty').textContent='Property Inspector file is missing from the imported plugin.';$('profilePiEmpty').classList.remove('hidden');return;}try{const html=await file.text(),parser=new DOMParser(),doc=parser.parseFromString(html,'text/html'),base=dirname(normalizePluginPath(ref));rewritePiAssetAttribute(doc,'script[src]','src',base);rewritePiAssetAttribute(doc,'link[href]','href',base);rewritePiAssetAttribute(doc,'img[src]','src',base);rewritePiAssetAttribute(doc,'source[src]','src',base);const bridge=doc.createElement('script');bridge.textContent=profilePropertyInspectorBridgeScript(inst);(doc.head||doc.documentElement).insertBefore(bridge,(doc.head||doc.documentElement).firstChild);const frame=$('profilePiFrame');frame.srcdoc='<!doctype html>\n'+doc.documentElement.outerHTML;frame.classList.add('live');$('profilePiEmpty').classList.add('hidden');$('profilePiStatus').classList.add('live');$('profilePiStatus').textContent='sandbox loading';profilePiState.context=inst.context;profilePiState.loaded=true;profilePiState.path=ref;profileOutbound('propertyInspectorDidAppear',{action:inst.actionUuid,context:inst.context,device:profileState.deviceId,event:'propertyInspectorDidAppear'});}catch(err){$('profilePiEmpty').textContent=`PI load error: ${err.message}`;$('profilePiEmpty').classList.remove('hidden');}}
function syncProfilePropertyInspector(oldInst,newInst){const desired=newInst?.context||null;if(profilePiState.context===desired)return;if(profilePiState.context){const old=profileInstanceByContext(profilePiState.context)||oldInst;if(old)profileOutbound('propertyInspectorDidDisappear',{action:old.actionUuid,context:old.context,device:profileState.deviceId,event:'propertyInspectorDidDisappear'});const frame=$('profilePiFrame');if(frame){frame.classList.remove('live');frame.srcdoc='';}profilePiState.context=null;profilePiState.loaded=false;}if(!newInst){$('profilePiCard').classList.add('hidden');return;}loadProfilePropertyInspector(newInst);}
async function handleProfilePiCommand(message){if(!message||typeof message!=='object')return;const inst=profileInstanceByContext(profilePiState.context);if(!inst)return;const event=message.event||'unknown';logProfile(`PI→host:${event}`,{context:inst.context,payload:deepClone(message.payload)});if(event==='registerPropertyInspector'||event==='getSettings'){if($('profilePiStatus')){$('profilePiStatus').textContent='connected';$('profilePiStatus').classList.add('live');}profileSendToPi({action:inst.actionUuid,context:inst.context,device:profileState.deviceId,event:'didReceiveSettings',payload:profilePayload(inst)});}else if(event==='setSettings'){profilePushHistory('PI settings');inst.settings=deepClone(message.payload||{});profileOutbound('didReceiveSettings',{action:inst.actionUuid,context:inst.context,device:profileState.deviceId,event:'didReceiveSettings',payload:profilePayload(inst)});if($('profileInstanceSettings'))$('profileInstanceSettings').value=JSON.stringify(inst.settings,null,2);profileScheduleAutosave();}else if(event==='getGlobalSettings')profileSendToPi({context:pluginState.manifest?.UUID||'plugin',event:'didReceiveGlobalSettings',payload:{settings:deepClone(profileState.globalSettings)}});else if(event==='setGlobalSettings'){profilePushHistory('PI global settings');profileState.globalSettings=deepClone(message.payload||{});profileOutbound('didReceiveGlobalSettings',{context:pluginState.manifest?.UUID||'plugin',event:'didReceiveGlobalSettings',payload:{settings:deepClone(profileState.globalSettings)}});if($('profileGlobalSettings'))$('profileGlobalSettings').value=JSON.stringify(profileState.globalSettings,null,2);profileScheduleAutosave();}else if(event==='sendToPlugin'){profileOutbound('sendToPlugin',{action:message.action||inst.actionUuid,context:message.context||inst.context,event:'sendToPlugin',payload:deepClone(message.payload)});}else if(['setTitle','setImage','setState','showOk','showAlert','setFeedback','setFeedbackLayout'].includes(event))await applyProfileCommand(inst,event,message.payload||{});else if(event==='openUrl')logProfile('PI openUrl blocked in sandbox',{url:message.payload?.url||message.url||''});}
window.addEventListener('message',ev=>{const outer=ev.data;if(!outer?.__decklabProfilePi)return;const payload=outer.payload||{};if(payload.kind==='bridge-ready')logProfile('PI bridge ready',{context:profilePiState.context});else if(payload.kind==='bridge-error')logProfile('PI bridge error',{error:payload.error});else if(payload.kind==='ws-send'){try{handleProfilePiCommand(typeof payload.data==='string'?JSON.parse(payload.data):payload.data);}catch(err){logProfile('PI invalid message',{error:err.message});}}});

async function buildProfileDemo(){if(pluginState.manifest?.UUID!=='com.decklab.hostdemo')await loadSamplePlugin();profilePushHistory('build demo');profileSendVisibleDisappear('demo profile rebuild');profileState.placements=[];profileState.selectedId=null;profileState.pages=[{id:'page-1',name:'Page 1',parentPageId:null,folderId:null}];profileState.currentPageId='page-1';profileState.pageCounter=1;profileState.folderCounter=0;profileState.multiCounter=0;const d=profileDevice(),actions=profileAvailableActions(),keyActions=actions.map((a,i)=>({a,i})).filter(x=>!x.a.DeckLabBuiltin&&!x.a.DeckLabPlaceholder&&getActionControllers(x.a).includes('Keypad'));let first=null;for(let i=0;i<Math.min(d.rows*d.cols,Math.max(3,keyActions.length));i++){const pick=keyActions[i%Math.max(1,keyActions.length)];if(!pick)break;const inst=await createProfileActionPlacement(pick.i,'Keypad',i%d.cols,Math.floor(i/d.cols),'page-1',{emit:false,pushHistory:false});if(!first&&inst)first=inst;}if(d.rows*d.cols>4){let slot=null;for(let i=0;i<d.rows*d.cols;i++){const c=i%d.cols,r=Math.floor(i/d.cols);if(!profilePlacementAt('Keypad',c,r)){slot={c,r};break;}}if(slot){const multi=createProfileMulti('multi',slot.c,slot.r,'page-1',{pushHistory:false});multi.title='Go Live';if(keyActions[0])multi.sequences.A.push(createMultiActionStep(keyActions[0].i,multi,'A'));multi.sequences.A.push({kind:'wait',id:`wait-${++profileState.stepCounter}`,duration:500});if(keyActions[1])multi.sequences.A.push(createMultiActionStep(keyActions[1].i,multi,'A'));}}if(d.dials){const enc=actions.findIndex(a=>!a.DeckLabBuiltin&&!a.DeckLabPlaceholder&&getActionControllers(a).includes('Encoder'));if(enc>=0)for(let i=0;i<(d.encoderSlots||d.dials);i++)await createProfileActionPlacement(enc,'Encoder',d.encoderSlots?Math.floor(i/2):i,d.encoderSlots?i%2:0,'page-1',{emit:false,pushHistory:false});}if(d.neo){const ni=actions.findIndex(a=>getActionControllers(a).includes('Neo'));if(ni>=0)await createProfileActionPlacement(ni,'Neo',0,0,'page-1',{emit:false,pushHistory:false});}profileState.selectedId=first?.id||null;profileState.selectedContext=first?.context||null;if(profileState.connected)profileSendVisibleAppear('demo profile built');renderProfileLab();profileScheduleAutosave();}
function exportDeckLabProfile(){const data=profileSerializableData();downloadText(`${(data.name||'decklab-profile').replace(/[^a-z0-9-_]+/gi,'-')}.decklab-profile.json`,JSON.stringify(data,null,2));}
async function importDeckLabProfileData(data,{autosave=false}={}){if(data.format!=='DeckLabProfile')throw new Error('This is not a DeckLab profile JSON file.');profilePrepareImportedActions(data);if($('builtinSimulationNotice'))$('builtinSimulationNotice').hidden=true;if(!autosave)profilePushHistory('import profile');if(profileState.connected)profileSendVisibleDisappear(autosave?'autosave restore':'profile import');unloadProfilePropertyInspector();profileState.target=data.target==='scissor'?'standard':data.target&&DEVICES[data.target]?data.target:'standard';currentDeviceKey=profileState.target;if($('deviceSelect'))$('deviceSelect').value=currentDeviceKey;profileState.rows=data.rows||null;profileState.cols=data.cols||null;profileState.deviceId=`decklab-profile-${profileState.target}-${String(Date.now()).slice(-5)}`;profileState.pages=Array.isArray(data.pages)&&data.pages.length?deepClone(data.pages):[{id:'page-1',name:'Page 1',parentPageId:null,folderId:null}];profileState.currentPageId=profileState.pages.find(p=>!p.parentPageId)?.id||profileState.pages[0].id;profileState.nativeSource=data.nativeSource||null;if(profileState.pages.some(p=>p.id===data.currentPageId))profileState.currentPageId=data.currentPageId;DeckLabPluginSettings.restore(data,{autosave});profileState.placements=[];profileState.selectedId=null;const actions=profileAvailableActions();const rawPlacements=deepClone(data.placements||[]);const legacyPeripheral3x4=['galleon','scimitar'].includes(profileState.target)&&rawPlacements.some(p=>p.controller==='Keypad'&&Number(p.column)===3);if(legacyPeripheral3x4){for(const p of rawPlacements){if(p.controller!=='Keypad')continue;const oldIndex=(Number(p.row)||0)*4+(Number(p.column)||0);p.column=oldIndex%3;p.row=Math.floor(oldIndex/3);}logProfile('profileMigrated',{target:profileState.target,from:'legacy 3×4 peripheral grid',to:'physical 4×3 layout'});}const legacyStudio4x8=profileState.target==='studio'&&data.deviceGeometryVersion!=='studio-2x16-v1';if(legacyStudio4x8){for(const p of rawPlacements){if(p.controller!=='Keypad')continue;const oldIndex=(Number(p.row)||0)*8+(Number(p.column)||0);p.column=oldIndex%16;p.row=Math.floor(oldIndex/16);}logProfile('profileMigrated',{target:'studio',from:'legacy generic 4×8 Studio grid',to:'physical 2×16 rack panel'});}for(const raw of rawPlacements){if(raw.kind==='folder'){profileState.placements.push(deepClone(raw));continue;}if(raw.kind==='action'){const idx=actions.findIndex(a=>a.UUID===raw.actionUuid);if(idx<0){logProfile('importSkipped',{actionUuid:raw.actionUuid,reason:'matching action not loaded'});continue;}const inst=await createProfileActionPlacement(idx,raw.controller,raw.column,raw.row,raw.pageId,{emit:false,pushHistory:false});if(inst){Object.assign(inst,{settings:deepClone(raw.settings||{}),state:raw.state||0,customVisual:deepClone(raw.customVisual||null),resources:deepClone(raw.resources||{}),nativeStates:deepClone(raw.nativeStates||null),sourceAction:deepClone(raw.sourceAction||null),importName:raw.importName||raw.title});profileManifestVisuals(inst);if(raw.previewLayout&&!validateLayout(raw.previewLayout,inst.controller).some(e=>e.severity==='error')){inst.previewLayout=deepClone(raw.previewLayout);inst.layout=deepClone(raw.previewLayout);}}continue;}if(raw.kind==='multi'||raw.kind==='multi-switch'){const p=createProfileMulti(raw.kind,raw.column,raw.row,raw.pageId,{pushHistory:false});if(!p)continue;p.id=raw.id||p.id;p.title=raw.title||p.title;p.customVisual=deepClone(raw.customVisual||null);p.state=raw.state||0;for(const key of ['A','B'])for(const st of raw.sequences?.[key]||[]){if(st.kind==='wait')p.sequences[key].push({kind:'wait',id:`wait-${++profileState.stepCounter}`,duration:Number(st.duration)||0});else{const idx=actions.findIndex(a=>a.UUID===st.actionUuid),child=createMultiActionStep(idx,p,key,st);if(child)p.sequences[key].push(child);}}}}
  profileState.pageCounter=Math.max(1,...profileState.pages.filter(p=>/^page-\d+$/.test(p.id)).map(p=>Number(p.id.split('-')[1])||1));profileState.folderCounter=profileState.placements.filter(p=>p.kind==='folder').length;profileState.multiCounter=profileState.placements.filter(p=>p.kind==='multi'||p.kind==='multi-switch').length;if($('profileName'))$('profileName').value=data.name||'Imported DeckLab Profile';profileState.connected=true;profileSendDeviceConnect();profileSendVisibleAppear(autosave?'autosave restored':'profile imported');renderProfileLab();profileScheduleAutosave();}
async function importDeckLabProfile(file){if(!file)return;try{if(file.size>64*1024*1024)throw Error('Profile file exceeds 64 MB.');let data;if(/\.streamDeckProfile$/i.test(file.name)){data=DeckLabNativeProfile.convert(await DeckLabNativeProfile.unzip(await file.arrayBuffer()));}else data=JSON.parse(await file.text());await importDeckLabProfileData(data);showNativeImportSummary(data);switchMode('profile');}catch(e){alert(`Profile import: ${e.message}`);}}
async function restoreProfileAutosave(){try{let raw=localStorage.getItem(profileState.autosaveKey);if(!raw)for(const k of profileState.legacyAutosaveKeys||[]){raw=localStorage.getItem(k);if(raw)break;}if(!raw)return;const data=JSON.parse(raw);if(data.plugin?.uuid&&pluginState.manifest?.UUID&&data.plugin.uuid!==pluginState.manifest.UUID&&!confirm(`This autosave was created with ${data.plugin.name||data.plugin.uuid}, but ${pluginState.manifest?.Name||'another plugin'} is currently loaded. Continue and skip unmatched actions?`))return;await importDeckLabProfileData(data,{autosave:true});}catch(e){alert(`Autosave: ${e.message}`);}}

$('profileTargetDevice').addEventListener('change',e=>resetProfileSession({target:e.target.value,emit:true}));
$('profileRows').addEventListener('change',applyProfileGrid);$('profileCols').addEventListener('change',applyProfileGrid);$('profileConnectBtn').addEventListener('click',toggleProfileDevice);
$('profileAddPageBtn').addEventListener('click',addProfilePage);$('profileRenamePageBtn').addEventListener('click',renameCurrentProfilePage);$('profileClearPageBtn').addEventListener('click',clearCurrentProfilePage);$('profileBackBtn').addEventListener('click',profileBack);$('profileDemoBtn').addEventListener('click',buildProfileDemo);
$('profileApplyInstanceSettingsBtn').addEventListener('click',applyProfileInstanceSettingsFromEditor);$('profileApplyGlobalSettingsBtn').addEventListener('click',applyProfileGlobalSettingsFromEditor);$('profileExportBtn').addEventListener('click',exportDeckLabProfile);$('profileImportInput').addEventListener('change',e=>importDeckLabProfile(e.target.files?.[0]));$('profileRestoreAutosaveBtn').addEventListener('click',restoreProfileAutosave);
$('profileActionSearch').addEventListener('input',renderProfileActionLibrary);$('profileCompatToggleBtn').addEventListener('click',()=>toggleProfileCompatibility());$('profileCompatCloseBtn').addEventListener('click',()=>toggleProfileCompatibility(false));$('profileCompatExportBtn').addEventListener('click',exportProfileCompatibility);$('profileUndoBtn').addEventListener('click',profileUndo);$('profileRedoBtn').addEventListener('click',profileRedo);$('profileCopyBtn').addEventListener('click',profileCopySelected);$('profilePasteBtn').addEventListener('click',profilePasteMode);$('profileDuplicateBtn').addEventListener('click',profileDuplicateSelected);$('profileRemoveSelectedBtn').addEventListener('click',removeSelectedProfilePlacement);$('profileName').addEventListener('input',profileScheduleAutosave);
$('multiAddActionBtn').addEventListener('click',addMultiActionStepFromEditor);$('multiAddWaitBtn').addEventListener('click',addMultiWaitStep);$('multiTitleInput').addEventListener('change',()=>{const p=selectedProfilePlacement();if(p&&(p.kind==='multi'||p.kind==='multi-switch')){profilePushHistory('rename multi action');p.title=$('multiTitleInput').value.trim()||p.title;renderProfileLab();profileScheduleAutosave();}});
$('clearProfileLogBtn').addEventListener('click',()=>{profileState.events=[];$('profileEventLog').textContent='';});$('downloadProfileLogBtn').addEventListener('click',()=>downloadText('decklab-profile-events.json',JSON.stringify(profileState.events.slice().reverse(),null,2)));$('openProfileLabBtn').addEventListener('click',()=>switchMode('profile'));
window.addEventListener('keydown',ev=>{if(currentMode!=='profile'||window.decklabLivePreview)return;const tag=(ev.target?.tagName||'').toLowerCase();if(['input','textarea','select'].includes(tag))return;const mod=ev.ctrlKey||ev.metaKey;if(mod&&ev.key.toLowerCase()==='z'){ev.preventDefault();ev.shiftKey?profileRedo():profileUndo();}else if(mod&&ev.key.toLowerCase()==='y'){ev.preventDefault();profileRedo();}else if(mod&&ev.key.toLowerCase()==='c'){ev.preventDefault();profileCopySelected();}else if(mod&&ev.key.toLowerCase()==='v'){ev.preventDefault();profilePasteMode();}else if(ev.key==='Delete'||ev.key==='Backspace'){ev.preventDefault();removeSelectedProfilePlacement();}});


// Host Lab controls.
$('openHostLabBtn').addEventListener('click',()=>switchMode('host'));
$('loadSamplePluginBtn').addEventListener('click',loadSamplePlugin);
$('hostTargetDevice').addEventListener('change',()=>{
  if (hostState.placed) removeHostAction({quiet:true});
  hostState.target=$('hostTargetDevice').value;
  syncHostControls(); renderHostLab();
});
$('hostController').addEventListener('change',()=>{
  if (hostState.placed) removeHostAction({quiet:true});
  hostState.controller=$('hostController').value;
  syncHostControls(); renderHostLab();
});
$('hostColumn').addEventListener('input',e=>hostState.column=Number(e.target.value)||0);
$('hostRow').addEventListener('input',e=>hostState.row=Number(e.target.value)||0);
$('placeHostActionBtn').addEventListener('click',placeHostAction);
$('removeHostActionBtn').addEventListener('click',()=>removeHostAction());
$('hostDeviceToggleBtn').addEventListener('click',toggleHostDevice);
$('hostNavigateBtn').addEventListener('click',simulateHostNavigation);
$('applyHostSettingsBtn').addEventListener('click',applyHostSettingsFromEditor);
$('applyHostGlobalBtn').addEventListener('click',applyHostGlobalFromEditor);
$('hostSetTitleBtn').addEventListener('click',()=>applyHostCommand('setTitle',{title:$('hostCommandTitle').value}));
$('hostSetStateBtn').addEventListener('click',()=>applyHostCommand('setState',{state:Number($('hostCommandState').value)||0}));
$('hostCommandImage').addEventListener('change',e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>applyHostCommand('setImage',{image:r.result});r.readAsDataURL(f);});
$('hostClearImageBtn').addEventListener('click',()=>applyHostCommand('setImage',{image:null}));
$('hostShowOkBtn').addEventListener('click',()=>applyHostCommand('showOk',{}));
$('hostShowAlertBtn').addEventListener('click',()=>applyHostCommand('showAlert',{}));
$('hostSetFeedbackBtn').addEventListener('click',()=>{const p=parseJsonEditor('hostFeedback','Feedback payload');if(p)applyHostCommand('setFeedback',p);});
$('hostSetFeedbackLayoutBtn').addEventListener('click',()=>applyHostCommand('setFeedbackLayout',{}));
$('clearHostLogBtn').addEventListener('click',()=>{hostState.events=[];$('hostProtocolLog').textContent='';});
$('downloadHostLogBtn').addEventListener('click',()=>downloadText('decklab-host-protocol.json',JSON.stringify(hostState.events.slice().reverse(),null,2)));
$('liveLaunchBtn').addEventListener('click',()=>launchLivePlugin());
$('liveStopBtn').addEventListener('click',()=>liveControl('stopPlugin'));
$('liveDemoBtn').addEventListener('click',launchBundledLiveDemo);

renderHostLab();
renderProfileLab();
connectLiveCompanion();
setInterval(renderLiveRuntimeStatus,500);
