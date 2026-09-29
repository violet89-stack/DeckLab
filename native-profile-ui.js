// SPDX-License-Identifier: MPL-2.0
function showNativeImportSummary(data){
 let dialog=document.getElementById('nativeImportSummary');if(!dialog){dialog=document.createElement('dialog');dialog.id='nativeImportSummary';document.body.append(dialog);}dialog.replaceChildren();
 const add=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;dialog.append(e);return e;};
 add('h2','Profile imported');add('p',`${data.name||'Profile'} · ${profileState.pages.length} pages / folders · ${profileState.placements.length} placements`);
 const unavailable=profileState.placements.filter(p=>p.kind==='action'&&profileActionFor(p)?.DeckLabPlaceholder);
 add('p',`${unavailable.length} placements preserved without runnable behaviour. Built-in system actions are simulated; navigation operates inside DeckLab.`);
 const list=add('ul','');for(const name of [...new Set(unavailable.map(p=>profileActionFor(p)?.Name||p.actionUuid))]){const li=document.createElement('li');li.textContent=name;list.append(li);}
 const issues=[...(data.importWarnings||[])];const d=profileDevice();
 for(const p of profileState.placements){if(p.controller==='Keypad'&&(p.column>=d.cols||p.row>=d.rows))issues.push(`Outside the selected device grid: ${p.importName||p.name||p.actionUuid} (${p.column}, ${p.row}). Preserved in the profile.`);if(!d.controllers?.includes(p.controller))issues.push(`Controller unavailable on selected device: ${p.controller}. Placement preserved.`);}
 if(issues.length){add('h3','Review');const ul=add('ul','');for(const issue of [...new Set(issues)]){const li=document.createElement('li');li.textContent=issue;ul.append(li);}}
 const b=add('button','Continue to profile');b.type='button';b.onclick=()=>dialog.close();dialog.showModal();
}
