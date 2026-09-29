// SPDX-License-Identifier: MPL-2.0
/* ----------------------------- DECKLAB 0.9 PLUGIN TEST SUITE ----------------------------- */

const testState = {
  running:false,
  cancel:false,
  results:[],
  trace:[],
  contexts:new Map(),
  selectedResultId:null,
  filter:'all',
  runId:0,
  resultCounter:0,
  progressDone:0,
  progressTotal:0,
  globalSettings:{},
  activeContext:null
};

function testStamp(){ return new Date().toISOString().slice(11,23); }
function testDelay(ms){ return new Promise(resolve=>setTimeout(resolve,ms)); }
function testChecked(id){ return !!$(id)?.checked; }
function testTrace(direction,event,data={}){
  const item={t:testStamp(),direction,event,...deepClone(data)};
  testState.trace.push(item);
  if(testState.trace.length>1200)testState.trace.shift();
  const el=$('testTraceLog');
  if(el)el.textContent=testState.trace.map(x=>JSON.stringify(x)).join('\n\n');
}
function testResult(status, action, targetKey, check, message, evidence={}, mode='STATIC'){
  const d=DEVICES[targetKey];
  const result={
    id:`qa-${++testState.resultCounter}`,
    status,
    mode,
    actionName:action?.Name || (action?.UUID ? action.UUID : 'Plugin package'),
    actionUuid:action?.UUID || pluginState.manifest?.UUID || '—',
    targetKey:targetKey || 'package',
    targetName:d?.name || (targetKey==='package'?'Package':'—'),
    check,
    message,
    evidence:deepClone(evidence),
    at:new Date().toISOString()
  };
  testState.results.push(result);
  renderTestResults();
  return result;
}
function testAdvance(note=''){
  testState.progressDone=Math.min(testState.progressTotal,testState.progressDone+1);
  renderTestProgress(note);
}
function testSelectedTargets(){
  return [...document.querySelectorAll('#testTargetList input[type="checkbox"]:checked')].map(x=>x.value).filter(k=>DEVICES[k]);
}
function testSelectedActions(){
  const actions=Array.isArray(pluginState.manifest?.Actions)?pluginState.manifest.Actions:[];
  if($('testScope')?.value==='all')return actions.map((action,index)=>({action,index}));
  const idx=Number($('testActionSelect')?.value);
  return Number.isInteger(idx)&&actions[idx]?[{action:actions[idx],index:idx}]:[];
}
function testRequestedLiveChecks(){
  return [
    ['lifecycle','testCheckLifecycle'],['input','testCheckInput'],['settings','testCheckSettings'],
    ['reconnect','testCheckReconnect'],['output','testCheckOutput']
  ].filter(([,id])=>testChecked(id)).map(([x])=>x);
}
function testRunCounts(){
  const counts={pass:0,warn:0,fail:0,skip:0};
  for(const r of testState.results)counts[r.status]=(counts[r.status]||0)+1;
  return counts;
}
function renderTestProgress(note=''){
  const c=testRunCounts();
  if($('testPassCount'))$('testPassCount').textContent=c.pass;
  if($('testWarnCount'))$('testWarnCount').textContent=c.warn;
  if($('testFailCount'))$('testFailCount').textContent=c.fail;
  if($('testSkipCount'))$('testSkipCount').textContent=c.skip;
  const pct=testState.progressTotal?Math.round(testState.progressDone/testState.progressTotal*100):0;
  if($('testProgressBar'))$('testProgressBar').style.width=`${pct}%`;
  if($('testProgressText'))$('testProgressText').textContent=note || (testState.running?`${testState.progressDone} / ${testState.progressTotal} checks completed.`:(testState.results.length?`${testState.results.length} results · ${c.fail} failures · ${c.warn} warnings.`:'No test run yet.'));
  if($('testRunState')){$('testRunState').textContent=testState.running?'RUNNING':(testState.results.length?'COMPLETE':'IDLE');$('testRunState').classList.toggle('live',testState.running);}
}
function syncTestActions(){
  const sel=$('testActionSelect'); if(!sel)return;
  const actions=Array.isArray(pluginState.manifest?.Actions)?pluginState.manifest.Actions:[];
  const old=sel.value;
  sel.innerHTML='';
  actions.forEach((a,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=a.Name||a.UUID||`Action ${i+1}`;sel.appendChild(o);});
  if(actions[Number(old)])sel.value=old;
  else if(actions[pluginState.selectedActionIndex])sel.value=String(pluginState.selectedActionIndex);
  else if(actions.length)sel.value='0';
  sel.disabled=$('testScope')?.value==='all'||!actions.length;
}
function renderTestTargets(){
  const host=$('testTargetList'); if(!host||host.children.length)return;
  for(const key of PLUGIN_TARGET_ORDER){
    const d=DEVICES[key]; if(!d)continue;
    const label=document.createElement('label'); label.className='test-target-option';
    const input=document.createElement('input');input.type='checkbox';input.value=key;input.checked=true;
    const copy=document.createElement('div');copy.innerHTML=`<strong>${escapeHtml(d.name)}</strong><small>${d.controllers.join(' + ')}${d.inputOnly?' · input only':''}${d.streamDeckApp===false?' · separate host':''}</small>`;
    const cap=document.createElement('span');cap.className='test-target-cap';cap.textContent=`${d.rows}×${d.cols}${d.dials?` +${d.dials}D`:''}${d.neo?' +INFO':''}`;
    label.append(input,copy,cap);host.appendChild(label);
  }
}
function renderTestSuite(){
  renderTestTargets(); syncTestActions();
  const loaded=!!pluginState.manifest;
  const title=pluginState.manifest?.Name||'No plugin loaded';
  if($('testSubtitle'))$('testSubtitle').textContent=loaded?`${title} · ${pluginState.manifest?.Actions?.length||0} actions · SDK ${pluginState.manifest?.SDKVersion??'—'}`:'Import a plugin in Plugin Lab or load the built-in demo.';
  if($('testToolbarStatus'))$('testToolbarStatus').textContent=loaded?`${title} · automated static + ${liveState.pluginConnected?'live':'optional live'} QA`:'Automated package + SDK protocol QA · static tests work without executing plugin code';
  if($('testPlanBadge')){$('testPlanBadge').textContent=liveState.pluginConnected?'live plugin connected':'static ready';$('testPlanBadge').classList.toggle('online',loaded);}
  for(const [id,on,label] of [['testCompanionBadge',liveState.companionConnected,'companion'],['testPluginBadge',liveState.pluginConnected,'plugin socket']]){const el=$(id);if(!el)continue;el.textContent=`${label} ${on?'online':'offline'}`;el.classList.toggle('online',on);el.classList.toggle('offline',!on);}
  if($('testRunBtn'))$('testRunBtn').disabled=!loaded||testState.running;
  if($('testStopBtn'))$('testStopBtn').disabled=!testState.running;
  if($('testRunTitle'))$('testRunTitle').textContent=testState.running?`Testing ${title}`:(testState.results.length?`Last run · ${title}`:'Ready');
  renderTestProgress(); renderTestResults(); renderTestDetail();
}
function renderTestResults(){
  const host=$('testResults'),empty=$('testResultsEmpty'); if(!host||!empty)return;
  host.innerHTML='';
  let rows=testState.results.slice();
  if(testState.filter==='fail')rows=rows.filter(r=>r.status==='fail');
  else if(testState.filter==='warn')rows=rows.filter(r=>r.status==='warn');
  empty.classList.toggle('hidden',rows.length>0);
  for(const r of rows){
    const b=document.createElement('button');b.type='button';b.className=`test-result-row ${r.id===testState.selectedResultId?'selected':''}`;
    b.innerHTML=`<span class="test-result-status ${r.status}">${r.status.toUpperCase()}</span><div class="test-result-action"><strong>${escapeHtml(r.actionName)}</strong><span>${escapeHtml(r.check)} · <span class="${r.mode==='LIVE'?'qa-live-chip':'qa-static-chip'}">${r.mode}</span></span></div><div class="test-result-device"><strong>${escapeHtml(r.targetName)}</strong><span>${escapeHtml(r.targetKey)}</span></div><div class="test-result-message">${escapeHtml(r.message)}</div>`;
    b.addEventListener('click',()=>{testState.selectedResultId=r.id;renderTestResults();renderTestDetail();});
    host.appendChild(b);
  }
}
function renderTestDetail(){
  const r=testState.results.find(x=>x.id===testState.selectedResultId)||null;
  $('testDetailEmpty')?.classList.toggle('hidden',!!r);$('testDetailBody')?.classList.toggle('hidden',!r);
  if(!r){if($('testDetailTitle'))$('testDetailTitle').textContent='Nothing selected';if($('testDetailStatus')){$('testDetailStatus').textContent='—';$('testDetailStatus').className='compat-pill partial';}return;}
  $('testDetailTitle').textContent=r.message.length>46?`${r.message.slice(0,43)}…`:r.message;
  const pill=$('testDetailStatus');pill.textContent=r.status.toUpperCase();pill.className=`compat-pill ${r.status==='pass'?'yes':r.status==='fail'?'no':'partial'}`;
  $('testDetailAction').textContent=`${r.actionName} · ${r.actionUuid}`;$('testDetailTarget').textContent=r.targetName;$('testDetailCheck').textContent=`${r.check} · ${r.mode}`;$('testDetailMessage').textContent=r.message;$('testDetailEvidence').textContent=JSON.stringify(r.evidence||{},null,2);
}
function clearTestSuite(){testState.cancel=true;testState.running=false;testState.results=[];testState.trace=[];testState.contexts.clear();testState.selectedResultId=null;testState.progressDone=0;testState.progressTotal=0;if($('testTraceLog'))$('testTraceLog').textContent='';renderTestSuite();}

function qaAssetRefsForAction(action){
  const refs=[];
  if(action.Icon)refs.push(['Icon',action.Icon]);
  (action.States||[]).forEach((s,i)=>{if(s?.Image)refs.push([`State ${i} image`,s.Image]);});
  if(action.PropertyInspectorPath)refs.push(['Property Inspector',action.PropertyInspectorPath]);
  if(action.Encoder?.Icon)refs.push(['Encoder icon',action.Encoder.Icon]);
  if(action.Encoder?.layout&&!String(action.Encoder.layout).startsWith('$'))refs.push(['Encoder layout',action.Encoder.layout]);
  return refs;
}
function qaAnimatedManifestRefs(action){return (action.States||[]).map(s=>s?.Image).filter(x=>typeof x==='string'&&/\.(gif|webp)$/i.test(x));}
function qaStaticPackageResult(){
  const issues=validatePluginPackage();const errors=issues.filter(x=>x.severity==='error'),warnings=issues.filter(x=>x.severity==='warning');
  const status=errors.length?'fail':warnings.length?'warn':'pass';
  testResult(status,{Name:pluginState.manifest?.Name,UUID:pluginState.manifest?.UUID},'package','Manifest & package',errors.length?`${errors.length} package error${errors.length===1?'':'s'} found.`:warnings.length?`${warnings.length} package warning${warnings.length===1?'':'s'} found.`:'Manifest and package structure passed DeckLab checks.',{issues,files:pluginState.fileList.length,layouts:pluginState.layouts.length},'STATIC');testAdvance('Manifest/package checks complete.');
}
async function qaStaticActionResources(action){
  const evidence={controllers:getActionControllers(action),assets:[],layouts:[],animatedManifestImages:qaAnimatedManifestRefs(action)};let failures=0,warnings=0;
  for(const [label,ref] of qaAssetRefsForAction(action)){const builtin=label==='Encoder layout'&&String(ref).startsWith('$');const found=builtin||!!findPluginFile(ref);evidence.assets.push({label,ref,found});if(!found){if(label.includes('layout')||label.includes('Property'))failures++;else warnings++;}}
  for(const controller of getActionControllers(action).filter(c=>c==='Encoder'||c==='Neo')){
    const layout=await getActionLayout(action,controller);if(!layout){warnings++;evidence.layouts.push({controller,found:false});continue;}
    const issues=validateLayout(layout,controller);const errs=issues.filter(x=>x.severity==='error');const warns=issues.filter(x=>x.severity==='warning');failures+=errs.length;warnings+=warns.length;evidence.layouts.push({controller,id:layout.id,issues});
  }
  const status=failures?'fail':warnings?'warn':'pass';
  const msg=failures?`${failures} resource/layout error${failures===1?'':'s'} found.`:warnings?`${warnings} resource/layout warning${warnings===1?'':'s'} found.`:'Referenced assets and controller layouts passed local checks.';
  testResult(status,action,'package','Assets & layouts',msg,evidence,'STATIC');testAdvance(`${action.Name||action.UUID}: assets/layouts checked.`);
}
function qaCompatibilityResult(action,targetKey){
  const compat=getCompatibility(action,targetKey);let status='pass';
  if(compat.kind==='no'||compat.kind==='special')status='skip';else if(compat.kind==='partial')status='warn';
  testResult(status,action,targetKey,'Device compatibility',compat.detail,{controllers:getActionControllers(action),available:compat.controllers,classification:compat.kind,label:compat.label},'STATIC');testAdvance(`${action.Name||action.UUID}: ${DEVICES[targetKey].name} compatibility checked.`);
}

function qaContextId(action,targetKey,controller){testState.runId++;return `test-${(action.UUID||'action').replace(/[^a-z0-9]+/gi,'-').slice(-26)}-${targetKey}-${controller.toLowerCase()}-${testState.runId}`;}
function qaDeviceId(targetKey){return `decklab-test-${targetKey}-${testState.runId}`;}
function qaPayload(ctx,extra={}){
  const payload={settings:deepClone(ctx.settings),controller:ctx.controller,isInMultiAction:false,resources:{},...extra};
  if(ctx.controller!=='Neo')payload.coordinates={column:0,row:0};
  if(ctx.controller==='Keypad')payload.state=ctx.state||0;
  return payload;
}
function qaSend(ctx,event,payload=null,extra={}){
  const msg={action:ctx.action.UUID,context:ctx.context,device:ctx.deviceId,event,...extra};
  if(payload!==null)msg.payload=payload;
  testTrace('host→plugin',event,{context:ctx.context,target:ctx.targetKey,controller:ctx.controller,message:msg});
  const ok=liveSendToPlugin(msg); if(!ok)ctx.transportErrors.push(`Could not send ${event}; plugin socket unavailable.`);return ok;
}
function qaSendDevice(ctx,event){
  const d=DEVICES[ctx.targetKey];const msg=event==='deviceDidConnect'?{event,device:ctx.deviceId,deviceInfo:{name:d.name,type:d.type,size:{columns:d.cols,rows:d.rows}}}:{event,device:ctx.deviceId};
  testTrace('host→plugin',event,{context:ctx.context,target:ctx.targetKey,message:msg});const ok=liveSendToPlugin(msg);if(!ok)ctx.transportErrors.push(`Could not send ${event}.`);return ok;
}
function qaOutputIssue(ctx,severity,message,evidence={}){ctx.outputIssues.push({severity,message,...deepClone(evidence)});}
function qaValidatePluginOutput(ctx,message){
  const event=message.event;const action=ctx.action,d=DEVICES[ctx.targetKey];
  const known=new Set(['getSettings','getGlobalSettings','getResources','logMessage','openUrl','sendToPropertyInspector','setFeedback','setFeedbackLayout','setGlobalSettings','setImage','setResources','setSettings','setState','setTitle','showAlert','showOk','switchToProfile']);
  if(!event||typeof event!=='string'){qaOutputIssue(ctx,'error','Plugin message is missing a string event.',{message});return;}
  if(!known.has(event))qaOutputIssue(ctx,'warning',`Unrecognized plugin command "${event}"; it may be a newer SDK command DeckLab 1.1.0 Community Alpha does not yet model.`,{message});
  const needsContext=new Set(['getSettings','getResources','sendToPropertyInspector','setFeedback','setFeedbackLayout','setImage','setResources','setSettings','setState','setTitle','showAlert','showOk']);
  if(needsContext.has(event)&&typeof message.context!=='string')qaOutputIssue(ctx,'error',`${event} is missing context.`,{message});
  if(event==='setState'){
    const st=Number(message.payload?.state);if(ctx.controller!=='Keypad')qaOutputIssue(ctx,'error','setState was sent for a non-Keypad context.',{controller:ctx.controller});if(!Number.isInteger(st)||st<0||st>1)qaOutputIssue(ctx,'error','setState must use state 0 or 1.',{state:message.payload?.state});if((action.States||[]).length<2)qaOutputIssue(ctx,'warning','setState was sent but the action manifest does not define two states.');
  }
  if(event==='setFeedback'&&!['Encoder','Neo'].includes(ctx.controller))qaOutputIssue(ctx,'error','setFeedback was sent to a Keypad context.',{controller:ctx.controller});
  if(event==='setFeedbackLayout'&&!['Encoder','Neo'].includes(ctx.controller))qaOutputIssue(ctx,'error','setFeedbackLayout was sent to a Keypad context.',{controller:ctx.controller});
  if(event==='setImage'){
    const image=message.payload?.image;if(image!=null&&typeof image!=='string')qaOutputIssue(ctx,'error','setImage payload.image must be a string or omitted.',{type:typeof image});
    if(typeof image==='string'&&(/^data:image\/gif/i.test(image)||/\.gif(?:$|[?#])/i.test(image)))qaOutputIssue(ctx,'warning','setImage is attempting to use an animated GIF. Elgato supports animated GIFs in manifest states, but not programmatic setImage animation.');
    if(d.inputOnly)qaOutputIssue(ctx,'warning',`${d.name} is input-only; setImage output is not visible on the physical control.`);
  }
  if(event==='setTitle'&&d.inputOnly)qaOutputIssue(ctx,'warning',`${d.name} is input-only; setTitle output is not visible on the physical control.`);
  if(event==='setFeedback'&&message.payload!=null&&(typeof message.payload!=='object'||Array.isArray(message.payload)))qaOutputIssue(ctx,'error','setFeedback payload must be an object.');
}
async function testObservePluginMessage(message){
  if(!testState.running)return false;
  let ctx=message.context?testState.contexts.get(message.context):null;
  if(!ctx&&testState.activeContext)ctx=testState.contexts.get(testState.activeContext)||null;
  if(!ctx)return false;
  ctx.messages.push({t:testStamp(),message:deepClone(message)});qaValidatePluginOutput(ctx,message);testTrace('plugin→host',message.event||'unknown',{context:message.context||ctx.context,target:ctx.targetKey,message});
  const event=message.event;
  if(event==='getSettings'){
    qaSend(ctx,'didReceiveSettings',qaPayload(ctx),{id:message.id});
  }else if(event==='getGlobalSettings'){
    const reply={context:message.context||pluginState.manifest?.UUID||'plugin',event:'didReceiveGlobalSettings',id:message.id,payload:{settings:deepClone(testState.globalSettings)}};testTrace('host→plugin','didReceiveGlobalSettings',{message:reply});liveSendToPlugin(reply);
  }else if(event==='setSettings'){
    ctx.settings=deepClone(message.payload||{});
  }else if(event==='setGlobalSettings'){
    testState.globalSettings=deepClone(message.payload||{});
  }
  return true;
}
function qaPhaseIssues(ctx,from){return ctx.outputIssues.slice(from);}
function qaStatusFromIssues(issues,transportOk=true){if(!transportOk||issues.some(x=>x.severity==='error'))return'fail';if(issues.some(x=>x.severity==='warning'))return'warn';return'pass';}
function qaPhaseEvidence(ctx,from,msgFrom){return {controller:ctx.controller,context:ctx.context,pluginMessages:ctx.messages.slice(msgFrom).map(x=>x.message),issues:qaPhaseIssues(ctx,from),transportErrors:ctx.transportErrors.slice()};}
async function qaRunLiveCase(action,targetKey,controller,checks){
  if(testState.cancel)return;
  const ctx={action,targetKey,controller,context:qaContextId(action,targetKey,controller),deviceId:qaDeviceId(targetKey),settings:{__decklabQa:true,run:testState.runId},state:0,messages:[],outputIssues:[],transportErrors:[]};
  testState.contexts.set(ctx.context,ctx);testState.activeContext=ctx.context;
  const d=DEVICES[targetKey];
  let issueAt=0,msgAt=0;
  qaSendDevice(ctx,'deviceDidConnect');qaSend(ctx,'willAppear',qaPayload(ctx));await testDelay(110);
  if(checks.includes('lifecycle')){
    const issues=qaPhaseIssues(ctx,issueAt),status=qaStatusFromIssues(issues,liveState.pluginConnected&&ctx.transportErrors.length===0);testResult(status,action,targetKey,`Lifecycle · ${controller}`,liveState.pluginConnected?'deviceDidConnect + willAppear completed without transport failure.':'Plugin socket disconnected during lifecycle test.',qaPhaseEvidence(ctx,issueAt,msgAt),'LIVE');testAdvance(`${action.Name}: ${d.name} lifecycle.`);issueAt=ctx.outputIssues.length;msgAt=ctx.messages.length;
  }
  if(testState.cancel)return;
  if(checks.includes('input')){
    if(controller==='Neo')testResult('skip',action,targetKey,`Input · ${controller}`,'Neo Infobar actions are display-only; there is no plugin touch/click input to synthesize.',{controller},'LIVE');
    else if(controller==='Keypad'){qaSend(ctx,'keyDown',qaPayload(ctx,{userDesiredState:ctx.state?0:1}));await testDelay(35);qaSend(ctx,'keyUp',qaPayload(ctx,{userDesiredState:ctx.state?0:1}));await testDelay(80);const issues=qaPhaseIssues(ctx,issueAt);testResult(qaStatusFromIssues(issues,liveState.pluginConnected),action,targetKey,`Input · ${controller}`,'Sent keyDown/keyUp to the action context.',qaPhaseEvidence(ctx,issueAt,msgAt),'LIVE');}
    else {qaSend(ctx,'dialDown',qaPayload(ctx));await testDelay(25);qaSend(ctx,'dialRotate',qaPayload(ctx,{ticks:1,pressed:false}));await testDelay(25);qaSend(ctx,'dialUp',qaPayload(ctx));if(d.touch)qaSend(ctx,'touchTap',qaPayload(ctx,{tapPos:[100,50],hold:false}));await testDelay(80);const issues=qaPhaseIssues(ctx,issueAt);testResult(qaStatusFromIssues(issues,liveState.pluginConnected),action,targetKey,`Input · ${controller}`,`Sent dial press/rotate/release${d.touch?' + touchTap':''}.`,qaPhaseEvidence(ctx,issueAt,msgAt),'LIVE');}
    testAdvance(`${action.Name}: ${d.name} input.`);issueAt=ctx.outputIssues.length;msgAt=ctx.messages.length;
  }
  if(testState.cancel)return;
  if(checks.includes('settings')){
    ctx.settings={...ctx.settings,qaMutation:`settings-${Date.now()}`};qaSend(ctx,'didReceiveSettings',qaPayload(ctx));await testDelay(100);const issues=qaPhaseIssues(ctx,issueAt);testResult(qaStatusFromIssues(issues,liveState.pluginConnected),action,targetKey,`Settings · ${controller}`,'Delivered didReceiveSettings with a per-context QA mutation and serviced getSettings/getGlobalSettings requests.',qaPhaseEvidence(ctx,issueAt,msgAt),'LIVE');testAdvance(`${action.Name}: ${d.name} settings.`);issueAt=ctx.outputIssues.length;msgAt=ctx.messages.length;
  }
  if(testState.cancel)return;
  if(checks.includes('reconnect')){
    qaSend(ctx,'willDisappear',qaPayload(ctx));qaSendDevice(ctx,'deviceDidDisconnect');await testDelay(55);qaSendDevice(ctx,'deviceDidConnect');qaSend(ctx,'willAppear',qaPayload(ctx));await testDelay(110);const issues=qaPhaseIssues(ctx,issueAt);testResult(qaStatusFromIssues(issues,liveState.pluginConnected),action,targetKey,`Reconnect · ${controller}`,'Simulated willDisappear → deviceDidDisconnect → deviceDidConnect → willAppear.',qaPhaseEvidence(ctx,issueAt,msgAt),'LIVE');testAdvance(`${action.Name}: ${d.name} reconnect.`);issueAt=ctx.outputIssues.length;msgAt=ctx.messages.length;
  }
  if(checks.includes('output')){
    await testDelay(70);const issues=ctx.outputIssues;const status=qaStatusFromIssues(issues,liveState.pluginConnected);const n=ctx.messages.length;testResult(status,action,targetKey,`Plugin output · ${controller}`,issues.length?`${issues.length} output schema/target issue${issues.length===1?'':'s'} detected across ${n} plugin message${n===1?'':'s'}.`:`${n} plugin message${n===1?'':'s'} observed; no modeled schema/target violations detected.`,{controller,context:ctx.context,messages:ctx.messages.map(x=>x.message),issues},'LIVE');testAdvance(`${action.Name}: ${d.name} output validation.`);
  }
  qaSend(ctx,'willDisappear',qaPayload(ctx));await testDelay(20);ctx.finished=true;if(testState.activeContext===ctx.context)testState.activeContext=null;
}
function qaEstimateTotal(actions,targets,liveChecks){
  let n=0;if(testChecked('testCheckPackage'))n+=1;if(testChecked('testCheckLayouts'))n+=actions.length;if(testChecked('testCheckCompatibility'))n+=actions.length*targets.length;
  if(liveChecks.length){for(const {action} of actions)for(const target of targets){const c=getCompatibility(action,target);if(liveState.pluginConnected&&c.controllers.length&&DEVICES[target].streamDeckApp!==false)n+=c.controllers.length*liveChecks.length;else n+=liveChecks.length;}}
  return Math.max(1,n);
}
async function runTestSuite(){
  if(testState.running||!pluginState.manifest)return;const actions=testSelectedActions(),targets=testSelectedTargets();if(!actions.length){alert('Select an action to test.');return;}if(!targets.length){alert('Select at least one target device.');return;}
  testState.running=true;testState.cancel=false;testState.results=[];testState.trace=[];testState.contexts.clear();testState.selectedResultId=null;testState.progressDone=0;testState.globalSettings={};testState.runId++;const liveChecks=testRequestedLiveChecks();testState.progressTotal=qaEstimateTotal(actions,targets,liveChecks);renderTestSuite();
  testTrace('DeckLab','qaRunStarted',{plugin:pluginState.manifest?.UUID,actions:actions.map(x=>x.action.UUID),targets,liveConnected:liveState.pluginConnected});
  try{
    if(testChecked('testCheckPackage')&&!testState.cancel)qaStaticPackageResult();
    if(testChecked('testCheckLayouts'))for(const {action} of actions){if(testState.cancel)break;await qaStaticActionResources(action);}
    if(testChecked('testCheckCompatibility'))for(const {action} of actions)for(const target of targets){if(testState.cancel)break;qaCompatibilityResult(action,target);}
    if(liveChecks.length&&!testState.cancel){
      if(!liveState.pluginConnected){
        for(const {action} of actions)for(const target of targets){const c=getCompatibility(action,target);for(const check of liveChecks){if(testState.cancel)break;const reason=DEVICES[target].streamDeckApp===false?'This target uses a separate host rather than the Stream Deck app protocol.':!c.controllers.length?c.detail:'No externally launched plugin socket is connected.';testResult('skip',action,target,check[0].toUpperCase()+check.slice(1),reason,{liveConnected:false,compatibility:c},'LIVE');testAdvance(`${action.Name}: live ${check} skipped.`);}}
      }else{
        for(const {action} of actions){for(const target of targets){if(testState.cancel)break;const c=getCompatibility(action,target);if(DEVICES[target].streamDeckApp===false||!c.controllers.length){for(const check of liveChecks){testResult('skip',action,target,check[0].toUpperCase()+check.slice(1),DEVICES[target].streamDeckApp===false?'Separate-host target; standard Stream Deck plugin lifecycle is not exercised here.':c.detail,{compatibility:c},'LIVE');testAdvance(`${action.Name}: ${target} ${check} skipped.`);}continue;}for(const controller of c.controllers){await qaRunLiveCase(action,target,controller,liveChecks);if(testState.cancel)break;}}}
      }
    }
  }catch(err){testTrace('DeckLab','qaRunnerError',{error:String(err),stack:err?.stack||''});testResult('fail',{Name:pluginState.manifest?.Name,UUID:pluginState.manifest?.UUID},'package','QA runner',`DeckLab test runner error: ${err.message||err}`,{stack:err?.stack||''},'STATIC');}
  finally{testState.running=false;testState.contexts.clear();testState.activeContext=null;testTrace('DeckLab',testState.cancel?'qaRunCancelled':'qaRunComplete',{counts:testRunCounts()});renderTestSuite();if(testState.results.length&&!testState.selectedResultId){testState.selectedResultId=(testState.results.find(r=>r.status==='fail')||testState.results.find(r=>r.status==='warn')||testState.results[0]).id;renderTestResults();renderTestDetail();}}
}
function stopTestSuite(){if(!testState.running)return;testState.cancel=true;testTrace('DeckLab','qaCancelRequested',{});if($('testProgressText'))$('testProgressText').textContent='Stopping after the current check…';}
function testReportObject(){return {$schema:'https://decklab.local/schemas/decklab-qa-report.schema.json',format:'DeckLabQAReport',version:'1.0',schemaVersion:'1.0',generatedAt:new Date().toISOString(),plugin:{name:pluginState.manifest?.Name||null,uuid:pluginState.manifest?.UUID||null,version:pluginState.manifest?.Version||null,sdkVersion:pluginState.manifest?.SDKVersion??null},plan:{scope:$('testScope')?.value,actions:testSelectedActions().map(x=>x.action.UUID),targets:testSelectedTargets(),livePluginConnected:liveState.pluginConnected},summary:testRunCounts(),results:deepClone(testState.results)};}
function exportTestReport(){const name=(pluginState.manifest?.Name||'decklab-plugin').replace(/[^a-z0-9-_]+/gi,'-');downloadText(`${name}.decklab-qa.json`,JSON.stringify(testReportObject(),null,2));}
function exportTestTrace(){const name=(pluginState.manifest?.Name||'decklab-plugin').replace(/[^a-z0-9-_]+/gi,'-');downloadText(`${name}.decklab-qa-trace.json`,JSON.stringify(testState.trace,null,2));}

$('testScope')?.addEventListener('change',()=>{syncTestActions();renderTestSuite();});
$('testActionSelect')?.addEventListener('change',e=>{const idx=Number(e.target.value);if(pluginState.manifest?.Actions?.[idx]){pluginState.selectedActionIndex=idx;if(typeof renderPluginActions==='function')renderPluginActions();}});
$('testTargetsAllBtn')?.addEventListener('click',()=>{const boxes=[...document.querySelectorAll('#testTargetList input[type="checkbox"]')];const all=boxes.every(x=>x.checked);boxes.forEach(x=>x.checked=!all);});
$('testRunBtn')?.addEventListener('click',runTestSuite);$('testStopBtn')?.addEventListener('click',stopTestSuite);$('testClearBtn')?.addEventListener('click',clearTestSuite);$('testExportBtn')?.addEventListener('click',exportTestReport);$('testExportTraceBtn')?.addEventListener('click',exportTestTrace);
$('testLoadDemoBtn')?.addEventListener('click',async()=>{await loadSamplePlugin();if(pluginState.manifest?.Actions?.length)pluginState.selectedActionIndex=0;renderTestSuite();});
document.querySelectorAll('[data-test-filter]').forEach(b=>b.addEventListener('click',()=>{testState.filter=b.dataset.testFilter;document.querySelectorAll('[data-test-filter]').forEach(x=>x.classList.toggle('active',x===b));renderTestResults();}));

renderTestSuite();
setInterval(()=>{if(currentMode==='test')renderTestSuite();},750);
