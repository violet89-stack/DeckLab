// SPDX-License-Identifier: MPL-2.0
/* Deterministic contract-driven protocol model. No DOM, network or OS effects. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.DeckLabProtocol=factory();})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const clone=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
 const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
 const compare=(a,b)=>{const aa=String(a).split('.').map(Number),bb=String(b).split('.').map(Number);for(let i=0;i<3;i++){const d=(aa[i]||0)-(bb[i]||0);if(d)return d;}return 0;};
 const stable=x=>JSON.stringify(sort(x));function sort(x){return Array.isArray(x)?x.map(sort):object(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,sort(x[k])])):x;}
 class Engine{
  constructor(contract,{version=contract.current,instances=[],globalSettings={},pluginUUID='com.decklab.fixture',piContext=null}={}){this.contract=contract;this.version=version;this.instances=new Map(instances.map(i=>[i.context,i]));this.globalSettings=clone(globalSettings);this.pluginUUID=pluginUUID;this.piContext=piContext;this.trace=[];this.registrations={};this.logs=[];}
  api(channel,event){return this.contract.apis.find(a=>a.channel===channel&&a.event===event);}
  available(api,controller){return !!api&&(!api.minVersion||compare(this.version,api.minVersion)>=0)&&(!api.removedVersion||compare(this.version,api.removedVersion)<0)&&(controller!=='Neo'||compare(this.version,this.contract.rules.neoMinVersion)>=0);}
  payload(i,event,extra={},channel='host->plugin'){
   const multi=!!i.isInMultiAction,controller=multi?'Keypad':i.controller;const p={controller,settings:clone(i.settings||{})};
   if(!multi)p.coordinates={column:Number(i.column)||0,row:Number(i.row)||0};
   if(!['dialDown','dialUp','dialPress','dialRotate','touchTap','titleParametersDidChange'].includes(event))p.isInMultiAction=multi;
   if(i.stateCount>1&&controller==='Keypad')p.state=i.state||0;
   if(multi&&['keyDown','keyUp'].includes(event)&&i.stateCount>1)p.userDesiredState=i.userDesiredState??0;
   if(compare(this.version,'7.1')>=0&&!(channel==='host->pi'&&event==='didReceiveSettings'))p.resources=clone(i.resources||{});
   if(multi&&['willAppear','willDisappear'].includes(event)&&compare(this.version,'6.5')<0)delete p.controller;
   if(channel==='host->pi'&&compare(this.version,'6.7')<0)delete p.isInMultiAction;
   return {...p,...clone(extra)};
  }
  packet(event,i,extra={},channel='host->plugin'){const a=this.api(channel,event);const m={event};if(a?.required.action)m.action=i.actionUuid;if(a?.required.context)m.context=i.context;if(a?.required.device)m.device=i.device||'device-fixture';if(a?.required.payload)m.payload=this.payload(i,event,extra,channel);return m;}
  validate(channel,m,i=this.instances.get(m?.context)){
   const a=this.api(channel,m?.event),errors=[];if(!a)return ['Unknown API/channel'];
   const ctrl=i?.isInMultiAction?'MultiAction':i?.controller|| (m?.payload?.isInMultiAction?'MultiAction':m?.payload?.controller);
   if(!this.available(a,ctrl))errors.push('Unavailable in selected software version');
   for(const [k,t] of Object.entries(a.required)){const v=m?.[k];if(v===undefined||(t==='object'&&!object(v))||(t==='string'&&typeof v!=='string'))errors.push('Invalid '+k);}
   if(m?.id!==undefined&&typeof m.id!=='string')errors.push('Invalid id');
   if(a.controllers.length&&ctrl&&!a.controllers.includes(ctrl))errors.push('Incompatible controller');
   const p=m?.payload,e=m?.event;
   if(channel==='pi->host'&&a.controllers.length&&this.piContext!==m.context)errors.push('Property Inspector context mismatch');
   if(i&&m.action!==undefined&&m.action!==i.actionUuid)errors.push('Action/context mismatch');
   if(channel.endsWith('->host')&&['getGlobalSettings','setGlobalSettings'].includes(e)&&m.context!==this.pluginUUID&&(!i||channel==='pi->host'))errors.push('Unknown plugin identity');
   if(e==='setState'&&![0,1].includes(p?.state))errors.push('Invalid state');
   if(['setImage','setTitle'].includes(e)){if(p?.state!==undefined&&![0,1].includes(p.state))errors.push('Invalid state');if(p?.target!==undefined&&![0,1,2].includes(p.target))errors.push('Invalid target');const field=e==='setTitle'?'title':'image';if(p?.[field]!==undefined&&typeof p[field]!=='string')errors.push('Invalid '+field);}
   if(e==='setResources'&&object(p)&&Object.values(p).some(v=>typeof v!=='string'))errors.push('Resources must map names to strings');
   if(e==='setTriggerDescription'&&object(p)&&Object.values(p).some(v=>typeof v!=='string'))errors.push('Descriptions must be strings');
   for(const [event,field,type] of [['setFeedbackLayout','layout','string'],['openUrl','url','string'],['logMessage','message','string'],['didReceiveDeepLink','url','string'],['applicationDidLaunch','application','string'],['applicationDidTerminate','application','string']])if(e===event&&typeof p?.[field]!==type)errors.push('Invalid '+field);
   if(e==='switchToProfile'&&p?.page!==undefined&&(!Number.isInteger(p.page)||p.page<0||compare(this.version,'6.5')<0))errors.push('Profile pages require 6.5 and a nonnegative index');
   if(channel.startsWith('host->')&&a.controllers.length&&p&&'settings' in p){
    if(!object(p.settings))errors.push('Invalid settings');
    const legacyMulti=ctrl==='MultiAction'&&['willAppear','willDisappear'].includes(e)&&compare(this.version,'6.5')<0;
    if(!legacyMulti&&p.controller!==(ctrl==='MultiAction'?'Keypad':ctrl))errors.push('Missing or incorrect controller');
    const flagExpected=!['dialDown','dialUp','dialPress','dialRotate','touchTap','titleParametersDidChange'].includes(e)&&!(channel==='host->pi'&&compare(this.version,'6.7')<0);
    if(flagExpected&&p.isInMultiAction!==(ctrl==='MultiAction'))errors.push('Invalid Multi Action flag');if(ctrl==='MultiAction'&&p.coordinates!==undefined)errors.push('Multi Action has no coordinates');
    if(ctrl&&ctrl!=='MultiAction'&&(!object(p.coordinates)||!Number.isInteger(p.coordinates.column)||!Number.isInteger(p.coordinates.row)||p.coordinates.column<0||p.coordinates.row<0))errors.push('Invalid coordinates');
    if(ctrl==='Encoder'&&p.coordinates?.row!==0)errors.push('Encoder row must be zero');
    if(compare(this.version,'7.1')>=0&&!(channel==='host->pi'&&e==='didReceiveSettings')&&!object(p.resources))errors.push('Missing resources');
    if(e==='dialRotate'&&(!Number.isInteger(p.ticks)||typeof p.pressed!=='boolean'))errors.push('Invalid rotation');
    if(e==='dialPress'&&typeof p.pressed!=='boolean')errors.push('Invalid pressed');
    if(e==='touchTap'&&(!Array.isArray(p.tapPos)||p.tapPos.length!==2||p.tapPos.some(n=>!Number.isFinite(n))||typeof p.hold!=='boolean'))errors.push('Invalid touch');
    if(ctrl==='MultiAction'&&i?.stateCount>1&&['keyDown','keyUp'].includes(e)&&![0,1].includes(p.userDesiredState))errors.push('Missing desired state');
   }
   return errors;
  }
  record(channel,packet,result){const entry={channel,packet:clone(packet),result};this.trace.push(entry);if(this.trace.length>2000)this.trace.shift();return entry;}
  host(channel,packet){const m=clone(packet),i=this.instances.get(m.context),errors=this.validate(channel,m,i);if(errors.length){this.record(channel,m,'rejected');return {status:'rejected',errors,outputs:[]};}this.record(channel,m,'emitted');return {status:'emitted',outputs:[{channel,packet:m}]};}
  input(event,context,extra={}){const i=this.instances.get(context);if(!i)return {status:'rejected',errors:['Unknown context'],outputs:[]};
   if(['dialDown','dialUp'].includes(event)&&compare(this.version,'6.1')<0)return this.host('host->plugin',this.packet('dialPress',i,{...extra,pressed:event==='dialDown'}));
   const outputs=[],result=this.host('host->plugin',this.packet(event,i,extra));outputs.push(...result.outputs);
   if(['dialDown','dialUp'].includes(event)&&compare(this.version,'6.1')>=0&&compare(this.version,'6.5')<0)outputs.push(...this.host('host->plugin',this.packet('dialPress',i,{...extra,pressed:event==='dialDown'})).outputs);
   return {...result,outputs};
  }
  dispatch(channel,m){const i=this.instances.get(m?.context),a=this.api(channel,m?.event),errors=this.validate(channel,m,i),outputs=[];
   if(errors.length){this.record(channel,m,'rejected');return {status:'rejected',errors,outputs};}
   if(a.status==='todo'){this.record(channel,m,'unsupported');return {status:'unsupported',errors:[a.limitations],outputs};}
   const e=m.event,p=m.payload,pi=channel==='pi->host';
   if(a.controllers.length&&!i){this.record(channel,m,'rejected');return {status:'rejected',errors:['Unknown context'],outputs};}
   const entry=this.record(channel,m,'pending');
   const send=(ch,packet)=>{outputs.push(...this.host(ch,packet).outputs);};
   const reply=(event,ch,id)=>{let packet=event==='didReceiveGlobalSettings'?{event,payload:{settings:clone(this.globalSettings)}}:this.packet(event,i,{},ch);if(id!==undefined)packet.id=id;send(ch,packet);};
   let status='handled';
   if(e.startsWith('register')){this.registrations[channel]=m.uuid;}
   else if(e==='getSettings'||e==='getResources'||e==='getGlobalSettings')reply(e==='getSettings'?'didReceiveSettings':e==='getResources'?'didReceiveResources':'didReceiveGlobalSettings',pi?'host->pi':'host->plugin',m.id);
   else if(e==='setSettings'||e==='setResources'){i[e==='setSettings'?'settings':'resources']=clone(p);const dest=pi?'host->plugin':'host->pi';if(pi||this.piContext===i.context)reply(e==='setSettings'?'didReceiveSettings':'didReceiveResources',dest);}
   else if(e==='setGlobalSettings'){this.globalSettings=clone(p);if(pi||this.piContext)reply('didReceiveGlobalSettings',pi?'host->plugin':'host->pi');}
   else if(e==='sendToPlugin'||e==='sendToPropertyInspector'){if(e==='sendToPlugin'||this.piContext===m.context)send(pi?'host->plugin':'host->pi',clone(m));}
   else if(e==='setTriggerDescription')i.triggerDescription=clone(p);
   else if(e==='logMessage'||e==='openUrl'){this.logs.push({event:e,payload:clone(p)});status=e==='openUrl'?'simulated':'handled';}
   else {status='adapter';}
   entry.result=status;return {status,outputs};
  }
 }
 function coverage(contract,results,version=contract.current){const byId=new Map(results.map(r=>[r.id,r]));const rows=contract.apis.map(a=>{const refs=a.fixtures||[],cases=refs.map(id=>byId.get(id)),pass=refs.length>0&&cases.every(c=>c?.pass),positive=cases.some(c=>c?.pass&&c.kind==='behavior');return {...a,applicable:(!a.minVersion||compare(version,a.minVersion)>=0)&&(!a.removedVersion||compare(version,a.removedVersion)<0),tested:pass,testedBehavior:pass&&positive&&a.status!=='todo',fixturePasses:cases.filter(c=>c?.pass).length,fixtureCount:refs.length};});const active=rows.filter(r=>r.applicable&&!['outside-scope','not-applicable'].includes(r.status));return {revision:contract.revision,version,rows,total:active.length,testedBehavior:active.filter(r=>r.testedBehavior).length,full:active.filter(r=>r.testedBehavior&&r.status==='full').length,hardwareValidated:0};}
 function normalizeTrace(trace){const maps={context:new Map(),device:new Map(),id:new Map(),uuid:new Map()};function norm(v,key){if(maps[key]&&typeof v==='string'){if(!maps[key].has(v))maps[key].set(v,key+'-'+maps[key].size);return maps[key].get(v);}if(Array.isArray(v))return v.map(x=>norm(x));if(object(v))return Object.fromEntries(Object.keys(v).sort().map(k=>[k,norm(v[k],k)]));return v;}return trace.map(e=>({channel:e.channel,packet:Object.fromEntries(Object.entries(e.packet).map(([k,v])=>[k,maps[k]?norm(v,k):clone(v)]))}));}
 function compareTraces(left,right){for(const t of [left,right])if(!object(t)||!Array.isArray(t.events)||!t.events.length||!t.version||!t.deviceModel||t.events.some(e=>!e.channel||!object(e.packet)||typeof e.packet.event!=='string'))throw Error('Trace needs version, deviceModel and nonempty events with channel and packet.');
  if(left.version!==right.version||left.deviceModel!==right.deviceModel)throw Error('Trace software versions and device models must match.');
  const l=normalizeTrace(left.events),r=normalizeTrace(right.events),differences=[];for(let i=0;i<Math.max(l.length,r.length);i++)if(stable(l[i])!==stable(r[i]))differences.push({index:i,emulator:l[i]||null,hardware:r[i]||null});
  return {version:left.version,deviceModel:left.deviceModel,match:!differences.length,differences,matchedEvents:Math.min(l.length,r.length)-differences.filter(d=>d.index<Math.min(l.length,r.length)).length,hardwareValidation:'unreviewed',provenance:{emulator:left.origin||'unknown',hardware:right.origin||'unknown'},note:'Only top-level packet identities are normalized by key; payload fields and ordering are compared. Timing is not validated. A match is evidence for this trace, not full API validation.'};}
 return {Engine,compare,clone,stable,coverage,compareTraces,normalizeTrace};
});
