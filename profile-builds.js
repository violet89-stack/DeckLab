// SPDX-License-Identifier: MPL-2.0
/* Named local profiles. Writes are atomic; opening a build first saves a recovery copy. */
(function () {
  const $ = id => document.getElementById(id), copy = value => JSON.parse(JSON.stringify(value));
  const MAX_BYTES = 64 * 1024 * 1024, MAX_TOTAL = 192 * 1024 * 1024;
  let db, rows = [], busy = false;
  const ready = new Promise((resolve, reject) => {
    const request = indexedDB.open('decklab-profile-builds', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('builds', {keyPath: 'id'});
    request.onsuccess = () => { db = request.result; resolve(); };
    request.onerror = () => reject(request.error);
  });
  ready.catch(() => {});
  async function transaction(mode, operation) {
    await ready;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('builds', mode), request = operation(tx.objectStore('builds'));
      tx.oncomplete = () => resolve(request?.result);
      tx.onerror = () => reject(tx.error || Error('Could not save the profile build.'));
      tx.onabort = () => reject(tx.error || Error('Save cancelled. Existing builds are unchanged.'));
    });
  }
  function validate(profile) {
    if (!profile || profile.format !== 'DeckLabProfile' || profile.version !== '1.0' || !Object.hasOwn(DEVICES, profile.target)) throw Error('Choose a supported DeckLab profile JSON file.');
    if (JSON.stringify(profile).length > MAX_BYTES) throw Error('Profile exceeds 64 MB.');
    if (!Array.isArray(profile.pages) || !profile.pages.length || profile.pages.length > 400 || !Array.isArray(profile.placements) || profile.placements.length > 4096) throw Error('Invalid profile pages or placements.');
    const pages = new Map();
    for (const page of profile.pages) {
      if (!page || typeof page.id !== 'string' || !page.id || pages.has(page.id)) throw Error('Profile page IDs must be unique.');
      pages.set(page.id, page);
    }
    for (const page of profile.pages) {
      const seen = new Set([page.id]); let parent = page.parentPageId;
      while (parent) {
        if (!pages.has(parent) || seen.has(parent)) throw Error('Invalid folder hierarchy.');
        seen.add(parent); parent = pages.get(parent).parentPageId;
      }
    }
    const slots = new Set();
    for (const p of profile.placements) {
      if (!p || !['action', 'folder', 'multi', 'multi-switch'].includes(p.kind) || !['Keypad', 'Encoder', 'Neo'].includes(p.controller) || !pages.has(p.pageId)) throw Error('Invalid profile placement.');
      if (![p.column, p.row].every(n => Number.isInteger(n) && n >= 0 && n < 4096)) throw Error('Invalid placement coordinates.');
      const slot = JSON.stringify([p.pageId, p.controller, p.column, p.row]); if (slots.has(slot)) throw Error('Two actions occupy the same profile slot.'); slots.add(slot);
      if (p.kind === 'action' && (typeof p.actionUuid !== 'string' || !p.actionUuid)) throw Error('An action is missing its ID.');
      if (p.kind === 'folder' && !pages.has(p.childPageId)) throw Error('A folder points to a missing page.');
      if (p.kind === 'multi' || p.kind === 'multi-switch') for (const key of ['A', 'B']) {
        const steps = p.sequences?.[key] || [];
        if (!Array.isArray(steps) || steps.length > 1000 || steps.some(s => !s || !['action', 'wait'].includes(s.kind) || (s.kind === 'action' && typeof s.actionUuid !== 'string'))) throw Error('Invalid Multi Action sequence.');
      }
    }
    const out = copy(profile); delete out.globalSettings; return out;
  }
  function cleanName(value) { const name = String(value || '').trim().slice(0, 48); if (!name) throw Error('Give this build a name.'); return name; }
  function record(profile, name, id = (crypto.randomUUID ? crypto.randomUUID() : 'build-' + Date.now() + '-' + Math.random().toString(36).slice(2)), createdAt = new Date().toISOString()) {
    const data = validate(profile); data.name = cleanName(name);
    return {id, name: data.name, createdAt, savedAt: new Date().toISOString(), profile: data};
  }
  async function putMany(records) {
    // Check size and write in the same transaction, including any recovery snapshot.
    await ready;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('builds', 'readwrite'), store = tx.objectStore('builds'), request = store.getAll(); let error;
      request.onsuccess = () => {
        const next = new Map(request.result.map(row => [row.id, row])); records.forEach(row => next.set(row.id, row));
        if (next.size > 201 || [...next.values()].reduce((total, row) => total + JSON.stringify(row).length, 0) > MAX_TOTAL) {
          error = Error('Build library is full. Download a backup, then remove unused builds.'); tx.abort(); return;
        }
        records.forEach(row => store.put(row));
      };
      tx.oncomplete = resolve; tx.onerror = () => reject(error || tx.error); tx.onabort = () => reject(error || tx.error || Error('Save cancelled.'));
    });
  }
  async function save(name) {
    const row = record(profileSerializableData(), name); await putMany([row]); return row;
  }
  async function openBuild(row) {
    if (window.decklabLivePreview) throw Error('Return to Build before opening a saved profile.');
    const data = validate(row.profile), before = profileHistorySnapshot();
    const recovery = record(profileSerializableData(), 'Recovery — before opening a build', 'recovery');
    // Fetch the requested record before replacing the recovery entry, so recovery itself can be opened.
    await putMany([recovery]);
    try {
      await importDeckLabProfileData(data);
      if (profileState.placements.length !== data.placements.length) throw Error('Some actions could not be restored. Your previous profile has been recovered.');
      DeckLabUX11.goStudio('build');
    } catch (error) { profileRestoreSnapshot(before, 'restore after failed build open'); throw error; }
  }
  function download(data, name) {
    downloadText((name.replace(/[^a-z0-9-_]+/gi, '-') || 'decklab') + '.decklab-profile.json', JSON.stringify(data, null, 2));
  }
  const note = text => $('profileBuildStatus').textContent = text;
  async function refresh() { rows = await transaction('readonly', store => store.getAll()); draw(); }
  async function run(operation) {
    if (busy) return; busy = true; $('profileBuildsDialog').setAttribute('aria-busy', 'true');
    $('profileBuildsDialog').querySelectorAll('button').forEach(button => button.disabled = true);
    try { await operation(); } catch (error) { note(error.message || 'Storage is unavailable. Download the current profile to keep your work.'); }
    finally { busy = false; $('profileBuildsDialog').removeAttribute('aria-busy'); $('profileBuildsDialog').querySelectorAll('button').forEach(button => button.disabled = false); }
  }
  function button(text, operation, label) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'secondary'; b.textContent = text;
    if (label) b.setAttribute('aria-label', label); b.onclick = () => run(operation); return b;
  }
  function draw() {
    const list = $('profileBuildList'); list.replaceChildren(); const query = $('profileBuildSearch').value.trim().toLowerCase();
    const found = rows.filter(row => (row.name + ' ' + DEVICES[row.profile.target]?.name).toLowerCase().includes(query)).sort((a, b) => (a.id === 'recovery') - (b.id === 'recovery') || b.savedAt.localeCompare(a.savedAt));
    $('profileBuildEmpty').hidden = !!found.length;
    $('profileBuildEmpty').textContent = rows.length ? 'No builds match your search.' : 'Save your first build to come back to it later.';
    for (const row of found) {
      const card = document.createElement('article'); card.className = 'profile-build-card'; card.dataset.buildId = row.id;
      const title = document.createElement('h3'); title.textContent = row.name;
      const meta = document.createElement('p'); meta.className = 'hint'; meta.textContent = `${DEVICES[row.profile.target]?.name || row.profile.target} · ${row.profile.pages.length} pages / folders · ${row.profile.placements.length} assignments · ${new Date(row.savedAt).toLocaleString()}`;
      const actions = document.createElement('div'); actions.className = 'profile-build-actions';
      actions.append(button('Open', async () => { await openBuild(row); $('profileBuildsDialog').close(); }, 'Open ' + row.name));
      actions.append(button('Download', () => download(row.profile, row.name), 'Download ' + row.name));
      if (row.id !== 'recovery') {
        actions.append(button('Update', async () => {
          if (!confirm('Replace “' + row.name + '” with the current build? The previous saved version will become the recovery copy.')) return;
          const updated = record(profileSerializableData(), row.name, row.id, row.createdAt);
          await putMany([{...row, id: 'recovery', name: 'Recovery — previous ' + row.name}, updated]); await refresh(); note('Updated “' + row.name + '”.');
        }, 'Update ' + row.name));
        actions.append(button('Rename', async () => {
          const name = prompt('Build name', row.name); if (name === null) return;
          await putMany([record(row.profile, name, row.id, row.createdAt)]); await refresh(); note('Build renamed.');
        }, 'Rename ' + row.name));
      }
      actions.append(button('Duplicate', async () => {
        await putMany([record(row.profile, (row.name.slice(0, 41) + ' copy'))]); await refresh(); note('Saved a separate copy.');
      }, 'Duplicate ' + row.name));
      actions.append(button('Delete', async () => {
        if (!confirm('Delete saved build “' + row.name + '”? Your open profile is unchanged.')) return;
        await transaction('readwrite', store => store.delete(row.id)); await refresh(); note('Saved build deleted. Your open profile is unchanged.');
      }, 'Delete ' + row.name));
      card.append(title, meta, actions); list.append(card);
    }
  }
  async function importData(data) {
    const profiles = data?.format === 'DeckLabProfileBuilds' && data.version === 1 ? data.builds : data?.format === 'DeckLabProfile' ? [data] : null;
    if (!Array.isArray(profiles) || !profiles.length || profiles.length > 200) throw Error('Choose a DeckLab profile or saved-builds backup.');
    const records = profiles.map(profile => record(profile, profile.name || 'Imported build')); await putMany(records); return records.length;
  }
  function boot() {
    const b = button('Saved builds', async () => {
      if (window.decklabLivePreview) return;
      $('profileBuildName').value = $('profileName').value; note(''); $('profileBuildsDialog').showModal(); await refresh();
    }); b.id = 'openProfileBuilds'; $('buildTools').append(b);
    const dialog = document.createElement('dialog'); dialog.id = 'profileBuildsDialog'; dialog.setAttribute('aria-labelledby', 'profileBuildsHeading');
    dialog.innerHTML = '<div class="artwork-heading"><div><h2 id="profileBuildsHeading">Saved profile builds</h2><p class="hint">Named deck setups, ready to reopen and edit.</p></div><button id="profileBuildClose" type="button" class="secondary" aria-label="Close saved builds">×</button></div><form id="profileBuildSaveForm" class="profile-build-save"><label>Build name<input id="profileBuildName" required maxlength="48"></label><button id="profileBuildSave" class="primary" type="submit">Save new build</button></form><div class="profile-build-actions"><button id="profileBuildDownload" type="button" class="secondary">Download current profile</button><button id="profileBuildExport" type="button" class="secondary">Back up all builds</button><button id="profileBuildImport" type="button" class="secondary">Import</button><input id="profileBuildFile" type="file" accept=".json,application/json" hidden></div><p id="profileBuildStatus" role="status"></p><input id="profileBuildSearch" type="search" placeholder="Search builds or devices…" aria-label="Search saved builds"><div id="profileBuildList"></div><p id="profileBuildEmpty"></p><p class="hint">Saved in this browser. Download a backup before clearing browser data or moving computers. Profiles embed placed artwork and settings; plugin executables must be loaded separately. Opening a build saves one recovery copy of your current profile.</p>';
    document.body.append(dialog); $('profileBuildClose').onclick = () => dialog.close(); $('profileBuildSearch').oninput = draw;
    $('profileBuildSaveForm').onsubmit = event => { event.preventDefault(); run(async () => { const row = await save($('profileBuildName').value); await refresh(); note('Saved “' + row.name + '”.'); }); };
    $('profileBuildDownload').onclick = () => run(() => { const profile = profileSerializableData(); download(profile, profile.name); });
    $('profileBuildExport').onclick = () => run(async () => {
      const saved = await transaction('readonly', store => store.getAll());
      if (!saved.length) throw Error('Save a build before backing up this library.');
      const data = {format: 'DeckLabProfileBuilds', version: 1, builds: saved.filter(row => row.id !== 'recovery').map(row => row.profile)};
      // The recovery copy is valuable even if it is the only remaining build.
      if (!data.builds.length) data.builds = saved.map(row => row.profile);
      downloadText('decklab-saved-builds.json', JSON.stringify(data, null, 2)); note('Backup downloaded. Keep it somewhere safe.');
    });
    $('profileBuildImport').onclick = () => $('profileBuildFile').click();
    $('profileBuildFile').onchange = event => {
      const file = event.target.files[0]; event.target.value = ''; if (!file) return;
      run(async () => { if (file.size > MAX_TOTAL) throw Error('Backup exceeds 192 MB.'); const count = await importData(JSON.parse(await file.text())); await refresh(); note('Imported ' + count + ' build(s). Your current profile is unchanged.'); });
    };
  }
  window.DeckLabProfileBuilds = {validate, save, openBuild, importData, refresh, getAll: () => transaction('readonly', store => store.getAll())};
  document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 480));
})();
