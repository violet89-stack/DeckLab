// SPDX-License-Identifier: MPL-2.0
/* Wires the tested model into profile plugin/PI routing and outbound version gates. */
(function(){
 const P=DeckLabProtocol,c=DECKLAB_SDK_CONTRACT;let version=c.current;try{const v=localStorage.getItem('decklab.protocol.version');if(c.versions.includes(v))version=v;}catch(_){}
 const engine=new P.Engine(c,{version});const rawSend=liveSendToPlugin,rawPi=profileSendToPi,rawPlugin=handleLivePluginMessage,rawProfilePlugin=handleProfilePluginMessage,rawPiCommand=handleProfilePiCommand;
 function sync(){DeckLabPluginSettings.sync();engine.version=version;engine.instances=new Map();for(const i of profileAllRuntimeInstances()){i.stateCount=profileActionFor(i)?.States?.length||1;i.device=profileState.deviceId;engine.instances.set(i.context,i);}if(typeof testState!=='undefined'&&testState.running)for(const q of testState.contexts.values())engine.instances.set(q.context,{...q,actionUuid:q.action.UUID,device:q.deviceId,stateCount:q.action.States?.length||1,column:0,row:0});if(hostState.placed&&!engine.instances.has(hostState.context))engine.instances.set(hostState.context,{context:hostState.context,actionUuid:hostAction()?.UUID,device:hostState.deviceId,controller:hostState.controller,column:hostState.column||0,row:hostState.row||0,state:hostState.state,stateCount:hostAction()?.States?.length||1,settings:hostState.actionSettings||{},resources:{}});engine.pluginUUID=pluginState.manifest?.UUID||'decklab.plugin';engine.globalSettings=P.clone(profileState.globalSettings||{});engine.piContext=profilePiState.context;return engine;}
 function diagnostic(result,packet){if(['rejected','unsupported'].includes(result.status))logProfile('protocol:'+result.status,{event:packet.event,errors:result.errors,version});}
 function prepared(channel,message){const e=sync(),i=e.instances.get(message.context);let m=P.clone(message);const a=e.api(channel,m.event);
  if(i&&a?.required.payload&&a.controllers.length&&m.payload&&'settings' in m.payload){const extra={...m.payload};for(const k of ['settings','controller','coordinates','isInMultiAction','resources','state'])delete extra[k];m.payload=e.payload(i,m.event,extra,channel);}
  if(m.payload&&P.compare(version,'7.1')<0&&'settings' in m.payload)delete m.payload.resources;
  return m;
 }
 function deliver(outputs){for(const o of outputs){if(o.channel==='host->pi')rawPi(o.packet);else rawSend(o.packet);}}
 liveSendToPlugin=function(message){if(!message||typeof message!=='object')return false;const e=sync(),i=e.instances.get(message.context);let result;
  if(i&&['dialDown','dialUp'].includes(message.event))result=e.input(message.event,i.context,message.payload?Object.fromEntries(Object.entries(message.payload).filter(([k])=>!['settings','controller','coordinates','isInMultiAction','resources','state'].includes(k))):{});
  else result=e.host('host->plugin',prepared('host->plugin',message));
  diagnostic(result,message);let sent=false;for(const o of result.outputs)sent=rawSend(o.packet)||sent;return sent;
 };
 profileSendToPi=function(message){const result=sync().host('host->pi',prepared('host->pi',message));diagnostic(result,message);deliver(result.outputs);};
 async function command(channel,message){const e=sync(),i=e.instances.get(message?.context),result=e.dispatch(channel,message);diagnostic(result,message);
  if(result.status==='adapter'){if(i){await applyProfileCommand(i,message.event,message.payload||{});result.status='partial-adapter';}else result.status='unsupported';}
  profileState.globalSettings=P.clone(e.globalSettings);deliver(result.outputs);
  if(i&&result.status==='handled'){refreshProfileInstance(i.context);profileScheduleAutosave();}
  if(message?.event==='setGlobalSettings')profileScheduleAutosave();
  return result;
 }
 handleProfilePluginMessage=async function(inst,message){await command('plugin->host',message);return true;};
 handleLivePluginMessage=async function(message){
  if(typeof testState!=='undefined'&&testState.running){const a=engine.api('plugin->host',message?.event);if(!engine.available(a)){diagnostic({status:'rejected',errors:['Unavailable API/version']},message);return;}return rawPlugin(message);}
  if(profileInstanceByContext(message?.context)||currentMode==='profile'||['getResources','setResources','setTriggerDescription','switchToProfile'].includes(message?.event)){await command('plugin->host',message);return;}
  const errors=sync().validate('plugin->host',message);if(errors.length){diagnostic({status:'rejected',errors},message);return;}engine.record('plugin->host',message,'legacy-adapter');return rawPlugin(message);
 };
 handleProfilePiCommand=async function(message){const result=await command('pi->host',message);if(message?.event==='registerPropertyInspector'&&result.status==='handled'){const s=document.getElementById('profilePiStatus');if(s)s.textContent='connected';}};
 const rawProfileInfo=profileInfoObject,rawHostInfo=hostInfoObject;const rawActionInfo=profileActionInfoObject;profileActionInfoObject=function(i){const m=rawActionInfo(i);sync();m.payload=engine.payload(i,'didReceiveSettings',{},'host->pi');return m;};
 function info(original){const data=original();data.application.version=version+'.0';data.colors.buttonMouseOverBackgroundColor='#30323d';return data;}
 profileInfoObject=()=>info(rawProfileInfo);hostInfoObject=()=>info(rawHostInfo);
 function setVersion(v){if(!c.versions.includes(v))throw Error('Unknown version');version=v;engine.version=v;try{localStorage.setItem('decklab.protocol.version',v);}catch(_){}return v;}
 function inject(event,payload){if(event==='systemDidWakeUp'&&profileState.connected){for(const i of profileVisibleRuntimeInstances().filter(i=>!profileIsLocalAction(i)))liveSendToPlugin(profileWillAppear(i));}return liveSendToPlugin({event,...(payload===undefined?{}:{payload})});}
 window.DeckLabProtocolRuntime={engine,sync,command,setVersion,get version(){return version;},inject,trace:()=>({format:'DeckLabProtocolTrace',origin:'decklab',version,deviceModel:profileState.target,contractRevision:c.revision,events:P.clone(engine.trace.filter(t=>['emitted','handled','partial-adapter','simulated','adapter'].includes(t.result)).map(t=>({channel:t.channel,packet:t.packet})))})};
})();
