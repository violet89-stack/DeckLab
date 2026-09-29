// SPDX-License-Identifier: MPL-2.0
/* DeckLab 1.1.3 — canonical device geometry + official preview renderer.
   Selected Elgato device-preview assets (see THIRD-PARTY-NOTICES.md) are used as the
   physical hardware layer. DeckLab renders live/action/editor content above that layer.
   All workspaces render the same device surface and only swap interaction/content factories. */
(function(){
  'use strict';

  const ASSET_SPECS = {
    keyIcon:{size2x:[144,144],size1x:[72,72],safe:[112,112],margin:[16,16],roundingCrop:24},
    studioKeyIcon:{size2x:[144,112],size1x:[72,56],safe:[112,80],margin:[16,16],roundingCrop:24},
    encoderSegment:{size:[200,100],safe:[168,76],margin:[16,12]},
    plusTouchStrip:{size:[800,100],safe:[768,76],margin:[16,12],segments:4},
    plusXLTouchStrip:{size:[1200,100],safe:[1168,76],margin:[16,12],segments:6},
    neoInfobarAsset:{size:[248,58],safe:[232,42],margin:[8,8]},
    // SDK layout coordinates remain 232×50 for Neo and 200×100 for Encoder actions.
    sdkLayout:{Encoder:[200,100],Neo:[232,50]}
  };

  const OFFICIAL_ARTWORK = {
    standard:{src:'assets/elgato/stream-deck-mk2-black.png',sourceSize:[780,554],credit:'Elgato Stream Deck asset resource · see Third-Party Notices'},
    mini:{src:'assets/elgato/stream-deck-mini-black.png',sourceSize:[1112,804],credit:'Elgato Stream Deck asset resource · see Third-Party Notices'},
    xl:{src:'assets/elgato/stream-deck-xl-black.png',sourceSize:[2440,1504],credit:'Elgato Stream Deck asset resource · see Third-Party Notices'},
    plus:{src:'assets/elgato/stream-deck-plus-black.png',sourceSize:[1024,972],credit:'Elgato Stream Deck asset resource · see Third-Party Notices'},
    plusxl:{src:'assets/elgato/stream-deck-plus-xl-black.png',sourceSize:[1472,1320],credit:'Elgato Stream Deck asset resource · see Third-Party Notices'},
    neo:{src:'assets/elgato/stream-deck-neo-black.png',sourceSize:[720,520],credit:'Elgato Stream Deck asset resource · see Third-Party Notices'},
    studio:{src:'assets/elgato/stream-deck-studio.png',sourceSize:[2732,254],credit:'Elgato Stream Deck asset resource · see Third-Party Notices'},
    galleon:{src:'assets/elgato/galleon-100-sd-module-reference.png',sourceSize:[1108,1945],credit:'Elgato Stream Deck asset resource · see Third-Party Notices'}
  };

  // Coordinates in bundled image pixels. Glass is the outer window; touch is
  // the inset active LCD, calibrated against the supplied illuminated references.
  // Artwork pixel dimensions are separate: + XL renders its 1200×100 canvas
  // into a 1176×98 image-space opening (12:1), not across the surrounding glass.
  const ARTWORK_CALIBRATION = {
    standard:{size:[780,554],key:[85,115,103,104],pitch:[128,128]},
    mini:{size:[1112,804],key:[190,158,220,220],pitch:[256,256]},
    xl:{size:[2440,1504],key:[214,294,220,220],pitch:[256,256]},
    plus:{size:[1024,972],key:[110,78,132,132],pitch:[224,152],glass:[68,412,888,188],touch:[112,456,800,100],dials:[[176,772,112],[400,772,112],[624,772,112],[848,772,112]]},
    plusxl:{size:[1472,1320],key:[114,94,124,124],pitch:[140,140],glass:[100,688,1272,172],touch:[148,725,1176,98],dials:[[208,1072,112],[419,1072,112],[630,1072,112],[842,1072,112],[1053,1072,112],[1264,1072,112]]},
    neo:{size:[720,520],key:[113,100,103,104],pitch:[132,132],neo:[238,370,245,56],nav:[[126,377,78,60],[514,377,78,60]]},
    studio:{size:[2732,254],key:[393,40,103,81],pitch:[122,97],centreGap:18,dials:[[204,127,90],[2528,127,90]]},
    galleon:{size:[1108,1945],key:[212,836,216,216],pitch:[236,236],dials:[[356,239.5,220],[752,239.5,220]],displays:[[209,421,338,178],[561,421,338,178]]}
  };
  function artworkRect(deviceKey,d,g,kind,index,column,row){
    const key=deviceKey==='scissor'?'standard':deviceKey,c=ARTWORK_CALIBRATION[key];if(!c)return null;let r;
    if(kind==='key')r=[c.key[0]+column*c.pitch[0]+(c.centreGap&&column>=8?c.centreGap:0),c.key[1]+row*c.pitch[1],c.key[2],c.key[3]];
    else if(kind==='dial'&&c.dials?.[index]){const [x,y,diameter]=c.dials[index];r=[x-diameter/2,y-diameter/2,diameter,diameter];}
    else if(kind==='touch'&&c.touch){const [x,y,w,h]=c.touch;r=[x+index*w/d.dials,y,w/d.dials,h];}
    else if(kind==='display'&&c.displays)r=c.displays[index];
    else if(kind==='neo'&&c.neo)r=c.neo;
    else if((kind==='neoPrev'||kind==='neoNext')&&c.nav)r=c.nav[kind==='neoPrev'?0:1];
    if(!r)return null;
    let [x,y,w,h]=r,[iw,ih]=c.size;const colour=window.DeckLabAppearance?.selected(deviceKey)?.[0];
    if(key==='standard'&&colour==='white'){x+=2;y+=2;iw=782;ih=556;}
    if(key==='plus'&&colour==='white'){x=x*2+4;y=y*2+4;w*=2;h*=2;iw=2052;ih=1948;}
    return {x:x/iw*g.w,y:y/ih*g.h,w:w/iw*g.w,h:h/ih*g.h};
  }
  const dialAngles=new Map();
  function paintDial(surface,index){const slot=surface.querySelector('.ds-dial[data-surface-index="'+index+'"]');if(!slot)return;const angle=dialAngles.get(surface.dataset.deviceKey+':'+index)||0;slot.style.setProperty('--dial-angle',angle+'deg');slot.dataset.dialAngle=String(angle);}
  function rotateDial(deviceKey,index,ticks){const key=deviceKey+':'+index;dialAngles.set(key,(dialAngles.get(key)||0)+(Number(ticks)||0)*15);document.querySelectorAll('.ds-surface').forEach(surface=>{if(surface.dataset.deviceKey===deviceKey)paintDial(surface,index)});}
  function pressDial(deviceKey,index,pressed){document.querySelectorAll('.ds-surface').forEach(surface=>{if(surface.dataset.deviceKey===deviceKey)surface.querySelector('.ds-dial[data-surface-index="'+index+'"]')?.classList.toggle('ds-dial-pressed',pressed)});}
  function recalibrate(surface){const key=surface.dataset.deviceKey,d=surface._device||DEVICES[key],g=surface._geom;surface.querySelectorAll('.ds-control').forEach(slot=>{const kind=slot.dataset.surfaceKind,i=Number(slot.dataset.surfaceIndex),r=controlRect(key,d,g,kind==='neo-nav'?(i?'neoNext':'neoPrev'):kind,i,i%d.cols,Math.floor(i/d.cols));Object.assign(slot.style,{left:pct(r.x,g.w),top:pct(r.y,g.h),width:pct(r.w,g.w),height:pct(r.h,g.h)});});}

  const DEVICES = {
    standard: {name:'Stream Deck / MK.2',type:0,rows:3,cols:5,dials:0,touch:false,neo:false,controllers:['Keypad'],family:'streamdeck',physical:{widthMm:118,faceHeightMm:84,keyWmm:16.4,keyHmm:16.4,pitchXmm:19.4,pitchYmm:19.4,keyLeftMm:12.9,keyTopMm:17.4,face:'classic',calibration:'official chassis dimensions + Elgato front-reference face calibration'},note:'15 LCD keys. Classic and MK.2 use the standard Keypad controller model.'},
    scissor: {name:'Stream Deck Scissor Keys',type:0,rows:3,cols:5,dials:0,touch:false,neo:false,controllers:['Keypad'],family:'streamdeck',physical:{widthMm:118,faceHeightMm:84,keyWmm:16.4,keyHmm:16.4,pitchXmm:19.4,pitchYmm:19.4,keyLeftMm:12.9,keyTopMm:17.4,face:'scissor',calibration:'official chassis dimensions + shared 15-key face reference; scissor styling remains visually calibrated'},note:'15 LCD keys at 72×72 px. Uses the same SDK device type as the standard 15-key Stream Deck.'},
    mini: {name:'Stream Deck Mini',type:1,rows:2,cols:3,dials:0,touch:false,neo:false,controllers:['Keypad'],family:'streamdeck',physical:{widthMm:84,faceHeightMm:60,keyWmm:16.4,keyHmm:16.4,pitchXmm:19.35,pitchYmm:19.35,keyLeftMm:14.4,keyTopMm:11.8,face:'mini',calibration:'official chassis dimensions + Elgato front-reference face calibration'},note:'6 LCD keys.'},
    xl: {name:'Stream Deck XL',type:2,rows:4,cols:8,dials:0,touch:false,neo:false,controllers:['Keypad'],family:'streamdeck',physical:{widthMm:182,faceHeightMm:112,keyWmm:16.4,keyHmm:16.4,pitchXmm:19.1,pitchYmm:19.1,keyLeftMm:16,keyTopMm:21.9,face:'xl',calibration:'official chassis dimensions + Elgato front-reference face calibration'},note:'32 LCD keys.'},
    plus: {name:'Stream Deck +',type:7,rows:2,cols:4,dials:4,touch:true,neo:false,controllers:['Keypad','Encoder'],family:'streamdeck',physical:{widthMm:140,faceHeightMm:133,keyWmm:18,keyHmm:18,pitchXmm:30.55,pitchYmm:20.75,keyLeftMm:15.3,keyTopMm:10.9,touchWidthMm:108,touchHeightMm:14,touchTopMm:56.2,dialMm:20.5,dialCenterYmm:107,dialCentersXmm:[25,55.5,86,116.5],face:'plus',calibration:'official 140 mm chassis width / 108×14 mm touch panel + Elgato front-reference face calibration'},note:'8 LCD keys plus 4 Encoder controls. Each dial owns a documented 200×100 SDK layout canvas; the full touch-strip asset is 800×100 with a 768×76 safe area.'},
    neo: {name:'Stream Deck Neo',type:9,rows:2,cols:4,dials:0,touch:false,neo:true,controllers:['Keypad','Neo'],family:'streamdeck',physical:{widthMm:107,faceHeightMm:78,keyWmm:15.5,keyHmm:15.5,pitchXmm:19.6,pitchYmm:19.6,keyLeftMm:16.8,keyTopMm:14.7,infobarXmm:35.2,infobarYmm:55,infobarWidthMm:36.7,infobarHeightMm:8.3,touchPointHitMm:12,face:'neo',calibration:'official 107×78 mm chassis + Elgato front-reference control placement'},note:'8 LCD keys plus a display-only Infobar. SDK layout canvas is 232×50; Elgato artwork guidance uses a 248×58 asset surface with 232×42 safe area. Two dedicated Touch Points navigate pages.'},
    galleon: {name:'Corsair GALLEON 100 SD',type:12,rows:4,cols:3,dials:2,encoderSlots:4,touch:false,neo:false,controllers:['Keypad','Encoder'],family:'corsair',hardwareShape:'galleon',infoDisplay:true,note:'Gaming keyboard with a dedicated Stream Deck module: 12 LCD keys in a 4×3 grid, two rotary Encoder controls, and a separate non-touch information display. Elgato guidance confirms each encoder feedback segment uses a 200×100 layout surface.'},
    plusxl: {name:'Stream Deck + XL',type:13,rows:4,cols:9,dials:6,touch:true,neo:false,controllers:['Keypad','Encoder'],family:'streamdeck',physical:{widthMm:205,faceHeightMm:184,keyWmm:17.3,keyHmm:17.3,pitchXmm:19.5,pitchYmm:19.5,keyLeftMm:15.9,keyTopMm:13.1,touchWidthMm:161,touchHeightMm:14,touchTopMm:95.8,dialMm:20.5,dialCenterYmm:151,dialCentersXmm:[25.7,55.1,84.5,113.9,143.3,172.7],face:'plusxl',calibration:'official 205 mm chassis width / 161×14 mm touch panel + Elgato front-reference face calibration'},note:'36 LCD keys plus 6 Encoder controls. Each dial uses a 200×100 SDK layout canvas; the full touch-strip asset is 1200×100 with a 1168×76 safe area.'},
    mobile: {name:'Stream Deck Mobile Pro',type:3,rows:5,cols:3,dials:0,touch:false,neo:false,controllers:['Keypad'],family:'mobile',customGrid:true,maxRows:8,maxCols:8,maxKeys:64,requiresPro:true,note:'Pro supports custom vertical, horizontal, or square layouts with up to 64 virtual LCD keys. DeckLab defaults to 5×3 and lets you resize the grid.'},
    virtual: {name:'Virtual Stream Deck',type:11,rows:3,cols:5,dials:0,touch:false,neo:false,controllers:['Keypad'],family:'virtual',customGrid:true,maxRows:8,maxCols:8,maxKeys:64,note:'Official Virtual Stream Deck supports custom rows/columns up to 8×8 (64 keys).'},
    scimitar: {name:'Corsair SCIMITAR ELITE WIRELESS SE',type:4,rows:4,cols:3,dials:0,touch:false,neo:false,controllers:['Keypad'],family:'corsair',hardwareShape:'scimitar',inputOnly:true,buttonPrefix:'G',hardwareLabels:['7','8','9','4','5','6','1','2','3','↔','0','ENT'],note:'Gaming mouse with an adjustable 12-button Key Slider side panel. DeckLab maps Stream Deck key actions to those 12 physical thumb buttons; the mouse has no LCD key surfaces, so titles, artwork, animation, and setImage feedback are not visible on the hardware.'},
    xeneon: {name:'Corsair XENEON EDGE · Stream Deck Widget',type:11,rows:4,cols:8,dials:0,touch:false,neo:false,controllers:['Keypad'],family:'corsair',customGrid:true,maxRows:4,maxCols:8,maxKeys:32,virtualHost:true,note:'Models the official Stream Deck widget on XENEON EDGE: up to 4×8 touchscreen keys. Dial actions are not supported. Native XENEON iCUE widgets are a separate platform.'},
    pedal: {name:'Stream Deck Pedal',type:5,rows:1,cols:3,dials:0,touch:false,neo:false,controllers:['Keypad'],family:'streamdeck',hardwareShape:'pedal',inputOnly:true,buttonPrefix:'P',physical:{widthMm:175,faceHeightMm:244,face:'pedal',calibration:'official 175×244 mm top-view footprint; internal pedal zones visually calibrated'},hardwareLabels:['LEFT','CENTER','RIGHT'],note:'Three customizable footswitches arranged as left, large center, and right pedal zones. They trigger Keypad actions hands-free and provide no LCD visual feedback.'},
    studio: {name:'Stream Deck Studio · Bitfocus host',type:10,rows:2,cols:16,dials:2,touch:false,neo:false,controllers:['Keypad','Encoder'],family:'streamdeck',hardwareShape:'studio',specialHost:'Bitfocus Buttons / Companion',streamDeckApp:false,physical:{widthMm:447,faceHeightMm:44,depthMm:80,face:'studio',calibration:'official 19-inch 1U form + Elgato front-reference control geometry; Studio keys use 72×56 artwork rather than square 72×72'},note:'Professional 19-inch 1U rackmount control surface with 32 rectangular LCD keys arranged as two rows of 16 plus two push encoders with LED rings. Studio uses Bitfocus Buttons / Companion workflows rather than standard Stream Deck app profiles.'}
  };

  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const pct=(n,total)=>`${(n/total*100).toFixed(5)}%`;

  function genericGeometry(d){
    const key=20,gap=3,pad=8;
    const w=pad*2+d.cols*key+Math.max(0,d.cols-1)*gap;
    const h=pad*2+d.rows*key+Math.max(0,d.rows-1)*gap;
    return {w,h,shape:d.family==='mobile'?'mobile':d.virtualHost?'xeneon':d.family==='virtual'?'virtual':'generic',key,gapX:gap,gapY:gap,keyLeft:pad,keyTop:pad};
  }

  function geometryFor(deviceKey,override){
    const d=override||DEVICES[deviceKey]||DEVICES.standard;
    if(d.hardwareShape==='studio') return {w:447,h:41.6,shape:'studio',keyW:17,keyH:13.4,pitchX:20,pitchY:16,keyLeft:64.3,keyTop:6.4,dial:19,dialCenters:[34,414],dialCenterY:23.2};
    if(d.hardwareShape==='scimitar') return {w:170,h:118,shape:'scimitar',keyW:18,keyH:18,pitchX:20.4,pitchY:20.4,keyLeft:111,keyTop:30};
    if(d.hardwareShape==='galleon') return {w:1108,h:1945,shape:'galleon',keyW:215,keyH:216,pitchX:236,pitchY:236,keyLeft:212,keyTop:837,dial:236,dialCenters:[356,752],dialCenterY:239.5,info:{x:188,y:400,w:732,h:396},displayRects:[{x:209,y:421,w:338,h:178},{x:561,y:421,w:338,h:178}]};
    if(d.hardwareShape==='pedal') return {w:175,h:244,shape:'pedal',pedals:[{x:8,y:30,w:39,h:176},{x:51,y:20,w:73,h:190},{x:128,y:30,w:39,h:176}]};
    if(d.physical?.widthMm){
      const p=d.physical,w=p.widthMm,h=p.faceHeightMm||Math.max(60,w*.7);
      const keyW=p.keyWmm??p.keyMm??18.8,keyH=p.keyHmm??p.keyMm??keyW;
      const pitchX=p.pitchXmm??(keyW+(p.gapXmm??3)),pitchY=p.pitchYmm??(keyH+(p.gapYmm??p.gapXmm??3));
      const gridW=d.cols*keyW+Math.max(0,d.cols-1)*(pitchX-keyW),gridH=d.rows*keyH+Math.max(0,d.rows-1)*(pitchY-keyH);
      const keyLeft=p.keyLeftMm??((w-gridW)/2),keyTop=p.keyTopMm??((h-gridH)/2);
      return {w,h,shape:p.face||'classic',key:keyW,keyW,keyH,pitchX,pitchY,gapX:pitchX-keyW,gapY:pitchY-keyH,keyLeft,keyTop,gridW,gridH,touchW:p.touchWidthMm,touchH:p.touchHeightMm,touchTop:p.touchTopMm,dial:p.dialMm,dialCentersX:p.dialCentersXmm,dialCenterY:p.dialCenterYmm,infobarX:p.infobarXmm,infobarY:p.infobarYmm,infobarW:p.infobarWidthMm,infobarH:p.infobarHeightMm,touchPoint:p.touchPointHitMm||p.touchPointMm||9};
    }
    const g=genericGeometry(d);g.keyW=g.key;g.keyH=g.key;g.pitchX=g.key+g.gapX;g.pitchY=g.key+g.gapY;return g;
  }

  function controlRect(deviceKey,d,g,kind,index,column,row){
    const calibrated=artworkRect(deviceKey,d,g,kind,index,column,row);if(calibrated)return calibrated;
    if(g.shape==='pedal') return g.pedals[index];
    if(kind==='key') return {x:g.keyLeft+column*(g.pitchX??(g.key+g.gapX)),y:g.keyTop+row*(g.pitchY??(g.key+g.gapY)),w:g.keyW??g.key,h:g.keyH??g.key};
    if(g.shape==='studio'&&kind==='dial'){
      const c=g.dialCenters[index]??g.dialCenters[0],y=(g.dialCenterY??g.h/2)-g.dial/2;return {x:c-g.dial/2,y,w:g.dial,h:g.dial};
    }
    if(g.shape==='galleon'&&kind==='dial'){
      const c=g.dialCenters[index]??g.dialCenters[0],cy=g.dialCenterY??g.dial/2;return {x:c-g.dial/2,y:cy-g.dial/2,w:g.dial,h:g.dial};
    }
    if(g.shape==='galleon'&&(kind==='touch'||kind==='display')){
      if(Array.isArray(g.displayRects)&&g.displayRects[index])return g.displayRects[index];const band=g.displayBand||g.info,half=band.w/2;return {x:band.x+index*half,y:band.y,w:half,h:band.h};
    }
    if(kind==='touch'){
      const tw=g.touchW||0,th=g.touchH||0,x=(g.w-tw)/2,seg=tw/Math.max(1,d.dials),y=g.touchTop??(g.keyTop+g.gridH+5);return {x:x+index*seg,y,w:seg,h:th};
    }
    if(kind==='dial'){
      const size=g.dial||20;
      if(Array.isArray(g.dialCentersX)){const cx=g.dialCentersX[index]??g.dialCentersX[0],cy=g.dialCenterY??(g.h-size/2-6);return {x:cx-size/2,y:cy-size/2,w:size,h:size};}
      const tw=g.touchW||g.gridW||g.w*.75,x0=(g.w-tw)/2,seg=tw/Math.max(1,d.dials),touchY=g.touchTop??(g.keyTop+g.gridH+5),y=touchY+(g.touchH||0)+5;return {x:x0+index*seg+(seg-size)/2,y,w:size,h:size};
    }
    if(kind==='neo'){
      const iw=g.infobarW||59,ih=g.infobarH||13,y=g.infobarY??(g.keyTop+g.gridH+5),x=g.infobarX??((g.w-iw)/2);return {x,y,w:iw,h:ih};
    }
    if(kind==='neoPrev'||kind==='neoNext'){
      const s=g.touchPoint||12,ir=controlRect(deviceKey,d,g,'neo',0,0,0),gap=3;return {x:kind==='neoPrev'?Math.max(3,ir.x-gap-s):Math.min(g.w-s-3,ir.x+ir.w+gap),y:ir.y+(ir.h-s)/2,w:s,h:s};
    }
    return {x:0,y:0,w:1,h:1};
  }

  function addRectControl(surface,rect,kind,index,node){
    const slot=document.createElement('div');slot.className=`ds-control ds-${kind}`;slot.dataset.surfaceKind=kind;slot.dataset.surfaceIndex=String(index??0);
    slot.style.left=pct(rect.x,surface._geom.w);slot.style.top=pct(rect.y,surface._geom.h);slot.style.width=pct(rect.w,surface._geom.w);slot.style.height=pct(rect.h,surface._geom.h);
    if(node)slot.appendChild(node);surface.appendChild(slot);if(kind==='dial'){const rotor=document.createElement('span');rotor.className='ds-dial-rotor';rotor.setAttribute('aria-hidden','true');slot.append(rotor);paintDial(surface,index);}return slot;
  }

  function addDecor(surface,shape,g){
    surface.classList.add(`ds-shape-${shape}`);
    if(shape==='galleon'&&g.mainKeyboard){
      const kb=document.createElement('div');kb.className='ds-galleon-keyboard';Object.assign(kb.style,{left:pct(g.mainKeyboard.x,g.w),top:pct(g.mainKeyboard.y,g.h),width:pct(g.mainKeyboard.w,g.w),height:pct(g.mainKeyboard.h,g.h)});
      for(let r=0;r<5;r++){const row=document.createElement('div');row.className='ds-qwerty-row';for(let i=0;i<[15,15,14,13,10][r];i++){const k=document.createElement('i');if(r===4&&i===4)k.className='space';row.appendChild(k);}kb.appendChild(row);}surface.appendChild(kb);
      const info=document.createElement('div');info.className='ds-galleon-info';Object.assign(info.style,{left:pct(g.info.x,g.w),top:pct(g.info.y,g.h),width:pct(g.info.w,g.w),height:pct(g.info.h,g.h)});info.innerHTML='<span>THU</span><strong>10:45</strong>';surface.appendChild(info);
      const wrist=document.createElement('div');wrist.className='ds-galleon-wrist';Object.assign(wrist.style,{left:pct(g.wrist.x,g.w),top:pct(g.wrist.y,g.h),width:pct(g.wrist.w,g.w),height:pct(g.wrist.h,g.h)});surface.appendChild(wrist);
    } else if(shape==='scimitar'){
      surface.innerHTML+='<div class="ds-mouse-top"><i></i><b></b><i></i></div><div class="ds-mouse-side-panel"></div>';
    } else if(shape==='studio'){
      surface.innerHTML+='<div class="ds-studio-ear left"></div><div class="ds-studio-ear right"></div><div class="ds-studio-panel"></div>';
    } else if(shape==='pedal'){
      surface.innerHTML+='<div class="ds-pedal-top"></div><div class="ds-pedal-mark">G</div>';
    } else if(shape==='xeneon'){
      surface.innerHTML+='<div class="ds-xeneon-screen"></div>';
    } else if(shape==='mobile'){
      surface.innerHTML+='<div class="ds-mobile-notch"></div>';
    }
  }

  function render(host,{deviceKey='standard',device=null,mode='preview',factories={},maxWidth=null,label=null}={}){
    if(!host)return null;const d=device||DEVICES[deviceKey]||DEVICES.standard,g=geometryFor(deviceKey,d);
    host.innerHTML='';host.classList.add('device-surface-host');host.dataset.deviceKey=deviceKey;host.dataset.surfaceMode=mode;
    const viewport=document.createElement('div');viewport.className='ds-viewport';
    const surface=document.createElement('div');surface.className=`ds-surface ds-mode-${mode}`;surface._geom=g;surface._device=d;surface.dataset.shape=g.shape;surface.dataset.deviceKey=deviceKey;
    const artwork=window.DeckLabAppearance?.artwork(deviceKey)||OFFICIAL_ARTWORK[deviceKey]||null;
    surface.style.aspectRatio=artwork?`${artwork.sourceSize[0]}/${artwork.sourceSize[1]}`:`${g.w}/${g.h}`;
    addDecor(surface,g.shape,g);
    if(artwork){
      surface.classList.add('ds-has-official-artwork');
      surface.dataset.artworkLicense='CC BY 4.0';
      const img=document.createElement('img');img.className='ds-official-artwork';img.src=artwork.src;img.alt='';img.draggable=false;img.decoding='async';img.loading='eager';
      img.addEventListener('error',()=>{surface.classList.remove('ds-has-official-artwork');surface.classList.add('ds-artwork-failed');delete surface.dataset.artworkLicense;img.remove();});
      surface.appendChild(img);
    }
    const compat=mode==='compat';
    const defaultMax=d.hardwareShape==='studio'?(compat?360:1000):d.hardwareShape==='galleon'?(compat?220:500):d.hardwareShape==='pedal'?(compat?250:620):d.hardwareShape==='scimitar'?(compat?300:580):d.physical?.widthMm?Math.min(compat?420:1000,d.physical.widthMm*(compat?1.65:3)):compat?340:760;
    const baseWidth=Math.round(maxWidth||defaultMax);surface.dataset.baseWidth=String(baseWidth);surface.style.maxWidth=`${Math.round(baseWidth*(window.DeckLabGuidance112?.zoom||1))}px`;
    surface.dataset.displayAppearance=window.DeckLabDisplayAppearance?.mode||'original';
    for(let r=0;r<d.rows;r++)for(let c=0;c<d.cols;c++){const i=r*d.cols+c,rect=controlRect(deviceKey,d,g,'key',i,c,r),node=factories.key?.(i,c,r,d,g)||null;addRectControl(surface,rect,'key',i,node);}
    if(d.hardwareShape==='galleon'){
      for(let i=0;i<d.dials;i++){addRectControl(surface,controlRect(deviceKey,d,g,'display',i,i,0),'display',i,factories.encoderDisplay?.(i,d,g)||factories.touch?.(i,d,g)||null);addRectControl(surface,controlRect(deviceKey,d,g,'dial',i,i,0),'dial',i,factories.dial?.(i,d,g)||null);}
    } else {
      if(d.touch&&d.dials)for(let i=0;i<d.dials;i++)addRectControl(surface,controlRect(deviceKey,d,g,'touch',i,i,0),'touch',i,factories.touch?.(i,d,g)||null);
      if(d.dials)for(let i=0;i<d.dials;i++)addRectControl(surface,controlRect(deviceKey,d,g,'dial',i,i,0),'dial',i,factories.dial?.(i,d,g)||null);
    }
    if(d.neo){
      addRectControl(surface,controlRect(deviceKey,d,g,'neoPrev',0,0,0),'neo-nav',0,factories.neoPrev?.(d,g)||null);
      addRectControl(surface,controlRect(deviceKey,d,g,'neo',0,0,0),'neo',0,factories.neo?.(d,g)||null);
      addRectControl(surface,controlRect(deviceKey,d,g,'neoNext',1,0,0),'neo-nav',1,factories.neoNext?.(d,g)||null);
    }
    if(label){const badge=document.createElement('div');badge.className='ds-device-badge';badge.textContent=label;surface.appendChild(badge);}
    viewport.appendChild(surface);host.appendChild(viewport);return {surface,geometry:g,device:d};
  }

  function snapshot(deviceKey,device){
    const d=device||DEVICES[deviceKey]||DEVICES.standard,g=geometryFor(deviceKey,d),controls=[];
    for(let r=0;r<d.rows;r++)for(let c=0;c<d.cols;c++){const i=r*d.cols+c;controls.push({kind:'Keypad',index:i,column:c,row:r,...controlRect(deviceKey,d,g,'key',i,c,r)});}
    for(let i=0;i<(d.dials||0);i++){if(d.touch)controls.push({kind:'EncoderTouch',index:i,...controlRect(deviceKey,d,g,'touch',i,i,0)});if(d.hardwareShape==='galleon')controls.push({kind:'EncoderDisplay',index:i,...controlRect(deviceKey,d,g,'display',i,i,0)});controls.push({kind:'EncoderDial',index:i,...controlRect(deviceKey,d,g,'dial',i,i,0)});}
    if(d.neo){controls.push({kind:'Neo',index:0,...controlRect(deviceKey,d,g,'neo',0,0,0)});controls.push({kind:'NeoNav',index:0,...controlRect(deviceKey,d,g,'neoPrev',0,0,0)});controls.push({kind:'NeoNav',index:1,...controlRect(deviceKey,d,g,'neoNext',1,0,0)});}
    return {deviceKey,canvas:{width:g.w,height:g.h},shape:g.shape,controls};
  }

  window.DeckLabSurface={DEVICES,ASSET_SPECS,OFFICIAL_ARTWORK,ARTWORK_CALIBRATION,rotateDial,pressDial,recalibrate,geometryFor,controlRect,render,snapshot,version:'1.1.3'};
})();
