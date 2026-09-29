// SPDX-License-Identifier: MPL-2.0
/* Run with: node tests-device-surface.js */
global.window={};
require('./device-surface.js');
const S=window.DeckLabSurface;
let failed=0;
function check(ok,msg){if(!ok){console.error('FAIL',msg);failed++;}else console.log('PASS',msg);}
function approx(a,b,t=.06){return Math.abs(a-b)<=t;}
for(const [key,d] of Object.entries(S.DEVICES)){
  const snap=S.snapshot(key,d);
  check(snap.controls.every(c=>c.x>=0&&c.y>=0&&c.x+c.w<=snap.canvas.width+1e-7&&c.y+c.h<=snap.canvas.height+1e-7),`${key}: all canonical controls stay inside face canvas`);
  check(snap.controls.filter(c=>c.kind==='Keypad').length===d.rows*d.cols,`${key}: keypad control count matches ${d.rows}×${d.cols}`);
}
check(approx(S.geometryFor('mini').keyW,S.geometryFor('standard').keyW,.001),'Nominal physical key width remains separate from artwork-pixel calibration');
check(approx(S.snapshot('studio').controls[8].x-S.snapshot('studio').controls[7].x,140/2732*447,.001),'Studio preserves the measured centre gap between its two banks');
check(S.geometryFor('plus').pitchX>S.geometryFor('plus').pitchY,'Stream Deck + preserves its wide horizontal key pitch');
check(approx(S.snapshot('studio').controls[0].w/S.snapshot('studio').controls[0].h,72/56,.03),'Studio key aspect matches official 72×56 artwork aspect');
check(S.snapshot('studio').controls.filter(c=>c.kind==='Keypad').length===32,'Studio exposes 32 keys');
check(S.snapshot('studio').controls.filter(c=>c.kind==='EncoderDial').length===2,'Studio exposes 2 end encoders');
check(S.snapshot('plus').controls.filter(c=>c.kind==='EncoderTouch').length===4,'Stream Deck + exposes 4 touch segments');
check(S.snapshot('plusxl').controls.filter(c=>c.kind==='EncoderTouch').length===6,'Stream Deck + XL exposes 6 touch segments');
check(S.snapshot('neo').controls.filter(c=>c.kind==='NeoNav').length===2,'Neo exposes 2 hardware navigation Touch Points');
check(S.snapshot('scimitar').controls.filter(c=>c.kind==='Keypad').length===12,'SCIMITAR exposes 12 Key Slider controls');
check(S.snapshot('galleon').controls.filter(c=>c.kind==='EncoderDisplay').length===2,'GALLEON exposes 2 non-touch encoder display regions');
check(S.snapshot('galleon').controls.filter(c=>c.kind==='EncoderTouch').length===0,'GALLEON does not expose a Stream Deck + touch surface');
check(S.ASSET_SPECS.encoderSegment.size.join('x')==='200x100','Encoder segment asset size is 200×100');
check(S.ASSET_SPECS.plusTouchStrip.size.join('x')==='800x100','Stream Deck + full-strip asset size is 800×100');
check(S.ASSET_SPECS.plusXLTouchStrip.size.join('x')==='1200x100','Stream Deck + XL full-strip asset size is 1200×100');
check(S.ASSET_SPECS.neoInfobarAsset.size.join('x')==='248x58','Neo artwork surface is 248×58');
check(S.ASSET_SPECS.neoInfobarAsset.safe.join('x')==='232x42','Neo artwork safe area is 232×42');
check(S.ASSET_SPECS.sdkLayout.Neo.join('x')==='232x50','Neo SDK layout canvas remains 232×50');
check(S.ASSET_SPECS.studioKeyIcon.size1x.join('x')==='72x56','Studio key artwork is rectangular 72×56 at 1×');
const gd=S.snapshot('galleon').controls.filter(c=>c.kind==='EncoderDisplay');
check(gd.every(c=>c.w/c.h>1.85&&c.w/c.h<2.05),'GALLEON encoder feedback regions match the official module display windows');
// 1.0.8 official artwork layer
const fs=require('fs');
const path=require('path');
const art=S.OFFICIAL_ARTWORK||{};
for(const key of ['standard','mini','xl','plus','plusxl','neo','studio','galleon']){
  check(!!art[key],`${key}: official preview artwork mapping exists`);
  if(art[key]) check(fs.existsSync(path.join(__dirname,art[key].src)),`${key}: bundled official preview asset exists`);
}
check(!!art.galleon,'GALLEON uses the official close-up module artwork because the keyboard body is irrelevant to Stream Deck interaction');
check(S.version==='1.1.3','canonical renderer reports version 1.1.3');
if(failed){console.error(`\n${failed} device-surface test(s) failed.`);process.exit(1);}else console.log('\nAll canonical device-surface tests passed.');
