// SPDX-License-Identifier: MPL-2.0
/* Focused profile workspace: the same profile is edited in Build and run in Live Preview. */
(function(){
  const byId=id=>document.getElementById(id);
  function fold(nodes,label,parent){const d=document.createElement('details');d.className='studio-details';const s=document.createElement('summary');s.textContent=label;d.append(s);parent.append(d);nodes.forEach(n=>{if(n)d.append(n)});return d;}
  function boot(){
    const library=document.querySelector('.builder-library-panel');
    const start=library.querySelector('.section-rule');if(start){const nodes=[];for(let n=start;n;){const next=n.nextElementSibling;nodes.push(n);n=next;}fold(nodes,'Profile & pages',library);}
    const inspector=document.querySelector('.builder-inspector-panel');
    const raw=byId('profileInstanceEditor');const rawDetails=document.createElement('details');rawDetails.className='studio-details raw-action-settings';const rawSummary=document.createElement('summary');rawSummary.textContent='Advanced action settings';raw.before(rawDetails);rawDetails.append(rawSummary,raw);
    const global=byId('profileGlobalSettings')?.closest('label');if(global){const heading=global.previousElementSibling;const rule=heading?.previousElementSibling;fold([rule,heading,global,byId('profileApplyGlobalSettingsBtn')],'Plugin settings',inspector);}
    document.querySelectorAll('.builder-event-details').forEach(d=>d.open=false);
    const runtime=document.querySelector('.profile-runtime-card');if(runtime){const d=document.createElement('details');d.className='studio-details studio-runtime-details';const s=document.createElement('summary');s.textContent='Plugin connection';runtime.before(d);d.append(s,runtime);}
    const heading=document.querySelector('.profile-heading');const status=document.createElement('div');status.id='studioPreviewStatus';status.setAttribute('role','status');status.textContent='Click a key to run it';heading.after(status);
    const notice=byId('builtinSimulationNotice');if(notice)new MutationObserver(()=>{if(!notice.hidden&&notice.textContent)status.textContent=notice.textContent;}).observe(notice,{childList:true,subtree:true,attributes:true});
    library.addEventListener('keydown',e=>{const c=e.target.closest('.builder-action-card');if(c&&['Enter',' '].includes(e.key)){e.preventDefault();c.click();}});
    const deck=byId('profileDeck');
    ['dragstart','dragover','drop','dblclick','contextmenu'].forEach(type=>deck.addEventListener(type,e=>{if(window.decklabLivePreview){e.preventDefault();e.stopImmediatePropagation();}},true));
    deck.addEventListener('click',e=>{
      if(!window.decklabLivePreview)return;
      const node=e.target.closest('.profile-slot,.profile-touch-slot,.profile-dial-slot,.profile-neo-slot');if(!node)return;
      e.preventDefault();e.stopImmediatePropagation();if(profileState.target==='galleon'&&node.classList.contains('lcd-build-region')){DeckLabDisplayControls.activate(node.dataset.lcdRegion);return;}const p=profileState.placements.find(p=>p.id===node.dataset.profileId);if(!p)return;
      if(!profileState.connected){status.textContent='Device disconnected. Open Plugin connection to reconnect.';return;}
      if(p.kind==='folder')navigateProfilePage(p.childPageId,'folder entered');
      else if(p.kind==='multi'||p.kind==='multi-switch')executeMultiPlacement(p);
      else if(node.classList.contains('profile-touch-slot')&&!node.classList.contains('profile-encoder-display'))profileEmitInput(p,'touchTap',{tapPos:[100,50],hold:false});
      else if(node.classList.contains('profile-slot'))profileRunAction(p);
    },true);
    const advanced=document.createElement('details');advanced.id='studioAdvanced';advanced.className='studio-advanced';const summary=document.createElement('summary');summary.textContent='Advanced';advanced.append(summary);const menu=document.createElement('div');advanced.append(menu);byId('studioMasterToolbar').append(advanced);
    document.querySelectorAll('.studio-shell-mode[data-studio-mode="test"],.studio-shell-mode[data-studio-mode="inspect"]').forEach(b=>{menu.append(b);b.addEventListener('click',()=>advanced.open=false);});
    document.addEventListener('click',e=>{if(!advanced.contains(e.target))advanced.open=false;});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')advanced.open=false;});
    const hint=byId('studioContextHint');if(hint){byId('studioModeHelpBtn').dataset.dlTip='Help for the current mode';}
    document.querySelectorAll('.builder-history-controls button').forEach(b=>{b.dataset.dlTip=b.title||b.textContent.trim();});
    if(currentDeviceKey==='scissor')DeckLabUX11.selectStudioDevice('standard');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,100));else setTimeout(boot,100);
})();
