// SPDX-License-Identifier: MPL-2.0
/* Bundled, offline samples. GIF bytes are embedded unchanged in saved profiles. */
(function(){
 const $=id=>document.getElementById(id);
 let pending,generation=0;
 const images=new Map();
 function load(){
  return pending||=(fetch('assets/samples/index.json').then(r=>{
   if(!r.ok)throw Error('Built-in samples unavailable.');
   return r.json();
  }).catch(e=>{pending=null;throw e}));
 }
 async function imageData(id){
  const catalogue=await load(),entry=catalogue.entries.find(e=>e.id===id);
  if(!entry)throw Error('Unknown built-in sample.');
  if(!images.has(id)){
   const request=(async()=>{
    const response=await fetch(entry.path);
    if(!response.ok)throw Error('Could not load '+entry.name+'.');
    const bytes=await response.arrayBuffer();
    if(bytes.byteLength>8*1024*1024)throw Error('Sample exceeds 8 MB.');
    const data=await new Promise((resolve,reject)=>{
     const reader=new FileReader();
     reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Could not read sample.'));
     reader.readAsDataURL(new Blob([bytes],{type:entry.mime}));
    });
    return {...entry,data,pack:'DeckLab samples',author:'DeckLab · AI-generated artwork',license:'MPL-2.0',sourcePath:entry.path,fit:'contain'};
   })();
   images.set(id,request);
   request.catch(()=>images.delete(id));
  }
  return images.get(id);
 }
 async function draw(grid,query,target){
  const stamp=++generation;
  grid.replaceChildren();$('artworkEmpty').hidden=true;
  $('artworkStatus').textContent='Loading built-in samples…';
  try{
   const catalogue=await load();
   if(stamp!==generation||$('artworkSource').value!=='samples')return;
   const words=query.toLowerCase().trim().split(/\s+/).filter(Boolean);
   const found=catalogue.entries.filter(e=>words.every(word=>(e.name+' '+e.description+' '+e.tags.join(' ')).toLowerCase().includes(word)));
   $('artworkStatus').textContent='Bundled artwork · available offline';
   $('artworkEmpty').hidden=!!found.length;$('artworkEmpty').textContent='No built-in samples match your search.';
   for(const entry of found){
    const card=document.createElement('div');card.className='artwork-card builtin-artwork-card';
    const use=document.createElement('button');use.type='button';use.className='artwork-use';use.dataset.sampleId=entry.id;
    use.title=entry.description+' · '+entry.width+' × '+entry.height+' · '+entry.durationSeconds+' second loop';
    use.draggable=true;use.ondragstart=e=>{e.dataTransfer.setData('application/x-decklab-sample',entry.id);e.dataTransfer.effectAllowed='copy';};
    const preview=new Image();preview.src=entry.path;preview.alt='';
    const label=document.createElement('span');label.textContent=entry.name;
    const size=document.createElement('small');size.textContent=entry.surface+' · '+entry.width+' × '+entry.height+' · GIF';
    use.append(preview,label,size);
    use.onclick=async()=>{
     use.disabled=true;
     try{
      const item=await imageData(entry.id);
      if(stamp!==generation||$('artworkSource').value!=='samples')return;
      DeckLabArtwork.apply(item,target);
      $('visualMessage').textContent=entry.name+' · animated · '+entry.width+' × '+entry.height;
      $('artworkDialog').close();
     }catch(e){$('artworkStatus').textContent=e.message;}finally{use.disabled=false}
    };
    const save=document.createElement('button');save.type='button';save.className='elgato-icon-save';save.textContent='+';
    save.title='Save to My artwork for favourites and reuse';save.setAttribute('aria-label','Save '+entry.name+' to My artwork');
    save.onclick=async()=>{
     save.disabled=true;
     try{const item=await imageData(entry.id);await DeckLabArtwork.add(item.name,item.data,item);$('artworkStatus').textContent='Saved '+item.name+' to My artwork.';}
     catch(e){$('artworkStatus').textContent=e.message;}finally{save.disabled=false}
    };
    card.append(use,save);grid.append(card);
   }
  }catch(e){if(stamp===generation)$('artworkStatus').textContent=e.message;}
 }
 function boot(){
  $('profileDeck').addEventListener('dragover',e=>{
   if(!e.dataTransfer.types.includes('application/x-decklab-sample'))return;
   e.preventDefault();e.stopImmediatePropagation();e.dataTransfer.dropEffect=window.decklabLivePreview?'none':'copy';
  },true);
  $('profileDeck').addEventListener('drop',async e=>{
   const id=e.dataTransfer.getData('application/x-decklab-sample');if(!id)return;
   e.preventDefault();e.stopImmediatePropagation();
   if(window.decklabLivePreview||profileDevice().inputOnly)return;
   const node=e.target.closest('[data-art-controller]');if(!node)return;
   const page=profilePage(),device=profileState.target,controller=node.dataset.artController,column=Number(node.dataset.artColumn),row=Number(node.dataset.artRow);
   try{
    const item=await imageData(id);
    if(page!==profilePage()||device!==profileState.target||window.decklabLivePreview)return;
    let p=profilePlacementAt(controller,column,row);
    if(!p)p=await createProfileActionPlacement(profileAvailableActions().findIndex(a=>a.UUID==='com.decklab.visual'),controller,column,row);
    if(p){
     selectProfilePlacement(p);
     DeckLabArtwork.apply(item,{kind:'action',device,page,placement:p});
     $('artworkStatus').textContent='Applied '+item.name;
    }
   }catch(err){$('artworkStatus').textContent=err.message;}
  },true);
 }
 window.DeckLabSamples={load,imageData,draw,cancel:()=>generation++};
 document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,480));
})();
