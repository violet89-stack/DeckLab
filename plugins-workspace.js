// SPDX-License-Identifier: MPL-2.0
/* Plugin discovery UI. External metadata is rendered as text, never markup. */
(() => {
  const key='decklab.discovery.v1';
  const sources=['opendeck'];
  let cache={}, selected=null;
  try{cache=JSON.parse(localStorage.getItem(key)||'{}')||{};}catch{}
  // Discard the retired ecosystem cache when upgrading from alpha.14/15.
  if(cache.streamdock){delete cache.streamdock;try{localStorage.setItem(key,JSON.stringify(cache));}catch{}}
  const dialog=document.createElement('dialog');dialog.id='pluginsWorkspace';
  dialog.innerHTML=`<header class="catalogue-heading"><div><div class="tiny-label">DECKLAB</div><h2>Plugins</h2><p>Discover Elgato Stream Deck plugins and inspect your local packages.</p></div><button id="catalogueClose" type="button" class="secondary">Close</button></header>
  <nav class="catalogue-tabs" aria-label="Plugin views"><button id="discoverTab" type="button">Discover</button><button id="libraryTab" type="button" class="secondary">My library</button></nav>
  <section id="catalogueDiscover"><div class="catalogue-marketplace"><h3>Elgato Stream Deck</h3><p><a href="https://marketplace.elgato.com/stream-deck/plugins" target="_blank" rel="noopener noreferrer">Browse official Elgato Marketplace plugins ↗</a></p><p class="hint">Marketplace opens in your browser. Below, OpenDeck provides community catalogue entries for Stream Deck plugins. Entries are untested in DeckLab until you inspect and test a package; listing here does not establish compatibility.</p></div><div class="catalogue-toolbar"><input id="catalogueSearch" type="search" placeholder="Search name, author or description" aria-label="Search catalogue"><select id="catalogueSource" aria-label="Catalogue source"><option value="opendeck">OpenDeck · Stream Deck catalogue</option></select><select id="catalogueCategory" aria-label="Category"><option value="all">All categories</option></select><button id="catalogueRefresh" type="button">Refresh catalogue</button><label class="file-button secondary">Import catalogue JSON<input id="catalogueImport" type="file" accept=".json,application/json"></label></div><p id="catalogueStatus" role="status"></p><div class="catalogue-body"><div id="catalogueGrid"></div><aside id="catalogueDetails"><h3>Plugin details</h3><p>Select a plugin to view its requirements and source.</p></aside></div></section>
  <section id="catalogueLibrary" hidden></section>`;
  document.body.append(dialog);
  const el=id=>document.getElementById(id);
  const panel=el('pluginLibraryPanel');el('catalogueLibrary').append(panel);panel.classList.remove('hidden');el('pluginLibraryCloseBtn').hidden=true;
  const scanLabel=document.querySelector('.plugin-library-button');el('catalogueLibrary').prepend(scanLabel);
  const openLocal=document.createElement('button');openLocal.type='button';openLocal.className='secondary wide-button';openLocal.textContent='Open plugin library';openLocal.onclick=()=>open('library');el('pluginImportStatus').before(openLocal);
  function safeURL(value){try{const u=new URL(value);return u.protocol==='https:'?u.href:'';}catch{return '';}}
  const str=v=>typeof v==='string'?v:typeof v==='number'?String(v):'';
  function normalize(row,source){
    if(!row||typeof row!=='object')return null;
    const name=str(row.name||row.Name),uuid=str(row.uuid||row.id||row.UUID);if(!name||!uuid)return null;
    const types=Array.isArray(row.types)?row.types:[];
    return {name,uuid,source,version:str(row.version),author:str(row.author),description:str(row.description||row.overview).replace(/<[^>]*>/g,' ').slice(0,4000),category:str(row.category)||types.map(t=>str(t.nameen)).filter(Boolean).join(', ')||'Uncategorised',icon:safeURL(row.icon||row.iconUrl||row.headUrl),url:safeURL(row.link||row.url),platforms:Array.isArray(row.platforms)?row.platforms.map(str).filter(Boolean):[],controllers:[],actions:[]};
  }
  function rows(){return sources.flatMap(s=>Array.isArray(cache[s]?.entries)?cache[s].entries:[]);}
  function save(){try{localStorage.setItem(key,JSON.stringify(cache));return true;}catch{return false;}}
  function textNode(tag,text,parent,cls){const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;parent.append(n);return n;}
  function showDetails(e){
    selected=e;const target=el('catalogueDetails');target.replaceChildren();
    textNode('h3',e.name,target);textNode('p',[e.author,e.version?'v'+e.version:''].filter(Boolean).join(' · '),target);
    textNode('p',e.description||'No description supplied.',target);
    const dl=document.createElement('dl');target.append(dl);
    for(const [label,value] of [['Source',e.source||'Local package'],['Plugin ID',e.uuid||'Unavailable'],['Declared platforms',(e.platforms||[]).join(', ')||'Not supplied'],['Declared controls',(e.controllers||[]).join(', ')||'Not supplied'],['DeckLab test status','Not tested by this catalogue'],['Package status',e.kind==='protected'?'Protected manifest':e.kind==='plain'?'Inspectable manifest':e.kind==='invalid'?'Needs attention':'Package not inspected']]){textNode('dt',label,dl);textNode('dd',value,dl);}
    if(e.actions?.length){textNode('h4','Actions',target);const ul=document.createElement('ul');target.append(ul);for(const a of e.actions)textNode('li',a.name,ul);}
    if(e.url){const a=textNode('a','Open publisher / source page',target);a.href=safeURL(e.url);a.target='_blank';a.rel='noopener noreferrer';}
    if(e.files){const b=textNode('button','Inspect package',target);b.type='button';b.onclick=async()=>{dialog.close();await loadPluginFolder(e.files);switchMode('plugin');};}
    else textNode('p',e.source?'To inspect this plugin, obtain its package from its publisher, unpack it and scan its .sdPlugin folder in My library.':'Rescan its folder in My library to inspect this saved entry.',target,'hint');
  }
  function render(){
    const all=rows(),q=el('catalogueSearch').value.toLowerCase().trim(),source=el('catalogueSource').value,category=el('catalogueCategory').value;
    const categories=[...new Set(all.map(e=>e.category))].sort();el('catalogueCategory').replaceChildren(new Option('All categories','all'),...categories.map(c=>new Option(c,c)));el('catalogueCategory').value=categories.includes(category)?category:'all';
    const filtered=all.filter(e=>(source==='all'||e.source===source)&&(el('catalogueCategory').value==='all'||e.category===category)&&(!q||[e.name,e.author,e.uuid,e.description].some(v=>v.toLowerCase().includes(q)))).sort((a,b)=>a.name.localeCompare(b.name));
    const grid=el('catalogueGrid');grid.replaceChildren();
    if(!filtered.length)textNode('p',all.length?'No matches. Try another search or filter.':'Choose Refresh catalogue to load the community catalogue, or import a catalogue JSON file.',grid,'catalogue-empty');
    for(const e of filtered){const card=document.createElement('button');card.type='button';card.className='catalogue-card secondary';if(e.icon){const img=document.createElement('img');img.src=e.icon;img.alt='';img.loading='lazy';img.referrerPolicy='no-referrer';img.onerror=()=>img.remove();card.append(img);}textNode('strong',e.name,card);textNode('span',e.author||'Author not supplied',card);textNode('small',`OpenDeck · ${e.category} · Untested in DeckLab`,card);card.onclick=()=>showDetails(e);grid.append(card);}
    const dates=sources.filter(s=>cache[s]?.at).map(s=>`${s}: cached ${new Date(cache[s].at).toLocaleString()}${cache[s].partial?' (partial)':''}`);
    el('catalogueStatus').textContent=`${filtered.length} of ${all.length} plugins. ${dates.join(' · ')}`;
  }
  function tab(name){const local=name==='library';el('catalogueDiscover').hidden=local;el('catalogueLibrary').hidden=!local;el('discoverTab').setAttribute('aria-pressed',String(!local));el('libraryTab').setAttribute('aria-pressed',String(local));if(local){panel.classList.remove('hidden');DeckLabPluginIntelligence.render();}}
  function open(name='discover'){tab(name);render();if(!dialog.open)dialog.showModal();}
  el('openPluginsWorkspace').onclick=()=>open();el('catalogueClose').onclick=()=>dialog.close();el('discoverTab').onclick=()=>tab('discover');el('libraryTab').onclick=()=>tab('library');
  for(const id of ['catalogueSearch','catalogueSource','catalogueCategory'])el(id).addEventListener(id==='catalogueSearch'?'input':'change',render);
  window.addEventListener('decklab-plugin-details',e=>{tab('discover');showDetails(e.detail);if(!dialog.open)dialog.showModal();});
  el('catalogueRefresh').onclick=async()=>{
    const button=el('catalogueRefresh');button.disabled=true;el('catalogueStatus').textContent='Loading Stream Deck community catalogue…';
    const wanted=sources;
    const results=await Promise.allSettled(wanted.map(async source=>{const response=await fetch(`/__decklab_catalogue?source=${source}`,{signal:AbortSignal.timeout(140000)});if(!response.ok)throw new Error('Source unavailable');const data=await response.json();if(!Array.isArray(data.rows))throw new Error('Unexpected format');const entries=data.rows.map(r=>normalize(r,source)).filter(Boolean);if(data.rows.length&&!entries.length)throw new Error('Unrecognised catalogue entries');cache[source]={entries,at:new Date().toISOString(),partial:!!data.partial};}));
    const stored=save();render();const failed=results.flatMap((r,i)=>r.status==='rejected'?[wanted[i]]:[]);if(failed.length)el('catalogueStatus').textContent+=` Could not refresh ${failed.join(', ')}. Existing results retained. Start DeckLab with its launcher, or import JSON.`;if(!stored)el('catalogueStatus').textContent+=' Browser storage unavailable; results last for this session.';button.disabled=false;
  };
  el('catalogueImport').onchange=async event=>{const file=event.target.files[0];event.target.value='';if(!file)return;try{if(file.size>4_000_000)throw new Error('File exceeds 4 MB');const data=JSON.parse(await file.text());if(data.source && !sources.includes(data.source))throw new Error('This build accepts only the OpenDeck Stream Deck catalogue');const source='opendeck';if(!sources.includes(source))throw new Error('Unsupported catalogue source');const input=Array.isArray(data)?data:data.rows||data.data?.list;if(!Array.isArray(input))throw new Error('Expected a catalogue array or rows list');const entries=input.map(r=>normalize(r,source)).filter(Boolean);if(input.length&&!entries.length)throw new Error('No recognised entries');cache[source]={entries,at:new Date().toISOString(),partial:false};const stored=save();render();el('catalogueStatus').textContent+=` Imported ${entries.length} entries.${stored?'':' Storage unavailable; session only.'}`;}catch(error){el('catalogueStatus').textContent=`Import failed: ${error.message}. Existing catalogue retained.`;}};
})();
