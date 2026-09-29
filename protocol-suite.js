// SPDX-License-Identifier: MPL-2.0
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./protocol-core.js'));else root.DeckLabProtocolSuite=factory(root.DeckLabProtocol);})(typeof window!=='undefined'?window:globalThis,function(P){
 function run(contract,fixtures){return fixtures.map(f=>{const errors=[],check=(actual,expected,label)=>{if(P.stable(actual)!==P.stable(expected))errors.push(label+': expected '+P.stable(expected)+'; got '+P.stable(actual));};try{
  const e=new P.Engine(contract,{version:f.version,instances:P.clone(f.instances),globalSettings:f.globalSettings,piContext:f.piContext});const before=P.stable([...e.instances]);const beforeGlobal=P.stable(e.globalSettings);let result;
  if(f.operation==='build'){const i=e.instances.get(f.packet.context);result=e.host(f.channel,e.packet(f.packet.event,i,f.extra||{},f.channel));}
  else if(f.operation==='input')result=e.input(f.packet.event,f.packet.context,f.extra||{});
  else result=f.operation==='host'?e.host(f.channel,f.packet):e.dispatch(f.channel,f.packet);
  check(result.status,f.expectedStatus,'status');check(result.outputs,f.expectedOutputs,'outputs');
  if(f.expectedStatus==='rejected'||f.expectedStatus==='unsupported'){check(P.stable([...e.instances]),before,'no instance mutation');check(P.stable(e.globalSettings),beforeGlobal,'no global mutation');}
  else {for(const [k,v] of Object.entries(f.expectedInstance||{}))check(e.instances.get(f.instances[0].context)[k],v,'instance.'+k);if(f.expectedGlobal)check(e.globalSettings,f.expectedGlobal,'global settings');if(f.expectedRegistration)check(e.registrations[f.channel],f.expectedRegistration,'registration');if(f.expectedLog)check(e.logs.at(-1),f.expectedLog,'log');}
 }catch(err){errors.push(err.message);}return {id:f.id,api:f.api,controller:f.controller,version:f.version,kind:f.kind,pass:errors.length===0,errors};});}
 return {run};
});
