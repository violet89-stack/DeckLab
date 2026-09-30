// SPDX-License-Identifier: MPL-2.0
/* ----------------------------- DECKLAB 1.0 RELEASE STUDIO ----------------------------- */

const DECKLAB_VERSION = '1.3.12-alpha.34';
const PROJECT_STORAGE_KEY = 'decklab.project.autosave.v10';
const ONBOARDING_KEY = 'decklab.onboarding.v10';

const project10State = {
  id: `project-${Date.now()}`,
  name: 'Untitled DeckLab Project',
  notes: '',
  createdAt: new Date().toISOString(),
  modifiedAt: new Date().toISOString(),
  lastSavedAt: null,
  qaHistory: [],
  relinkNeeded: false,
  sourceFile: null,
  lastDigest: '',
  lastRecordedQaRunId: null,
  activeComparison: null,
  restoring: false
};

function dl10SafeJson(value, fallback=null){
  try { return JSON.parse(JSON.stringify(value)); } catch (_) { return fallback; }
}
function dl10DateLabel(iso){
  if(!iso) return '—';
  const d=new Date(iso); if(Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString([], {year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
}
function dl10Slug(s='project'){return String(s||'project').trim().replace(/[^a-z0-9-_]+/gi,'-').replace(/^-+|-+$/g,'').toLowerCase()||'project';}
function dl10CurrentPluginSnapshot(){
  const m=pluginState?.manifest;
  if(!m) return null;
  return {
    uuid:m.UUID||null,
    name:m.Name||null,
    version:m.Version||null,
    sdkVersion:m.SDKVersion??null,
    rootName:pluginState.rootName||null,
    manifest:dl10SafeJson(m,{}),
    assetsEmbedded:false
  };
}
function dl10CurrentProfile(){
  try { return typeof profileSerializableData==='function' ? profileSerializableData() : null; }
  catch(_) { return null; }
}
function dl10ProjectObject(){
  const now=new Date().toISOString();
  return {
    $schema:'https://decklab.local/schemas/decklab-project.schema.json',
    format:'DeckLabProject',
    version:'1.0',
    schemaVersion:'1.0',
    appVersion:DECKLAB_VERSION,
    id:project10State.id,
    createdAt:project10State.createdAt,
    modifiedAt:now,
    project:{name:project10State.name,notes:project10State.notes},
    plugin:dl10CurrentPluginSnapshot(),
    profile:dl10CurrentProfile(),
    qaHistory:dl10SafeJson(project10State.qaHistory,[]),
    security:{automaticProcessLaunch:false,bridge:'127.0.0.1:8975',externalPluginsRequireManualLaunch:true}
  };
}
function dl10ProjectDigest(){
  const obj=dl10ProjectObject();
  obj.modifiedAt='';
  if(obj.profile){ delete obj.profile.deviceId; }
  try{return JSON.stringify(obj);}catch(_){return '';}
}
function projectScheduleSave(){
  if(project10State.restoring) return;
  const digest=dl10ProjectDigest();
  if(!digest || digest===project10State.lastDigest) return;
  project10State.lastDigest=digest;
  project10State.modifiedAt=new Date().toISOString();
  project10State.lastSavedAt=project10State.modifiedAt;
  try{
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(dl10ProjectObject()));
    const b=$('projectAutosaveBadge'); if(b){b.textContent='autosaved';b.classList.add('profile-autosave-flash');setTimeout(()=>b.classList.remove('profile-autosave-flash'),500);}
    const t=$('projectSaveStatusTop'); if(t)t.textContent='Project autosaved';
  }catch(err){
    const b=$('projectAutosaveBadge'); if(b){b.textContent='save failed';b.classList.remove('online');b.classList.add('offline');}
    const t=$('projectSaveStatusTop'); if(t)t.textContent=`Autosave failed: ${err.message}`;
  }
  if(currentMode==='project') renderProjectStudio();
}

function renderProjectStudio(){
  if(!$('projectDashboardTitle')) return;
  const m=pluginState?.manifest;
  const d=typeof profileDevice==='function'?profileDevice():null;
  $('projectDashboardTitle').textContent=project10State.name;
  $('projectNameInput').value=project10State.name;
  $('projectNotesInput').value=project10State.notes;
  $('projectLastSaved').textContent=dl10DateLabel(project10State.lastSavedAt||project10State.modifiedAt);
  $('projectPluginName').textContent=m?.Name||'No plugin loaded';
  const pluginPill=$('projectPluginState');
  if(m){
    pluginPill.textContent=project10State.relinkNeeded?'RELINK':'LOADED';
    pluginPill.className=`compat-pill ${project10State.relinkNeeded?'partial':'yes'}`;
    $('projectPluginMeta').textContent=`${m.UUID||'No UUID'} · v${m.Version||'—'} · SDK ${m.SDKVersion??'—'} · ${m.Actions?.length||0} actions`;
  } else {
    pluginPill.textContent='EMPTY'; pluginPill.className='compat-pill partial';
    $('projectPluginMeta').textContent='Import a plugin package in Plugin Lab, or use the built-in demo.';
  }
  $('projectRelinkNotice').classList.toggle('hidden',!project10State.relinkNeeded);
  $('projectProfileName').textContent=$('profileName')?.value||'DeckLab Profile';
  $('projectProfileTarget').textContent=d?.name||'—';
  $('projectProfileTarget').className='compat-pill yes';
  $('projectPlacementCount').textContent=String(profileState?.placements?.length||0);
  $('projectPageCount').textContent=String(profileState?.pages?.length||1);
  $('projectContextCount').textContent=String(typeof profileAllRuntimeInstances==='function'?profileAllRuntimeInstances().length:0);
  $('projectQaCountBadge').textContent=`${project10State.qaHistory.length} RUN${project10State.qaHistory.length===1?'':'S'}`;
  const last=project10State.qaHistory.at(-1);
  if(last){
    const s=last.report?.summary||{};
    $('projectQaSummary').innerHTML=`<strong>${escapeHtml(last.plugin?.name||'Plugin')}</strong><br>${escapeHtml(dl10DateLabel(last.at))}<br><span class="qa-inline pass">${s.pass||0} pass</span> · <span class="qa-inline warn">${s.warn||0} warn</span> · <span class="qa-inline fail">${s.fail||0} fail</span> · ${s.skip||0} skipped`;
  } else $('projectQaSummary').textContent='No QA runs have been recorded for this project yet.';
}

function dl10ResetProject({keepPlugin=true}={}){
  if(!confirm('Start a new DeckLab project? The current project is autosaved locally, but this will reset the working profile and QA history.'))return;
  project10State.restoring=true;
  project10State.id=`project-${Date.now()}`;
  project10State.name='Untitled DeckLab Project'; project10State.notes='';
  project10State.createdAt=new Date().toISOString(); project10State.modifiedAt=project10State.createdAt; project10State.lastSavedAt=null;
  project10State.qaHistory=[]; project10State.relinkNeeded=false; project10State.sourceFile=null; project10State.lastDigest=''; project10State.activeComparison=null;
  try{ if(typeof resetProfileSession==='function')resetProfileSession({target:'standard',emit:false,preserveHistory:true}); }catch(_){}
  if(!keepPlugin && pluginState){pluginState.manifest=null;pluginState.files.clear();pluginState.fileList=[];pluginState.layouts=[];pluginState.selectedActionIndex=-1;pluginState.warnings=[];}
  project10State.restoring=false; renderProjectStudio(); renderQaHistory(); projectScheduleSave();
}
function exportDeckLabProject(){
  project10State.modifiedAt=new Date().toISOString(); project10State.lastSavedAt=project10State.modifiedAt;
  const obj=dl10ProjectObject();
  downloadText(`${dl10Slug(project10State.name)}.decklab-project.json`,JSON.stringify(obj,null,2));
  projectScheduleSave();
}
function dl10LoadManifestSnapshot(snapshot){
  if(!snapshot?.manifest) return;
  try{ clearPluginUrls(); }catch(_){}
  pluginState.manifest=dl10SafeJson(snapshot.manifest,{});
  pluginState.files.clear(); pluginState.fileList=[]; pluginState.layouts=[]; pluginState.urls=new Map();
  pluginState.rootPrefix=''; pluginState.rootName=snapshot.rootName||`${snapshot.uuid||'plugin'}.sdPlugin`;
  pluginState.selectedActionIndex=Array.isArray(pluginState.manifest?.Actions)&&pluginState.manifest.Actions.length?0:-1;
  pluginState.warnings=validatePluginPackage();
  project10State.relinkNeeded=true;
  try{renderPluginLab();}catch(_){}
}
async function importDeckLabProjectObject(obj,{fromAutosave=false}={}){
  if(!obj||obj.format!=='DeckLabProject')throw new Error('This is not a DeckLab project file.');
  project10State.restoring=true;
  project10State.id=obj.id||`project-${Date.now()}`;
  project10State.name=obj.project?.name||'Imported DeckLab Project';
  project10State.notes=obj.project?.notes||'';
  project10State.createdAt=obj.createdAt||new Date().toISOString(); project10State.modifiedAt=obj.modifiedAt||new Date().toISOString();
  project10State.lastSavedAt=obj.modifiedAt||obj.createdAt||null; project10State.qaHistory=Array.isArray(obj.qaHistory)?obj.qaHistory.slice(-20):[];
  project10State.sourceFile=fromAutosave?'local autosave':null; project10State.relinkNeeded=false;
  const wantedUuid=obj.plugin?.uuid||obj.plugin?.manifest?.UUID||null;
  const currentUuid=pluginState.manifest?.UUID||null;
  try{
    if(wantedUuid==='com.decklab.hostdemo' && currentUuid!==wantedUuid){await loadSamplePlugin();project10State.relinkNeeded=false;}
    else if(obj.plugin?.manifest && currentUuid!==wantedUuid){dl10LoadManifestSnapshot(obj.plugin);}
    else if(wantedUuid && currentUuid===wantedUuid){project10State.relinkNeeded=pluginState.fileList.length===0;}
    if(obj.profile && typeof importDeckLabProfileData==='function')await importDeckLabProfileData(obj.profile,{autosave:true});
  } finally { project10State.restoring=false; }
  project10State.lastDigest=dl10ProjectDigest();
  renderProjectStudio(); renderQaHistory(); projectScheduleSave();
}
async function importDeckLabProjectFile(file){
  try{const obj=JSON.parse(await file.text()); await importDeckLabProjectObject(obj);project10State.sourceFile=file.name;switchMode('project');}
  catch(err){alert(`Project import failed: ${err.message}`);}
}
async function restoreProjectAutosave(){
  try{const raw=localStorage.getItem(PROJECT_STORAGE_KEY);if(!raw)return false;await importDeckLabProjectObject(JSON.parse(raw),{fromAutosave:true});return true;}catch(err){console.warn('DeckLab project autosave could not be restored',err);return false;}
}

/* ----------------------------- QA HISTORY / REGRESSION ----------------------------- */
function qaHistoryKey(r){return [r.actionUuid||'',r.targetKey||'',r.check||'',r.mode||''].join('|');}
function qaStatusRank(s){return s==='pass'?0:s==='warn'?1:s==='fail'?2:null;}
function makeQaHistoryEntry(report){
  return {id:`qa-run-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,at:new Date().toISOString(),plugin:dl10SafeJson(report.plugin,{}),report:dl10SafeJson(report,{})};
}
function recordCurrentQaRun(){
  if(typeof testState==='undefined'||testState.running||!testState.results?.length)return;
  if(project10State.lastRecordedQaRunId===testState.runId)return;
  const report=testReportObject(); report.version='1.0';report.schemaVersion='1.0';report.$schema='https://decklab.local/schemas/decklab-qa-report.schema.json';
  project10State.qaHistory.push(makeQaHistoryEntry(report));
  project10State.qaHistory=project10State.qaHistory.slice(-20);
  project10State.lastRecordedQaRunId=testState.runId;
  project10State.activeComparison=null;
  renderQaHistory(); projectScheduleSave(); renderProjectStudio();
}
function compareQaReports(baseEntry,currentEntry){
  const base=baseEntry?.report?.results||[],cur=currentEntry?.report?.results||[];
  const b=new Map(base.map(r=>[qaHistoryKey(r),r])),c=new Map(cur.map(r=>[qaHistoryKey(r),r]));
  const keys=new Set([...b.keys(),...c.keys()]); const rows=[]; const summary={regressions:0,fixed:0,unchanged:0,newChanged:0};
  for(const key of keys){
    const before=b.get(key)||null,after=c.get(key)||null;let kind='changed';
    if(!before||!after){kind='changed';summary.newChanged++;}
    else if(before.status===after.status){kind='unchanged';summary.unchanged++;}
    else {
      const br=qaStatusRank(before.status),ar=qaStatusRank(after.status);
      if(br!==null&&ar!==null&&ar>br){kind='regression';summary.regressions++;}
      else if(br!==null&&ar!==null&&ar<br){kind='fixed';summary.fixed++;}
      else {kind='changed';summary.newChanged++;}
    }
    rows.push({key,kind,before,after});
  }
  rows.sort((a,b)=>({regression:0,fixed:1,changed:2,unchanged:3}[a.kind]-{regression:0,fixed:1,changed:2,unchanged:3}[b.kind]));
  return {format:'DeckLabQAComparison',version:'1.0',generatedAt:new Date().toISOString(),baseline:{id:baseEntry?.id,at:baseEntry?.at,plugin:baseEntry?.plugin},compare:{id:currentEntry?.id,at:currentEntry?.at,plugin:currentEntry?.plugin},summary,rows};
}
function qaHistoryOptionLabel(entry,i){const s=entry.report?.summary||{};return `${i+1}. ${dl10DateLabel(entry.at)} · ${s.pass||0}P ${s.warn||0}W ${s.fail||0}F`;}
function renderQaHistory(){
  const bsel=$('qaBaselineSelect'),csel=$('qaCompareSelect'); if(!bsel||!csel)return;
  const hist=project10State.qaHistory;
  const oldB=bsel.value,oldC=csel.value;bsel.innerHTML='';csel.innerHTML='';
  hist.forEach((e,i)=>{for(const sel of [bsel,csel]){const o=document.createElement('option');o.value=e.id;o.textContent=qaHistoryOptionLabel(e,i);sel.appendChild(o);}});
  if(hist.length){
    bsel.value=hist.some(x=>x.id===oldB)?oldB:(hist.at(-2)?.id||hist[0].id);
    csel.value=hist.some(x=>x.id===oldC)?oldC:hist.at(-1).id;
    if(hist.length>=2 && bsel.value===csel.value){bsel.value=hist.at(-2).id;csel.value=hist.at(-1).id;}
  }
  $('qaHistoryCount').textContent=`${hist.length} RUN${hist.length===1?'':'S'}`;
  const enough=hist.length>=2;$('qaHistoryEmpty').classList.toggle('hidden',enough);$('qaComparisonBody').classList.toggle('hidden',!enough);
  $('qaCompareBtn').disabled=!enough;$('qaExportComparisonBtn').disabled=!enough;
  if(enough) renderQaComparison();
}
function renderQaComparison(){
  const hist=project10State.qaHistory;if(hist.length<2)return;
  const base=hist.find(x=>x.id===$('qaBaselineSelect').value)||hist.at(-2),cur=hist.find(x=>x.id===$('qaCompareSelect').value)||hist.at(-1);
  const cmp=compareQaReports(base,cur);project10State.activeComparison=cmp;
  $('qaRegressionCount').textContent=cmp.summary.regressions;$('qaFixedCount').textContent=cmp.summary.fixed;$('qaUnchangedCount').textContent=cmp.summary.unchanged;$('qaNewCount').textContent=cmp.summary.newChanged;
  const host=$('qaComparisonList');host.innerHTML='';
  const interesting=cmp.rows.filter(r=>r.kind!=='unchanged');
  if(!interesting.length){host.innerHTML='<div class="qa-no-change">No result-status changes between these runs.</div>';return;}
  for(const row of interesting.slice(0,60)){
    const ref=row.after||row.before;const div=document.createElement('div');div.className=`qa-compare-row ${row.kind}`;
    const before=row.before?.status?.toUpperCase()||'—',after=row.after?.status?.toUpperCase()||'—';
    div.innerHTML=`<span class="qa-change-kind">${escapeHtml(row.kind.toUpperCase())}</span><div><strong>${escapeHtml(ref?.actionName||'Check')}</strong><span>${escapeHtml(ref?.targetName||ref?.targetKey||'—')} · ${escapeHtml(ref?.check||'—')}</span></div><code>${before} → ${after}</code>`;
    host.appendChild(div);
  }
}
function exportQaComparison(){
  if(!project10State.activeComparison)renderQaComparison();if(!project10State.activeComparison)return;
  downloadText(`${dl10Slug(project10State.name)}.qa-comparison.json`,JSON.stringify(project10State.activeComparison,null,2));
}

/* ----------------------------- ONBOARDING ----------------------------- */
const onboardingSlides=[
  {title:'DeckLab 1.3.12 Community Alpha',body:'This is experimental community-testing software. DeckLab is an independent project, not affiliated with Elgato or CORSAIR. It has no telemetry and never launches imported plugin executables; only start third-party plugin code you trust.',icon:'◇'},
  {title:'Safe by design',body:'DeckLab never launches plugin executables. Static inspection works entirely in the browser. For live SDK tests, you explicitly start a trusted plugin yourself and it connects to the localhost bridge.',icon:'⌾'},
  {title:'One device workspace',body:'Choose a device once, then Preview, Build, Test and Inspect around that same hardware surface. Advanced SDK tools stay out of the way until you ask for them.',icon:'▦'},
  {title:'QA with a memory',body:'Test Suite now keeps project QA history. Run the same plugin again after a change and DeckLab can show regressions, fixes and newly testable checks.',icon:'✓'}
];
let onboardingIndex=0;
function renderOnboarding(){
  const s=onboardingSlides[onboardingIndex];if(!s)return;
  $('onboardingContent').innerHTML=`<div class="onboarding-icon">${s.icon}</div><div class="tiny-label">STEP ${onboardingIndex+1} OF ${onboardingSlides.length}</div><h2 id="onboardingTitle">${escapeHtml(s.title)}</h2><p>${escapeHtml(s.body)}</p>${onboardingIndex===onboardingSlides.length-1?'<div class="onboarding-choice-row"><button id="onboardingDemoBtn" class="secondary" type="button">Start with demo</button><button id="onboardingEmptyBtn" class="secondary" type="button">Start empty</button></div>':''}`;
  $('onboardingBackBtn').disabled=onboardingIndex===0;$('onboardingNextBtn').textContent=onboardingIndex===onboardingSlides.length-1?'Done':'Next';
  $('onboardingProgress').innerHTML=onboardingSlides.map((_,i)=>`<i class="${i<=onboardingIndex?'active':''}"></i>`).join('');
  $('onboardingDemoBtn')?.addEventListener('click',async()=>{await loadSamplePlugin();await buildProfileDemo();project10State.name='DeckLab Demo Project';$('projectNameInput').value=project10State.name;closeOnboarding();switchMode('profile');projectScheduleSave();});
  $('onboardingEmptyBtn')?.addEventListener('click',()=>{closeOnboarding();switchMode('device');setTimeout(()=>window.DeckLabUX11?.openDevicePicker?.(),80);});
}
function openOnboarding(){onboardingIndex=0;$('onboardingOverlay').classList.remove('hidden');renderOnboarding();}
function closeOnboarding(){try{localStorage.setItem(ONBOARDING_KEY,'complete');}catch(_){}$('onboardingOverlay').classList.add('hidden');}

/* ----------------------------- RELEASE WIRING ----------------------------- */
$('projectNameInput')?.addEventListener('input',e=>{project10State.name=e.target.value||'Untitled DeckLab Project';renderProjectStudio();projectScheduleSave();});
$('projectNotesInput')?.addEventListener('input',e=>{project10State.notes=e.target.value;projectScheduleSave();});
$('projectNewBtn')?.addEventListener('click',()=>dl10ResetProject());
$('projectExportBtn')?.addEventListener('click',exportDeckLabProject);
$('projectImportInput')?.addEventListener('change',e=>{const f=e.target.files?.[0];if(f)importDeckLabProjectFile(f);e.target.value='';});
$('projectOpenPluginBtn')?.addEventListener('click',()=>switchMode('plugin'));
$('projectLoadDemoBtn')?.addEventListener('click',async()=>{await loadSamplePlugin();project10State.relinkNeeded=false;renderProjectStudio();projectScheduleSave();switchMode('plugin');});
$('projectOpenProfileBtn')?.addEventListener('click',()=>switchMode('profile'));
$('projectBuildDemoBtn')?.addEventListener('click',async()=>{if(!pluginState.manifest)await loadSamplePlugin();await buildProfileDemo();renderProjectStudio();projectScheduleSave();switchMode('profile');});
$('projectOpenQaBtn')?.addEventListener('click',()=>switchMode('test'));
$('projectCompareLatestBtn')?.addEventListener('click',()=>{switchMode('test');renderQaHistory();});
$('qaCompareBtn')?.addEventListener('click',renderQaComparison);$('qaBaselineSelect')?.addEventListener('change',renderQaComparison);$('qaCompareSelect')?.addEventListener('change',renderQaComparison);$('qaExportComparisonBtn')?.addEventListener('click',exportQaComparison);
$('openTourBtn')?.addEventListener('click',openOnboarding);$('onboardingBackBtn')?.addEventListener('click',()=>{if(onboardingIndex>0){onboardingIndex--;renderOnboarding();}});$('onboardingNextBtn')?.addEventListener('click',()=>{if(onboardingIndex<onboardingSlides.length-1){onboardingIndex++;renderOnboarding();}else closeOnboarding();});$('onboardingSkipBtn')?.addEventListener('click',closeOnboarding);

// Keep project state in sync with imported/relinked plugin assets without changing Plugin Lab internals.
let dl10LastPluginSig='';
setInterval(()=>{
  const sig=`${pluginState.manifest?.UUID||''}|${pluginState.manifest?.Version||''}|${pluginState.fileList?.length||0}`;
  if(sig!==dl10LastPluginSig){dl10LastPluginSig=sig;if(pluginState.manifest&&pluginState.fileList?.length)project10State.relinkNeeded=false;renderProjectStudio();projectScheduleSave();}
  recordCurrentQaRun();
  if(currentMode==='project')renderProjectStudio();
},700);
setInterval(projectScheduleSave,1800);

(async function bootDeckLab10(){
  const restored=await restoreProjectAutosave();
  renderProjectStudio();renderQaHistory();
  let last='project';try{last=localStorage.getItem('decklab.lastWorkspace.v10')||'project';}catch(_){}
  if(!['project','device','layout','plugin','host','profile','test'].includes(last))last='project';
  switchMode(restored?last:'device');
  let shown=false;try{shown=localStorage.getItem(ONBOARDING_KEY)==='complete';}catch(_){}
  if(!shown)setTimeout(openOnboarding,120);
})();
