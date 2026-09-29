// SPDX-License-Identifier: MPL-2.0
const fs=require('fs'),vm=require('vm'),assert=require('assert');
class Element {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.value='';this.handlers={};this.classList={remove(){},add(){}};}
 append(...children){this.children.push(...children);} prepend(...children){this.children.unshift(...children);} before(){}
 replaceChildren(...children){this.children=children;} addEventListener(name,fn){this.handlers[name]=fn;}setAttribute(){} remove(){} click(){this.onclick?.();}showModal(){this.open=true;}close(){this.open=false;}
}
const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};
get('catalogueSource').value='all';get('catalogueCategory').value='all';
const storage=new Map();const context={document:{getElementById:get,createElement:tag=>new Element(tag),body:new Element(),querySelector:()=>new Element()},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},window:{addEventListener(){},dispatchEvent(){}},Option:function(text,value){this.textContent=text;this.value=value;},URL,Blob,AbortSignal,setTimeout,confirm:()=>true,renderPluginWarnings(){},pluginState:{},loadPluginFolder:async()=>{},switchMode(){},classifyPluginManifestText:text=>{try{return {kind:'plain',manifest:JSON.parse(text)}}catch{return {kind:text.startsWith('ELGATO')?'protected':'invalid',reason:'Invalid JSON'}}}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(__dirname+'/plugin-intelligence113.js','utf8'),context);
context.DeckLabPluginIntelligence=context.window.DeckLabPluginIntelligence;
storage.set('decklab.discovery.v1',JSON.stringify({streamdock:{entries:[{name:'Retired dock entry'}]}}));
vm.runInContext(fs.readFileSync(__dirname+'/plugins-workspace.js','utf8'),context);
assert(!JSON.parse(storage.get('decklab.discovery.v1')).streamdock);
(async()=>{
 const file=(path,text)=>({webkitRelativePath:path,text:async()=>text});
 await context.DeckLabPluginIntelligence.scanLibrary([file('root/demo.sdPlugin/manifest.json',JSON.stringify({Name:'Demo',UUID:'com.demo',Actions:[{Name:'Toggle',UUID:'com.demo.toggle',Controllers:['Keypad']}]})),file('root/protected.sdPlugin/manifest.json','ELGATO protected')]);
 const entries=context.DeckLabPluginIntelligence.getEntries();assert.equal(entries.length,2);assert.equal(entries[0].actions[0].name,'Toggle');assert.equal(entries[1].kind,'protected');
 get('pluginLibrarySearch').handlers.input({target:{value:'toggle'}});assert.equal(get('pluginLibraryList').children.length,1);
 const saved=JSON.parse(storage.get('decklab.pluginCatalogue.v1'));assert(!('files' in saved[0]));
 get('catalogueSource').value='opendeck';await get('catalogueImport').onchange({target:{files:[{size:200,text:async()=>JSON.stringify([{id:'com.example',name:'Example',link:'javascript:alert(1)'}])}],value:''}});
 assert.equal(get('catalogueGrid').children.length,1);get('catalogueGrid').children[0].onclick();assert(!get('catalogueDetails').children.some(c=>c.tagName==='a'));
 context.fetch=async()=>{throw Error('offline')};await get('catalogueRefresh').onclick();assert(get('catalogueStatus').textContent.includes('Existing results retained'));assert.equal(get('catalogueGrid').children.length,1);
 await get('catalogueImport').onchange({target:{files:[{size:200,text:async()=>JSON.stringify({source:'streamdock',rows:[{id:'dock',name:'Dock'}]})}],value:''}});assert(get('catalogueStatus').textContent.includes('Import failed'));assert.equal(get('catalogueGrid').children.length,1);
 console.log('PASS: retired source cache cleanup and import rejection; scan, action search, protected classification, metadata persistence, catalogue import, unsafe URL rejection, offline retention. DOM harness; not browser validation.');
})().catch(e=>{console.error(e);process.exitCode=1;});
