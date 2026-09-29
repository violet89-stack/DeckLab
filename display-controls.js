// SPDX-License-Identifier: MPL-2.0
/* LCD composition, independent GALLEON action slots and physical dial-set selection. */
(function(){
 const $=id=>document.getElementById(id),A=DeckLabDisplayArtwork;
 const isG=()=>profileState.target==='galleon';
 const coords=n=>isG()?{column:Math.floor(n/2),row:n%2}:{column:n,row:0};
 const instance=n=>{const c=coords(n);return profilePlacementAt('Encoder',c.column,c.row);};
 const capacity=()=>isG()?4:profileDevice().dials;
 function source(id){if(id.startsWith('segment-'))return Math.max(0,Math.min(capacity()-1,Number(id.split('-')[1])||0));const fallback=id==='full'?0:id.startsWith('vertical-')&&isG()?Number(id.split('-')[1])*2:Number(id.split('-')[1]);return Math.max(0,Math.min(capacity()-1,Number(A.config().sources?.[id]??fallback)||0));}
 function change(patch){if(window.decklabLivePreview)return;profilePushHistory('edit LCD layout');const p=profilePage();p.displayArtwork||={};p.displayArtwork[profileState.target]={...A.config(),...patch};renderProfileDeck();profileScheduleAutosave();}
 function editRegion(patch){const id=$('displayPart').value;change({[id]:{...A.config()[id],...patch}});}
 function pick(id){if(window.decklabLivePreview)return;$('displayPart').value=id;$('displayPart').dispatchEvent(new Event('change'));$('displayArtworkEditor').open=true;selectProfilePlacement(instance(source(id))||null,{render:false});sync();}
 function active(dial){return Number(A.config().active?.[dial])===1?1:0;}
 function setActive(dial,row,{render=true}={}){
  if(!isG()||![0,1].includes(dial)||![0,1].includes(row)||active(dial)===row)return;
  const page=profilePage();page.displayArtwork||={};page.displayArtwork.galleon||={};
  page.displayArtwork.galleon.active={...page.displayArtwork.galleon.active,[dial]:row};
  if(render)renderProfileDeck();profileScheduleAutosave();
 }
 // Keep the physical control, selected action and LCD editor on the same target.
 // Full/split compositions retain their source; an unrelated dial is edited in
 // the selected-action inspector rather than silently retargeting that display.
 function reflectTarget(column,row=0){
  if(window.decklabLivePreview||!A.spec()||!$('displayPart'))return;
  const n=isG()?column*2+row:column,surface=$('profileDeck')?.querySelector('.ds-surface');
  if(!surface)return;
  const ids=A.regions(surface).map(([id])=>id),current=$('displayPart').value;
  const id=ids.includes(current)&&source(current)===n?current:ids.find(id=>source(id)===n);
  if(id){$('displayPart').value=id;$('displayArtworkEditor').open=true;}
  else $('displayArtworkEditor').open=false;
 }
 const selectPlacement=selectProfilePlacement;
 selectProfilePlacement=function(p,options){
  if(p?.controller==='Encoder'&&!window.decklabLivePreview){
   if(isG())setActive(Number(p.column),Number(p.row)||0,{render:false});
   reflectTarget(Number(p.column),Number(p.row)||0);
  }
  selectPlacement(p,options);sync();
 };
 function activate(id){
  if(!isG())return;const n=source(id),c=coords(n);
  setActive(c.column,c.row);selectProfilePlacement(instance(n),{render:false});
  const status=$('studioPreviewStatus');if(status)status.textContent=(c.column?'Right':'Left')+' dial controls the '+(c.row?'bottom':'top')+' action';
 }
 async function clickRegion(id){
  if(window.decklabLivePreview){activate(id);return;}
  const c=coords(source(id));if(isG())setActive(c.column,c.row);
  await profileSlotClick('Encoder',c.column,c.row);pick(id);
 }
 function sync(){if(!$('displayBuildMode')||!A.spec())return;const mode=A.config().mode||'segments';$('displayBuildMode').value=mode;const surface=$('profileDeck')?.querySelector('.ds-surface');if(A.modeOf($('displayPart').value)!==mode&&surface)$('displayPart').value=A.regions(surface)[0][0];const id=$('displayPart').value||'segment-0',n=source(id),sel=$('displaySource'),r=A.config()[id]||{};sel.replaceChildren();for(let i=0;i<capacity();i++){const p=instance(i);sel.add(new Option((isG()?'Action '+(i+1)+' · '+(i<2?'left':'right')+' '+(i%2?'bottom':'top'):'Dial '+(i+1))+(p?' · '+(profileActionFor(p)?.Name||p.actionUuid):' · unassigned'),String(i)));}sel.value=String(n);sel.disabled=id.startsWith('segment-');$('displayControlNote').textContent=isG()?'Select a region to choose its dial action. Hold a dial for 3 seconds and release to switch top/bottom. LCD clicks are a simulator shortcut; the hardware screen is non-touch.':'Dial inputs and touch zones keep their physical assignments. Widgets use simulated data.';
 const action=$('displayAction');action.replaceChildren(new Option('Choose an Encoder action…',''));profileAvailableActions().forEach((a,i)=>{if((a.VisibleInActionsList!==false||a.UUID===instance(n)?.actionUuid)&&getActionControllers(a).includes('Encoder'))action.add(new Option(a.Name||a.UUID,String(i)));});const p=instance(n);action.value=p?String(profileAvailableActions().findIndex(a=>a.UUID===p.actionUuid)):'';
 $('displayContent').value=r.content||'action';$('displayActionFields').hidden=!!r.content&&r.content!=='action';$('displayWidgetFields').hidden=r.content!=='widget';$('displayWidget').value=r.widget?.uuid||'com.decklab.demo.cpu';$('displayWidgetValue').value=r.widget?.settings?.value??42;$('displayDialSets').hidden=!isG();for(let i=0;i<2;i++)$('displayActive'+i).value=String(active(i));
 }
 function widgetFace(r){const uuid=r.widget?.uuid||'com.decklab.demo.cpu',a=profileAvailableActions().find(a=>a.UUID===uuid),p={id:'lcd-widget',actionUuid:uuid,settings:{...a?.defaults,value:42,...r.widget?.settings}};return profileActionFace(p);}
 function regionNode(id,n){const c=coords(n),p=instance(n),r=A.config()[id]||{},node=document.createElement('div');node.className='profile-touch-slot profile-encoder-display lcd-build-region';node.dataset.lcdRegion=id;node.dataset.sourceDial=n;if(p){node.dataset.profileId=p.id;node.classList.add('occupied');node.classList.toggle('selected',profileState.selectedId===p.id);attachPlacementDrag(node,p);}installProfileDropTarget(node,'Encoder',c.column,c.row);const h=document.createElement('div');h.className='profile-mini-layout';node.append(h);
 const draw=()=>{if(r.content==='artwork')return;if(r.content==='widget'){h.append(widgetFace(r));return;}if(p){if(p.layout&&!p.customVisual&&!window.DeckLabCreator?.isPreview(p))renderLayoutInto(h,p.layout,{selectable:false});else h.append(profileActionFace(p));}else{const plus=document.createElement('div');plus.className='profile-empty-plus';plus.textContent='+';h.append(plus);}};requestAnimationFrame(draw);
 node.title=(id==='full'?'Full display':id.startsWith('segment-')?'Segment '+(Number(id.split('-')[1])+1):id.startsWith('vertical-')?(id.endsWith('0')?'Left half':'Right half'):(id.endsWith('0')?'Top half':'Bottom half'));node.tabIndex=window.decklabLivePreview&&!isG()?-1:0;if(isG()){node.setAttribute('aria-pressed',String(c.row===active(c.column)));node.title+=' · choose '+(c.column?'right':'left')+' dial '+(c.row?'bottom':'top')+' action';}node.setAttribute('role','button');node.setAttribute('aria-label',node.title);node.addEventListener('click',()=>clickRegion(id));node.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();clickRegion(id);}});return node;}
 function render(){const surface=$('profileDeck')?.querySelector('.ds-surface');if(!A.spec()||!surface)return;surface.querySelectorAll(':scope > .lcd-build-region').forEach(n=>n.remove());const g=surface._geom;
 surface.querySelectorAll(':scope > .ds-touch,:scope > .ds-display').forEach(slot=>{slot.replaceChildren();if(slot.classList.contains('ds-touch')){const p=profilePlacementAt('Encoder',Number(slot.dataset.surfaceIndex),0),hit=document.createElement('div');hit.className='lcd-touch-hit profile-touch-slot';if(p)hit.dataset.profileId=p.id;slot.append(hit);}slot.classList.add('lcd-native-hit');});
 for(const [id,r] of A.regions(surface)){const n=source(id),node=regionNode(id,n);Object.assign(node.style,{position:'absolute',left:r.x/g.w*100+'%',top:r.y/g.h*100+'%',width:r.w/g.w*100+'%',height:r.h/g.h*100+'%'});if(isG()&&coords(n).row===active(coords(n).column))node.classList.add('lcd-active-action');surface.append(node);}sync();}
 const baseDial=makeProfileDial;
 makeProfileDial=function(column){if(!isG()){const wrap=baseDial(column),button=wrap.querySelector('button');button?.addEventListener('click',()=>{reflectTarget(column);sync();});button?.addEventListener('focus',()=>{if(!window.decklabLivePreview){selectProfilePlacement(profilePlacementAt('Encoder',column,0),{render:false});reflectTarget(column);sync();}});return wrap;}const row=active(column),p=profilePlacementAt('Encoder',column,row),wrap=document.createElement('div'),b=document.createElement('button');wrap.className='profile-dial-slot';if(p)wrap.dataset.profileId=p.id;installProfileDropTarget(wrap,'Encoder',column,row);b.type='button';b.className='profile-dial-control';b.title='Turn: wheel / arrows / drag. Hold 3 seconds and release: switch top/bottom action.';b.setAttribute('aria-label',(column?'Right':'Left')+' dial · '+(row?'bottom':'top')+' action');let start=null,y=null,drag=false;
 const rotate=ticks=>{if(p)profileEmitInput(p,'dialRotate',{ticks,pressed:start!==null});else DeckLabSurface.rotateDial(profileState.target,column,ticks);};
 const down=()=>{if(start!==null)return;start=performance.now();drag=false;DeckLabSurface.pressDial('galleon',column,true);};
 const release=cancel=>{if(start===null)return;const held=performance.now()-start;start=null;y=null;DeckLabSurface.pressDial('galleon',column,false);if(cancel)return;if(held>=3000&&!drag){setActive(column,1-row);return;}if(!drag&&p){profileEmitInput(p,'dialDown',{});profileEmitInput(p,'dialUp',{});}};
 b.addEventListener('wheel',e=>{e.preventDefault();rotate(e.deltaY<0?1:-1);},{passive:false});b.addEventListener('pointerdown',e=>{down();y=e.clientY;b.setPointerCapture?.(e.pointerId);});b.addEventListener('pointermove',e=>{if(start===null||y===null)return;const t=Math.trunc((y-e.clientY)/8);if(t){drag=true;y-=t*8;rotate(t);}});b.addEventListener('pointerup',()=>release(false));b.addEventListener('pointercancel',()=>release(true));b.addEventListener('blur',()=>release(true));b.addEventListener('keydown',e=>{if(['ArrowUp','ArrowRight','ArrowDown','ArrowLeft'].includes(e.key)){e.preventDefault();rotate(['ArrowUp','ArrowRight'].includes(e.key)?1:-1);}else if(['Enter',' '].includes(e.key)){e.preventDefault();down();}});b.addEventListener('keyup',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();release(false);}});b.addEventListener('click',async()=>{if(!window.decklabLivePreview){await profileSlotClick('Encoder',column,row);reflectTarget(column,row);sync();}});wrap.append(b);return wrap;};
 // Runtime feedback refresh must retain independent widget / artwork-only presentation.
 const refresh=refreshProfileInstance;refreshProfileInstance=function(...args){refresh(...args);if(A.spec())render();};
 function boot(){const box=$('displayArtworkEditor');box.querySelector('summary').textContent='LCD layout, widgets & artwork';const controls=document.createElement('div');controls.innerHTML='<label>Build layout<select id="displayBuildMode"><option value="segments">Separate segments</option><option value="full">Full screen / strip</option><option value="vertical">Vertical split · left / right</option><option value="horizontal">Horizontal split · top / bottom</option></select></label><div id="displayDialSets"><label>Left dial action<select id="displayActive0"><option value="0">Top</option><option value="1">Bottom</option></select></label><label>Right dial action<select id="displayActive1"><option value="0">Top</option><option value="1">Bottom</option></select></label></div>';box.querySelector('summary').after(controls);$('displayPart').closest('label').firstChild.textContent='Selected region';const binding=document.createElement('div');binding.innerHTML='<label>Content<select id="displayContent"><option value="action">Dial action feedback</option><option value="widget">Built-in widget · simulated</option><option value="artwork">Artwork only</option></select></label><div id="displayActionFields"><label>Action source<select id="displaySource"></select></label><label>Action<select id="displayAction"></select></label></div><div id="displayWidgetFields"><label>Widget<select id="displayWidget"></select></label><label>Sample value<input id="displayWidgetValue" type="number" min="0" max="100"></label></div><p class="hint" id="displayControlNote"></p>';$('displayPart').closest('label').after(binding);
 for(const a of profileAvailableActions().filter(a=>a.demo))$('displayWidget').add(new Option(a.Name,a.UUID));
 $('displayBuildMode').onchange=e=>{const mode=e.target.value;change({mode});pick(mode==='full'?'full':mode==='segments'?'segment-0':mode+'-0');};$('displayPart').addEventListener('change',()=>{const id=$('displayPart').value,mode=A.modeOf(id);if((A.config().mode||'segments')!==mode)change({mode});const c=coords(source(id));if(isG())setActive(c.column,c.row);selectProfilePlacement(instance(source(id))||null,{render:false});sync();});$('displaySource').onchange=e=>{const id=$('displayPart').value;change({sources:{...A.config().sources,[id]:Number(e.target.value)}});pick(id);};$('displayAction').onchange=async e=>{if(window.decklabLivePreview||e.target.value==='')return;const id=$('displayPart').value,n=source(id),idx=Number(e.target.value),p=instance(n),c=coords(n);if(p){selectProfilePlacement(p,{render:false});await DeckLabVisuals.assignAction(idx,p);}else await createProfileActionPlacement(idx,'Encoder',c.column,c.row);renderProfileLab();pick(id);};
 $('displayContent').onchange=e=>editRegion({content:e.target.value});const widget=()=>editRegion({widget:{uuid:$('displayWidget').value,settings:{value:Math.max(0,Math.min(100,Number($('displayWidgetValue').value)||0))}}});$('displayWidget').onchange=widget;$('displayWidgetValue').onchange=widget;for(let i=0;i<2;i++)$('displayActive'+i).onchange=e=>{if(!window.decklabLivePreview){profilePushHistory('switch dial action');setActive(i,Number(e.target.value));selectProfilePlacement(profilePlacementAt('Encoder',i,active(i)),{render:false});}};render();}
 const old=renderProfileDeck;renderProfileDeck=function(){old();render();};const colour=DeckLabAppearance.select;DeckLabAppearance.select=function(...args){colour(...args);render();};window.DeckLabDisplayControls={source,change,pick,render,coords,instance,active,setActive,activate};document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,360));
})();
