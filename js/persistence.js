// ═══════════════════════════════════════════════════════════
//  PERSISTENCE — localStorage, adventure grid, import/export
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  ADVENTURE SELECT
// ═══════════════════════════════════════════════════════════
function renderAdventureGrid() {
  const grid = document.getElementById('adventures-grid');
  grid.innerHTML = '';

  adventures.forEach((adv, i) => {
    // A built-in adventure is one that is NOT saved in localStorage (initially loaded from data.js)
    // For simplicity, we keep a list of known hardcoded IDs or check if it's the new master-test
    const isBuiltin = adv.meta.id === 'master-test' || adv.meta.id === 'builtin-1' || adv.meta.id === 'test-adventure';
    const card = document.createElement('div');
    card.className = 'adventure-card';

    card.innerHTML = `
      <div class="card-play-area">
        <div class="card-icon">${adv.meta.icon || '📜'}</div>
        <div class="card-title">${adv.meta.title}</div>
        <div class="card-author">por ${adv.meta.author || 'Desconhecido'}</div>
        <div class="card-desc">${adv.meta.desc || ''}</div>
        <span class="card-tag">${adv.meta.genre || 'Aventura'}</span>
      </div>
      ${!isBuiltin ? `<div class="card-actions">
        <button class="btn-sm card-btn-edit">✎ Editar</button>
        <button class="btn-sm card-btn-download">↓ Baixar</button>
        <button class="btn-sm red card-btn-remove">✕ Remover</button>
      </div>` : ''}
    `;

    // Only the play area triggers startAdventure — buttons are fully isolated
    card.querySelector('.card-play-area').addEventListener('click', () => startAdventure(adv));

    if (!isBuiltin) {
      card.querySelector('.card-btn-edit').addEventListener('click', () => editAdventure(i));
      card.querySelector('.card-btn-download').addEventListener('click', () => downloadAdventure(i));
      card.querySelector('.card-btn-remove').addEventListener('click', () => removeAdventure(i));
    }

    grid.appendChild(card);
  });

  // Add card
  const add = document.createElement('div');
  add.className = 'adventure-card card-add';
  add.innerHTML = `<div style="font-size:2rem;">+</div><div style="font-family:'Cinzel',serif;font-size:0.8rem;letter-spacing:0.15em;text-transform:uppercase;">Importar Aventura</div><div style="font-size:0.8rem;">Arquivo .json da comunidade</div>`;
  add.onclick = () => document.getElementById('import-input').click();
  grid.appendChild(add);
}

function removeAdventure(i) {
  adventures.splice(i, 1);
  saveAdventures();
  renderAdventureGrid();
}

function downloadAdventure(i) {
  const adv = adventures[i];
  if (!adv) return;
  const json = JSON.stringify(adv, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (adv.meta.title || 'aventura').replace(/\s/g, '_') + '.json';
  a.click();
  URL.revokeObjectURL(url);
  notify('Baixando: ' + adv.meta.title);
}

function editAdventure(i) {
  const adv = adventures[i];
  if (!adv) return;
  // Load adventure into editor
  editorAdventure = JSON.parse(JSON.stringify(adv));
  if (!editorAdventure.combats) editorAdventure.combats = {};
  selectedNodeId = editorAdventure.meta.startNode || Object.keys(editorAdventure.nodes)[0] || null;
  showScreen('screen-editor');
  notify('Editando: ' + adv.meta.title);
}

// ═══════════════════════════════════════════════════════════
//  PERSISTENCE — localStorage
// ═══════════════════════════════════════════════════════════
const STORAGE_KEY = 'cronicas-aventuras-v1';
const BUILTIN_IDS = ['master-test', 'builtin-1', 'test-adventure'];

function saveAdventures() {
  try {
    // Only save custom adventures (skip builtins — they're always embedded)
    const custom = adventures.filter(a => !BUILTIN_IDS.includes(a.meta.id));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
    const ts = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setStorageStatus(`✦ salvo às ${ts}`);
  } catch (err) {
    setStorageStatus('⚠ erro ao salvar');
  }
}

function loadSavedAdventures() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved)) return;
    let count = 0;
    saved.forEach(adv => {
      if (!adv.meta || !adv.nodes) return;
      if (BUILTIN_IDS.includes(adv.meta.id)) return; // skip if somehow a builtin crept in
      if (adventures.some(a => a.meta.id === adv.meta.id)) return; // no duplicates
      adventures.push(adv);
      count++;
    });
    if (count > 0) setStorageStatus(`✦ ${count} aventura${count > 1 ? 's' : ''} carregada${count > 1 ? 's' : ''}`);
  } catch (err) {
    console.warn('Erro ao carregar aventuras salvas:', err);
  }
}

function setStorageStatus(msg) {
  const el = document.getElementById('storage-status');
  if (el) el.textContent = msg;
}

// ═══════════════════════════════════════════════════════════
//  GAME ENGINE
// ═══════════════════════════════════════════════════════════
function importAdventure(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const adv = JSON.parse(e.target.result);
      if (!adv.meta || !adv.nodes) throw new Error('Formato inválido');
      // Avoid duplicate by id
      const idx = adventures.findIndex(a => a.meta.id === adv.meta.id);
      if (idx >= 0 && !BUILTIN_IDS.includes(adv.meta.id)) {
        adventures[idx] = adv;
        notify('Aventura atualizada: ' + adv.meta.title);
      } else {
        adventures.push(adv);
        notify('Aventura importada: ' + adv.meta.title);
      }
      saveAdventures();
      renderAdventureGrid();
    } catch (err) {
      notify('Erro ao importar: arquivo inválido');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function exportAdventure() {
  syncMetaToEditor();
  const json = JSON.stringify(editorAdventure, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (editorAdventure.meta.title || 'aventura').replace(/\s/g,'_') + '.json';
  a.click();
  URL.revokeObjectURL(url);
  notify('Aventura exportada com sucesso!');
}

function testAdventure() {
  syncMetaToEditor();
  if (!editorAdventure.meta.startNode || !editorAdventure.nodes[editorAdventure.meta.startNode]) {
    notify('Defina uma cena de início primeiro!');
    return;
  }
  // Make a deep copy to test
  const copy = JSON.parse(JSON.stringify(editorAdventure));
  // Replace if already exists, else prepend
  const idx = adventures.findIndex(a => a.meta.id === copy.meta.id);
  if (idx >= 0) adventures[idx] = copy; else adventures.unshift(copy);
  saveAdventures();
  startAdventure(copy);
}

function saveAdventureFromEditor() {
  syncMetaToEditor();
  const copy = JSON.parse(JSON.stringify(editorAdventure));
  const idx = adventures.findIndex(a => a.meta.id === copy.meta.id);
  if (idx >= 0) adventures[idx] = copy; else adventures.push(copy);
  saveAdventures();
  notify('✦ Aventura salva localmente: ' + (copy.meta.title || 'sem título'));
}

