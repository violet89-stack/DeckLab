// SPDX-License-Identifier: MPL-2.0
/* DeckLab local plugin catalogue. Metadata is remembered; plugin files stay in memory only. */
(() => {
  const $id = id => document.getElementById(id);
  const KEY='decklab.pluginCatalogue.v1';
  const state={entries:[],query:'',filter:'all',sort:'name'};
  const pathOf=f=>String(f?.webkitRelativePath||f?.name||'').replace(/\\/g,'/');
  const rootOf=f=>{const p=pathOf(f), i=p.toLowerCase().lastIndexOf('.sdplugin/manifest.json');return i<0?'':p.slice(0,i+'.sdplugin/'.length);};
  function readSaved(){try{const value=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(value)?value.filter(e=>e&&typeof e.name==='string').slice(0,2000).map(e=>({...e,files:null})):[];}catch{return [];}}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state.entries.map(({files,manifest,...e})=>e)));}catch{if(typeof uxToast==='function')uxToast('Catalogue storage is full or unavailable. This scan remains available until you close DeckLab.','warning');}}
  state.entries=readSaved();
  async function buildEntry(file,all){
    const root=rootOf(file), files=all.filter(f=>pathOf(f).startsWith(root));
    const classification=classifyPluginManifestText(await file.text());
    const fallback=(root.split('/').filter(Boolean).pop()||'plugin.sdPlugin').replace(/\.sdPlugin$/i,'');
    const m=classification.kind==='plain'?classification.manifest:null;
    const actions=Array.isArray(m?.Actions)?m.Actions.map(a=>({name:String(a?.Name||a?.UUID||'Unnamed action'),uuid:String(a?.UUID||'')})):[];
    return {root,files,kind:classification.kind,reason:classification.reason||'',name:String(m?.Name||fallback),uuid:String(m?.UUID||''),version:String(m?.Version||''),author:String(m?.Author||''),actions,description:String(m?.Description||''),category:String(m?.Category||''),platforms:Array.isArray(m?.OS)?m.OS.map(o=>String(o.Platform||'')):[],controllers:[...new Set((Array.isArray(m?.Actions)?m.Actions:[]).flatMap(a=>Array.isArray(a.Controllers)?a.Controllers:[]))],scannedAt:new Date().toISOString()};
  }
  function badge(e){const label={plain:'Inspectable',protected:'Protected',invalid:'Needs attention'}[e.kind]||'Needs attention';return `<span class="plugin-lib-badge ${e.kind==='plain'?'inspectable':e.kind}">${label}</span>`;}
  function render(){
    const panel=$id('pluginLibraryPanel'),list=$id('pluginLibraryList'),stats=$id('pluginLibraryStats');
    if(!panel||!list||!stats)return;
    const q=state.query.trim().toLowerCase();
    const entries=state.entries.filter(e=>(state.filter==='all'||e.kind===state.filter)&&(!q||[e.name,e.uuid,e.author,e.kind,e.root,...(e.actions||[]).flatMap(a=>[a.name,a.uuid])].some(v=>String(v||'').toLowerCase().includes(q))));
    entries.sort((a,b)=>state.sort==='actions'?(b.actions?.length||0)-(a.actions?.length||0)||a.name.localeCompare(b.name):state.sort==='status'?a.kind.localeCompare(b.kind)||a.name.localeCompare(b.name):a.name.localeCompare(b.name,undefined,{sensitivity:'base'}));
    const counts=state.entries.reduce((a,e)=>(a[e.kind]=(a[e.kind]||0)+1,a),{});
    stats.innerHTML=`<span><strong>${state.entries.length}</strong> packages</span><span class="good">${counts.plain||0} inspectable</span><span class="protected">${counts.protected||0} protected</span>${counts.invalid?`<span class="bad">${counts.invalid} need attention</span>`:''}`;
    $id('pluginLibraryCount').textContent=`Showing ${entries.length} of ${state.entries.length}`;
    list.replaceChildren();
    if(!entries.length){list.innerHTML='<div class="plugin-library-empty">No packages match. Select a folder to scan, or adjust the search and filter.</div>';return;}
    for(const e of entries){
      const card=document.createElement('article');card.className=`plugin-library-card ${e.kind}`;
      const main=document.createElement('div');main.className='plugin-library-card-main';
      const row=document.createElement('div');row.className='plugin-library-name-row';
      const title=document.createElement('strong');title.textContent=e.name;row.append(title);
      const badgeEl=document.createElement('span');badgeEl.className=`plugin-lib-badge ${e.kind==='plain'?'inspectable':e.kind}`;badgeEl.textContent={plain:'Inspectable',protected:'Protected',invalid:'Needs attention'}[e.kind]||'Needs attention';row.append(badgeEl);main.append(row);
      const detail=document.createElement('div');detail.className='plugin-library-detail';detail.textContent=e.kind==='plain'?`${e.actions?.length||0} actions${e.version?' · v'+e.version:''}${e.author?' · '+e.author:''}`:e.kind==='protected'?'Marketplace-protected manifest · action list unavailable':e.reason||'Manifest could not be parsed';main.append(detail);
      if(e.uuid){const code=document.createElement('code');code.textContent=e.uuid;main.append(code);}
      if(e.actions?.length){const actionList=document.createElement('div');actionList.className='plugin-library-action-list';actionList.textContent=e.actions.map(a=>a.name).join(' · ');main.append(actionList);}
      const availability=document.createElement('small');availability.textContent=e.files?'Available from this scan':'Saved index · rescan folder to inspect';main.append(availability);
      const info=document.createElement('button');info.type='button';info.className='secondary compact-button';info.textContent='Details';info.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('decklab-plugin-details',{detail:e})));main.append(info);
      const button=document.createElement('button');button.className='secondary compact-button';button.type='button';button.textContent=e.files?'Inspect':'Rescan to inspect';button.disabled=!e.files;
      button.addEventListener('click',async()=>{document.getElementById('pluginsWorkspace')?.close();await loadPluginFolder(e.files);if(typeof switchMode==='function')switchMode('plugin');});card.append(main,button);list.append(card);
    }
  }
  async function scanLibrary(files){
    const all=[...files];if(!all.length)return;
    const unique=new Map();for(const f of all){if(!/manifest\.json$/i.test(pathOf(f)))continue;const root=rootOf(f);if(root&&!unique.has(root.toLowerCase()))unique.set(root.toLowerCase(),f);}
    const entries=[];for(const f of unique.values())entries.push(await buildEntry(f,all));
    const old=new Map(state.entries.map(e=>[(e.uuid||e.root).toLowerCase(),e]));
    for(const e of entries)old.set((e.uuid||e.root).toLowerCase(),e);
    state.entries=[...old.values()];save();$id('pluginLibraryPanel')?.classList.remove('hidden');render();
    if(typeof uxToast==='function')uxToast(`Indexed ${entries.length} plugin package${entries.length===1?'':'s'}.`,'good');
  }
  $id('pluginLibraryInput')?.addEventListener('change',e=>{scanLibrary(e.target.files).catch(err=>{if(typeof uxToast==='function')uxToast(`Scan failed: ${err.message}`,'bad');});e.target.value='';});
  $id('pluginLibrarySearch')?.addEventListener('input',e=>{state.query=e.target.value;render();});
  $id('pluginLibraryFilter')?.addEventListener('change',e=>{state.filter=e.target.value;render();});
  $id('pluginLibrarySort')?.addEventListener('change',e=>{state.sort=e.target.value;render();});
  $id('pluginLibraryCloseBtn')?.addEventListener('click',()=> $id('pluginLibraryPanel')?.classList.add('hidden'));
  $id('pluginLibraryClearBtn')?.addEventListener('click',()=>{if(!confirm('Clear saved plugin catalogue metadata?'))return;state.entries=[];save();render();});
  $id('pluginLibraryExportBtn')?.addEventListener('click',()=>{const blob=new Blob([JSON.stringify({format:'decklab-plugin-catalogue',version:1,exportedAt:new Date().toISOString(),plugins:state.entries.map(({files,manifest,...e})=>e)},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='decklab-plugin-catalogue.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  if(state.entries.length){$id('pluginLibraryPanel')?.classList.remove('hidden');render();}
  const originalRenderWarnings=renderPluginWarnings;
  renderPluginWarnings=function(){originalRenderWarnings();if(pluginState.importKind==='protected'){const host=$id('pluginWarnings');if(host&&!host.querySelector('.protected-help')){const note=document.createElement('div');note.className='validation-entry info protected-help';note.innerHTML='<strong>Why?</strong> Marketplace DRM can protect manifest and asset files after distribution. DeckLab recognizes the package but does not attempt to bypass that protection.';host.append(note);}}};
  window.DeckLabPluginIntelligence={scanLibrary,getEntries:()=>state.entries,render,classifyManifestText:classifyPluginManifestText};
})();
