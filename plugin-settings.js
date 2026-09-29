// SPDX-License-Identifier: MPL-2.0
/* Local plugin settings never enter shareable profile/project exports. */
(function(){
 const prefix='decklab.pluginGlobals.v1.';let active=null;
 const valid=v=>v&&typeof v==='object'&&!Array.isArray(v);
 function read(id){try{const v=JSON.parse(localStorage.getItem(prefix+id)||'{}');return valid(v)?v:{};}catch(_){return {};}}
 function save(){if(active)try{localStorage.setItem(prefix+active,JSON.stringify(profileState.globalSettings||{}));}catch(e){logProfile('pluginSettingsSaveFailed',{error:e.message});}}
 let migrated=false;
 function migrate(){if(migrated)return;migrated=true;for(const key of ['decklab.profile.autosave.v10','decklab.profile.autosave.v09','decklab.profile.autosave.v08','decklab.profile.autosave.v07','decklab.project.autosave.v10']){try{const raw=JSON.parse(localStorage.getItem(key)||'null');const data=raw?.profile||raw;const id=data?.plugin?.uuid;if(id&&valid(data.globalSettings)&&localStorage.getItem(prefix+id)===null)localStorage.setItem(prefix+id,JSON.stringify(data.globalSettings));}catch(_){}}}
 function sync(){migrate();const next=pluginState.manifest?.UUID||'decklab.local';if(next!==active){save();active=next;profileState.globalSettings=read(next);}return profileState.globalSettings;}
 function restore(data,{autosave=false}={}){sync();const id=data.plugin?.uuid||active;if(autosave&&valid(data.globalSettings)){try{if(localStorage.getItem(prefix+id)===null)localStorage.setItem(prefix+id,JSON.stringify(data.globalSettings));}catch(_){}if(id===active)profileState.globalSettings=read(id);}/* An imported shareable profile cannot overwrite local plugin settings. */}
 window.DeckLabPluginSettings={sync,save,restore};
})();
