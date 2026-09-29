// SPDX-License-Identifier: MPL-2.0
/* ----------------------------- DECKLAB 1.3.9 COMMUNITY ALPHA ----------------------------- */

const COMMUNITY_VERSION = '1.3.9-alpha.31';
const COMMUNITY_BUILD = '2026.09.30-colour-templates';
const COMMUNITY_NOTICE_KEY = 'decklab.communityAlphaNotice.v101';
let communityConfig = {
  version: COMMUNITY_VERSION,
  build: COMMUNITY_BUILD,
  releaseChannel: 'Community Alpha',
  repositoryUrl: '',
  issuesUrl: '',
  projectHomepage: ''
};

const DEVICE_VERIFICATION = {
  standard:{status:'spec',label:'OFFICIAL ART + SPEC',detail:'Official Elgato device-preview artwork with DeckLab SDK/control modelling. Physical hardware comparison still wanted.'},
  scissor:{status:'spec',label:'SPEC MODEL',detail:'Modelled from published device/SDK specifications. Community hardware comparison wanted.'},
  mini:{status:'spec',label:'OFFICIAL ART + SPEC',detail:'Official Elgato device-preview artwork with DeckLab SDK/control modelling. Physical hardware comparison still wanted.'},
  xl:{status:'spec',label:'OFFICIAL ART + SPEC',detail:'Official Elgato device-preview artwork with DeckLab SDK/control modelling. Physical hardware comparison still wanted.'},
  plus:{status:'spec',label:'OFFICIAL ART + SPEC',detail:'Official Elgato device-preview artwork; Keypad, Encoder and touch behaviour remain DeckLab SDK models. Hardware comparison wanted.'},
  neo:{status:'spec',label:'OFFICIAL ART + SPEC',detail:'Official Elgato device-preview artwork. SDK Infobar layouts use 232×50; artwork guidance uses 248×58 with a 232×42 safe area. Hardware comparison wanted.'},
  galleon:{status:'experimental',label:'SPEC / EXPERIMENTAL',detail:'Modelled from current published information; physical-device comparison is especially valuable.'},
  plusxl:{status:'experimental',label:'OFFICIAL ART · SDK MODEL',detail:'Official Elgato preview artwork with DeckLab SDK behaviour modelling; physical-device validation remains especially valuable.'},
  mobile:{status:'spec',label:'SPEC MODEL',detail:'Custom-grid behaviour modelled from published Stream Deck Mobile Pro limits. Device/app comparison wanted.'},
  virtual:{status:'spec',label:'SPEC MODEL',detail:'Modelled from the published Virtual Stream Deck device type and grid limits.'},
  scimitar:{status:'experimental',label:'SPEC / INPUT-ONLY',detail:'Action triggering is modelled from published integration behaviour; community comparison wanted.'},
  xeneon:{status:'experimental',label:'SPEC / EXPERIMENTAL',detail:'Stream Deck widget surface is modelled from published XENEON EDGE behaviour; community comparison wanted.'},
  pedal:{status:'spec',label:'SPEC / INPUT-ONLY',detail:'Keypad action triggering is modelled from published Pedal behaviour; community comparison wanted.'},
  studio:{status:'separate',label:'OFFICIAL ART · SEPARATE HOST',detail:'Official Elgato rackmount artwork. Studio remains a Bitfocus Buttons / Companion target rather than claiming normal Stream Deck app parity.'}
};

function communityEscape(s){return escapeHtml(String(s??''));}
function communityNow(){return new Date().toISOString();}
function communitySlug(s='decklab-bugreport'){return String(s||'decklab-bugreport').replace(/[^a-z0-9-_]+/gi,'-').replace(/^-+|-+$/g,'').toLowerCase()||'decklab-bugreport';}
function communityDownload(filename,blob){const a=document.createElement('a');const url=URL.createObjectURL(blob);a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

function communitySanitizeString(value){
  let s=String(value ?? '');
  s=s.replace(/[A-Za-z]:\\Users\\[^\\\r\n"']+/gi,'<redacted-user-path>');
  s=s.replace(/\/Users\/[^\/\r\n"']+/g,'<redacted-user-path>');
  s=s.replace(/\/home\/[^\/\r\n"']+/g,'<redacted-user-path>');
  s=s.replace(/\\\\[^\\\r\n]+\\[^\\\r\n]+/g,'<redacted-network-path>');
  s=s.replace(/([?&](?:token|access_token|api[_-]?key|secret|password|auth|code)=)[^&\s]+/gi,'$1<redacted>');
  return s;
}
function communitySanitize(value,keyName=''){
  if(value===null||value===undefined)return value;
  if(/(?:password|passwd|secret|token|api.?key|authorization|cookie|session.?id)/i.test(keyName))return '<redacted>';
  if(typeof value==='string')return communitySanitizeString(value);
  if(Array.isArray(value))return value.map(v=>communitySanitize(v,keyName));
  if(typeof value==='object'){
    const out={};
    for(const [k,v] of Object.entries(value)){
      if(/^(?:notes|projectNotes)$/i.test(k))continue;
      out[k]=communitySanitize(v,k);
    }
    return out;
  }
  return value;
}
function communityPluginSnapshot(){
  const m=pluginState?.manifest;
  if(!m)return null;
  const actions=(Array.isArray(m.Actions)?m.Actions:[]).map(a=>({
    Name:a.Name??null, UUID:a.UUID??null, Icon:a.Icon??null,
    Controllers:communitySanitize(a.Controllers??null), States:communitySanitize(a.States??null),
    Encoder:communitySanitize(a.Encoder??null), PropertyInspectorPath:a.PropertyInspectorPath??null,
    SupportedInMultiActions:a.SupportedInMultiActions??null, VisibleInActionsList:a.VisibleInActionsList??null
  }));
  return communitySanitize({Name:m.Name||null,UUID:m.UUID||null,Version:m.Version||null,SDKVersion:m.SDKVersion??null,Actions:actions});
}
function communityProfileSnapshot(){
  try{
    const p=typeof profileSerializableData==='function'?profileSerializableData():dl10CurrentProfile?.();
    return communitySanitize(p||null);
  }catch(_){return null;}
}
function communityEnvironment(){
  return {
    generatedAt:communityNow(),
    deckLabVersion:COMMUNITY_VERSION,
    build:COMMUNITY_BUILD,
    browser:{userAgent:navigator.userAgent,language:navigator.language,languages:navigator.languages||[],platform:navigator.platform||null,cookieEnabled:navigator.cookieEnabled},
    display:{viewport:{width:innerWidth,height:innerHeight},screen:{width:screen?.width||null,height:screen?.height||null},devicePixelRatio:devicePixelRatio||1},
    runtime:{protocol:location.protocol,hostname:location.hostname,companionConnected:!!liveState?.companionConnected,pluginConnected:!!liveState?.pluginConnected},
    omitted:['IP address','precise location','browser storage contents not listed below','plugin executable bytes','project notes','known secret/token/password fields']
  };
}
function communitySanitizedProject(){
  let obj=null;
  try{obj=dl10ProjectObject();}catch(_){obj={format:'DeckLabProject',version:'1.0'};}
  obj=communitySanitize(obj);
  if(obj?.project)obj.project.notes='[omitted from bug report]';
  if(obj)obj.plugin=communityPluginSnapshot();
  if(obj)obj.profile=communityProfileSnapshot();
  return obj;
}
function communityProtocolBundle(){
  return communitySanitize({
    devicePreviewEvents:typeof events!=='undefined'?events:[],
    layoutEvents:typeof layoutEvents!=='undefined'?layoutEvents:[],
    hostProtocol:hostState?.events||[],
    propertyInspector:hostState?.piEvents||[],
    profileLifecycle:profileState?.events||[],
    qaTrace:typeof testState!=='undefined'?testState.trace||[]:[],
    companionConsole:liveState?.processLines||[]
  });
}
function communityQaSnapshot(){
  try{return typeof testState!=='undefined'&&testState.results?.length?communitySanitize(testReportObject()):{note:'No QA run was available when this bug report was created.'};}
  catch(err){return {note:'QA report unavailable',error:communitySanitizeString(err.message)};}
}
function communityCompatibilitySnapshot(){
  try{return profileState?.placements?.length?communitySanitize(profileCompatibilityReport()):{note:'No populated profile was available when this bug report was created.'};}
  catch(err){return {note:'Compatibility report unavailable',error:communitySanitizeString(err.message)};}
}
function communityReportMetadata(){
  const d=typeof profileDevice==='function'?profileDevice():DEVICES[currentDeviceKey]||null;
  return communitySanitize({
    '$schema':'https://decklab.local/schemas/decklab-bug-report.schema.json',format:'DeckLabBugReport',version:'1.0',appVersion:COMMUNITY_VERSION,build:COMMUNITY_BUILD,generatedAt:communityNow(),
    workspace:typeof currentMode==='string'?currentMode:null,
    targetDevice:{key:profileState?.target||currentDeviceKey||null,name:d?.name||null,type:d?.type??null},
    plugin:communityPluginSnapshot(),
    status:{companionConnected:!!liveState?.companionConnected,pluginConnected:!!liveState?.pluginConnected,profileConnected:!!profileState?.connected},
    privacy:'Sanitized diagnostic bundle. Project notes and common secret/token/password fields are omitted; common personal filesystem prefixes are redacted.'
  });
}

/* Minimal uncompressed ZIP writer; avoids external libraries/network access. */
let communityCrcTable=null;
function communityCrc32(bytes){
  if(!communityCrcTable){communityCrcTable=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;communityCrcTable[n]=c>>>0;}}
  let c=0xffffffff;for(const b of bytes)c=communityCrcTable[(c^b)&0xff]^(c>>>8);return (c^0xffffffff)>>>0;
}
function communityU16(v){return new Uint8Array([v&255,(v>>>8)&255]);}
function communityU32(v){return new Uint8Array([v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255]);}
function communityConcat(parts){let n=0;parts.forEach(p=>n+=p.length);const out=new Uint8Array(n);let o=0;for(const p of parts){out.set(p,o);o+=p.length;}return out;}
function communityDosDateTime(date=new Date()){
  const year=Math.max(1980,date.getFullYear());
  const time=((date.getHours()&31)<<11)|((date.getMinutes()&63)<<5)|((Math.floor(date.getSeconds()/2))&31);
  const day=((year-1980)<<9)|((date.getMonth()+1)<<5)|date.getDate();
  return {time,day};
}
function communityZipTextFiles(files){
  const enc=new TextEncoder(),locals=[],centrals=[];let offset=0;const dt=communityDosDateTime();
  for(const file of files){
    const name=enc.encode(file.name),data=enc.encode(file.text),crc=communityCrc32(data),flags=0x0800;
    const local=communityConcat([communityU32(0x04034b50),communityU16(20),communityU16(flags),communityU16(0),communityU16(dt.time),communityU16(dt.day),communityU32(crc),communityU32(data.length),communityU32(data.length),communityU16(name.length),communityU16(0),name,data]);
    locals.push(local);
    const central=communityConcat([communityU32(0x02014b50),communityU16(20),communityU16(20),communityU16(flags),communityU16(0),communityU16(dt.time),communityU16(dt.day),communityU32(crc),communityU32(data.length),communityU32(data.length),communityU16(name.length),communityU16(0),communityU16(0),communityU16(0),communityU16(0),communityU32(0),communityU32(offset),name]);
    centrals.push(central);offset+=local.length;
  }
  const centralData=communityConcat(centrals),localData=communityConcat(locals);
  const end=communityConcat([communityU32(0x06054b50),communityU16(0),communityU16(0),communityU16(files.length),communityU16(files.length),communityU32(centralData.length),communityU32(localData.length),communityU16(0)]);
  return new Blob([localData,centralData,end],{type:'application/zip'});
}

function createCommunityBugReport(){
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  const meta=communityReportMetadata();
  const files=[
    {name:'README.txt',text:[
      'DeckLab Community Alpha sanitized bug report',
      `DeckLab ${COMMUNITY_VERSION} · ${COMMUNITY_BUILD}`,
      '',
      'This bundle is created locally in your browser. It contains diagnostic JSON only.',
      'It does not intentionally include plugin executable files, project notes, IP/precise location, or common secret/token/password fields.',
      'Common user-home filesystem prefixes are redacted. Review the files before posting publicly.',
      '',
      'Please attach a screenshot separately when the issue is visual.'
    ].join('\n')},
    {name:'report.json',text:JSON.stringify(meta,null,2)},
    {name:'version.txt',text:`DeckLab ${COMMUNITY_VERSION}\nBuild ${COMMUNITY_BUILD}\nChannel Community Alpha\n`},
    {name:'browser-environment.json',text:JSON.stringify(communitySanitize(communityEnvironment()),null,2)},
    {name:'project-sanitized.json',text:JSON.stringify(communitySanitizedProject(),null,2)},
    {name:'compatibility-report.json',text:JSON.stringify(communityCompatibilitySnapshot(),null,2)},
    {name:'qa-report.json',text:JSON.stringify(communityQaSnapshot(),null,2)},
    {name:'protocol-log.json',text:JSON.stringify(communityProtocolBundle(),null,2)}
  ];
  const blob=communityZipTextFiles(files);
  const file=`decklab-bugreport-${stamp}.zip`;
  communityDownload(file,blob);
  communityToast(`Created ${file}. Review it before attaching publicly; add a screenshot separately for visual issues.`);
}

function communityToast(message){
  let t=document.getElementById('communityToast');
  if(!t){t=document.createElement('div');t.id='communityToast';t.className='community-toast';document.body.appendChild(t);}
  t.textContent=message;t.classList.add('show');clearTimeout(communityToast._timer);communityToast._timer=setTimeout(()=>t.classList.remove('show'),5200);
}

function communityVerificationBadge(deviceKey){
  const v=DEVICE_VERIFICATION[deviceKey]||{status:'experimental',label:'UNVERIFIED'};
  const span=document.createElement('span');span.className=`device-verification-badge ${v.status}`;span.textContent=v.label;span.title=v.detail||'';return span;
}
function decoratePluginCompatibility(){
  const cards=[...document.querySelectorAll('#compatMatrix .compat-card')];
  cards.forEach((card,i)=>{const key=PLUGIN_TARGET_ORDER[i];if(!key||card.querySelector('.device-verification-badge'))return;card.querySelector('.compat-card-top')?.appendChild(communityVerificationBadge(key));});
}
function decorateProfileCompatibility(){
  const buttons=[...document.querySelectorAll('#profileCompatMatrix .profile-compat-target')];
  buttons.forEach((button,i)=>{const key=PLUGIN_TARGET_ORDER.filter(k=>DEVICES[k])[i];if(!key||button.querySelector('.device-verification-badge'))return;button.querySelector('.compat-target-top')?.appendChild(communityVerificationBadge(key));});
  const selected=profileState?.compatTarget;if(selected&&$('profileCompatTargetTitle')){
    const title=$('profileCompatTargetTitle');if(!title.parentElement?.querySelector('.device-verification-detail')){
      const v=DEVICE_VERIFICATION[selected];const n=document.createElement('div');n.className='device-verification-detail';n.textContent=v?.detail||'Hardware verification status not recorded.';title.parentElement.appendChild(n);
    }else title.parentElement.querySelector('.device-verification-detail').textContent=DEVICE_VERIFICATION[selected]?.detail||'Hardware verification status not recorded.';
  }
}

function communityInsertUi(){
  const toolbar=document.getElementById('projectToolbar');
  if(toolbar&&!document.getElementById('communityBugBtn')){
    const bug=document.createElement('button');bug.id='communityBugBtn';bug.className='secondary';bug.type='button';bug.textContent='Create bug report';bug.addEventListener('click',createCommunityBugReport);
    const about=document.createElement('button');about.id='communityAboutBtn';about.className='secondary';about.type='button';about.textContent='About';about.addEventListener('click',()=>communityShowAbout(true));
    toolbar.insertBefore(bug,toolbar.firstChild);toolbar.insertBefore(about,bug);
  }
  const grid=document.querySelector('.project-grid');
  if(grid&&!document.getElementById('communityAlphaCard')){
    const card=document.createElement('article');card.id='communityAlphaCard';card.className='runtime-card project-card community-alpha-card';
    card.innerHTML=`<div class="runtime-card-heading"><div><div class="tiny-label">COMMUNITY ALPHA</div><h3>Help validate DeckLab on real hardware</h3></div><span class="compat-pill partial">${communityEscape(COMMUNITY_VERSION)}</span></div><p class="hint">DeckLab combines official preview artwork where licensed/available with specification-based interaction models. Community comparisons with physical hardware are intentionally tracked separately from spec support.</p><div class="community-stat-row"><div><strong id="communitySpecCount">0</strong><span>modeled targets</span></div><div><strong>0</strong><span>hardware-verified in bundle</span></div></div><div class="project-card-actions"><button id="communityCardBugBtn" class="primary" type="button">Create sanitized bug report</button><button id="communityRepoBtn" class="secondary" type="button">Community repository</button></div><div id="communityRepoHint" class="hint community-repo-hint"></div>`;
    grid.appendChild(card);
    card.querySelector('#communityCardBugBtn').addEventListener('click',createCommunityBugReport);
    card.querySelector('#communitySpecCount').textContent=String(Object.keys(DEVICE_VERIFICATION).length);
    card.querySelector('#communityRepoBtn').addEventListener('click',communityOpenRepo);
  }
  if(!document.getElementById('communityAboutOverlay')){
    const wrap=document.createElement('div');wrap.id='communityAboutOverlay';wrap.className='onboarding-overlay hidden';wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');
    wrap.innerHTML=`<div class="onboarding-card community-about-card"><button id="communityAboutClose" class="community-modal-close" type="button" aria-label="Close">×</button><div class="tiny-label">COMMUNITY ALPHA BUILD</div><h2>DeckLab ${communityEscape(COMMUNITY_VERSION)}</h2><p>Independent Stream Deck development simulator and plugin QA studio. Not affiliated with, endorsed by, or supported by Elgato or CORSAIR.</p><div class="community-about-grid"><div><span>Build</span><strong>${communityEscape(COMMUNITY_BUILD)}</strong></div><div><span>Telemetry</span><strong>None</strong></div><div><span>Local bridge</span><strong>127.0.0.1 only</strong></div><div><span>Plugin launch</span><strong>Manual only</strong></div></div><h3>Official preview artwork</h3><p class="hint">Stream Deck Templates by Elgato and Will Johnson are used under CC BY 4.0. DeckLab crops, resizes and composites this artwork; its own source code is MPL 2.0. See <a href="THIRD-PARTY-NOTICES.md" target="_blank" rel="noopener">Third-Party Notices</a>. DeckLab adds live LCD content, interaction overlays, scaling, and editor hit-zones. This use does not imply endorsement by Elgato or CORSAIR.</p><h3>Privacy & diagnostics</h3><p class="hint">DeckLab does not send telemetry. The optional bug-report exporter creates a ZIP locally in your browser and omits project notes, common secret/token/password fields, plugin executables, IP/precise location, and common user-home path prefixes. Always review a report before posting it publicly.</p><div class="onboarding-choice-row"><button id="communityAboutBug" class="primary" type="button">Create bug report</button><button id="communityAboutRepo" class="secondary" type="button">Open community repository</button></div><p id="communityAboutRepoHint" class="hint"></p></div>`;
    document.body.appendChild(wrap);
    wrap.querySelector('#communityAboutClose').addEventListener('click',()=>communityShowAbout(false));
    wrap.addEventListener('click',e=>{if(e.target===wrap)communityShowAbout(false);});
    wrap.querySelector('#communityAboutBug').addEventListener('click',createCommunityBugReport);
    wrap.querySelector('#communityAboutRepo').addEventListener('click',communityOpenRepo);
  }
}
function communityShowAbout(show){document.getElementById('communityAboutOverlay')?.classList.toggle('hidden',!show);}
function communityRepoUrl(){return communityConfig.issuesUrl||communityConfig.repositoryUrl||communityConfig.projectHomepage||'';}
function communityOpenRepo(){const u=communityRepoUrl();if(u)window.open(u,'_blank','noopener');else communityToast('Community repository URL is not configured yet. Set repositoryUrl in community-config.json before publishing.');}
function communityUpdateRepoUi(){
  const configured=!!communityRepoUrl();
  for(const id of ['communityRepoBtn','communityAboutRepo']){const b=document.getElementById(id);if(b){b.disabled=!configured;b.title=configured?communityRepoUrl():'Set repositoryUrl in community-config.json';}}
  const msg=configured?`Feedback: ${communityRepoUrl()}`:'Before publishing, set repositoryUrl (and optionally issuesUrl) in community-config.json.';
  for(const id of ['communityRepoHint','communityAboutRepoHint']){const n=document.getElementById(id);if(n)n.textContent=msg;}
}
async function communityLoadConfig(){
  try{const r=await fetch(`community-config.json?b=${encodeURIComponent(COMMUNITY_BUILD)}`,{cache:'no-store'});if(r.ok)communityConfig={...communityConfig,...await r.json()};}catch(_){/* file:// or unavailable: use defaults */}
  communityUpdateRepoUi();
}

function communityAlphaFirstRun(){
  let acknowledged=false;try{acknowledged=localStorage.getItem(COMMUNITY_NOTICE_KEY)==='ack';}catch(_){}
  if(acknowledged)return;
  try{localStorage.setItem(COMMUNITY_NOTICE_KEY,'ack');}catch(_){}
  communityToast('Community Alpha: experimental software, no telemetry, and no automatic plugin execution. Please report hardware differences with screenshots + a sanitized bug report.');
}

// Wrap existing compatibility renderers after all prior scripts have loaded.
try{
  const baseRenderCompatibility=renderCompatibility;
  renderCompatibility=function(action){baseRenderCompatibility(action);decoratePluginCompatibility();};
}catch(_){}
try{
  const baseRenderProfileCompatibility=renderProfileCompatibility;
  renderProfileCompatibility=function(){baseRenderProfileCompatibility();decorateProfileCompatibility();};
}catch(_){}

(function bootCommunityAlpha(){
  communityInsertUi();
  communityLoadConfig();
  communityAlphaFirstRun();
  // Update release-visible labels that intentionally do not affect 1.0 schema versions.
  document.querySelectorAll('.tiny-label').forEach(el=>{if(el.textContent.trim()==='DECKLAB 1.0')el.textContent='DECKLAB 1.3.9 COMMUNITY ALPHA';});
  if(document.title.includes('DeckLab 1.0'))document.title=document.title.replace('DeckLab 1.0','DeckLab 1.3.9 Community Alpha');
})();
