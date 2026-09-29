// SPDX-License-Identifier: MPL-2.0
/* Independent Stream Deck profile reader. Imports data only; never executes actions. */
(function(root){
 'use strict';
 const LIMIT=64*1024*1024, MAX_FILE=8*1024*1024;
 const text=new TextDecoder();
 function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
 async function unzip(input){
  const bytes=new Uint8Array(input),v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);if(bytes.length>LIMIT)throw Error('Profile archive exceeds 64 MB.');
  let end=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(v.getUint32(i,true)===0x06054b50&&i+22+v.getUint16(i+20,true)===bytes.length){end=i;break;}
  if(end<0)throw Error('Not a complete ZIP profile.');
  if(v.getUint16(end+4,true)||v.getUint16(end+6,true))throw Error('Split ZIP profiles are not supported.');
  const count=v.getUint16(end+10,true);let p=v.getUint32(end+16,true),total=0;const result=new Map();
  if(count>5000||count===65535)throw Error('Too many profile files.');
  for(let i=0;i<count;i++){
   if(p+46>bytes.length||v.getUint32(p,true)!==0x02014b50)throw Error('Invalid ZIP directory.');
   const flags=v.getUint16(p+8,true),method=v.getUint16(p+10,true),crc=v.getUint32(p+16,true),compressed=v.getUint32(p+20,true),size=v.getUint32(p+24,true),nl=v.getUint16(p+28,true),el=v.getUint16(p+30,true),cl=v.getUint16(p+32,true),local=v.getUint32(p+42,true);
   const name=text.decode(bytes.slice(p+46,p+46+nl)).replace(/\\/g,'/');p+=46+nl+el+cl;
   if(name.startsWith('/')||name.split('/').includes('..')||name.includes(':'))throw Error('Unsafe archive path.');
   if(flags&1)throw Error('Encrypted ZIP profiles are not supported.');
   total+=size;if(size>MAX_FILE||total>LIMIT)throw Error('Expanded profile exceeds import limits.');
   if(name.endsWith('/'))continue;
   if(result.has(name))throw Error('Duplicate file in archive.');
   if(local+30>bytes.length||v.getUint32(local,true)!==0x04034b50)throw Error('Invalid ZIP entry.');
   const start=local+30+v.getUint16(local+26,true)+v.getUint16(local+28,true);if(start+compressed>bytes.length)throw Error('Truncated ZIP entry.');
   let data=bytes.slice(start,start+compressed);
   if(method===8){
    const reader=new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader(),chunks=[];let length=0;
    try{while(true){const r=await reader.read();if(r.done)break;length+=r.value.length;if(length>size||length>MAX_FILE)throw Error('Invalid expanded file size.');chunks.push(r.value);}}finally{await reader.cancel();}
    data=new Uint8Array(length);let at=0;for(const c of chunks){data.set(c,at);at+=c.length;}
   }else if(method!==0)throw Error('Unsupported ZIP compression.');
   if(data.length!==size||crc32(data)!==crc)throw Error('Profile file failed integrity check.');
   result.set(name,data);
  }
  return result;
 }
 function pageUUID(name){
  const plain=name.toLowerCase();if(/^[a-f0-9-]{36}$/.test(plain))return plain;
  // Stream Deck's filesystem-safe base32 form uses V/W instead of U/V, then Z padding.
  if(!/^[0-9A-TVW]{26}Z$/i.test(name))return plain;
  const alphabet='0123456789ABCDEFGHIJKLMNOPQRSTVW';let bits=0n;for(const c of name.slice(0,26).toUpperCase())bits=(bits<<5n)|BigInt(alphabet.indexOf(c));
  const h=(bits>>2n).toString(16).padStart(32,'0');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
 }
 const models={'20GAI9901':'mini','20GAA9902':'standard','20GAT9902':'xl','20GBD9901':'plus','20GBJ9901':'neo','20GBX9901':'plusxl'};
 function convert(files){
  const roots=[...files.keys()].filter(n=>/(^|\/)[^/]+\.sdProfile\/manifest\.json$/i.test(n));if(roots.length!==1)throw Error('Select an archive containing exactly one .sdProfile.');
  const path=roots[0],prefix=path.slice(0,-13),read=n=>JSON.parse(text.decode(files.get(n))),manifest=read(path);
  if(!manifest||typeof manifest!=='object'||!manifest.Device)throw Error('Invalid Stream Deck profile manifest.');
  const warnings=[],pages=[],placements=[],documents=[],assets={};let assetBytes=0;
  const image=(ref,base)=>{
   if(typeof ref!=='string'||!ref||ref.includes('..'))return null;
   const choices=[base+ref,prefix+ref,...[...files.keys()].filter(n=>n.startsWith(prefix)&&n.endsWith('/'+ref))];const matches=[...new Set(choices.filter(n=>files.has(n)))];
   const chosen=files.has(choices[0])?choices[0]:files.has(choices[1])?choices[1]:matches.length===1?matches[0]:null;
   if(!chosen){warnings.push(`Missing or ambiguous image: ${ref}`);return null;}
   if(assets[chosen])return assets[chosen];const data=files.get(chosen),ext=chosen.split('.').pop().toLowerCase(),mime={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp'}[ext];
   if(!mime){warnings.push(`Image format not previewed: ${ref}`);return null;}
   assetBytes+=data.length;if(assetBytes>16*1024*1024)throw Error('Referenced images exceed 16 MB.');
   let binary='';for(let i=0;i<data.length;i+=16384)binary+=String.fromCharCode(...data.subarray(i,i+16384));return assets[chosen]=`data:${mime};base64,${btoa(binary)}`;
  };
  const pageNames=[...files.keys()].filter(n=>n.startsWith(prefix+'Profiles/')&&/\/manifest\.json$/.test(n));
  for(const n of pageNames){const id=pageUUID(n.split('/').slice(-2)[0]),doc=read(n);if(pages.some(p=>p.id===id))throw Error('Duplicate page identifier.');pages.push({id,name:doc.Name||`Page ${pages.length+1}`,parentPageId:null,folderId:null});documents.push({id,doc,base:n.slice(0,-13)});}
  if(!pages.length){pages.push({id:'page-1',name:'Page 1',parentPageId:null,folderId:null});documents.push({id:'page-1',doc:manifest,base:prefix});}
  const pageById=new Map(pages.map(p=>[p.id,p]));
  const listed=Array.isArray(manifest.Pages?.Pages)?manifest.Pages.Pages.map(x=>String(x).toLowerCase()):[];
  pages.sort((a,b)=>{const ai=listed.indexOf(a.id),bi=listed.indexOf(b.id);return (ai<0?9999:ai)-(bi<0?9999:bi);});
  for(const {id,doc,base} of documents){
   const controllers=Array.isArray(doc.Controllers)?doc.Controllers:[{Type:'Keypad',Actions:doc.Actions||{}}];
   for(const c of controllers){
    const controller=c.Type==='Keypad'?'Keypad':c.Type==='Encoder'?'Encoder':c.Type==='Neo'?'Neo':null;
    if(!controller){if(Object.keys(c.Actions||{}).length)warnings.push(`Unsupported controller ${c.Type} on ${id}`);continue;}
    if(c.Background)warnings.push(`Controller background retained as source data, not rendered (${id}).`);
    for(const [slot,a] of Object.entries(c.Actions||{})){
     const coords=/^(\d+),(\d+)$/.exec(slot);if(!coords||!a||typeof a!=='object'){warnings.push(`Invalid action slot ${slot}`);continue;}
     const state=Number.isInteger(a.State)&&a.State>=0?a.State:0,states=Array.isArray(a.States)?a.States:[],visuals=states.map(s=>({...s,previewImage:image(s.Image,base)})),visual=visuals[state]||visuals[0]||{};
     const common={id:`native-${placements.length+1}`,controller,column:Number(coords[1]),row:Number(coords[2]),pageId:id,sourceAction:a,nativeStates:visuals,title:visual.Title??a.Name??'',settings:a.Settings&&typeof a.Settings==='object'?a.Settings:{},state};
     const child=String(a.Settings?.ProfileUUID||'').toLowerCase();
     if(a.UUID==='com.elgato.streamdeck.profile.openchild'&&pageById.has(child)&&child!==id){
      const target=pageById.get(child);if(!target.parentPageId&&!listed.includes(child)){
       // Reject cycles before assigning a parent.
       let ancestor=pageById.get(id),cycle=false;const seen=new Set();while(ancestor){if(ancestor.id===child||seen.has(ancestor.id)){cycle=true;break;}seen.add(ancestor.id);ancestor=pageById.get(ancestor.parentPageId);}
       if(!cycle){target.parentPageId=id;target.folderId=common.id;target.name=visual.Title||a.Name||'Folder';}
      }
      placements.push({...common,kind:'folder',name:visual.Title||a.Name||'Folder',childPageId:child});
     }else{
      placements.push({...common,kind:'action',actionUuid:String(a.UUID||'decklab.unknown'),importName:String(a.Name||'Unknown action')});
      if(a.UUID==='com.elgato.streamdeck.profile.openchild')warnings.push(`Folder destination not found: ${child||'(empty)'}`);
     }
    }
   }
  }
  const target=models[manifest.Device.Model]||'virtual';if(target==='virtual')warnings.push(`Device model ${manifest.Device.Model||'(unknown)'} uses a virtual grid; choose a supported target to compare.`);
  const keyActions=placements.filter(p=>p.controller==='Keypad'),cols=Math.max(1,...keyActions.map(p=>p.column+1)),rows=Math.max(1,...keyActions.map(p=>p.row+1));if(cols>16||rows>16)throw Error('Profile grid exceeds supported import size.');
  const current=String(manifest.Pages?.Current||manifest.Pages?.Default||'').toLowerCase();
  return {format:'DeckLabProfile',version:'1.0',name:manifest.Name||'Imported Stream Deck Profile',target,rows:target==='virtual'?rows:null,cols:target==='virtual'?cols:null,pages,placements,currentPageId:pageById.has(current)?current:pages[0].id,nativeSource:{manifest,controllers:documents.map(d=>({pageId:d.id,controllers:d.doc.Controllers}))},importWarnings:[...new Set(warnings)]};
 }
 root.DeckLabNativeProfile={unzip,convert,pageUUID};
 if(typeof module!=='undefined')module.exports=root.DeckLabNativeProfile;
})(typeof window!=='undefined'?window:globalThis);
