// SPDX-License-Identifier: MPL-2.0
/* Appearance is independent of device identity, geometry and profile contents. */
(function(){
  const variants={
    standard:[['black','Black','mk2-black',780,554],['white','White','mk2-white',782,556],['purple','Wild Lavender','mk2-purple',780,554],['pink','Pink Petal','mk2-pink',780,554],['blue','Glacier Ice','mk2-blue',780,554],['green','Forest Green','mk2-green',780,554],['purple-transparent','Atomic Purple','mk2-purple-transparent',780,554]],
    neo:[['black','Black','neo-black',720,520],['white','White','neo-white',720,520]],
    plus:[['black','Black','plus-black',1024,972],['white','White','plus-white',2052,1948]]
  };
  let saved={};try{saved=JSON.parse(localStorage.getItem('decklab.deviceColours.v1'))||{};}catch(_){}
  if(typeof saved!=='object'||Array.isArray(saved))saved={};
  function key(k){return k==='scissor'?'standard':k;}
  function choices(k){return variants[key(k)]||[];}
  function selected(k){return choices(k).find(v=>v[0]===saved[key(k)])||choices(k)[0];}
  function artwork(k){const v=selected(k);return v?{src:`assets/elgato/${v[2]}.png`,sourceSize:[v[3],v[4]],credit:'Elgato device assets supplied by user'}:null;}
  function syncPicker(k){const w=document.getElementById('studioAppearanceWrap'),s=document.getElementById('studioAppearanceSelect');if(!s)return;const opts=choices(k);w.classList.toggle('hidden',opts.length<2);if(s.dataset.device!==key(k)){s.replaceChildren(...opts.map(v=>new Option(v[1],v[0])));s.dataset.device=key(k);}s.value=selected(k)?.[0]||'';}
  function select(k,value){if(!choices(k).some(v=>v[0]===value))return;saved[key(k)]=value;try{localStorage.setItem('decklab.deviceColours.v1',JSON.stringify(saved));}catch(_){}syncPicker(k);
    document.querySelectorAll('.ds-surface').forEach(surface=>{const art=artwork(surface.dataset.deviceKey);const img=surface.querySelector('.ds-official-artwork');if(art&&img){img.src=art.src;surface.style.aspectRatio=art.sourceSize.join('/');window.DeckLabSurface?.recalibrate(surface);}});
  }
  window.DeckLabAppearance={choices,selected,artwork,syncPicker,select};
})();
