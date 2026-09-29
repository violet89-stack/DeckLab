// SPDX-License-Identifier: MPL-2.0
/* Runtime visual overrides are scoped to the action state and SDK target.
   They never modify source artwork or serialised user design settings. */
(function(){
 const own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
 function actionFor(i){return i===hostState?hostAction():profileActionFor(i);}
 function base(i,state){const a=actionFor(i)||{},s=a.States?.[state]||a.States?.[0]||{},n=i.nativeStates?.[state]||i.nativeStates?.[0]||{},v=window.DeckLabVisuals?DeckLabVisuals.visual({...i,state}):{...i.customVisual,...i.customVisual?.states?.[state]};const ref=s.Image||a.Icon||null;
  return {title:v.title??n.Title??s.Title??'',image:own(v,'image')?v.image:n._image||pluginAssetUrl(ref)||null,imageRef:ref};
 }
 function init(i){if(i.runtimeVisuals)return;const count=Math.max(1,actionFor(i)?.States?.length||1);i.runtimeVisuals={hardware:{},software:{},base:{}};for(let n=0;n<count;n++)i.runtimeVisuals.base[n]=base(i,n);const s=Number(i.state)||0;i.runtimeVisuals.base[s]={...i.runtimeVisuals.base[s],title:i.title??'',image:i.image??null,imageRef:i.imageRef??null};}
 function resolve(i,target='hardware'){if(!i.runtimeVisuals)return i;const s=Number(i.state)||0,o=i.runtimeVisuals[target]?.[s]||{};return {...i,...i.runtimeVisuals.base[s],...o};}
 function refresh(i){if(!i.runtimeVisuals)return;const r=resolve(i);i.title=r.title;i.image=r.image;i.imageRef=r.imageRef;if(r.imageOrigin)i.imageOrigin=r.imageOrigin;}
 async function command(i,event,p={}){init(i);const count=Math.max(1,actionFor(i)?.States?.length||1),states=p.state===undefined||count===1?Array.from({length:count},(_,n)=>n):[p.state],targets=p.target===1?['hardware']:p.target===2?['software']:['hardware','software'];let image;
  if(event==='setImage'&&p.image){const scratch={frameTimes:[]};await setProfileRuntimeImage(scratch,p.image);if(scratch.imageOrigin!=='runtime'){i.animationNote=scratch.animationNote;return;}image={image:scratch.image,imageRef:scratch.imageRef,imageOrigin:'runtime'};i.animationNote=scratch.animationNote;}
  for(const target of targets)for(const state of states){const o=i.runtimeVisuals[target][state]||={};if(event==='setTitle'){if(p.title===undefined){delete o.title;i.runtimeVisuals.base[state]={...i.runtimeVisuals.base[state],title:base(i,state).title};}else o.title=p.title;}else if(p.image==null||p.image===''){for(const k of ['image','imageRef','imageOrigin'])delete o[k];Object.assign(i.runtimeVisuals.base[state],base(i,state));}else Object.assign(o,image);}
  refresh(i);
 }
 window.DeckLabRuntimeVisuals={base,resolve,refresh,command};
})();
