// SPDX-License-Identifier: MPL-2.0
const DECKLAB_BUILTINS=DECKLAB_ACTION_CATALOGUE.map(a=>structuredClone(a));
const decklabImportedActions=new Map();
function profileAvailableActions(){
 const loaded=Array.isArray(pluginState.manifest?.Actions)?pluginState.manifest.Actions:[];
 const result=[...DECKLAB_BUILTINS,...loaded.filter(a=>!DECKLAB_BUILTINS.some(b=>b.UUID===a.UUID))];
 for(const a of decklabImportedActions.values())if(!result.some(b=>b.UUID===a.UUID))result.push(a);
 return result;
}
function profilePrepareImportedActions(data){
 for(const raw of data.placements||[]){
  const instances=raw.kind==='action'?[raw]:Object.values(raw.sequences||{}).flat().filter(s=>s.kind==='action');
  for(const p of instances){
   const existing=profileAvailableActions().find(a=>a.UUID===p.actionUuid);
   if(!existing)decklabImportedActions.set(p.actionUuid,{UUID:p.actionUuid,Name:p.importName||p.sourceAction?.Name||p.title||p.actionUuid,Controllers:[p.controller||'Keypad'],States:[{Title:p.title||p.importName||p.actionUuid}],DeckLabPlaceholder:true});
   else if(existing.DeckLabPlaceholder&&!existing.Controllers.includes(p.controller))existing.Controllers.push(p.controller);
  }
 }
}
function profileIsLocalAction(inst){const a=profileActionFor(inst);return !!(a?.DeckLabBuiltin||a?.DeckLabPlaceholder);}
function profileImportedVisuals(inst){
 if(!Array.isArray(inst.nativeStates))return;
 const s=inst.nativeStates[Number(inst.state)||0]||inst.nativeStates[0]||{};
 inst.title=s.Title??inst.importName??inst.title;inst.image=typeof s.previewImage==='string'&&/^data:image\/(png|jpeg|gif|webp);base64,/.test(s.previewImage)?s.previewImage:null;
 inst.imageOrigin='profile';inst.animationNote=inst.image?.startsWith('data:image/gif')?'imported GIF · animated':'imported profile image';
}
function profileRunBuiltin(inst,event){
 const action=profileActionFor(inst);if(!profileIsLocalAction(inst))return false;
 if(event!=='keyUp'&&event!=='dialUp'&&event!=='touchTap')return true;
 if(action.DeckLabPlaceholder){profileBuiltinNotice(`“${action.Name}” is preserved, but its behaviour is not implemented or its plugin is not loaded.`);logProfile('unsupportedAction',{action:inst.actionUuid,settings:inst.settings});return true;}
 if(inst.actionUuid==='com.decklab.visual')return true;
 const id=inst.actionUuid.replace('com.elgato.streamdeck.',''),settings=inst.settings||{};
 if(id==='page.next'||id==='page.previous'){
  const pages=profileTopLevelPages(),i=pages.findIndex(p=>p.id===profileState.currentPageId),next=pages[i+(id==='page.next'?1:-1)];
  if(i>=0&&next)navigateProfilePage(next.id,action.Name);else profileBuiltinNotice('No page in that direction.');
 }else if(id==='page.goto'){
  const page=profileState.pages.find(p=>p.id===settings.pageId);if(page)navigateProfilePage(page.id,'Go to Page');else profileBuiltinNotice('Choose a destination page in the action settings.');
 }else if(id==='profile.backtoparent'){
  if(profilePage()?.parentPageId)profileBack();else profileBuiltinNotice('Already at the top level.');
 }else profileBuiltinNotice(`${action.Name} simulated: ${String(settings[action.field]||JSON.stringify(settings)).slice(0,180)}`);
 logProfile('builtinSimulation',{action:inst.actionUuid,settings:inst.settings});return true;
}
function profileBuiltinNotice(message){const e=document.getElementById('builtinSimulationNotice');if(e){e.textContent=message;e.hidden=false;}}
function renderBuiltinSettings(){
 const host=document.getElementById('builtinActionSettings');if(!host)return;host.replaceChildren();const inst=selectedProfileInstance(),action=profileActionFor(inst);host.hidden=!profileIsLocalAction(inst);if(!inst||!action)return;if(inst.actionUuid==='com.decklab.visual'){host.hidden=true;return;}
 const note=document.createElement('p');note.className='hint';note.textContent=action.DeckLabPlaceholder?'Preserved action · behaviour unavailable. Original settings remain below.':'Built-in simulation · navigation works inside DeckLab; system actions report their result here.';host.append(note);
 if(!action.field)return;
 const label=document.createElement('label');label.textContent=action.label;const field=document.createElement(action.field==='pageId'?'select':'input');
 if(action.field==='pageId'){field.append(new Option('Choose a page',''));for(const p of profileState.pages)field.append(new Option(p.name,p.id));}else field.type='text';
 field.value=inst.settings?.[action.field]??action.defaults[action.field]??'';field.addEventListener('change',()=>{profilePushHistory('edit built-in settings');inst.settings={...inst.settings,[action.field]:field.value};profileScheduleAutosave();document.getElementById('profileInstanceSettings').value=JSON.stringify(inst.settings,null,2);});label.append(field);host.append(label);
}
