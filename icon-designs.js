// SPDX-License-Identifier: MPL-2.0
/* Editable icon designs live in My artwork. PNG export is a separate, static snapshot. */
(function () {
  const $ = id => document.getElementById(id);
  const sizes = {Keypad: [144, 144], Encoder: [200, 100], Neo: [232, 50]};
  const copy = value => JSON.parse(JSON.stringify(value));
  const raster = value => typeof value === 'string' && /^data:image\/(png|jpeg|gif|webp);base64,/.test(value);
  const clamp = (value, min, max, fallback) => Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Number(value))) : fallback;
  const colour = (value, fallback) => /^#[\da-f]{6}$/i.test(value || '') ? value : fallback;
  let pending = null;

  async function checkImage(value) {
    if (value == null) return null;
    if (!raster(value) || value.length > 12 * 1024 * 1024) throw Error('Design images must be embedded PNG, JPEG, GIF or WebP, up to 8 MB each.');
    const img = new Image(); img.src = value; await img.decode();
    if (img.naturalWidth * img.naturalHeight > 32 * 1024 * 1024) throw Error('Design image dimensions are too large.');
    return value;
  }

  async function embedded(value) {
    if (!value) return null;
    if (raster(value)) return checkImage(value);
    if (!String(value).startsWith('blob:')) throw Error('Upload this image into My artwork before saving the design.');
    const response = await fetch(value), blob = await response.blob();
    const data = await new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(Error('Could not read the icon image.')); reader.readAsDataURL(blob);
    });
    return checkImage(data);
  }

  async function validate(design) {
    if (!design || design.format !== 'DeckLabIconDesign' || design.version !== 1 || !Object.hasOwn(sizes, design.controller)) throw Error('Not a supported DeckLab icon design.');
    if (JSON.stringify(design).length > 32 * 1024 * 1024) throw Error('Icon design exceeds 32 MB.');
    async function layer(v = {}) {
      const out = {image: await checkImage(v.image), background: null, title: String(v.title || '').slice(0, 100), showTitle: v.showTitle !== false,
        colour: colour(v.colour, '#ffffff'), size: clamp(v.size, 6, 32, 12), align: ['top', 'middle', 'bottom'].includes(v.align) ? v.align : 'bottom', fit: v.fit === 'contain' ? 'contain' : 'cover', artworkCredit: v.artworkCredit ? copy(v.artworkCredit) : null};
      if (v.background) out.background = {image: await checkImage(v.background.image), fit: v.background.fit === 'contain' ? 'contain' : 'cover', template: v.background.template ? copy(v.background.template) : null, artworkCredit: v.background.artworkCredit ? copy(v.background.artworkCredit) : null};
      return out;
    }
    const v = design.visual || {}, visual = await layer(v);
    if (v.states) {
      if (Object.keys(v.states).length > 32) throw Error('Too many icon states.');
      visual.states = {};
      for (const [key, state] of Object.entries(v.states)) {
        if (!/^(0|[1-9]\d?)$/.test(key) || Number(key) > 31) throw Error('Invalid icon state.');
        visual.states[key] = await layer({...v, ...state});
      }
    }
    if (v.creator) {
      const recipes = {};
      for (const [key, r] of Object.entries(v.creator.recipes || {})) {
        if (!['0', '1'].includes(key)) throw Error('Invalid creator state.');
        recipes[key] = {background: colour(r.background, '#152334'), transparent: !!r.transparent, text: String(r.text || '').slice(0, 1000), colour: colour(r.colour, '#ffffff'), size: clamp(r.size, 6, 72, 24), align: ['left', 'center', 'right'].includes(r.align) ? r.align : 'center', fit: r.fit === 'cover' ? 'cover' : 'contain', zoom: clamp(r.zoom, 0.25, 3, 1), x: clamp(r.x, -100, 100, 0), y: clamp(r.y, -100, 100, 0)};
      }
      visual.creator = {source: await checkImage(v.creator.source), sourceCredit: v.creator.sourceCredit ? copy(v.creator.sourceCredit) : null, recipes};
    }
    return {format: 'DeckLabIconDesign', version: 1, controller: design.controller, visual};
  }

  async function capture(placement, visualOverride) {
    if (!placement || !Object.hasOwn(sizes, placement.controller)) throw Error('Select a key, dial display or Neo Infobar action first.');
    const p = {...placement, id: 'icon-design-capture', customVisual: visualOverride || placement.customVisual}, normalized = DeckLabVisuals.normalize(p.customVisual);
    const states = {}, keys = new Set(['0', ...Object.keys(normalized.states || {}), ...Object.keys(p.nativeStates || {})]);
    for (const key of keys) {
      const state = Number(key), view = DeckLabVisuals.visual({...p, state}), resolved = DeckLabVisuals.resolve({...p, state}), appearance = resolved.nativeStates?.[state] || {};
      states[key] = {...view, image: await embedded(Object.hasOwn(view, 'image') ? view.image : resolved.image), background: view.background ? {...view.background, image: await embedded(view.background.image)} : null,
        title: view.title ?? resolved.title ?? '', showTitle: view.showTitle ?? appearance.ShowTitle !== false, colour: view.colour || appearance.TitleColor, size: view.size || appearance.FontSize, align: view.align || appearance.TitleAlignment};
      delete states[key].states; delete states[key].creator;
    }
    return validate({format: 'DeckLabIconDesign', version: 1, controller: p.controller, visual: {...states[0], states, ...(normalized.creator ? {creator: {...normalized.creator, source: await embedded(normalized.creator.source)}} : {})}});
  }

  async function render(design, state = 0) {
    const [width, height] = sizes[design.controller], v = {...design.visual, ...design.visual.states?.[state]};
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    for (const [src, fit] of [[v.background?.image, v.background?.fit], [v.image, v.fit]]) {
      if (!src) continue;
      const img = new Image(); img.src = src; await img.decode();
      const scale = fit === 'contain' ? Math.min(width / img.width, height / img.height) : Math.max(width / img.width, height / img.height);
      const w = img.width * scale, h = img.height * scale; ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
    }
    if (v.showTitle && v.title) {
      ctx.fillStyle = v.colour; ctx.font = `600 ${v.size}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const lines = v.title.split('\n').slice(0, 5), lineHeight = v.size * 1.15;
      const centre = v.align === 'top' ? 4 + lines.length * lineHeight / 2 : v.align === 'middle' ? height / 2 : height - 4 - lines.length * lineHeight / 2;
      lines.forEach((line, i) => ctx.fillText(line, width / 2, centre + (i - (lines.length - 1) / 2) * lineHeight, width - 8));
    }
    return canvas.toDataURL('image/png');
  }

  function apply(design, target) {
    if (target.kind === 'display') throw Error('Choose a key, dial display or Infobar action to use an editable icon design.');
    if (target.placement.controller !== design.controller) throw Error('This design uses the ' + design.controller + ' canvas. Choose a matching action.');
    profilePushHistory('apply saved icon design');
    target.placement.customVisual = copy(design.visual);
    renderProfileDeck(); DeckLabVisuals.sync(); profileScheduleAutosave();
  }

  function requestSave(placement = selectedProfilePlacement(), visualOverride) {
    if (!placement || window.decklabLivePreview) return;
    // Freeze all values before opening the dialog; edits in the deck cannot change this save.
    pending = {placement: copy(placement), visual: visualOverride ? copy(visualOverride) : undefined};
    $('iconDesignName').value = DeckLabVisuals.visual(placement).title || placement.importName || 'My icon';
    $('iconDesignStatus').textContent = ''; $('iconDesignDialog').showModal(); $('iconDesignName').select();
  }

  function boot() {
    const button = document.createElement('button'); button.id = 'saveIconDesign'; button.type = 'button'; button.className = 'secondary'; button.textContent = 'Save icon design';
    button.title = 'Save background, foreground, title and editable A/B artwork to My artwork'; button.onclick = () => requestSave(); $('openAssetCreator').after(button);
    const dialog = document.createElement('dialog'); dialog.id = 'iconDesignDialog'; dialog.setAttribute('aria-labelledby', 'iconDesignHeading');
    dialog.innerHTML = '<form id="iconDesignForm"><h2 id="iconDesignHeading">Save icon design</h2><label>Name<input id="iconDesignName" maxlength="160" required></label><p class="hint">Keeps separate layers, title and editable A/B artwork in My artwork. Animated source images stay animated when applied.</p><p id="iconDesignStatus" role="status"></p><div class="creator-actions"><button id="iconDesignSave" class="primary" type="submit">Save to My artwork</button><button id="iconDesignCancel" type="button" class="secondary">Cancel</button></div></form>';
    document.body.append(dialog); $('iconDesignCancel').onclick = () => dialog.close();
    $('iconDesignForm').onsubmit = async event => {
      event.preventDefault(); const name = $('iconDesignName').value.trim(); if (!name || !pending) return;
      $('iconDesignSave').disabled = true;
      try {
        const design = await capture(pending.placement, pending.visual), data = await render(design);
        await DeckLabArtwork.add(name, data, {role: 'design', design, tags: ['editable', 'icon design']});
        dialog.close(); $('visualMessage').textContent = 'Saved “' + name + '” to My artwork. Export the library for a portable backup.';
        if (!$('assetCreator').hidden) $('creatorStatus').textContent = 'Editable design saved to My artwork.';
      } catch (error) { $('iconDesignStatus').textContent = error.message; }
      finally { $('iconDesignSave').disabled = false; }
    };
  }
  window.DeckLabIconDesigns = {validate, capture, render, apply, requestSave};
  document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 470));
})();
