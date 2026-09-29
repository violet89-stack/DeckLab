// SPDX-License-Identifier: MPL-2.0
/* User artwork belongs to the profile placement, independent of its action. */
(function(){
 const $=id=>document.getElementById(id);
 const safeImage=s=>typeof s==='string'&&/^data:image\/(png|jpeg|gif|webp);base64,/.test(s)?s:null;
 function resolve(p){
  const preview=window.DeckLabCreator?.preview;if(preview?.id===p.id)p={...p,customVisual:{...p.customVisual,image:preview.image,showTitle:false,states:null}};if(!p.customVisual)return window.DeckLabRuntimeVisuals?.resolve(p)||p;const v={...p.customVisual,...p.customVisual.states?.[Number(p.state)||0]},base=p.nativeStates?.[Number(p.state)||0]||p.nativeStates?.[0]||{};
  const appearance={...base,Title:v.title??p.title??p.name,ShowTitle:v.showTitle!==false,TitleColor:/^#[\da-f]{6}$/i.test(v.colour||'')?v.colour:'#ffffff',FontSize:Math.max(6,Math.min(32,Number(v.size)||12)),TitleAlignment:['top','middle','bottom'].includes(v.align)?v.align:'bottom'};
  return DeckLabRuntimeVisuals.resolve({...p,title:appearance.Title,image:safeImage(v.image)||p.image,nativeStates:Array.from({length:Math.max(2,Number(p.state)+1)},()=>appearance)});
 }
 function commit(p,patch){if(!p||window.decklabLivePreview)return;profilePushHistory('edit artwork');if(patch.image&&!('template' in patch))patch={...patch,template:null,artworkCredit:null};if(patch.image&&p.customVisual?.states){patch={...patch,states:{...p.customVisual.states,[Number(p.state)||0]:{...p.customVisual.states[Number(p.state)||0],image:patch.image}},creator:null};}p.customVisual={...p.customVisual,...patch};renderProfileDeck();sync();profileScheduleAutosave();}
 function sync(){const host=$('placementVisuals');if(!host)return;const p=selectedProfilePlacement();host.hidden=!p||profileDevice().inputOnly;if(host.hidden)return;
  const resolved=resolve(p),v=p.customVisual||{},state=resolved.nativeStates?.[Number(p.state)||0]||{};
  $('visualTitle').value=v.title??resolved.title??p.name??'';$('visualShowTitle').checked=v.showTitle??state.ShowTitle!==false;
  $('visualColour').value=/^#[\da-f]{6}$/i.test(v.colour||state.TitleColor||'')?(v.colour||state.TitleColor):'#ffffff';$('visualSize').value=v.size||state.FontSize||12;$('visualAlign').value=v.align||state.TitleAlignment||'bottom';$('visualFit').value=v.fit||'cover';
  const img=$('visualImagePreview');img.hidden=!resolved.image;if(resolved.image)img.src=resolved.image;else img.removeAttribute('src');
  $('visualReset').disabled=!p.customVisual;
  const select=$('visualAction');select.replaceChildren();select.closest('label').hidden=p.kind!=='action';if(p.kind==='action')profileAvailableActions().forEach((a,i)=>{if((a.VisibleInActionsList!==false||a.UUID===p.actionUuid)&&getActionControllers(a).includes(p.controller))select.append(new Option(a.Name||a.UUID,String(i),false,a.UUID===p.actionUuid));});
 }
 async function assignAction(value,p=selectedProfileInstance()){const a=profileAvailableActions()[Number(value)];if(!p||!a||a.UUID===p.actionUuid||!getActionControllers(a).includes(p.controller))return;
  profilePushHistory('change action');if(profileState.connected)profileLifecycleForPlacement(p,'willDisappear','action changed');unloadProfilePropertyInspector();
  const existing=resolve(p);const visual=p.controller==='Keypad'?{...p.customVisual,title:existing.title??'',...(safeImage(existing.image)?{image:existing.image}:{})}:p.customVisual?deepClone(p.customVisual):null;Object.assign(p,{actionIndex:Number(value),actionUuid:a.UUID,context:profileMakeContext(a),settings:deepClone(a.defaults||{}),state:0,layout:null,previewLayout:null,overlay:null,resources:{},runtimeVisuals:null,nativeStates:null,sourceAction:null,importName:null,customVisual:visual});profileManifestVisuals(p);
  if(['Encoder','Neo'].includes(p.controller)&&!profileIsLocalAction(p))p.layout=await getActionLayout(a,p.controller);
  if(profileState.connected)profileLifecycleForPlacement(p,'willAppear','action changed');selectProfilePlacement(p);profileScheduleAutosave();
 }
 function boot(){
  const host=document.createElement('section');host.id='placementVisuals';host.hidden=true;
  host.innerHTML='<h3>Artwork & action</h3><label>Action<select id="visualAction"></select></label><div class="visual-image-row"><img id="visualImagePreview" alt="Selected artwork" hidden><label class="file-button">Choose image<input id="visualImageInput" type="file" accept="image/png,image/jpeg,image/gif,image/webp"></label></div><label>Title<input id="visualTitle" maxlength="100"></label><div class="visual-fields"><label>Size<input id="visualSize" type="number" min="6" max="32"></label><label>Colour<input id="visualColour" type="color" value="#ffffff"></label><label>Position<select id="visualAlign"><option value="top">Top</option><option value="middle">Centre</option><option value="bottom">Bottom</option></select></label><label>Image fit<select id="visualFit"><option value="cover">Fill</option><option value="contain">Fit</option></select></label></div><label class="visual-show-title"><input id="visualShowTitle" type="checkbox" checked> Show title</label><button id="visualReset" class="secondary" type="button" data-dl-tip="Remove your artwork overrides and restore the action’s current visuals">Reset artwork</button><p id="visualMessage" role="status" class="hint"></p>';
  $('profileInstanceEmpty').after(host);
  $('visualAction').addEventListener('change',e=>assignAction(e.target.value));
  for(const [id,field] of [['visualSize','size'],['visualColour','colour'],['visualAlign','align'],['visualFit','fit'],['visualShowTitle','showTitle']])$(id).addEventListener('change',e=>commit(selectedProfilePlacement(),{[field]:id==='visualShowTitle'?e.target.checked:id==='visualSize'?Math.max(6,Math.min(32,Number(e.target.value)||12)):e.target.value}));
  let titleEditing=false;$('visualTitle').addEventListener('focus',()=>titleEditing=false);$('visualTitle').addEventListener('input',e=>{const p=selectedProfilePlacement();if(!p||window.decklabLivePreview)return;if(!titleEditing){profilePushHistory('edit title');titleEditing=true;}p.customVisual={...p.customVisual,title:e.target.value};renderProfileDeck();profileScheduleAutosave();});
  $('visualReset').onclick=()=>{const p=selectedProfilePlacement();if(!p)return;profilePushHistory('reset artwork');delete p.customVisual;renderProfileDeck();sync();profileScheduleAutosave();};
  $('visualImageInput').onchange=async e=>{const f=e.target.files?.[0],p=selectedProfilePlacement();e.target.value='';if(!f||!p)return;try{
    if(f.size>8*1024*1024)throw Error('Choose an image smaller than 8 MB.');if(!['image/png','image/jpeg','image/gif','image/webp'].includes(f.type))throw Error('Choose PNG, JPEG, GIF or WebP.');
    const data=await new Promise((ok,no)=>{const fr=new FileReader();fr.onload=()=>ok(fr.result);fr.onerror=no;fr.readAsDataURL(f)});
    const img=new Image();img.src=data;await img.decode();if(!profileState.placements.includes(p))throw Error('The selected item was removed. Please select another.');
    commit(p,{image:data});$('visualMessage').textContent=f.name+' · '+img.naturalWidth+' × '+img.naturalHeight;
   }catch(err){$('visualMessage').textContent=err.message||'Could not load this image.';}};
  const manage=document.createElement('button');manage.type='button';manage.className='secondary';manage.textContent='Manage plugins';manage.onclick=()=>$('openPluginsWorkspace').click();document.querySelector('.builder-search').before(manage);
  sync();
 }
 window.DeckLabVisuals={resolve,sync,assignAction,commit};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,120));else setTimeout(boot,120);
})();
