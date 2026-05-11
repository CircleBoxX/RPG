// ═══════════════════════════════════════════════════════════
//  ENGINE — Toda a lógica do jogo, editor e sidequests
//  Este arquivo depende de data.js (carregado antes no HTML).
// ═══════════════════════════════════════════════════════════

let currentAdventure = null;
let currentNodeId = null;
let sceneCount = 0;
let history = [];

// ── Epilogue tracking ──
let epilogueLog = {
  mainEnding: null,      // { type, title, sceneName }
  sqResults: [],         // [{ sqId, sqTitle, outcome:'victory'|'defeat'|'skipped', endingTitle, endingName }]
  totalChoices: 0,
  sqCompleted: 0,
};

// Character state
let character = {
  name: '',
  attrs: { forca:1, destreza:1, inteligencia:1, carisma:1, sabedoria:1, constituicao:1 },
  vida: 3, vidaMax: 3,           // vida da jornada — baixa e escassa, persiste entre combates
  sanidade: 3, sanidadeMax: 3,   // sanidade da jornada — idem
  vidaCombate: 18, vidaCombateMax: 18, // vida de combate — grande, reseta a cada combate
  tags: {},          // { tagName: true/false } — set of active tags
  classKey: '',      // key/index of chosen class
  primaryAttr: '',   // primary attribute of chosen class (e.g. 'forca')
};

// ═══════════════════════════════════════════════════════════
//  TAG SYSTEM
// ═══════════════════════════════════════════════════════════

// Set or remove a tag on the player character
function setTag(tagName, value) {
  if (!tagName) return;
  const key = tagName.trim().toLowerCase();
  if (value === false || value === null || value === undefined || value === '' || value === 'false') {
    delete character.tags[key];
  } else {
    character.tags[key] = true;
  }
  renderTagsHud();
}

// Check if player has a tag
function hasTag(tagName) {
  if (!tagName) return false;
  return !!character.tags[tagName.trim().toLowerCase()];
}

// Apply an array of tag-set instructions: [{tag, value}]
function applyTagEffects(tagEffects) {
  if (!Array.isArray(tagEffects)) return;
  tagEffects.forEach(e => {
    if (e && e.tag) setTag(e.tag, e.value !== false);
  });
}

// Render mini tag display in HUD
function renderTagsHud() {
  let el = document.getElementById('tags-hud');
  if (!el) return;
  const keys = Object.keys(character.tags);
  if (!keys.length) { el.style.display = 'none'; return; }
  el.style.display = 'flex';
  el.innerHTML = keys.map(k =>
    `<span class="tag-chip">${escHtmlRuntime(k)}</span>`
  ).join('');
}

// Evaluate choice tag rules — returns: 'show' | 'hide' | 'disabled'
// choice.tagRules = [ { tag, mode:'show'|'hide'|'disable'|'redirect', redirectNode, invert } ]
function evalChoiceTagVisibility(choice) {
  if (!choice.tagRules || !choice.tagRules.length) return 'show';
  for (const rule of choice.tagRules) {
    const present = hasTag(rule.tag);
    const matches = rule.invert ? !present : present;
    if (!matches) continue;
    if (rule.mode === 'hide')     return 'hide';
    if (rule.mode === 'disable')  return 'disabled';
    // 'show' rules just keep showing (default)
  }
  return 'show';
}

// Get redirect node from tag rules (first matching redirect rule)
function evalChoiceTagRedirect(choice) {
  if (!choice.tagRules || !choice.tagRules.length) return null;
  for (const rule of choice.tagRules) {
    const present = hasTag(rule.tag);
    const matches = rule.invert ? !present : present;
    if (matches && rule.mode === 'redirect' && rule.redirectNode) {
      return rule.redirectNode;
    }
  }
  return null;
}

// Apply combat tag modifiers to a combat cfg (returns a new modified copy)
function applyCombatTagModifiers(cfg) {
  if (!cfg.tagModifiers || !cfg.tagModifiers.length) return cfg;
  // Deep copy to avoid mutating the original
  const modified = JSON.parse(JSON.stringify(cfg));
  for (const mod of cfg.tagModifiers) {
    const present = hasTag(mod.tag);
    const matches = mod.invert ? !present : present;
    if (!matches) continue;
    // skipToVictory: auto-win
    if (mod.skipToVictory) {
      modified._skipToVictory = true;
    }
    // Attribute modifiers on the enemy
    if (mod.attrDeltas) {
      if (!modified.attrs) modified.attrs = {};
      for (const [attr, delta] of Object.entries(mod.attrDeltas)) {
        modified.attrs[attr] = Math.max(1, (modified.attrs[attr] || 1) + delta);
      }
    }
    // Vida modifier
    if (mod.vidaDelta) {
      modified.vidaMax = Math.max(1, (modified.vidaMax || 8) + mod.vidaDelta);
      modified.vida    = modified.vidaMax;
    }
    // Special action unlock
    if (mod.specialAction) {
      modified._specialAction = mod.specialAction;
    }
  }
  return modified;
}
let pendingAdventure = null; // adventure waiting for character creation

// Editor state
let editorAdventure = {
  meta: { id: genId(), title: "Minha Aventura", author: "", desc: "", genre: "Fantasia Medieval", icon: "⚔️", startNode: "" },
  nodes: {}
};
let selectedNodeId = null;

// ═══════════════════════════════════════════════════════════
//  PIXEL ART GENERATION
// ═══════════════════════════════════════════════════════════

// Simple cache: prompt → svg string (clears on page refresh, that's fine)

// Each position has its own image. node.images = { header, inline, side, bg }
// node.portraitName = optional character name shown under portrait
// Backward-compat: if node.imageData exists (old format), treat as header image.
function getNodeImages(node) {
  if (node.images) return node.images;
  if (node.imageData) return { header: node.imageData };
  return {};
}

function renderSceneImage(node) {
  const headerWrap  = document.getElementById('scene-image-wrap');
  const headerInner = document.getElementById('scene-image-inner');
  const inlineSlot  = document.getElementById('scene-image-inline');
  const bgSlot      = document.getElementById('scene-image-bg');
  const contentArea = document.getElementById('scene-content-area');
  const sceneText   = document.getElementById('scene-text');

  // Remove old portrait wrapper if present
  const oldPortrait = document.getElementById('scene-portrait');
  if (oldPortrait) {
    // move scene-text back out before removing portrait
    if (sceneText.parentNode !== contentArea) {
      contentArea.insertBefore(sceneText, contentArea.firstChild);
    }
    oldPortrait.remove();
  }

  headerWrap.style.display = 'none'; headerInner.innerHTML = '';
  inlineSlot.style.display = 'none'; inlineSlot.innerHTML  = '';
  bgSlot.style.display     = 'none'; bgSlot.innerHTML      = '';

  const imgs = getNodeImages(node);
  const px = 'image-rendering:pixelated;';

  if (imgs.header) {
    headerWrap.style.display = 'block';
    headerInner.innerHTML = `<img src="${imgs.header}" style="width:100%;height:220px;object-fit:cover;display:block;${px}">`;
  }
  if (imgs.inline) {
    inlineSlot.style.display = 'block';
    inlineSlot.innerHTML = `<img src="${imgs.inline}" class="scene-img-inline" style="${px}">`;
  }
  if (imgs.side) {
    // Build portrait wrapper, move scene-text inside speech bubble
    const portrait = document.createElement('div');
    portrait.id = 'scene-portrait';
    portrait.className = 'scene-portrait-wrap';

    const nameHtml = node.portraitName
      ? `<div class="scene-portrait-name">${escHtmlRuntime(node.portraitName)}</div>`
      : '';

    portrait.innerHTML = `
      <div class="scene-portrait-img-box">
        <img src="${imgs.side}" style="${px}">
        ${nameHtml}
      </div>
      <div class="scene-portrait-speech" id="scene-portrait-speech"></div>`;

    contentArea.insertBefore(portrait, contentArea.firstChild);
    // move scene-text into speech div
    document.getElementById('scene-portrait-speech').appendChild(sceneText);
  }
  if (imgs.bg) {
    bgSlot.style.display = 'block';
    bgSlot.innerHTML = `<img src="${imgs.bg}" style="${px}width:100%;height:100%;object-fit:cover;opacity:0.07;filter:sepia(0.5) blur(1px);">`;
  }
}

function escHtmlRuntime(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (id === 'screen-select') renderAdventureGrid();
  if (id === 'screen-editor') renderEditor();
  if (id === 'screen-sq-editor') { renderSqList(); if (selectedSqId) renderSqEditor(selectedSqId); }
  if (id === 'screen-encounter-editor') { renderEncList(); if (selectedEncId) renderEncEditor(selectedEncId); }
  if (id === 'screen-char') {
    document.getElementById('char-name').value = character.name || '';
    renderCharClasses();
    renderAttrRows();
  }
}

// ═══════════════════════════════════════════════════════════
//  ADVENTURE SELECT
// ═══════════════════════════════════════════════════════════
function renderAdventureGrid() {
  const grid = document.getElementById('adventures-grid');
  grid.innerHTML = '';

  adventures.forEach((adv, i) => {
    const isBuiltin = adv.meta.id === 'builtin-1' || adv.meta.id === 'test-adventure';
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
  selectedNodeId = editorAdventure.meta.startNode || Object.keys(editorAdventure.nodes)[0] || null;
  showScreen('screen-editor');
  notify('Editando: ' + adv.meta.title);
}

// ═══════════════════════════════════════════════════════════
//  PERSISTENCE — localStorage
// ═══════════════════════════════════════════════════════════
const STORAGE_KEY = 'cronicas-aventuras-v1';
const BUILTIN_IDS = ['builtin-1', 'test-adventure'];

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
function startAdventure(adv) {
  pendingAdventure = adv;
  showScreen('screen-char');
}

// Restart same adventure with same character (skip char creation)
function restartCurrentAdventure() {
  if (!currentAdventure) return;
  // Limpa overlays que possam ter ficado abertos
  const deathOverlay = document.getElementById('death-overlay');
  if (deathOverlay) deathOverlay.remove();
  const combatOverlay = document.getElementById('combat-overlay');
  if (combatOverlay) combatOverlay.style.display = 'none';
  combatState = null;
  currentNodeId = currentAdventure.meta.startNode;
  sceneCount = 0;
  history = [];
  epilogueLog = { mainEnding: null, sqResults: [], totalChoices: 0, sqCompleted: 0 };
  character.tags = {};
  // Reset SQ completion flags
  if (currentAdventure.sidequests) {
    currentAdventure.sidequests.forEach(sq => { delete sq._completed; });
  }
  resetEncounterFlags();
  resetScore();
  renderCharHud();
  renderScene(currentNodeId);
}

// ── Text interpolation: {{nome}}, {{forca}}, {{destreza}}, etc.
// Returns plain values — sem tags <em> para não poluir o diálogo visualmente.
function interpolateText(text) {
  if (!text) return text;
  const attrLabels = {
    forca: 'Força', destreza: 'Destreza', inteligencia: 'Inteligência',
    carisma: 'Carisma', sabedoria: 'Sabedoria', constituicao: 'Constituição'
  };
  return text
    .replace(/\{\{nome\}\}/gi, escHtmlRuntime(character.name || 'Aventureiro'))
    .replace(/\{\{(\w+)\}\}/gi, (_, key) => {
      const k = key.toLowerCase();
      // Retorna o valor numérico do atributo diretamente
      if (character.attrs[k] !== undefined) {
        return String(character.attrs[k]);
      }
      // Retorna o nome do atributo se for só o nome (ex: {{Força}} sem valor)
      if (attrLabels[k]) return attrLabels[k];
      // Classe do personagem atual (se definida)
      if (k === 'classe' && character.className) return escHtmlRuntime(character.className);
      return `{{${key}}}`;
    });
}

function confirmCharAndStart() {
  const nameInput = document.getElementById('char-name').value.trim();
  character.name = nameInput || 'Aventureiro';
  // Calcular vida e sanidade da jornada (baixas e escassas)
  character.vidaMax    = calcMaxVida(character.attrs);
  character.vida       = character.vidaMax;
  character.sanidadeMax = calcMaxSanidade(character.attrs);
  character.sanidade   = character.sanidadeMax;
  // Calcular vida de combate (grande, reseta a cada combate)
  character.vidaCombateMax = calcVidaCombate(character.attrs);
  character.vidaCombate    = character.vidaCombateMax;
  // Reset tags (keep class tag which was set during applyClass)
  const classTags = {};
  for (const [k,v] of Object.entries(character.tags)) {
    if (k.startsWith('classe:')) classTags[k] = v;
  }
  character.tags = classTags;
  currentAdventure = pendingAdventure;
  currentNodeId = currentAdventure.meta.startNode;
  sceneCount = 0;
  history = [];
  epilogueLog = { mainEnding: null, sqResults: [], totalChoices: 0, sqCompleted: 0 };
  resetScore();
  showScreen('screen-game');
  document.getElementById('game-title-bar').textContent = currentAdventure.meta.title;
  renderCharHud();
  renderScene(currentNodeId);
}

function renderCharHud() {
  const hud = document.getElementById('char-hud');
  if (!hud) return;
  if (!character.name) { hud.style.display = 'none'; return; }
  hud.style.display = 'flex';
  hud.style.flexWrap = 'wrap';
  hud.style.gap = '0.5rem';

  const vidaPct    = Math.round((character.vida    / character.vidaMax)    * 100);
  const sanPct     = Math.round((character.sanidade / character.sanidadeMax) * 100);
  const barStyle   = (pct, color) =>
    `<div style="width:48px;height:4px;background:rgba(255,255,255,0.1);border-radius:0;overflow:hidden;margin-top:2px;">` +
    `<div style="width:${pct}%;height:100%;background:${color};transition:width 0.4s;"></div></div>`;

  const statusHtml =
    `<div class="char-hud-attr" style="flex-direction:column;align-items:flex-start;gap:0;" title="Vida da jornada — escassa, persiste entre combates">` +
      `<div style="display:flex;align-items:center;gap:0.25rem;">` +
        `<span>❤️</span><span style="font-size:0.65rem;color:#e06060;">VID</span>` +
        `<span style="color:#ff8888;font-weight:700;">${character.vida}/${character.vidaMax}</span>` +
      `</div>${barStyle(vidaPct, '#cc4444')}` +
    `</div>` +
    `<div class="char-hud-attr" style="flex-direction:column;align-items:flex-start;gap:0;" title="Sanidade da jornada — escassa, persiste entre combates">` +
      `<div style="display:flex;align-items:center;gap:0.25rem;">` +
        `<span>🧠</span><span style="font-size:0.65rem;color:#9370db;">SAN</span>` +
        `<span style="color:#c8a8ff;font-weight:700;">${character.sanidade}/${character.sanidadeMax}</span>` +
      `</div>${barStyle(sanPct, '#9370db')}` +
    `</div>`;

  hud.innerHTML =
    `<span style="color:var(--gold-light);font-family:'Cinzel',serif;font-size:0.75rem;margin-right:0.3rem;">${character.name}</span>` +
    ATTRS.map(a => `<div class="char-hud-attr">${a.icon} <span>${a.name.substring(0,3).toUpperCase()}</span><span>${character.attrs[a.key]}</span></div>`).join('') +
    statusHtml;
  renderTagsHud();
}

// Modifica vida ou sanidade do personagem (+/- delta), atualiza o HUD e verifica morte/loucura
function changeVida(delta) {
  character.vida = Math.max(0, Math.min(character.vidaMax, character.vida + delta));
  renderCharHud();
  if (character.vida <= 0) triggerStatusDeath('vida');
}
function changeSanidade(delta) {
  character.sanidade = Math.max(0, Math.min(character.sanidadeMax, character.sanidade + delta));
  renderCharHud();
  if (character.sanidade <= 0) triggerStatusDeath('sanidade');
}

// Fim de jogo por vida ou sanidade zerada — registra derrota e vai para epílogo
function triggerStatusDeath(tipo) {
  const isVida = tipo === 'vida';
  const title   = isVida ? 'Sucumbiu aos Ferimentos' : 'A Mente se Partiu';
  const sceneName = isVida ? '— Vida esgotada —' : '— Sanidade esgotada —';

  // Registra como derrota no epilogue log (só se ainda não houve um ending)
  if (!epilogueLog.mainEnding) {
    epilogueLog.mainEnding = { type: 'defeat', title, sceneName };
  }

  // Mostra overlay dramático antes de ir ao epílogo
  // Remove overlay anterior se existir (evita sobreposição)
  const overlayAntigo = document.getElementById('death-overlay');
  if (overlayAntigo) overlayAntigo.remove();

  const overlay = document.createElement('div');
  overlay.id = 'death-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;z-index:2000;animation:fadeIn 0.4s ease;';
  overlay.innerHTML = `
    <div style="text-align:center;max-width:380px;padding:2.5rem;border:1px solid ${isVida ? '#8b1a1a' : '#4a2080'};">
      <div style="font-size:3rem;margin-bottom:1rem;">${isVida ? '💀' : '🌀'}</div>
      <div style="font-family:'Cinzel',serif;font-size:0.7rem;letter-spacing:0.3em;color:${isVida ? '#cc4444' : '#9370db'};text-transform:uppercase;margin-bottom:0.6rem;">
        ${isVida ? '✦ DERROTA ✦' : '✦ LOUCURA ✦'}
      </div>
      <div style="font-family:'Cinzel',serif;font-size:1.4rem;color:var(--parchment);margin-bottom:1.5rem;line-height:1.3;">
        ${title}
      </div>
      <div style="font-family:'IM Fell English',serif;font-style:italic;color:var(--stone-light);font-size:0.95rem;margin-bottom:2rem;">
        ${isVida ? 'Seus ferimentos foram graves demais. A jornada termina aqui.' : 'A escuridão consumiu sua mente. Não há mais retorno da loucura.'}
      </div>
      <button class="btn-medieval danger" onclick="const o=document.getElementById('death-overlay');if(o)o.remove(); showEpilogue();">📜 Ver Epílogo</button>
    </div>`;
  document.body.appendChild(overlay);
}

function renderScene(nodeId) {
  const node = currentAdventure.nodes[nodeId];
  if (!node) { notify('Cena não encontrada: ' + nodeId); return; }

  sceneCount++;
  document.getElementById('game-stats').textContent = `Cena ${sceneCount}`;

  // Animate
  const card = document.getElementById('story-card');
  card.style.opacity = '0';
  card.style.transform = 'translateY(10px)';

  setTimeout(() => {
    document.getElementById('scene-title').innerHTML = interpolateText(node.title);
    document.getElementById('scene-text').innerHTML = interpolateText(node.text.replace(/\n/g, '<br>'));

    // Scene pixel art image (async, non-blocking)
    renderSceneImage(node);

    // Choices — always reset the whole section first to avoid stale #choices-list
    const choicesSection = document.getElementById('choices-section');
    choicesSection.innerHTML = '';

    // History log
    const historyLog = document.getElementById('history-log');
    if (historyLog) {
      historyLog.textContent = history.length > 0
        ? 'Caminho: ' + history.slice(-3).map(h => h.scene).join(' → ')
        : '';
    }

    card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    card.style.opacity = '1';
    card.style.transform = 'translateY(0)';

    // Dialogue plays first (if configured), then shows choices/endings
    startDialogue(node, () => {
      _renderSceneChoices(node, nodeId, choicesSection);
      // Check sidequest trigger (only on non-ending scenes, not during a sidequest)
      if (!node.ending && !activeSidequest) {
        setTimeout(() => {
          const sqTriggered = checkSidequestTrigger(nodeId);
          if (!sqTriggered) checkEncounterTrigger(nodeId);
        }, 600);
      }
    });
  }, 150);
}

// ── Renders choices/endings after dialogue finishes ──
function _renderSceneChoices(node, nodeId, choicesSection) {
  if (node.ending) {
    // Record the main ending in the epilogue log
    epilogueLog.mainEnding = {
      type: node.ending.type,
      title: node.ending.title || node.title,
      sceneName: node.title
    };
    // Award ending score points
    if (node.ending.points) addScore(node.ending.points, 'ending', `Final: ${node.ending.title || node.title}`);
    choicesSection.innerHTML = `
      <div class="ending-banner">
        <div class="ending-type ${node.ending.type}">${node.ending.type === 'victory' ? '✦ VITÓRIA ✦' : node.ending.type === 'defeat' ? '✦ DERROTA ✦' : '✦ FIM ✦'}</div>
        <div class="ending-title" style="color:${node.ending.type==='victory'?'var(--gold-light)':node.ending.type==='defeat'?'#cc4444':'var(--parchment-dark)'}">${node.ending.title}</div>
        <button class="btn-medieval" style="margin:0 auto;" onclick="showEpilogue()">📜 Ver Epílogo</button>
        <button class="btn-medieval secondary" style="margin:0.5rem auto 0;" onclick="restartCurrentAdventure()">↺ Jogar Novamente</button>
        <button class="btn-medieval secondary" style="margin:0.3rem auto 0;" onclick="showScreen('screen-select')">← Outras Aventuras</button>
      </div>`;
  } else {
    // Check for combat first
    if (checkAndStartCombat(nodeId)) {
      // Combat overlay will handle navigation
    } else {
      choicesSection.innerHTML = `<div class="choices-label">O que fazes?</div><div id="choices-list"></div>`;
      const cl = document.getElementById('choices-list');
      (node.choices || []).forEach((c, i) => {
        // ── Tag visibility check ──
        const visibility = evalChoiceTagVisibility(c);
        if (visibility === 'hide') return; // completely hidden

        const btn = document.createElement('button');
        btn.className = 'choice-btn';

        if (visibility === 'disabled') {
          btn.disabled = true;
          btn.style.opacity = '0.4';
          btn.style.cursor = 'not-allowed';
        }

        let badge = '';
        if (c.attrCheck) {
          const attrVal = character.attrs[c.attrCheck] || 1;
          const chance = calcSuccessChance(attrVal, c.difficulty || 5);
          const tier = chance >= 75 ? 'easy' : chance >= 50 ? 'medium' : chance >= 30 ? 'hard' : 'vhard';
          const attrInfo = ATTRS.find(a => a.key === c.attrCheck);
          badge = `<span class="choice-attr-badge ${tier}">${attrInfo?.icon || ''} ${attrInfo?.name || c.attrCheck} · ${chance}%</span>`;
        }

        btn.innerHTML = `<span class="choice-num">${String.fromCharCode(73 + i)}.</span><span>${c.text}${badge}</span>`;
        btn.onclick = () => {
          history.push({ scene: node.title, choice: c.text });
          epilogueLog.totalChoices++;
          // Award base choice points
          if (c.points) addScore(c.points, 'choice', `Escolha: ${c.text.substring(0,30)}`);
          // Apply tags from this choice
          if (c.tagEffects) applyTagEffects(c.tagEffects);
          // Apply vida/sanidade changes from the choice itself (before roll)
          if (c.vida)     changeVida(c.vida);
          if (c.sanidade) changeSanidade(c.sanidade);
          // Tag redirect overrides next
          const redirect = evalChoiceTagRedirect(c);
          if (redirect) {
            renderScene(redirect);
            return;
          }
          if (c.attrCheck) {
            doAttrRoll(c);
          } else {
            renderScene(c.next);
          }
        };
        cl.appendChild(btn);
      });
    } // end else (no combat)
  }
}
function renderAttrRows() {
  const container = document.getElementById('attr-rows');
  if (!container) return;
  const used = Object.values(character.attrs).reduce((a,b) => a+b, 0) - BASE_POINTS_USED;
  const remaining = FREE_POINTS - used;
  const pointsEl = document.getElementById('points-remaining');
  if (pointsEl) pointsEl.textContent = remaining + ' pontos restantes';

  const previewVida        = calcMaxVida(character.attrs);
  const previewSanidade    = calcMaxSanidade(character.attrs);
  const previewVidaCombate = calcVidaCombate(character.attrs);

  container.innerHTML = ATTRS.map(a => {
    const val = character.attrs[a.key];
    const fillPct = ((val - ATTR_MIN) / (ATTR_MAX - ATTR_MIN)) * 100;
    // Hint for constituicao and sabedoria showing derived stat
    let derivedHint = '';
    if (a.key === 'constituicao') derivedHint =
      `<span style="color:#ff8888;font-size:0.6rem;margin-left:0.5rem;">❤️ Vida: ${previewVida}</span>` +
      `<span style="color:#e07070;font-size:0.6rem;margin-left:0.4rem;">⚔️ Combate: ${previewVidaCombate}</span>`;
    if (a.key === 'sabedoria')    derivedHint = `<span style="color:#c8a8ff;font-size:0.6rem;margin-left:0.5rem;">🧠 Sanidade: ${previewSanidade}</span>`;
    return `
      <div class="attr-row">
        <div class="attr-icon">${a.icon}</div>
        <div class="attr-info">
          <div class="attr-name">${a.name}${derivedHint}</div>
          <div class="attr-desc">${a.desc}</div>
          <div class="attr-bar"><div class="attr-bar-fill" style="width:${fillPct}%"></div></div>
        </div>
        <div class="attr-controls">
          <button class="attr-btn" onclick="changeAttr('${a.key}',-1)" ${val <= ATTR_MIN ? 'disabled' : ''}>−</button>
          <div class="attr-value">${val}</div>
          <button class="attr-btn" onclick="changeAttr('${a.key}',1)" ${val >= ATTR_MAX_CREATION || remaining <= 0 ? 'disabled' : ''}>+</button>
        </div>
      </div>`;
  }).join('');
}

function changeAttr(key, delta) {
  const used = Object.values(character.attrs).reduce((a,b) => a+b, 0) - BASE_POINTS_USED;
  const remaining = FREE_POINTS - used;
  const val = character.attrs[key];
  if (delta > 0 && (remaining <= 0 || val >= ATTR_MAX_CREATION)) return;
  if (delta < 0 && val <= ATTR_MIN) return;
  character.attrs[key] = val + delta;
  renderAttrRows();
}

// applyClass: recebe index (classes customizadas) ou key string (classes padrão)
function applyClass(cls) {
  document.querySelectorAll('.class-btn').forEach(b => b.classList.remove('selected'));
  const btn = document.getElementById('class-' + cls);
  if (btn) btn.classList.add('selected');

  const customList = pendingAdventure?.meta?.classes;
  let desc = '';

  if (Array.isArray(customList) && customList.length > 0) {
    const cc = customList[cls];
    if (!cc) return;
    character.className = cc.name || 'Aventureiro';
    character.classKey  = String(cls);
    character.primaryAttr = cc.primaryAttr || 'forca';
    desc = cc.desc || '';
    // Set class tag
    setTag('classe:' + (cc.name || 'aventureiro').toLowerCase().replace(/\s+/g,'_'), true);
    // Also set generic "classe" tag with the class name value (stored in tags as classe_<name>)
    if (cc.tags && Array.isArray(cc.tags)) applyTagEffects(cc.tags);
  } else {
    const preset = CLASS_PRESETS[cls];
    if (!preset) return;
    character.className = cls;
    character.classKey  = cls;
    character.primaryAttr = preset._primaryAttr || preset.primaryAttr || 'forca';
    setTag('classe:' + cls.toLowerCase(), true);
  }

  // Mostra descrição da classe se existir
  const descPanel = document.getElementById('class-desc-panel');
  if (descPanel) {
    if (desc) {
      descPanel.textContent = desc;
      descPanel.style.display = 'block';
    } else {
      descPanel.style.display = 'none';
    }
  }
  // Atributos NÃO são alterados — jogador distribui livremente
}

// Renderiza a grade de classes — usa lista customizada se a aventura tiver classes definidas
function renderCharClasses() {
  const descPanel = document.getElementById('class-desc-panel');
  if (descPanel) descPanel.style.display = 'none';
  const grid = document.getElementById('char-class-grid');
  if (!grid) return;

  const customList = pendingAdventure?.meta?.classes;

  if (Array.isArray(customList) && customList.length > 0) {
    // Classes da aventura: índice numérico como identificador do botão
    grid.innerHTML = customList.map((cc, idx) => {
      const desc = cc.desc ? escHtmlRuntime(cc.desc) : '';
      return `
        <button class="class-btn" onclick="applyClass(${idx})" id="class-${idx}" title="${desc}">
          <span class="class-icon">${cc.icon || '⚔️'}</span>
          <span>${escHtmlRuntime((cc.name || 'Classe').toUpperCase())}</span>
        </button>`;
    }).join('');
  } else {
    // Classes padrão do sistema — uma por atributo
    const defaultClasses = [
      { key: 'warrior', icon: '⚔️', label: 'GUERREIRO', primary: 'Força' },
      { key: 'rogue',   icon: '🗡️', label: 'LADINO',    primary: 'Destreza' },
      { key: 'mage',    icon: '📚', label: 'MAGO',       primary: 'Inteligência' },
      { key: 'bard',    icon: '🎶', label: 'BARDO',      primary: 'Carisma' },
      { key: 'ranger',  icon: '🏹', label: 'ARQUEIRO',   primary: 'Sabedoria' },
      { key: 'paladin', icon: '🛡️', label: 'PALADINO',   primary: 'Constituição' },
    ];
    grid.innerHTML = defaultClasses.map(c => `
      <button class="class-btn" onclick="applyClass('${c.key}')" id="class-${c.key}">
        <span class="class-icon">${c.icon}</span>
        <span>${c.label}</span>
      </button>`).join('');
  }
}

// ═══════════════════════════════════════════════════════════
//  ATTRIBUTE ROLL ENGINE
// ═══════════════════════════════════════════════════════════

// Success chance: attrVal/difficulty as base, scaled 15-95%
// Sabedoria dá bônus pequeno de chance (percepção e julgamento)
function calcSuccessChance(attrVal, difficulty) {
  const sabedoria = character.attrs['sabedoria'] || 1;
  const raw = (attrVal / difficulty) * 60 + 10 + (sabedoria - 1) * 1.5;
  return Math.round(Math.min(95, Math.max(15, raw)));
}

function doAttrRoll(choice) {
  const attrKey = choice.attrCheck;
  const difficulty = choice.difficulty || 5;
  const attrVal = character.attrs[attrKey] || 1;
  const attrInfo = ATTRS.find(a => a.key === attrKey);
  const chance = calcSuccessChance(attrVal, difficulty);

  // Roll 1-100
  const roll = Math.floor(Math.random() * 100) + 1;
  const success = roll <= chance;
  const nextNode = success ? choice.next : (choice.nextFail || choice.next);

  // Show overlay
  const overlay = document.getElementById('roll-overlay');
  overlay.style.display = 'flex';

  document.getElementById('roll-attr-name').textContent =
    `Teste de ${attrInfo?.name || attrKey} (${attrVal}) · Dificuldade ${difficulty}`;
  document.getElementById('roll-choice-text').textContent = choice.text;
  document.getElementById('roll-dice').textContent = '🎲';
  document.getElementById('roll-number').style.color = 'var(--gold)';

  // Animate number
  let frame = 0;
  const anim = setInterval(() => {
    document.getElementById('roll-number').textContent = Math.floor(Math.random() * 100) + 1;
    frame++;
    if (frame >= 12) {
      clearInterval(anim);
      document.getElementById('roll-number').textContent = roll;
      document.getElementById('roll-number').style.color = success ? '#4a8' : '#cc4444';
      document.getElementById('roll-vs').textContent = `Precisava ≤ ${chance} para ter sucesso`;
      const resultEl = document.getElementById('roll-result');
      resultEl.className = 'roll-result ' + (success ? 'success' : 'failure');
      resultEl.textContent = success ? '✦ SUCESSO ✦' : '✦ FALHOU ✦';
    }
  }, 60);

  const btn = document.getElementById('roll-continue-btn');
  btn.onclick = () => {
    overlay.style.display = 'none';
    // Award roll-specific points
    if (success && choice.pointsSuccess) addScore(choice.pointsSuccess, 'roll', `Sucesso: ${choice.text.substring(0,30)}`);
    if (!success && choice.pointsFail)   addScore(choice.pointsFail,   'roll', `Falha: ${choice.text.substring(0,30)}`);
    // Apply vida/sanidade changes from roll result
    if (success) {
      if (choice.vidaSuccess)     changeVida(choice.vidaSuccess);
      if (choice.sanidadeSuccess) changeSanidade(choice.sanidadeSuccess);
    } else {
      if (choice.vidaFail)        changeVida(choice.vidaFail);
      if (choice.sanidadeFail)    changeSanidade(choice.sanidadeFail);
    }
    renderScene(nextNode);
  };
}

// ═══════════════════════════════════════════════════════════
//  IMPORT / EXPORT
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

// ═══════════════════════════════════════════════════════════
//  EDITOR
// ═══════════════════════════════════════════════════════════
function renderEditor() {
  syncMetaFromEditor();
  renderNodeList();
  renderClassEditor();
  if (selectedNodeId && editorAdventure.nodes[selectedNodeId]) {
    renderNodeEditor(selectedNodeId);
  } else {
    document.getElementById('node-editor').innerHTML = `<div style="color:var(--stone);font-style:italic;text-align:center;padding:2rem;">Selecione ou crie uma cena.</div>`;
  }
}

function syncMetaFromEditor() {
  document.getElementById('meta-title').value = editorAdventure.meta.title || '';
  document.getElementById('meta-author').value = editorAdventure.meta.author || '';
  document.getElementById('meta-desc').value = editorAdventure.meta.desc || '';
  document.getElementById('meta-icon').value = editorAdventure.meta.icon || '';
  const sel = document.getElementById('meta-genre');
  if (sel) sel.value = editorAdventure.meta.genre || 'Fantasia Medieval';
}

function syncMetaToEditor() {
  editorAdventure.meta.title = document.getElementById('meta-title').value;
  editorAdventure.meta.author = document.getElementById('meta-author').value;
  editorAdventure.meta.desc = document.getElementById('meta-desc').value;
  editorAdventure.meta.icon = document.getElementById('meta-icon').value;
  editorAdventure.meta.genre = document.getElementById('meta-genre').value;
}

// ═══════════════════════════════════════════════════════════
//  CUSTOM CLASS EDITOR
//  Cada classe: { name, icon, desc, primaryAttr }
//  O atributo primário começa em 5 na criação; demais em 1.
// ═══════════════════════════════════════════════════════════

function getEditorClasses() {
  if (!Array.isArray(editorAdventure.meta.classes)) editorAdventure.meta.classes = [];
  return editorAdventure.meta.classes;
}

// Gera atributos: primário = 5, demais = 1
function buildClassAttrs(primaryAttr) {
  const attrs = {};
  ATTRS.forEach(a => { attrs[a.key] = a.key === primaryAttr ? ATTR_MAX_CREATION : ATTR_MIN; });
  return attrs;
}

function renderClassEditor() {
  const container = document.getElementById('class-editor-body');
  if (!container) return;
  const classes = getEditorClasses();

  if (classes.length === 0) {
    container.innerHTML = `<div style="color:var(--stone);font-style:italic;font-size:0.82rem;padding:0.6rem 0;">
      Nenhuma classe criada — o jogo usará as 6 classes padrão do sistema.
    </div>`;
    return;
  }

  container.innerHTML = classes.map((cc, idx) => {
    return `
      <div style="display:grid;grid-template-columns:52px 1fr auto;gap:0.5rem;align-items:start;
                  border:1px solid rgba(201,162,39,0.18);padding:0.7rem;margin-bottom:0.5rem;background:rgba(0,0,0,0.12);">
        <div>
          <label class="field-label" style="font-size:0.58rem;">Ícone</label>
          <input class="field-input" value="${escHtml(cc.icon||'⚔️')}"
            style="text-align:center;font-size:1.3rem;padding:0.15rem;width:100%;"
            oninput="updateCustomClass(${idx},'icon',this.value)">
        </div>
        <div style="display:flex;flex-direction:column;gap:0.35rem;">
          <div>
            <label class="field-label" style="font-size:0.58rem;">Nome</label>
            <input class="field-input" value="${escHtml(cc.name||'Nova Classe')}"
              oninput="updateCustomClass(${idx},'name',this.value)">
          </div>
          <div>
            <label class="field-label" style="font-size:0.58rem;">Descrição <span style="color:var(--stone);font-weight:normal;">(aparece ao selecionar a classe)</span></label>
            <input class="field-input" value="${escHtml(cc.desc||'')}"
              placeholder="Ex: Especialista em furtividade e precisão..."
              oninput="updateCustomClass(${idx},'desc',this.value)">
          </div>
          <div>
            <label class="field-label" style="font-size:0.58rem;">Atributo Primário <span style="color:var(--stone);font-weight:normal;">(usado no ataque em combate)</span></label>
            <select class="field-select" style="font-size:0.7rem;" onchange="updateCustomClass(${idx},'primaryAttr',this.value)">
              ${ATTRS.map(a => `<option value="${a.key}" ${cc.primaryAttr===a.key?'selected':''}>${a.icon} ${a.name}</option>`).join('')}
            </select>
          </div>
        </div>
        <button class="btn-sm red" style="margin-top:1.1rem;" onclick="deleteCustomClass(${idx})">✕</button>
      </div>`;
  }).join('');
}

function addCustomClass() {
  const classes = getEditorClasses();
  classes.push({ name: 'Nova Classe', icon: '⚔️', desc: '' });
  renderClassEditor();
}
function deleteCustomClass(idx) {
  const classes = getEditorClasses();
  classes.splice(idx, 1);
  renderClassEditor();
}

function updateCustomClass(idx, field, value) {
  const classes = getEditorClasses();
  if (!classes[idx]) return;
  classes[idx][field] = value;
}

// ═══════════════════════════════════════════════════════════
//  TAG EDITOR HELPERS
// ═══════════════════════════════════════════════════════════

function buildChoiceTagRulesHtml(nodeId, choiceIdx, choice, allNodeIds) {
  const rules = choice.tagRules || [];
  if (!rules.length) return '<div style="font-size:0.65rem;color:var(--stone);font-style:italic;">Nenhuma regra.</div>';
  return rules.map((rule, ri) => {
    const modeOpts = ['show','hide','disable','redirect'].map(m =>
      `<option value="${m}" ${rule.mode===m?'selected':''}>${{show:'Mostrar',hide:'Ocultar',disable:'Desabilitar',redirect:'Redirecionar'}[m]}</option>`
    ).join('');
    const redirectOpt = rule.mode === 'redirect' ? `
      <select class="field-select" style="font-size:0.62rem;padding:0.15rem 0.3rem;" onchange="updateChoiceTagRule('${nodeId}',${choiceIdx},${ri},'redirectNode',this.value)">
        <option value="">— Cena —</option>
        ${allNodeIds.map(id=>`<option value="${id}" ${rule.redirectNode===id?'selected':''}>${escHtml(editorAdventure.nodes[id]?.title||id)}</option>`).join('')}
      </select>` : '';
    return `<div style="display:flex;align-items:center;gap:0.3rem;flex-wrap:wrap;margin-bottom:0.25rem;background:rgba(100,60,160,0.08);padding:0.25rem 0.35rem;">
      <span style="font-size:0.6rem;color:#b080e0;">SE</span>
      <input class="field-input" style="width:100px;font-size:0.62rem;padding:0.15rem 0.3rem;" placeholder="tag" value="${escHtml(rule.tag||'')}"
        onchange="updateChoiceTagRule('${nodeId}',${choiceIdx},${ri},'tag',this.value)">
      <label style="display:flex;align-items:center;gap:0.2rem;font-size:0.6rem;color:var(--stone-light);">
        <input type="checkbox" ${rule.invert?'checked':''} onchange="updateChoiceTagRule('${nodeId}',${choiceIdx},${ri},'invert',this.checked)"> ausente
      </label>
      <span style="font-size:0.6rem;color:#b080e0;">→</span>
      <select class="field-select" style="font-size:0.62rem;padding:0.15rem 0.3rem;" onchange="updateChoiceTagRule('${nodeId}',${choiceIdx},${ri},'mode',this.value);renderNodeEditor('${nodeId}')">
        ${modeOpts}
      </select>
      ${redirectOpt}
      <button class="btn-sm red" style="font-size:0.55rem;padding:0.1rem 0.3rem;" onclick="removeChoiceTagRule('${nodeId}',${choiceIdx},${ri})">✕</button>
    </div>`;
  }).join('');
}

function updateChoiceTagGrants(nodeId, choiceIdx, value, isGrant) {
  const choice = editorAdventure.nodes[nodeId]?.choices?.[choiceIdx];
  if (!choice) return;
  if (!choice.tagEffects) choice.tagEffects = [];
  // Remove existing effects of this type (grant or remove)
  choice.tagEffects = choice.tagEffects.filter(e => isGrant ? e.value === false : e.value !== false);
  // Add new
  const tags = value.split(',').map(t => t.trim()).filter(Boolean);
  tags.forEach(tag => choice.tagEffects.push({ tag, value: isGrant ? true : false }));
}

function addChoiceTagRule(nodeId, choiceIdx) {
  const choice = editorAdventure.nodes[nodeId]?.choices?.[choiceIdx];
  if (!choice) return;
  if (!choice.tagRules) choice.tagRules = [];
  choice.tagRules.push({ tag: '', mode: 'hide', invert: false });
  renderNodeEditor(nodeId);
}

function updateChoiceTagRule(nodeId, choiceIdx, ruleIdx, key, value) {
  const choice = editorAdventure.nodes[nodeId]?.choices?.[choiceIdx];
  if (!choice?.tagRules?.[ruleIdx]) return;
  choice.tagRules[ruleIdx][key] = value;
}

function removeChoiceTagRule(nodeId, choiceIdx, ruleIdx) {
  const choice = editorAdventure.nodes[nodeId]?.choices?.[choiceIdx];
  if (!choice?.tagRules) return;
  choice.tagRules.splice(ruleIdx, 1);
  renderNodeEditor(nodeId);
}

// ─── Combat tag modifier editor ───
function buildCombatTagModifiersHtml(nodeId, c, allNodeIds) {
  const mods = (c.tagModifiers || []);
  const attrKeys = ['forca','destreza','constituicao'];
  const attrNames = {forca:'Força', destreza:'Destreza', constituicao:'Constituição'};

  const modsHtml = mods.map((mod, mi) => {
    const attrDeltaInputs = attrKeys.map(k => `
      <div style="display:flex;align-items:center;gap:0.2rem;">
        <span style="font-size:0.6rem;color:var(--stone-light);">${attrNames[k]}:</span>
        <input class="points-mini-input" type="number" min="-9" max="9" value="${(mod.attrDeltas||{})[k]||0}"
          onchange="updateCombatTagModAttr('${nodeId}',${mi},'${k}',+this.value)">
      </div>`).join('');

    return `<div style="background:rgba(100,60,160,0.08);border:1px dashed rgba(180,120,220,0.2);padding:0.4rem;margin-bottom:0.35rem;font-size:0.65rem;">
      <div style="display:flex;align-items:center;gap:0.35rem;flex-wrap:wrap;margin-bottom:0.3rem;">
        <span style="color:#b080e0;font-size:0.6rem;">SE TAG</span>
        <input class="field-input" style="width:110px;font-size:0.62rem;padding:0.15rem 0.3rem;" placeholder="nome da tag" value="${escHtml(mod.tag||'')}"
          onchange="updateCombatTagMod('${nodeId}',${mi},'tag',this.value)">
        <label style="display:flex;align-items:center;gap:0.2rem;font-size:0.6rem;color:var(--stone-light);">
          <input type="checkbox" ${mod.invert?'checked':''} onchange="updateCombatTagMod('${nodeId}',${mi},'invert',this.checked)"> ausente
        </label>
        <button class="btn-sm red" style="font-size:0.55rem;padding:0.1rem 0.3rem;margin-left:auto;" onclick="removeCombatTagMod('${nodeId}',${mi})">✕</button>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:0.3rem;align-items:center;margin-bottom:0.25rem;">
        ${attrDeltaInputs}
        <div style="display:flex;align-items:center;gap:0.2rem;">
          <span style="font-size:0.6rem;color:var(--stone-light);">Vida Δ:</span>
          <input class="points-mini-input" type="number" min="-99" max="99" value="${mod.vidaDelta||0}"
            onchange="updateCombatTagMod('${nodeId}',${mi},'vidaDelta',+this.value)">
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
        <label style="display:flex;align-items:center;gap:0.2rem;font-size:0.6rem;color:#7ecb8a;">
          <input type="checkbox" ${mod.skipToVictory?'checked':''} onchange="updateCombatTagMod('${nodeId}',${mi},'skipToVictory',this.checked)"> Pular para vitória
        </label>
      </div>
      <div style="margin-top:0.25rem;">
        <span style="font-size:0.6rem;color:var(--stone-light);">Ação especial (nome):</span>
        <input class="field-input" style="font-size:0.62rem;padding:0.15rem 0.3rem;" placeholder="Ex: Toque Sombrio"
          value="${escHtml(mod.specialAction?.label||'')}"
          onchange="updateCombatTagModSpecial('${nodeId}',${mi},'label',this.value)">
        <span style="font-size:0.6rem;color:var(--stone-light);">Dano especial:</span>
        <input class="points-mini-input" type="number" min="0" max="99" value="${mod.specialAction?.damage||5}"
          onchange="updateCombatTagModSpecial('${nodeId}',${mi},'damage',+this.value)">
      </div>
    </div>`;
  }).join('');

  return `
    <div style="border-top:1px dashed rgba(180,120,220,0.2);margin-top:0.6rem;padding-top:0.5rem;">
      <div style="font-family:'Cinzel',serif;font-size:0.6rem;letter-spacing:0.12em;color:#b080e0;text-transform:uppercase;margin-bottom:0.4rem;">🏷 Modificadores de Tag no Combate</div>
      ${modsHtml || '<div style="font-size:0.65rem;color:var(--stone);font-style:italic;margin-bottom:0.3rem;">Nenhum modificador.</div>'}
      <button class="btn-sm" style="font-size:0.6rem;" onclick="addCombatTagMod('${nodeId}')">+ Modificador de Tag</button>
      <div style="margin-top:0.5rem;">
        <div style="font-size:0.6rem;color:var(--stone-light);margin-bottom:0.2rem;">Tags ao vencer (separadas por vírgula):</div>
        <input class="field-input" style="font-size:0.72rem;" placeholder="ex: VenceuGuarda, ChegouPorto"
          value="${escHtml((c.victoryTagEffects||[]).map(e=>e.tag).join(', '))}"
          onchange="updateCombatTagList('${nodeId}','victoryTagEffects',this.value)">
        <div style="font-size:0.6rem;color:var(--stone-light);margin-bottom:0.2rem;margin-top:0.3rem;">Tags ao perder (separadas por vírgula):</div>
        <input class="field-input" style="font-size:0.72rem;" placeholder="ex: FoiDerrotado"
          value="${escHtml((c.defeatTagEffects||[]).map(e=>e.tag).join(', '))}"
          onchange="updateCombatTagList('${nodeId}','defeatTagEffects',this.value)">
      </div>
    </div>`;
}

function addCombatTagMod(nodeId) {
  const node = editorAdventure.nodes[nodeId];
  if (!node?.combat) return;
  if (!node.combat.tagModifiers) node.combat.tagModifiers = [];
  node.combat.tagModifiers.push({ tag:'', invert:false, attrDeltas:{}, vidaDelta:0, skipToVictory:false });
  renderNodeEditor(nodeId);
}

function removeCombatTagMod(nodeId, mi) {
  const node = editorAdventure.nodes[nodeId];
  if (!node?.combat?.tagModifiers) return;
  node.combat.tagModifiers.splice(mi, 1);
  renderNodeEditor(nodeId);
}

function updateCombatTagMod(nodeId, mi, key, value) {
  const node = editorAdventure.nodes[nodeId];
  if (!node?.combat?.tagModifiers?.[mi]) return;
  node.combat.tagModifiers[mi][key] = value;
}

function updateCombatTagModAttr(nodeId, mi, attrKey, value) {
  const node = editorAdventure.nodes[nodeId];
  if (!node?.combat?.tagModifiers?.[mi]) return;
  if (!node.combat.tagModifiers[mi].attrDeltas) node.combat.tagModifiers[mi].attrDeltas = {};
  node.combat.tagModifiers[mi].attrDeltas[attrKey] = value;
}

function updateCombatTagModSpecial(nodeId, mi, key, value) {
  const node = editorAdventure.nodes[nodeId];
  if (!node?.combat?.tagModifiers?.[mi]) return;
  if (!node.combat.tagModifiers[mi].specialAction) node.combat.tagModifiers[mi].specialAction = {label:'',damage:5};
  node.combat.tagModifiers[mi].specialAction[key] = value;
}

function updateCombatTagList(nodeId, field, value) {
  const node = editorAdventure.nodes[nodeId];
  if (!node?.combat) return;
  const tags = value.split(',').map(t=>t.trim()).filter(Boolean);
  node.combat[field] = tags.map(tag => ({tag, value: true}));
}
function renderNodeList() {
  const list = document.getElementById('node-list');
  list.innerHTML = '';
  Object.values(editorAdventure.nodes).forEach(node => {
    const item = document.createElement('div');
    item.className = 'node-item' + (node.id === selectedNodeId ? ' selected' : '');
    item.innerHTML = `
      <div class="node-item-title">${node.title || '(sem título)'}${node.id === editorAdventure.meta.startNode ? '<span class="node-start-badge">INÍCIO</span>' : ''}</div>
      <div class="node-item-id">#${node.id}</div>
    `;
    item.onclick = () => { selectedNodeId = node.id; renderEditor(); };
    list.appendChild(item);
  });
}

function renderNodeEditor(nodeId) {
  const node = editorAdventure.nodes[nodeId];
  if (!node) return;

  const allNodeIds = Object.keys(editorAdventure.nodes);

  document.getElementById('editing-label').textContent = `Editando: ${node.title || node.id}`;

  const choicesHtml = (node.choices || []).map((c, i) => `
    <div class="choice-editor-item">
      <button class="del-choice" onclick="removeChoice('${nodeId}', ${i})">✕</button>
      <div class="field-group" style="margin-bottom:0.6rem;">
        <label class="field-label">Texto da escolha</label>
        <input class="field-input" value="${escHtml(c.text)}" onchange="updateChoice('${nodeId}',${i},'text',this.value)">
      </div>
      <div class="field-group" style="margin-bottom:0.6rem;">
        <label class="field-label">Vai para (sucesso / padrão)</label>
        <select class="field-select" onchange="updateChoice('${nodeId}',${i},'next',this.value)">
          <option value="">— Selecionar cena —</option>
          ${allNodeIds.map(id => `<option value="${id}" ${c.next===id?'selected':''}>${editorAdventure.nodes[id]?.title || id}</option>`).join('')}
        </select>
      </div>
      <div style="border-top:1px dashed rgba(201,162,39,0.15);padding-top:0.6rem;margin-top:0.2rem;">
        <label class="field-label" style="margin-bottom:0.5rem;">Teste de Atributo (opcional)</label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.5rem;">
          <div>
            <label class="field-label" style="font-size:0.6rem;">Atributo</label>
            <select class="field-select" onchange="updateChoice('${nodeId}',${i},'attrCheck',this.value)">
              <option value="">Nenhum</option>
              ${ATTRS.map(a => `<option value="${a.key}" ${c.attrCheck===a.key?'selected':''}>${a.icon} ${a.name}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="field-label" style="font-size:0.6rem;">Dificuldade (1-10)</label>
            <input class="field-input" type="number" min="1" max="10" value="${c.difficulty||5}" onchange="updateChoice('${nodeId}',${i},'difficulty',+this.value)" ${!c.attrCheck?'disabled':''} style="${!c.attrCheck?'opacity:0.4':''}">
          </div>
        </div>
        ${c.attrCheck ? `
        <div class="field-group" style="margin-bottom:0.5rem;">
          <label class="field-label" style="font-size:0.6rem;">Vai para em FALHA (deixe vazio = mesma cena)</label>
          <select class="field-select" onchange="updateChoice('${nodeId}',${i},'nextFail',this.value)">
            <option value="">— Mesma cena de sucesso —</option>
            ${allNodeIds.map(id => `<option value="${id}" ${c.nextFail===id?'selected':''}>${editorAdventure.nodes[id]?.title || id}</option>`).join('')}
          </select>
        </div>` : ''}
      </div>
      <div style="border-top:1px dashed rgba(201,162,39,0.1);padding-top:0.5rem;margin-top:0.3rem;display:flex;flex-direction:column;gap:0.4rem;">
        <!-- ── Pontos ── -->
        <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
          <span style="font-family:'Cinzel',serif;font-size:0.6rem;letter-spacing:0.1em;color:var(--gold);text-transform:uppercase;min-width:3rem;">⭐ Pts</span>
          <div style="display:flex;align-items:center;gap:0.3rem;">
            <span style="font-size:0.6rem;color:var(--stone-light);">Escolha:</span>
            <input class="points-mini-input" type="number" value="${c.points||0}" min="-999" max="9999"
              title="Pontos ganhos ao selecionar esta escolha"
              onchange="updateChoice('${nodeId}',${i},'points',+this.value)">
          </div>
          ${c.attrCheck ? `
          <div style="display:flex;align-items:center;gap:0.3rem;">
            <span style="font-size:0.6rem;color:#4a8;">✦ Suc:</span>
            <input class="points-mini-input" type="number" value="${c.pointsSuccess||0}" min="-999" max="9999"
              title="Pontos bônus ao passar no teste"
              onchange="updateChoice('${nodeId}',${i},'pointsSuccess',+this.value)" style="border-color:rgba(68,170,136,0.4);">
          </div>
          <div style="display:flex;align-items:center;gap:0.3rem;">
            <span style="font-size:0.6rem;color:#c84;">✗ Fal:</span>
            <input class="points-mini-input" type="number" value="${c.pointsFail||0}" min="-999" max="9999"
              title="Pontos ao falhar (use negativo para penalidade)"
              onchange="updateChoice('${nodeId}',${i},'pointsFail',+this.value)" style="border-color:rgba(204,100,68,0.4);">
          </div>` : ''}
        </div>
        <!-- ── Vida ── -->
        <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
          <span style="font-family:'Cinzel',serif;font-size:0.6rem;letter-spacing:0.1em;color:#cc4444;text-transform:uppercase;min-width:3rem;">❤️ Vida</span>
          <div style="display:flex;align-items:center;gap:0.3rem;">
            <span style="font-size:0.6rem;color:var(--stone-light);">Escolha:</span>
            <input class="points-mini-input" type="number" value="${c.vida||0}" min="-99" max="99"
              title="Altera a vida ao escolher (negativo = dano, positivo = cura)"
              onchange="updateChoice('${nodeId}',${i},'vida',+this.value)" style="border-color:rgba(204,68,68,0.4);">
          </div>
          ${c.attrCheck ? `
          <div style="display:flex;align-items:center;gap:0.3rem;">
            <span style="font-size:0.6rem;color:#4a8;">✦ Suc:</span>
            <input class="points-mini-input" type="number" value="${c.vidaSuccess||0}" min="-99" max="99"
              title="Altera a vida ao passar no teste"
              onchange="updateChoice('${nodeId}',${i},'vidaSuccess',+this.value)" style="border-color:rgba(68,170,136,0.4);">
          </div>
          <div style="display:flex;align-items:center;gap:0.3rem;">
            <span style="font-size:0.6rem;color:#c84;">✗ Fal:</span>
            <input class="points-mini-input" type="number" value="${c.vidaFail||0}" min="-99" max="99"
              title="Altera a vida ao falhar no teste"
              onchange="updateChoice('${nodeId}',${i},'vidaFail',+this.value)" style="border-color:rgba(204,100,68,0.4);">
          </div>` : ''}
        </div>
        <!-- ── Sanidade ── -->
        <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
          <span style="font-family:'Cinzel',serif;font-size:0.6rem;letter-spacing:0.1em;color:#9370db;text-transform:uppercase;min-width:3rem;">🧠 San</span>
          <div style="display:flex;align-items:center;gap:0.3rem;">
            <span style="font-size:0.6rem;color:var(--stone-light);">Escolha:</span>
            <input class="points-mini-input" type="number" value="${c.sanidade||0}" min="-99" max="99"
              title="Altera a sanidade ao escolher (negativo = perda, positivo = recuperação)"
              onchange="updateChoice('${nodeId}',${i},'sanidade',+this.value)" style="border-color:rgba(147,112,219,0.4);">
          </div>
          ${c.attrCheck ? `
          <div style="display:flex;align-items:center;gap:0.3rem;">
            <span style="font-size:0.6rem;color:#4a8;">✦ Suc:</span>
            <input class="points-mini-input" type="number" value="${c.sanidadeSuccess||0}" min="-99" max="99"
              title="Altera a sanidade ao passar no teste"
              onchange="updateChoice('${nodeId}',${i},'sanidadeSuccess',+this.value)" style="border-color:rgba(68,170,136,0.4);">
          </div>
          <div style="display:flex;align-items:center;gap:0.3rem;">
            <span style="font-size:0.6rem;color:#c84;">✗ Fal:</span>
            <input class="points-mini-input" type="number" value="${c.sanidadeFail||0}" min="-99" max="99"
              title="Altera a sanidade ao falhar no teste"
              onchange="updateChoice('${nodeId}',${i},'sanidadeFail',+this.value)" style="border-color:rgba(204,100,68,0.4);">
          </div>` : ''}
        </div>
      </div>
      <!-- ── Tags desta Escolha ── -->
      <div style="border-top:1px dashed rgba(180,120,220,0.2);padding-top:0.5rem;margin-top:0.3rem;">
        <div style="font-family:'Cinzel',serif;font-size:0.6rem;letter-spacing:0.12em;color:#b080e0;text-transform:uppercase;margin-bottom:0.4rem;">🏷 Tags</div>
        <!-- Tag Effects: atribuir tags ao escolher -->
        <div style="margin-bottom:0.4rem;">
          <div style="font-size:0.6rem;color:var(--stone-light);margin-bottom:0.25rem;">Atribuir tags ao escolher (separadas por vírgula):</div>
          <input class="field-input" style="font-size:0.72rem;" placeholder="ex: PossuiChave, CompletoSidequest1"
            value="${escHtml((c.tagEffects||[]).filter(e=>e.value!==false).map(e=>e.tag).join(', '))}"
            onchange="updateChoiceTagGrants('${nodeId}',${i},this.value,true)">
        </div>
        <div style="margin-bottom:0.4rem;">
          <div style="font-size:0.6rem;color:var(--stone-light);margin-bottom:0.25rem;">Remover tags ao escolher (separadas por vírgula):</div>
          <input class="field-input" style="font-size:0.72rem;" placeholder="ex: PossuiChave"
            value="${escHtml((c.tagEffects||[]).filter(e=>e.value===false).map(e=>e.tag).join(', '))}"
            onchange="updateChoiceTagGrants('${nodeId}',${i},this.value,false)">
        </div>
        <!-- Tag Rules: visibilidade baseada em tags -->
        <div style="font-size:0.6rem;color:var(--stone-light);margin-bottom:0.25rem;">Regras de visibilidade por tag:</div>
        ${buildChoiceTagRulesHtml(nodeId, i, c, allNodeIds)}
        <button class="btn-sm" style="font-size:0.6rem;margin-top:0.3rem;" onclick="addChoiceTagRule('${nodeId}',${i})">+ Regra de Tag</button>
      </div>
    </div>
  `).join('');

  document.getElementById('node-editor').innerHTML = `
    <div class="field-group">
      <label class="field-label">ID da Cena</label>
      <input class="field-input" value="${node.id}" style="opacity:0.5;" readonly>
    </div>
    <div class="field-group">
      <label class="field-label">Título</label>
      <input class="field-input" id="en-title" value="${escHtml(node.title)}" oninput="updateNode('${nodeId}','title',this.value)">
    </div>
    <div class="field-group">
      <label class="field-label">Texto da Cena</label>
      <textarea class="field-textarea" id="en-text" style="min-height:140px;" oninput="updateNode('${nodeId}','text',this.value)">${escHtml(node.text)}</textarea>
      <div style="font-size:0.68rem; color:var(--stone); margin-top:0.3rem; font-style:italic;">
        Dica: use <code style="color:var(--gold-light);">{{nome}}</code> para o nome, <code style="color:var(--gold-light);">{{forca}}</code>, <code style="color:var(--gold-light);">{{destreza}}</code>, <code style="color:var(--gold-light);">{{inteligencia}}</code>, <code style="color:var(--gold-light);">{{carisma}}</code>, <code style="color:var(--gold-light);">{{sabedoria}}</code>, <code style="color:var(--gold-light);">{{constituicao}}</code> para os atributos.
      </div>
    </div>
    <div class="image-prompt-wrap" id="img-upload-wrap-${nodeId}">
      <label class="field-label" style="margin-bottom:0.6rem;">🎨 Imagens da Cena <span style="font-size:0.6rem;font-family:'Crimson Text',serif;font-style:italic;font-weight:400;color:var(--stone);letter-spacing:0;text-transform:none;">— cada posição tem sua própria imagem</span></label>
      <div id="img-slots-${nodeId}"></div>
    </div>
    <div style="border-top:1px solid rgba(201,162,39,0.15); padding-top:1rem; margin-top:0.5rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.8rem;">
        <span class="field-label" style="margin:0;">Escolhas</span>
        <button class="btn-sm" onclick="addChoice('${nodeId}')">+ Escolha</button>
      </div>
      ${choicesHtml || '<div style="color:var(--stone);font-size:0.85rem;font-style:italic;margin-bottom:0.8rem;">Nenhuma escolha — esta será uma cena de fim.</div>'}
    </div>
    <div class="field-group" style="margin-top:1rem; border-top:1px solid rgba(201,162,39,0.1); padding-top:1rem;">
      <label class="field-label">Tipo de Final (opcional)</label>
      <select class="field-select" onchange="updateEnding('${nodeId}',this.value)">
        <option value="">Não é final</option>
        <option value="victory" ${node.ending?.type==='victory'?'selected':''}>Vitória</option>
        <option value="defeat" ${node.ending?.type==='defeat'?'selected':''}>Derrota</option>
        <option value="neutral" ${node.ending?.type==='neutral'?'selected':''}>Neutro</option>
      </select>
    </div>
    ${node.ending ? `<div class="field-group">
      <label class="field-label">Título do Final</label>
      <input class="field-input" value="${escHtml(node.ending.title||'')}" oninput="updateNode_ending('${nodeId}','title',this.value)">
    </div>
    <div class="field-group">
      <label class="field-label">⭐ Pontos do Final</label>
      <div style="display:flex;align-items:center;gap:0.7rem;">
        <input class="points-mini-input" style="width:80px;" type="number" value="${node.ending.points||0}" min="-9999" max="99999"
          title="Pontos ganhos/perdidos ao atingir este final"
          onchange="updateNode_ending('${nodeId}','points',+this.value)">
        <span style="font-size:0.72rem;color:var(--stone-light);font-family:'Cinzel',serif;">adicionados ao atingir este final</span>
      </div>
    </div>` : ''}
    ${buildDialogueEditorHtml(nodeId, node)}
    ${buildCombatEditorHtml(nodeId, node, allNodeIds)}
  `;

  // Render per-position image slots (must be after innerHTML)
  renderImageSlots(nodeId);
}

function updateNode(nodeId, key, value) {
  if (editorAdventure.nodes[nodeId]) {
    editorAdventure.nodes[nodeId][key] = value;
    if (key === 'title') renderNodeList();
  }
}

function updateNode_ending(nodeId, key, value) {
  if (editorAdventure.nodes[nodeId]?.ending) {
    editorAdventure.nodes[nodeId].ending[key] = value;
  }
}

function updateEnding(nodeId, type) {
  const node = editorAdventure.nodes[nodeId];
  if (!node) return;
  if (type === '') { delete node.ending; }
  else { node.ending = { type, title: node.ending?.title || '' }; }
  renderNodeEditor(nodeId);
}

function updateChoice(nodeId, idx, key, value) {
  editorAdventure.nodes[nodeId].choices[idx][key] = value;
  // If attrCheck was cleared, clear related fields
  if (key === 'attrCheck' && !value) {
    delete editorAdventure.nodes[nodeId].choices[idx].nextFail;
    delete editorAdventure.nodes[nodeId].choices[idx].difficulty;
  }
  if (key === 'attrCheck') renderNodeEditor(nodeId);
}

function addChoice(nodeId) {
  editorAdventure.nodes[nodeId].choices = editorAdventure.nodes[nodeId].choices || [];
  editorAdventure.nodes[nodeId].choices.push({ text: 'Nova escolha', next: '' });
  renderNodeEditor(nodeId);
}

function removeChoice(nodeId, idx) {
  editorAdventure.nodes[nodeId].choices.splice(idx, 1);
  renderNodeEditor(nodeId);
}

function addNode() {
  const id = 'cena_' + Date.now();
  editorAdventure.nodes[id] = { id, title: 'Nova Cena', text: 'Descreva o que acontece aqui...', choices: [] };
  selectedNodeId = id;
  if (!editorAdventure.meta.startNode) editorAdventure.meta.startNode = id;
  renderEditor();
}

function deleteNode() {
  if (!selectedNodeId) return;
  if (Object.keys(editorAdventure.nodes).length <= 1) { notify('Você precisa ter ao menos uma cena.'); return; }
  delete editorAdventure.nodes[selectedNodeId];
  if (editorAdventure.meta.startNode === selectedNodeId) {
    editorAdventure.meta.startNode = Object.keys(editorAdventure.nodes)[0] || '';
  }
  selectedNodeId = Object.keys(editorAdventure.nodes)[0] || null;
  renderEditor();
}

function setAsStart() {
  if (!selectedNodeId) return;
  editorAdventure.meta.startNode = selectedNodeId;
  notify('Cena de início definida: ' + editorAdventure.nodes[selectedNodeId].title);
  renderNodeList();
}

// ═══════════════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════════════
function genId() { return Math.random().toString(36).substring(2, 8); }

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function notify(msg) {
  const el = document.createElement('div');
  el.className = 'notif';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

// ═══════════════════════════════════════════════════════════
//  SIDEQUEST SYSTEM
// ═══════════════════════════════════════════════════════════

// Sidequest data structure:
// { id, title, desc, triggerNodes: [], nodes: {}, startNode, rewards: {forca:0,...}, penalty: {forca:0,...}, rewardType: 'positive'|'negative'|'neutral', completed: false }

let selectedSqId = null;

// Get or create sidequests array on editorAdventure
function getSqs() {
  if (!editorAdventure.sidequests) editorAdventure.sidequests = [];
  return editorAdventure.sidequests;
}

// ── Runtime state ──
let activeSidequest = null;   // sidequest being played
let sqReturnNodeId = null;    // main story node to return to after SQ

// Probability a sidequest appears at eligible node (0..1)
const SQ_APPEAR_CHANCE = 0.65;

// Check if we should trigger a sidequest when entering a main story node
function checkSidequestTrigger(nodeId) {
  const sqs = currentAdventure?.sidequests || [];
  if (!sqs.length) return false;

  // Find eligible sidequests: have this node as a trigger, not yet completed,
  // and pass tag conditions (requireTags / excludeTags)
  const eligible = sqs.filter(sq => {
    if (!sq.triggerNodes || !sq.triggerNodes.includes(nodeId)) return false;
    if (sq._completed) return false;
    // requireTags: ALL must be present
    if (sq.requireTags?.length) {
      if (!sq.requireTags.every(t => hasTag(t))) return false;
    }
    // excludeTags: NONE can be present
    if (sq.excludeTags?.length) {
      if (sq.excludeTags.some(t => hasTag(t))) return false;
    }
    return true;
  });
  if (!eligible.length) return false;

  // Random chance
  if (Math.random() > SQ_APPEAR_CHANCE) return false;

  // Pick one at random
  const sq = eligible[Math.floor(Math.random() * eligible.length)];
  offerSidequest(sq, nodeId);
  return true;
}

function offerSidequest(sq, returnNodeId) {
  sqReturnNodeId = returnNodeId;

  // Add the SQ accept/decline as natural choices appended to the existing choices list
  const cl = document.getElementById('choices-list');
  if (!cl) return;

  const currentCount = cl.querySelectorAll('.choice-btn').length;

  // Accept button — uses the sq.desc as the choice text, feels like a narrative option
  const acceptBtn = document.createElement('button');
  acceptBtn.className = 'choice-btn';
  acceptBtn.id = 'sq-accept-btn';
  const acceptLabel = sq.desc || 'Investigar o que está acontecendo';
  acceptBtn.innerHTML = `<span class="choice-num">${String.fromCharCode(73 + currentCount)}.</span><span>${acceptLabel}</span>`;
  acceptBtn.onclick = () => startSidequest(sq.id);
  cl.appendChild(acceptBtn);

  // Decline button — a second natural option that ignores the opportunity
  const declineBtn = document.createElement('button');
  declineBtn.className = 'choice-btn';
  declineBtn.id = 'sq-decline-btn';
  declineBtn.style.color = 'var(--stone-light)';
  declineBtn.style.borderColor = 'rgba(90,80,64,0.3)';
  const declineLabel = sq.declineText || 'Não há tempo para desvios agora';
  declineBtn.innerHTML = `<span class="choice-num" style="color:var(--stone);">${String.fromCharCode(73 + currentCount + 1)}.</span><span>${declineLabel}</span>`;
  declineBtn.onclick = () => declineSidequest();
  cl.appendChild(declineBtn);
}

function declineSidequest() {
  // Record as skipped in epilogue if we know which SQ was offered
  const cl = document.getElementById('choices-list');
  const acceptBtn = document.getElementById('sq-accept-btn');
  if (acceptBtn && sqReturnNodeId) {
    // Try to find which sidequest was being offered
    const sqs = currentAdventure?.sidequests || [];
    const eligible = sqs.filter(sq =>
      sq.triggerNodes && sq.triggerNodes.includes(sqReturnNodeId) && !sq._completed
    );
    if (eligible.length) {
      const sq = eligible[0];
      epilogueLog.sqResults.push({
        sqId: sq.id,
        sqTitle: sq.title,
        outcome: 'skipped',
        endingTitle: '',
        endingName: sq.title
      });
    }
  }
  ['sq-accept-btn','sq-decline-btn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
  const badge = document.getElementById('sq-hud-badge');
  if (badge) badge.remove();
  sqReturnNodeId = null;
}

function startSidequest(sqId) {
  const sq = currentAdventure.sidequests.find(s => s.id === sqId);
  if (!sq || !sq.startNode || !sq.nodes?.[sq.startNode]) {
    notify('Esta sidequest não tem cenas configuradas!');
    declineSidequest();
    return;
  }
  ['sq-accept-btn','sq-decline-btn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });

  activeSidequest = sq;
  renderSqScene(sq.startNode);
}

function renderSqScene(nodeId) {
  const sq = activeSidequest;
  if (!sq) return;
  const node = sq.nodes[nodeId];
  if (!node) { endSidequest(false); return; }

  sceneCount++;
  document.getElementById('game-stats').textContent = `◈ Missão: ${sq.title}`;

  const card = document.getElementById('story-card');
  card.style.opacity = '0';
  card.style.transform = 'translateY(10px)';

  setTimeout(() => {
    document.getElementById('scene-title').innerHTML = `<span style="color:#c8a8ff;">◈</span> ${escHtml(node.title)}`;
    document.getElementById('scene-text').innerHTML = interpolateText((node.text || '').replace(/\n/g,'<br>'));

    const choicesSection = document.getElementById('choices-section');
    choicesSection.innerHTML = '';

    if (node.combat && !node.ending) {
      // Combat in sidequest scene
      checkAndStartCombat(nodeId);
    } else if (node.ending || !node.choices?.length) {      // SQ ended
      const type = node.ending?.type || 'neutral';
      choicesSection.innerHTML = `
        <div class="ending-banner" style="border-color:rgba(147,112,219,0.4);background:rgba(50,20,80,0.15);">
          <div class="ending-type ${type}" style="color:${type==='victory'?'#c8a8ff':type==='defeat'?'#cc4444':'var(--stone-light)'}">◈ ${type==='victory'?'MISSÃO CONCLUÍDA':'MISSÃO FALHOU'} ◈</div>
          <div class="ending-title" style="color:#c8a8ff;">${escHtml(node.ending?.title||sq.title)}</div>
          <button class="btn-medieval" style="margin:0 auto;border-color:#9370db;color:#c8a8ff;" onclick="endSidequest(${type==='victory'})">Retornar à história</button>
        </div>`;
    } else {
      choicesSection.innerHTML = `<div class="choices-label" style="color:#9370db;">O que fazes?</div><div id="choices-list"></div>`;
      const cl = document.getElementById('choices-list');
      node.choices.forEach((c, i) => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.style.borderColor = 'rgba(147,112,219,0.3)';
        let badge = '';
        if (c.attrCheck) {
          const attrVal = character.attrs[c.attrCheck] || 1;
          const chance = calcSuccessChance(attrVal, c.difficulty || 5);
          const tier = chance >= 75 ? 'easy' : chance >= 50 ? 'medium' : chance >= 30 ? 'hard' : 'vhard';
          const attrInfo = ATTRS.find(a => a.key === c.attrCheck);
          badge = `<span class="choice-attr-badge ${tier}">${attrInfo?.icon||''} ${attrInfo?.name||c.attrCheck} · ${chance}%</span>`;
        }
        btn.innerHTML = `<span class="choice-num" style="color:#9370db;">${String.fromCharCode(73+i)}.</span><span>${escHtml(c.text)}${badge}</span>`;
        btn.onclick = () => {
          epilogueLog.totalChoices++;
          if (c.points) addScore(c.points, 'choice', `◈ Escolha: ${c.text.substring(0,30)}`);
          if (c.attrCheck) {
            doAttrRollSq(c);
          } else if (c.next && sq.nodes[c.next]) {
            renderSqScene(c.next);
          } else {
            endSidequest(true);
          }
        };
        cl.appendChild(btn);
      });
    }

    card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    card.style.opacity = '1';
    card.style.transform = 'translateY(0)';
  }, 150);
}

function doAttrRollSq(choice) {
  // Use the main roll system, but after resolving go to SQ node
  const attrKey = choice.attrCheck;
  const difficulty = choice.difficulty || 5;
  const attrVal = character.attrs[attrKey] || 1;
  const attrInfo = ATTRS.find(a => a.key === attrKey);
  const chance = calcSuccessChance(attrVal, difficulty);
  const roll = Math.floor(Math.random() * 100) + 1;
  const success = roll <= chance;
  const nextNode = success ? choice.next : (choice.nextFail || choice.next);

  const overlay = document.getElementById('roll-overlay');
  overlay.style.display = 'flex';
  document.getElementById('roll-attr-name').textContent =
    `Teste de ${attrInfo?.name||attrKey} (${attrVal}) · Dificuldade ${difficulty}`;
  document.getElementById('roll-choice-text').textContent = choice.text;
  document.getElementById('roll-dice').textContent = '🎲';
  document.getElementById('roll-number').style.color = 'var(--gold)';

  let frame = 0;
  const anim = setInterval(() => {
    document.getElementById('roll-number').textContent = Math.floor(Math.random()*100)+1;
    frame++;
    if (frame >= 12) {
      clearInterval(anim);
      document.getElementById('roll-number').textContent = roll;
      document.getElementById('roll-number').style.color = success ? '#4a8' : '#cc4444';
      document.getElementById('roll-vs').textContent = `Precisava ≤ ${chance} para ter sucesso`;
      const resultEl = document.getElementById('roll-result');
      resultEl.className = 'roll-result ' + (success ? 'success' : 'failure');
      resultEl.textContent = success ? '✦ SUCESSO ✦' : '✦ FALHOU ✦';
    }
  }, 60);

  document.getElementById('roll-continue-btn').onclick = () => {
    overlay.style.display = 'none';
    if (success && choice.pointsSuccess) addScore(choice.pointsSuccess, 'roll', `◈ Sucesso: ${choice.text.substring(0,30)}`);
    if (!success && choice.pointsFail)   addScore(choice.pointsFail,   'roll', `◈ Falha: ${choice.text.substring(0,30)}`);
    if (nextNode && activeSidequest?.nodes?.[nextNode]) {
      renderSqScene(nextNode);
    } else {
      endSidequest(success);
    }
  };
}

function endSidequest(success) {
  if (!activeSidequest) return;
  const sq = activeSidequest;
  sq._completed = true;

  // Record in epilogue log
  // Find the ending node to get its title
  let endingTitle = sq.title;
  let endingNodeTitle = '';
  const endNode = Object.values(sq.nodes || {}).find(n => n.ending);
  if (endNode) {
    endingTitle = endNode.ending?.title || sq.title;
    endingNodeTitle = endNode.title || '';
  }
  epilogueLog.sqResults.push({
    sqId: sq.id,
    sqTitle: sq.title,
    outcome: success ? 'victory' : 'defeat',
    endingTitle: endingTitle,
    endingName: endingNodeTitle
  });
  if (success) epilogueLog.sqCompleted++;

  // Award SQ score points
  const sqScore = success ? (sq.scoreSuccess || 0) : (sq.scoreFail || 0);
  if (sqScore) addScore(sqScore, 'sidequest', `◈ ${sq.title}: ${success ? 'Concluída' : 'Fracassada'}`);

  // Apply tag effects from sidequest — collect granted tags for the overlay
  const grantedTags = [];
  const tagEffectsToApply = success ? (sq.victoryTagEffects || []) : (sq.defeatTagEffects || []);
  tagEffectsToApply.forEach(e => {
    if (e && e.tag) {
      grantedTags.push({ tag: e.tag, value: e.value !== false });
    }
  });
  if (tagEffectsToApply.length) applyTagEffects(tagEffectsToApply);

  // Apply attribute rewards/penalties
  const rewards = sq.attrRewards || {};
  const debuffs = sq.failDebuffs || {};
  const changes = [];

  ATTRS.forEach(a => {
    let delta = 0;
    if (success) {
      // success: apply positive rewards
      delta = rewards[a.key] || 0;
    } else {
      // failure: apply failDebuffs (always negative/zero), and if failPenalty also strip positive rewards
      const debuff = debuffs[a.key] || 0;
      const reward = rewards[a.key] || 0;
      delta = debuff; // failDebuffs are explicit negative deltas
      if (sq.failPenalty) {
        // also strip any positive rewards (don't grant them)
        delta += Math.min(0, reward);
      }
    }
    if (delta !== 0) {
      const oldVal = character.attrs[a.key];
      character.attrs[a.key] = Math.max(1, Math.min(ATTR_MAX, oldVal + delta));
      const actual = character.attrs[a.key] - oldVal;
      if (actual !== 0) {
        changes.push({ attr: a, delta: actual });
      }
    }
  });

  activeSidequest = null;

  // Show result overlay
  const overlay = document.getElementById('sq-result-overlay');
  const resultHeader = document.getElementById('sq-result-header');
  resultHeader.textContent = success ? '◈ Missão Concluída' : '◈ Missão Falhou';
  resultHeader.style.color = success ? '#9370db' : '#cc4444';
  document.getElementById('sq-result-title').textContent = sq.title;

  const changesEl = document.getElementById('sq-attr-changes');
  if (changes.length) {
    changesEl.innerHTML = changes.map(ch => {
      const cls = ch.delta > 0 ? 'sq-change-pos' : 'sq-change-neg';
      const sign = ch.delta > 0 ? '+' : '';
      const label = !success && ch.delta < 0 ? ' (penalidade)' : '';
      return `<div class="sq-attr-change-row"><span>${ch.attr.icon} ${ch.attr.name}<span style="font-size:0.65rem;opacity:0.6;">${label}</span></span><span class="${cls}">${sign}${ch.delta}</span></div>`;
    }).join('');
  } else {
    changesEl.innerHTML = `<div style="color:var(--stone);font-style:italic;">${success ? 'Nenhuma alteração de atributos.' : 'A derrota não trouxe consequências imediatas.'}</div>`;
  }

  // Show granted/removed tags below attr changes
  const tagsEl = document.getElementById('sq-tag-changes');
  if (tagsEl) {
    if (grantedTags.length) {
      tagsEl.style.display = 'block';
      tagsEl.innerHTML = grantedTags.map(t => {
        const isGrant = t.value !== false;
        const color  = isGrant ? '#9370db' : '#cc6666';
        const prefix = isGrant ? '🏷 +' : '🏷 −';
        return `<div class="sq-attr-change-row" style="opacity:0.85;">
          <span style="color:${color};font-size:0.75rem;">${prefix} <em>${escHtmlRuntime(t.tag)}</em></span>
        </div>`;
      }).join('');
    } else {
      tagsEl.style.display = 'none';
      tagsEl.innerHTML = '';
    }
  }

  overlay.style.display = 'flex';

  document.getElementById('sq-result-continue-btn').onclick = () => {
    overlay.style.display = 'none';
    const badge = document.getElementById('sq-hud-badge');
    if (badge) badge.remove();
    renderCharHud();
    // Return to main story
    if (sqReturnNodeId) {
      renderScene(sqReturnNodeId);
    }
    sqReturnNodeId = null;
  };
}

// ── SIDEQUEST EDITOR ──

function openSqEditor() {
  syncMetaToEditor();
  showScreen('screen-sq-editor');
  renderSqList();
  if (selectedSqId) renderSqEditor(selectedSqId);
}

function renderSqList() {
  const list = document.getElementById('sq-list');
  const sqs = getSqs();
  if (!sqs.length) {
    list.innerHTML = '<div style="color:var(--stone);font-style:italic;text-align:center;padding:1.5rem;font-size:0.85rem;">Nenhuma sidequest criada ainda.</div>';
    return;
  }
  list.innerHTML = sqs.map(sq => {
    const triggerNames = (sq.triggerNodes || []).map(nid => {
      const node = editorAdventure.nodes[nid];
      return node ? (node.title || nid) : nid;
    }).join(', ') || 'Sem gatilhos definidos';
    return `<div class="sq-slot-item ${sq.id === selectedSqId ? 'selected' : ''}" onclick="selectSq('${sq.id}')">
      <div class="sq-slot-title">◈ ${escHtml(sq.title || '(sem título)')}</div>
      <div class="sq-slot-trigger">Gatilhos: ${escHtml(triggerNames)}</div>
    </div>`;
  }).join('');
}

function selectSq(id) {
  selectedSqId = id;
  renderSqList();
  renderSqEditor(id);
}

function addSidequest() {
  const id = 'sq_' + Date.now();
  const startId = 'sqcena_' + Date.now();
  getSqs().push({
    id,
    title: 'Nova Missão',
    desc: 'Descreva brevemente a missão...',
    triggerNodes: [],
    startNode: startId,
    nodes: {
      [startId]: { id: startId, title: 'Início da Missão', text: 'Descreva o que acontece...', choices: [] }
    },
    attrRewards: { forca:0, destreza:0, inteligencia:0, carisma:0, sabedoria:0, constituicao:0 },
    failDebuffs: { forca:0, destreza:0, inteligencia:0, carisma:0, sabedoria:0, constituicao:0 },
    failPenalty: false
  });
  selectedSqId = id;
  renderSqList();
  renderSqEditor(id);
}

function deleteSidequest() {
  if (!selectedSqId) return;
  const sqs = getSqs();
  const idx = sqs.findIndex(s => s.id === selectedSqId);
  if (idx < 0) return;
  sqs.splice(idx, 1);
  selectedSqId = sqs[0]?.id || null;
  renderSqList();
  if (selectedSqId) renderSqEditor(selectedSqId);
  else document.getElementById('sq-node-editor').innerHTML = '<div style="color:var(--stone);font-style:italic;text-align:center;padding:2rem;">Selecione ou crie uma sidequest.</div>';
}

function renderSqEditor(sqId) {
  const sq = getSqs().find(s => s.id === sqId);
  if (!sq) return;
  document.getElementById('sq-editing-label').textContent = `◈ ${sq.title || 'Sem título'}`;

  const allMainNodes = Object.values(editorAdventure.nodes);
  const allSqNodes = Object.keys(sq.nodes || {});

  // Trigger node checkboxes
  const triggerCheckboxes = allMainNodes.map(n => {
    const checked = (sq.triggerNodes || []).includes(n.id);
    return `<label style="display:flex;align-items:center;gap:0.5rem;font-size:0.78rem;color:var(--parchment-dark);margin-bottom:0.3rem;cursor:pointer;">
      <input type="checkbox" value="${n.id}" ${checked ? 'checked' : ''} onchange="toggleSqTrigger('${sqId}','${n.id}',this.checked)"
        style="accent-color:#9370db;">
      <span>${escHtml(n.title || n.id)}</span>
    </label>`;
  }).join('') || '<div style="color:var(--stone);font-size:0.78rem;font-style:italic;">Crie cenas na história principal primeiro.</div>';

  // Attr rewards
  const rewardRows = ATTRS.map(a => {
    const delta = (sq.attrRewards || {})[a.key] || 0;
    const cls = delta > 0 ? 'pos' : delta < 0 ? 'neg' : 'zero';
    const sign = delta > 0 ? '+' : '';
    return `<div class="attr-reward-row">
      <span style="font-size:1rem;width:1.4rem;text-align:center;">${a.icon}</span>
      <span style="font-family:'Cinzel',serif;font-size:0.72rem;color:var(--gold);flex:1;">${a.name}</span>
      <button class="reward-delta-btn neg" onclick="changeSqReward('${sqId}','${a.key}',-1)">−</button>
      <span class="reward-val ${cls}">${sign}${delta}</span>
      <button class="reward-delta-btn" onclick="changeSqReward('${sqId}','${a.key}',1)">+</button>
    </div>`;
  }).join('');

  // Attr debuffs on failure
  const debuffRows = ATTRS.map(a => {
    const delta = (sq.failDebuffs || {})[a.key] || 0;
    const cls = delta < 0 ? 'neg' : delta > 0 ? 'pos' : 'zero';
    return `<div class="attr-reward-row">
      <span style="font-size:1rem;width:1.4rem;text-align:center;">${a.icon}</span>
      <span style="font-family:'Cinzel',serif;font-size:0.72rem;color:#cc6666;flex:1;">${a.name}</span>
      <button class="reward-delta-btn neg" onclick="changeSqDebuff('${sqId}','${a.key}',-1)">−</button>
      <span class="reward-val ${cls}">${delta}</span>
      <button class="reward-delta-btn" onclick="changeSqDebuff('${sqId}','${a.key}',1)">+</button>
    </div>`;
  }).join('');

  // SQ scene list
  const sqSceneList = allSqNodes.map(nid => {
    const n = sq.nodes[nid];
    return `<div style="font-family:'Cinzel',serif;font-size:0.7rem;color:${nid===sq.startNode?'#c8a8ff':'var(--stone-light)'};padding:0.3rem 0;display:flex;justify-content:space-between;">
      <span>${escHtml(n?.title || nid)}${nid===sq.startNode?' ★':''}</span>
      <span style="font-size:0.6rem;color:var(--stone);">#${nid}</span>
    </div>`;
  }).join('');

  // SQ scene editor (simple: pick a scene to edit)
  const sqSceneChoices = allSqNodes.map(nid => {
    const n = sq.nodes[nid];
    return `<option value="${nid}">${escHtml(n?.title||nid)}${nid===sq.startNode?' (início)':''}</option>`;
  }).join('');

  document.getElementById('sq-node-editor').innerHTML = `
    <div class="field-group">
      <label class="field-label">Título da Sidequest</label>
      <input class="field-input" value="${escHtml(sq.title)}" oninput="updateSq('${sqId}','title',this.value)">
    </div>
    <div class="field-group">
      <label class="field-label">Descrição / Texto da escolha de aceitar</label>
      <textarea class="field-textarea" style="min-height:70px;" oninput="updateSq('${sqId}','desc',this.value)">${escHtml(sq.desc)}</textarea>
    </div>
    <div class="field-group">
      <label class="field-label" style="color:var(--stone-light);">Texto da escolha de recusar (opcional)</label>
      <input class="field-input" style="border-color:rgba(90,80,64,0.4);" placeholder="Não há tempo para desvios agora" value="${escHtml(sq.declineText||'')}" oninput="updateSq('${sqId}','declineText',this.value)">
    </div>

    <div style="border:1px solid rgba(147,112,219,0.2);padding:0.8rem 1rem;margin-bottom:1.2rem;">
      <div class="field-label" style="margin-bottom:0.6rem;">Gatilhos — Após qual cena da história principal esta missão pode aparecer?</div>
      ${triggerCheckboxes}
    </div>

    <div style="border:1px solid rgba(180,120,220,0.25);padding:0.8rem 1rem;margin-bottom:1.2rem;">
      <div class="field-label" style="margin-bottom:0.5rem;color:#b080e0;">🏷 Condições de Tag para Aparecer</div>
      <div style="font-size:0.7rem;color:var(--stone);font-style:italic;margin-bottom:0.7rem;">A missão só é oferecida se o jogador atender a estas condições no momento do gatilho.</div>
      <div class="field-group" style="margin-bottom:0.5rem;">
        <label class="field-label" style="font-size:0.62rem;">Requer estas tags (todas, separadas por vírgula)</label>
        <input class="field-input" placeholder="ex: conheceu_mira, sabe_sindicato"
          value="${escHtml((sq.requireTags||[]).join(', '))}"
          onchange="updateSqTagList('${sqId}','requireTags',this.value)"
          style="border-color:rgba(68,170,136,0.35);">
        <div style="font-size:0.6rem;color:var(--stone);margin-top:0.2rem;">Vazio = sem restrição de tags obrigatórias.</div>
      </div>
      <div class="field-group" style="margin:0;">
        <label class="field-label" style="font-size:0.62rem;">Bloqueada se o jogador tiver estas tags (qualquer, separadas por vírgula)</label>
        <input class="field-input" placeholder="ex: sq_ja_feita, kael_preso"
          value="${escHtml((sq.excludeTags||[]).join(', '))}"
          onchange="updateSqTagList('${sqId}','excludeTags',this.value)"
          style="border-color:rgba(204,68,68,0.35);">
        <div style="font-size:0.6rem;color:var(--stone);margin-top:0.2rem;">Vazio = sem bloqueio por tag.</div>
      </div>
    </div>

    <div style="border:1px solid rgba(201,162,39,0.15);padding:0.8rem 1rem;margin-bottom:1.2rem;">
      <div class="field-label" style="margin-bottom:0.6rem;color:#c8a8ff;">Recompensas (Sucesso)</div>
      <div style="font-size:0.7rem;color:var(--stone);font-style:italic;margin-bottom:0.6rem;">Valores positivos = bônus. Negativos = penalidade. Zero = sem efeito.</div>
      ${rewardRows}
      <div style="margin-top:0.8rem;border-top:1px dashed rgba(201,162,39,0.15);padding-top:0.7rem;display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap;">
        <span style="font-family:'Cinzel',serif;font-size:0.62rem;letter-spacing:0.1em;color:var(--gold);text-transform:uppercase;">⭐ Pontos de Score</span>
        <div style="display:flex;align-items:center;gap:0.4rem;">
          <span style="font-size:0.6rem;color:#4a8;">Sucesso:</span>
          <input class="points-mini-input" type="number" value="${sq.scoreSuccess||0}" min="-9999" max="99999"
            onchange="updateSq('${sqId}','scoreSuccess',+this.value)" style="border-color:rgba(68,170,136,0.5);">
        </div>
        <div style="display:flex;align-items:center;gap:0.4rem;">
          <span style="font-size:0.6rem;color:#cc6666;">Falha:</span>
          <input class="points-mini-input" type="number" value="${sq.scoreFail||0}" min="-9999" max="99999"
            onchange="updateSq('${sqId}','scoreFail',+this.value)" style="border-color:rgba(204,68,68,0.5);">
        </div>
      </div>
      <div style="margin-top:0.8rem;border-top:1px dashed rgba(180,120,220,0.2);padding-top:0.7rem;">
        <div style="font-family:'Cinzel',serif;font-size:0.62rem;letter-spacing:0.1em;color:#b080e0;text-transform:uppercase;margin-bottom:0.45rem;">🏷 Tags Concedidas</div>
        <div class="field-group" style="margin-bottom:0.4rem;">
          <label class="field-label" style="font-size:0.6rem;">Ao concluir com <span style="color:#4a8;">sucesso</span> (separadas por vírgula)</label>
          <input class="field-input" placeholder="ex: ajudou_ferreiro, portao_aberto"
            value="${escHtml((sq.victoryTagEffects||[]).filter(e=>e.value!==false).map(e=>e.tag).join(', '))}"
            onchange="updateSqVictoryTags('${sqId}',this.value)"
            style="border-color:rgba(68,170,136,0.35);">
        </div>
        <div class="field-group" style="margin:0;">
          <label class="field-label" style="font-size:0.6rem;">Ao <span style="color:#cc6666;">falhar</span> (separadas por vírgula)</label>
          <input class="field-input" placeholder="ex: falhou_missao, perdeu_aliado"
            value="${escHtml((sq.defeatTagEffects||[]).filter(e=>e.value!==false).map(e=>e.tag).join(', '))}"
            onchange="updateSqDefeatTags('${sqId}',this.value)"
            style="border-color:rgba(204,68,68,0.35);">
        </div>
      </div>
    </div>

    <div style="border:1px solid rgba(204,68,68,0.25);padding:0.8rem 1rem;margin-bottom:1.2rem;">
      <div class="field-label" style="margin-bottom:0.6rem;color:#cc6666;">Debuffs por Falha</div>
      <div style="font-size:0.7rem;color:var(--stone);font-style:italic;margin-bottom:0.6rem;">Aplicados apenas se a missão for <em>falha</em>. Use valores negativos para punir o personagem.</div>
      ${debuffRows}
      <label style="display:flex;align-items:center;gap:0.5rem;margin-top:0.7rem;font-size:0.75rem;cursor:pointer;color:var(--parchment-dark);">
        <input type="checkbox" ${sq.failPenalty?'checked':''} onchange="updateSq('${sqId}','failPenalty',this.checked)" style="accent-color:#cc4444;">
        Em falha: também anular bônus de sucesso (não concede ganhos se falhar)
      </label>
    </div>

    <div style="border:1px solid rgba(147,112,219,0.2);padding:0.8rem 1rem;margin-bottom:1.2rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.6rem;">
        <div class="field-label" style="color:#c8a8ff;margin:0;">Cenas da Sidequest</div>
        <button class="btn-sm" style="border-color:#9370db;color:#c8a8ff;" onclick="addSqNode('${sqId}')">+ Cena</button>
      </div>
      <div style="margin-bottom:0.8rem;">${sqSceneList || '<div style="color:var(--stone);font-size:0.78rem;font-style:italic;">Nenhuma cena.</div>'}</div>
      <div class="field-label" style="margin-bottom:0.4rem;">Editar Cena:</div>
      <select class="field-select" id="sq-scene-select" onchange="loadSqSceneEditor('${sqId}',this.value)" style="border-color:rgba(147,112,219,0.4);">
        <option value="">— Selecionar cena —</option>
        ${sqSceneChoices}
      </select>
      <div id="sq-scene-edit-area" style="margin-top:0.8rem;"></div>
    </div>
  `;
}

function loadSqSceneEditor(sqId, nodeId) {
  const sq = getSqs().find(s => s.id === sqId);
  if (!sq || !nodeId) return;
  const node = sq.nodes[nodeId];
  if (!node) return;

  const allSqNodes = Object.keys(sq.nodes);
  const choicesHtml = (node.choices || []).map((c, i) => `
    <div style="border:1px solid rgba(147,112,219,0.15);padding:0.6rem;margin-bottom:0.5rem;position:relative;">
      <button style="position:absolute;top:0.3rem;right:0.3rem;background:none;border:none;color:var(--blood);cursor:pointer;font-size:1rem;" onclick="removeSqChoice('${sqId}','${nodeId}',${i})">✕</button>
      <div class="field-group" style="margin-bottom:0.4rem;">
        <label class="field-label" style="font-size:0.6rem;">Texto</label>
        <input class="field-input" value="${escHtml(c.text)}" onchange="updateSqChoice('${sqId}','${nodeId}',${i},'text',this.value)">
      </div>
      <div class="field-group" style="margin-bottom:0.4rem;">
        <label class="field-label" style="font-size:0.6rem;">Vai para</label>
        <select class="field-select" onchange="updateSqChoice('${sqId}','${nodeId}',${i},'next',this.value)">
          <option value="">— cena —</option>
          ${allSqNodes.map(id => `<option value="${id}" ${c.next===id?'selected':''}>${escHtml(sq.nodes[id]?.title||id)}</option>`).join('')}
        </select>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.4rem;">
        <div>
          <label class="field-label" style="font-size:0.6rem;">Teste de Atributo</label>
          <select class="field-select" onchange="updateSqChoice('${sqId}','${nodeId}',${i},'attrCheck',this.value)">
            <option value="">Nenhum</option>
            ${ATTRS.map(a=>`<option value="${a.key}" ${c.attrCheck===a.key?'selected':''}>${a.icon} ${a.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="field-label" style="font-size:0.6rem;">Dificuldade</label>
          <input class="field-input" type="number" min="1" max="10" value="${c.difficulty||5}" onchange="updateSqChoice('${sqId}','${nodeId}',${i},'difficulty',+this.value)">
        </div>
      </div>
    </div>
  `).join('');

  document.getElementById('sq-scene-edit-area').innerHTML = `
    <div style="border:1px dashed rgba(147,112,219,0.3);padding:0.8rem;">
      <div class="field-group">
        <label class="field-label" style="color:#c8a8ff;">Título da Cena</label>
        <input class="field-input" value="${escHtml(node.title)}" oninput="updateSqNode('${sqId}','${nodeId}','title',this.value)">
      </div>
      <div class="field-group">
        <label class="field-label" style="color:#c8a8ff;">Texto</label>
        <textarea class="field-textarea" style="min-height:90px;" oninput="updateSqNode('${sqId}','${nodeId}','text',this.value)">${escHtml(node.text)}</textarea>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
        <label class="field-label" style="margin:0;color:#c8a8ff;">Escolhas</label>
        <button class="btn-sm" style="border-color:#9370db;color:#c8a8ff;" onclick="addSqChoice('${sqId}','${nodeId}')">+ Escolha</button>
      </div>
      ${choicesHtml || '<div style="color:var(--stone);font-size:0.78rem;font-style:italic;margin-bottom:0.5rem;">Nenhuma escolha = cena de fim.</div>'}
      <div class="field-group" style="margin-top:0.6rem;">
        <label class="field-label" style="font-size:0.62rem;color:#9370db;">Tipo de Final (opcional)</label>
        <select class="field-select" style="border-color:rgba(147,112,219,0.3);" onchange="updateSqEnding('${sqId}','${nodeId}',this.value)">
          <option value="">Não é final</option>
          <option value="victory" ${node.ending?.type==='victory'?'selected':''}>Missão Concluída</option>
          <option value="defeat" ${node.ending?.type==='defeat'?'selected':''}>Missão Falhou</option>
          <option value="neutral" ${node.ending?.type==='neutral'?'selected':''}>Neutro</option>
        </select>
      </div>
      <div style="display:flex;gap:0.5rem;margin-top:0.4rem;">
        <button class="btn-sm" style="border-color:#9370db;color:#c8a8ff;font-size:0.6rem;" onclick="setSqStart('${sqId}','${nodeId}')">★ Definir como Início</button>
        <button class="btn-sm red" style="font-size:0.6rem;" onclick="deleteSqNode('${sqId}','${nodeId}')">Excluir Cena</button>
      </div>
    </div>
  `;
}

function updateSq(sqId, key, value) {
  const sq = getSqs().find(s => s.id === sqId);
  if (!sq) return;
  sq[key] = value;
  if (key === 'title') {
    document.getElementById('sq-editing-label').textContent = '◈ ' + (value || 'Sem título');
    renderSqList();
  }
}

// Parse comma-separated tag list into array and save to sq[field]
function updateSqTagList(sqId, field, value) {
  const sq = getSqs().find(s => s.id === sqId);
  if (!sq) return;
  sq[field] = value.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
}

// Build victoryTagEffects from comma-separated success tag string
function updateSqVictoryTags(sqId, value) {
  const sq = getSqs().find(s => s.id === sqId);
  if (!sq) return;
  // Keep any "remove" effects (value:false) that may exist, replace grants
  const existing = (sq.victoryTagEffects || []).filter(e => e.value === false);
  const grants = value.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
    .map(tag => ({ tag, value: true }));
  sq.victoryTagEffects = [...grants, ...existing];
}

// Build defeatTagEffects from comma-separated defeat tag string
function updateSqDefeatTags(sqId, value) {
  const sq = getSqs().find(s => s.id === sqId);
  if (!sq) return;
  const existing = (sq.defeatTagEffects || []).filter(e => e.value === false);
  const grants = value.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
    .map(tag => ({ tag, value: true }));
  sq.defeatTagEffects = [...grants, ...existing];
}

function toggleSqTrigger(sqId, nodeId, checked) {
  const sq = getSqs().find(s => s.id === sqId);
  if (!sq) return;
  if (!sq.triggerNodes) sq.triggerNodes = [];
  if (checked) { if (!sq.triggerNodes.includes(nodeId)) sq.triggerNodes.push(nodeId); }
  else { sq.triggerNodes = sq.triggerNodes.filter(id => id !== nodeId); }
  renderSqList();
}

function changeSqReward(sqId, attrKey, delta) {
  const sq = getSqs().find(s => s.id === sqId);
  if (!sq) return;
  if (!sq.attrRewards) sq.attrRewards = {};
  sq.attrRewards[attrKey] = Math.max(-5, Math.min(5, (sq.attrRewards[attrKey] || 0) + delta));
  renderSqEditor(sqId);
  // Restore scene select
  const sel = document.getElementById('sq-scene-select');
  if (sel && sel.value) loadSqSceneEditor(sqId, sel.value);
}

function changeSqDebuff(sqId, attrKey, delta) {
  const sq = getSqs().find(s => s.id === sqId);
  if (!sq) return;
  if (!sq.failDebuffs) sq.failDebuffs = {};
  // Debuffs capped at -5..0 (only negative or zero make sense here)
  sq.failDebuffs[attrKey] = Math.max(-5, Math.min(0, (sq.failDebuffs[attrKey] || 0) + delta));
  renderSqEditor(sqId);
  const sel = document.getElementById('sq-scene-select');
  if (sel && sel.value) loadSqSceneEditor(sqId, sel.value);
}

function addSqNode(sqId) {
  const sq = getSqs().find(s => s.id === sqId);
  if (!sq) return;
  const id = 'sqcena_' + Date.now();
  sq.nodes[id] = { id, title: 'Nova Cena', text: 'Descreva o que acontece...', choices: [] };
  renderSqEditor(sqId);
}

function deleteSqNode(sqId, nodeId) {
  const sq = getSqs().find(s => s.id === sqId);
  if (!sq || !sq.nodes[nodeId]) return;
  if (Object.keys(sq.nodes).length <= 1) { notify('A sidequest precisa de ao menos uma cena.'); return; }
  delete sq.nodes[nodeId];
  if (sq.startNode === nodeId) sq.startNode = Object.keys(sq.nodes)[0] || '';
  renderSqEditor(sqId);
}

function setSqStart(sqId, nodeId) {
  const sq = getSqs().find(s => s.id === sqId);
  if (!sq) return;
  sq.startNode = nodeId;
  renderSqEditor(sqId);
  notify('Cena de início da sidequest definida!');
}

function updateSqNode(sqId, nodeId, key, value) {
  const sq = getSqs().find(s => s.id === sqId);
  if (!sq || !sq.nodes[nodeId]) return;
  sq.nodes[nodeId][key] = value;
}

function addSqChoice(sqId, nodeId) {
  const sq = getSqs().find(s => s.id === sqId);
  if (!sq || !sq.nodes[nodeId]) return;
  sq.nodes[nodeId].choices = sq.nodes[nodeId].choices || [];
  sq.nodes[nodeId].choices.push({ text: 'Nova escolha', next: '' });
  loadSqSceneEditor(sqId, nodeId);
}

function removeSqChoice(sqId, nodeId, idx) {
  const sq = getSqs().find(s => s.id === sqId);
  if (!sq || !sq.nodes[nodeId]) return;
  sq.nodes[nodeId].choices.splice(idx, 1);
  loadSqSceneEditor(sqId, nodeId);
}

function updateSqChoice(sqId, nodeId, idx, key, value) {
  const sq = getSqs().find(s => s.id === sqId);
  if (!sq || !sq.nodes[nodeId]) return;
  sq.nodes[nodeId].choices[idx][key] = value;
}

function updateSqEnding(sqId, nodeId, type) {
  const sq = getSqs().find(s => s.id === sqId);
  if (!sq || !sq.nodes[nodeId]) return;
  if (!type) { delete sq.nodes[nodeId].ending; }
  else { sq.nodes[nodeId].ending = { type, title: sq.nodes[nodeId].ending?.title || '' }; }
}

// ═══════════════════════════════════════════════════════════
//  SCENE IMAGE UPLOAD
// ═══════════════════════════════════════════════════════════
// ── Per-slot image upload ──
const IMAGE_SLOTS = [
  { key: 'header', icon: '▬', label: 'Header',   hint: 'Topo, largura total' },
  { key: 'inline', icon: '≡', label: 'Inline',   hint: 'Entre título e texto' },
  { key: 'side',   icon: '◧', label: 'Retrato',  hint: 'Personagem falando' },
  { key: 'bg',     icon: '◫', label: 'Background', hint: 'Plano de fundo sutil' },
];

function handleSceneImageUpload(nodeId, slotKey, input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const W = 320, H = 180;
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      const px = document.createElement('canvas');
      const SCALE = 4;
      px.width = Math.round(W / SCALE); px.height = Math.round(H / SCALE);
      const pctx = px.getContext('2d');
      pctx.imageSmoothingEnabled = false;
      pctx.drawImage(img, 0, 0, px.width, px.height);
      ctx.drawImage(px, 0, 0, W, H);
      const dataUrl = canvas.toDataURL('image/png');
      const node = editorAdventure.nodes[nodeId];
      if (node) {
        if (!node.images) node.images = {};
        node.images[slotKey] = dataUrl;
        // clean up old single-image field if migrating
        delete node.imageData;
        delete node.imagePositions;
        renderNodeEditor(nodeId);
        notify('Imagem carregada: ' + IMAGE_SLOTS.find(s=>s.key===slotKey)?.label);
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function removeSceneImageSlot(nodeId, slotKey) {
  const node = editorAdventure.nodes[nodeId];
  if (!node || !node.images) return;
  delete node.images[slotKey];
  if (Object.keys(node.images).length === 0) delete node.images;
  renderNodeEditor(nodeId);
  notify('Imagem removida.');
}

// Legacy single-remove (for old imageData field if somehow still present)
function removeSceneImage(nodeId) {
  const node = editorAdventure.nodes[nodeId];
  if (!node) return;
  delete node.imageData; delete node.imagePositions; delete node.images;
  renderNodeEditor(nodeId);
  notify('Imagens removidas.');
}

function renderImageSlots(nodeId) {
  const el = document.getElementById('img-slots-' + nodeId);
  if (!el) return;
  const node = editorAdventure.nodes[nodeId];
  if (!node) return;
  const imgs = getNodeImages(node);

  el.innerHTML = IMAGE_SLOTS.map(slot => {
    const src = imgs[slot.key];
    const extraHtml = (slot.key === 'side' && src)
      ? `<div style="margin-top:0.45rem;">
           <label style="font-family:'Cinzel',serif;font-size:0.58rem;letter-spacing:0.1em;color:var(--stone-light);text-transform:uppercase;display:block;margin-bottom:0.2rem;">Nome do personagem <span style="font-style:italic;font-weight:400;text-transform:none;opacity:0.6;">(opcional)</span></label>
           <input class="field-input" style="font-size:0.82rem;padding:0.3rem 0.5rem;" placeholder="ex: Mirdan, o Ancião" value="${escHtml(node.portraitName||'')}" oninput="updateNode('${nodeId}','portraitName',this.value)">
         </div>`
      : '';
    return `<div style="border:1px solid rgba(201,162,39,${src?'0.4':'0.15'});padding:0.6rem;margin-bottom:0.5rem;background:rgba(201,162,39,${src?'0.05':'0'});">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:${src?'0.5rem':'0'};">
        <span style="font-family:'Cinzel',serif;font-size:0.65rem;letter-spacing:0.1em;color:${src?'var(--gold-light)':'var(--stone-light)'};text-transform:uppercase;">
          <span style="margin-right:0.3em;">${slot.icon}</span>${slot.label}
          <span style="font-family:'Crimson Text',serif;font-size:0.7rem;letter-spacing:0;font-style:italic;opacity:0.6;font-weight:400;text-transform:none;margin-left:0.4em;">${slot.hint}</span>
        </span>
        ${src ? `<button class="btn-sm red" style="font-size:0.55rem;padding:0.2em 0.5em;" onclick="removeSceneImageSlot('${nodeId}','${slot.key}')">✕</button>` : ''}
      </div>
      ${src
        ? `<img src="${src}" style="width:100%;max-height:90px;object-fit:cover;object-position:top;display:block;image-rendering:pixelated;border:1px solid rgba(201,162,39,0.2);">`
        : `<label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;color:var(--stone);font-size:0.72rem;font-family:'Cinzel',serif;letter-spacing:0.06em;padding:0.4rem 0;">
            <span style="opacity:0.5;">📁</span> Enviar imagem
            <input type="file" accept="image/*" style="display:none;" onchange="handleSceneImageUpload('${nodeId}','${slot.key}',this)">
          </label>`
      }
      ${extraHtml}
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════
//  SCORE SYSTEM
// ═══════════════════════════════════════════════════════════

// Runtime score state
let scoreState = {
  total: 0,
  fromChoices: 0,     // base points from selecting choices
  fromRolls: 0,       // bonus/penalty from attr rolls
  fromSidequests: 0,  // points from SQ outcomes
  fromEnding: 0,      // points from the final ending node
  log: []             // [{label, delta}]
};

function resetScore() {
  scoreState = { total: 0, fromChoices: 0, fromRolls: 0, fromSidequests: 0, fromEnding: 0, log: [] };
  updateScoreHud();
}

function addScore(delta, category, label) {
  if (!delta) return;
  scoreState.total += delta;
  if (category === 'choice')    scoreState.fromChoices    += delta;
  if (category === 'roll')      scoreState.fromRolls      += delta;
  if (category === 'sidequest') scoreState.fromSidequests += delta;
  if (category === 'ending')    scoreState.fromEnding     += delta;
  scoreState.log.push({ label: label || category, delta });
  updateScoreHud();
  showScorePopup(delta);
}

function updateScoreHud() {
  const hud = document.getElementById('score-hud');
  const val = document.getElementById('score-hud-val');
  if (!hud || !val) return;
  hud.style.display = 'flex';
  val.textContent = scoreState.total.toLocaleString('pt-BR');
}

function showScorePopup(delta) {
  if (!delta) return;
  const hud = document.getElementById('score-hud');
  if (!hud) return;
  const rect = hud.getBoundingClientRect();
  const popup = document.createElement('div');
  popup.className = 'score-popup' + (delta < 0 ? ' neg' : '');
  popup.textContent = (delta > 0 ? '+' : '') + delta + ' pts';
  popup.style.left = (rect.left + rect.width / 2 - 30) + 'px';
  popup.style.top  = (rect.top - 10) + 'px';
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 1500);
}

function getScoreRank(total) {
  if (total >= 1000) return '⭐ Lenda do Reino';
  if (total >= 700)  return '🏆 Herói Épico';
  if (total >= 400)  return '⚔️ Aventureiro Ilustre';
  if (total >= 200)  return '🗡️ Viajante Experiente';
  if (total >= 50)   return '🛡️ Iniciante Promissor';
  if (total >= 0)    return '🌱 Novato';
  return '💀 Lenda Esquecida';
}

// ═══════════════════════════════════════════════════════════
//  EPILOGUE SYSTEM
// ═══════════════════════════════════════════════════════════

function showEpilogue() {
  showScreen('screen-epilogue');

  // Header
  document.getElementById('epi-char-name').textContent =
    character.name ? `A saga de ${character.name}` : 'A saga do Aventureiro';
  document.getElementById('epi-adventure-name').textContent =
    currentAdventure?.meta?.title || 'Crônicas do Reino';

  // ── Main ending ──
  const me = epilogueLog.mainEnding;
  if (me) {
    const typeLabels = { victory: '✦ VITÓRIA ✦', defeat: '✦ DERROTA ✦', neutral: '✦ FIM ✦' };
    const typeEl = document.getElementById('epi-main-type');
    typeEl.className = 'epilogue-ending-type ' + (me.type || 'neutral');
    typeEl.textContent = typeLabels[me.type] || '✦ FIM ✦';
    document.getElementById('epi-main-name').textContent = me.title || '—';
    document.getElementById('epi-main-scene').textContent = me.sceneName ? `Cena: ${me.sceneName}` : '';
  } else {
    document.getElementById('epi-main-type').textContent = '—';
    document.getElementById('epi-main-name').textContent = 'Aventura não concluída';
    document.getElementById('epi-main-scene').textContent = '';
  }

  // ── Sidequest results ──
  const sqSection = document.getElementById('epi-sqs-section');
  const sqList = document.getElementById('epi-sqs-list');

  // Also include any SQs from currentAdventure that were never offered (to show full picture)
  const allSqs = currentAdventure?.sidequests || [];
  // Build a map of recorded results
  const recordedIds = new Set(epilogueLog.sqResults.map(r => r.sqId));
  // Add not-encountered ones
  const allResults = [...epilogueLog.sqResults];
  allSqs.forEach(sq => {
    if (!recordedIds.has(sq.id)) {
      // Not encountered during play - don't show unless we want to
    }
  });

  if (allResults.length === 0 && allSqs.length === 0) {
    sqSection.style.display = 'none';
  } else {
    sqSection.style.display = 'block';
    const outcomeIcons = { victory: '✦', defeat: '✗', skipped: '◌', neutral: '◆' };
    const outcomeLabels = { victory: 'Concluída', defeat: 'Fracassada', skipped: 'Ignorada', neutral: 'Encerrada' };

    sqList.innerHTML = allResults.map(r => {
      const icon = outcomeIcons[r.outcome] || '◌';
      const label = outcomeLabels[r.outcome] || r.outcome;
      const isSkipped = r.outcome === 'skipped';
      return `
        <div class="epilogue-sq-card ${isSkipped ? 'skipped' : ''}">
          <div class="epilogue-sq-outcome-icon" style="color:${r.outcome==='victory'?'#c8a8ff':r.outcome==='defeat'?'#cc4444':'var(--stone)'}">${icon}</div>
          <div class="epilogue-sq-info">
            <div class="epilogue-sq-title">◈ ${escHtml(r.sqTitle)}</div>
            ${r.endingTitle && !isSkipped ? `<div class="epilogue-sq-ending-name">${escHtml(r.endingTitle)}</div>` : ''}
            ${isSkipped ? `<div class="epilogue-sq-ending-name" style="color:var(--stone);font-style:italic;">Oportunidade não aproveitada</div>` : ''}
            <span class="epilogue-sq-outcome-tag ${r.outcome}">${label}</span>
          </div>
        </div>`;
    }).join('') || '<div style="color:var(--stone);font-style:italic;font-family:\'IM Fell English\',serif;padding:1rem 0;">Nenhuma missão secundária encontrada nesta jornada.</div>';
  }

  // ── Stats ──
  document.getElementById('epi-stat-scenes').textContent = sceneCount;
  document.getElementById('epi-stat-choices').textContent = epilogueLog.totalChoices;
  document.getElementById('epi-stat-sqs').textContent = epilogueLog.sqCompleted;
  document.getElementById('epi-stat-score').textContent = scoreState.total.toLocaleString('pt-BR');

  // ── Score breakdown ──
  document.getElementById('epi-score-total').textContent = scoreState.total.toLocaleString('pt-BR');
  document.getElementById('epi-score-rank').textContent = getScoreRank(scoreState.total);
  const rows = [];
  if (scoreState.fromChoices)    rows.push({ label: 'Escolhas', val: scoreState.fromChoices });
  if (scoreState.fromRolls)      rows.push({ label: 'Testes de Atributo', val: scoreState.fromRolls });
  if (scoreState.fromSidequests) rows.push({ label: 'Missões Secundárias', val: scoreState.fromSidequests });
  if (scoreState.fromEnding)     rows.push({ label: 'Final da Aventura', val: scoreState.fromEnding });
  document.getElementById('epi-score-rows').innerHTML = rows.length
    ? rows.map(r => `<div class="score-row">
        <span>${r.label}</span>
        <span class="score-row-val ${r.val>0?'pos':r.val<0?'neg':''}">${r.val>0?'+':''}${r.val.toLocaleString('pt-BR')}</span>
      </div>`).join('')
    : '<div class="score-row" style="justify-content:center;font-style:italic;color:var(--stone);">Nenhum ponto configurado nesta aventura</div>';

  // ── Final attributes ──
  const vidaColor = character.vida <= character.vidaMax * 0.3 ? '#cc4444' : character.vida <= character.vidaMax * 0.6 ? '#c84' : '#ff8888';
  const sanColor  = character.sanidade <= character.sanidadeMax * 0.3 ? '#9370db' : character.sanidade <= character.sanidadeMax * 0.6 ? '#7a5ab5' : '#c8a8ff';
  document.getElementById('epi-attrs').innerHTML =
    `<div style="font-family:'Cinzel',serif;font-size:0.65rem;letter-spacing:0.2em;color:var(--gold);text-transform:uppercase;width:100%;margin-bottom:0.5rem;">Atributos Finais</div>` +
    ATTRS.map(a =>
      `<div class="epilogue-attr-chip">${a.icon} <span>${a.name}</span><span>${character.attrs[a.key]}</span></div>`
    ).join('') +
    `<div class="epilogue-attr-chip" style="border-color:rgba(204,68,68,0.4);">❤️ <span>Vida</span><span style="color:${vidaColor};">${character.vida}/${character.vidaMax}</span></div>` +
    `<div class="epilogue-attr-chip" style="border-color:rgba(147,112,219,0.4);">🧠 <span>Sanidade</span><span style="color:${sanColor};">${character.sanidade}/${character.sanidadeMax}</span></div>`;

  // ── Scroll of deeds (recent history) ──
  const deedsList = document.getElementById('epi-deeds-list');
  if (history.length === 0) {
    deedsList.innerHTML = '<div style="color:var(--stone);font-style:italic;font-family:\'IM Fell English\',serif;">Nenhum feito registrado.</div>';
  } else {
    // Show last 10 choices made during the adventure
    const shown = history.slice(-10);
    deedsList.innerHTML = shown.map(h =>
      `<div class="epilogue-deed-entry">
        <span class="epilogue-deed-marker">›</span>
        <span><em style="color:var(--gold-light);font-style:normal;">${escHtml(h.scene)}</em> — ${escHtml(h.choice)}</span>
      </div>`
    ).join('');
    if (history.length > 10) {
      deedsList.innerHTML = `<div style="color:var(--stone);font-size:0.75rem;font-family:'Cinzel',serif;text-align:center;padding:0.3rem 0;margin-bottom:0.5rem;letter-spacing:0.1em;">... e mais ${history.length - 10} ações anteriores ...</div>` + deedsList.innerHTML;
    }
  }
}

function restartFromEpilogue() {
  if (!currentAdventure) { showScreen('screen-select'); return; }
  // Limpa overlays que possam ter ficado abertos
  const deathOverlay = document.getElementById('death-overlay');
  if (deathOverlay) deathOverlay.remove();
  const combatOverlay = document.getElementById('combat-overlay');
  if (combatOverlay) combatOverlay.style.display = 'none';
  combatState = null;
  // Reset state
  currentNodeId = currentAdventure.meta.startNode;
  sceneCount = 0;
  history = [];
  epilogueLog = { mainEnding: null, sqResults: [], totalChoices: 0, sqCompleted: 0 };
  // Reset SQ completion flags
  if (currentAdventure.sidequests) {
    currentAdventure.sidequests.forEach(sq => { delete sq._completed; });
  }
  resetEncounterFlags();
  // Reset character attrs to initial class preset if possible (or go to char screen)
  character.attrs = { forca:1, destreza:1, inteligencia:1, carisma:1, sabedoria:1, constituicao:1 };
  character.vidaMax = calcMaxVida(character.attrs);
  character.vida = character.vidaMax;
  character.sanidadeMax = calcMaxSanidade(character.attrs);
  character.sanidade = character.sanidadeMax;
  character.vidaCombateMax = calcVidaCombate(character.attrs);
  character.vidaCombate    = character.vidaCombateMax;
  pendingAdventure = currentAdventure;
  showScreen('screen-char');
}

// ═══════════════════════════════════════════════════════════
//  DIALOGUE SYSTEM — Runtime
// ═══════════════════════════════════════════════════════════

/*  Dialogue line structure:
    { speaker: "Nome", portrait: "emoji ou data-url", text: "Fala...", narrator: false }

    A scene node can have:
    node.dialogues = [ { speaker, portrait, text, narrator? }, ... ]

    If dialogues are present, they play BEFORE choices are shown.
    After the last line, choices are rendered normally.
*/

let dlgState = null;   // active dialogue session
let dlgTypingTimer = null;

// Entry point — called from renderScene if node has dialogues
function startDialogue(node, afterCallback) {
  if (!node.dialogues || node.dialogues.length === 0) {
    afterCallback();
    return;
  }

  dlgState = {
    lines: node.dialogues,
    idx: 0,
    typing: false,
    fullText: '',
    afterCallback,
  };

  const overlay = document.getElementById('dialogue-overlay');
  overlay.style.display = 'flex';
  _dlgShowLine(0);
}

// Show a specific dialogue line
function _dlgShowLine(idx) {
  if (!dlgState) return;
  const lines = dlgState.lines;
  if (idx >= lines.length) {
    _dlgClose();
    return;
  }

  dlgState.idx = idx;
  const line = lines[idx];
  const isNarrator = !line.speaker || line.narrator;

  // Box class
  const box = document.querySelector('.dialogue-box');
  box.classList.toggle('narrator', isNarrator);

  // Portrait
  const portraitImgEl = document.getElementById('dlg-portrait-img');
  const portraitNameEl = document.getElementById('dlg-portrait-name');

  if (!isNarrator) {
    if (line.portrait) {
      if (line.portrait.startsWith('data:') || line.portrait.startsWith('http')) {
        portraitImgEl.innerHTML = `<img src="${line.portrait}">`;
      } else {
        // Treat as emoji
        portraitImgEl.textContent = line.portrait;
      }
    } else {
      // Default: first letter of speaker name as avatar
      portraitImgEl.textContent = (line.speaker || '?')[0].toUpperCase();
    }
    portraitNameEl.textContent = interpolateText(line.speaker || '');
  }

  // Speaker label
  const speakerEl = document.getElementById('dlg-speaker');
  speakerEl.textContent = isNarrator ? '' : interpolateText(line.speaker || '');

  // Counter
  document.getElementById('dlg-counter').textContent = `${idx + 1} / ${lines.length}`;

  // Hint
  const hint = document.getElementById('dlg-hint');
  const isLast = idx === lines.length - 1;
  hint.textContent = isLast ? 'clique para continuar →' : 'clique para avançar ›';

  // Typewriter
  _dlgTypewrite(interpolateText(line.text || ''));
}

function _dlgTypewrite(fullText) {
  if (!dlgState) return;

  // Clear previous timer
  if (dlgTypingTimer) clearInterval(dlgTypingTimer);

  dlgState.fullText = fullText;
  dlgState.typing = true;

  const textEl = document.getElementById('dlg-text');
  textEl.className = 'dialogue-text typing';
  textEl.innerHTML = '';

  let i = 0;
  const speed = 28; // ms per character

  dlgTypingTimer = setInterval(() => {
    if (!dlgState) { clearInterval(dlgTypingTimer); return; }
    i++;
    textEl.innerHTML = escHtmlRuntime(fullText.substring(0, i));
    if (i >= fullText.length) {
      clearInterval(dlgTypingTimer);
      dlgTypingTimer = null;
      dlgState.typing = false;
      textEl.className = 'dialogue-text';
    }
  }, speed);
}

// Called when player clicks anywhere on the overlay
function dialogueAdvance() {
  if (!dlgState) return;

  if (dlgState.typing) {
    // Skip typewriter — show full text instantly
    if (dlgTypingTimer) { clearInterval(dlgTypingTimer); dlgTypingTimer = null; }
    dlgState.typing = false;
    const textEl = document.getElementById('dlg-text');
    textEl.className = 'dialogue-text';
    textEl.innerHTML = escHtmlRuntime(dlgState.fullText);
    return;
  }

  // Advance to next line
  _dlgShowLine(dlgState.idx + 1);
}

function _dlgClose() {
  if (dlgTypingTimer) { clearInterval(dlgTypingTimer); dlgTypingTimer = null; }
  document.getElementById('dialogue-overlay').style.display = 'none';
  const cb = dlgState?.afterCallback;
  dlgState = null;
  if (cb) cb();
}

// Keyboard support for dialogue
document.addEventListener('keydown', e => {
  if (!dlgState) return;
  if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowRight') {
    e.preventDefault();
    dialogueAdvance();
  }
});

// ═══════════════════════════════════════════════════════════
//  DIALOGUE SYSTEM — Editor helpers
// ═══════════════════════════════════════════════════════════

function buildDialogueEditorHtml(nodeId, node) {
  const lines = node.dialogues || [];

  const linesHtml = lines.map((line, i) => {
    const isNarrator = !line.speaker || line.narrator;
    const portraitPreview = line.portrait
      ? (line.portrait.startsWith('data:') || line.portrait.startsWith('http'))
          ? `<img src="${line.portrait}">`
          : escHtml(line.portrait)
      : (line.speaker ? escHtml((line.speaker||'?')[0].toUpperCase()) : '📜');

    return `
    <div class="dialogue-line-item" id="dlg-line-${nodeId}-${i}">
      <button style="position:absolute;top:0.35rem;right:0.35rem;background:none;border:none;color:var(--blood);cursor:pointer;font-size:0.95rem;line-height:1;" onclick="removeDialogueLine('${nodeId}',${i})">✕</button>

      <div style="display:flex;gap:0.7rem;align-items:flex-start;margin-bottom:0.5rem;">
        <!-- Portrait preview -->
        <div class="dlg-portrait-preview">${portraitPreview}</div>

        <div style="flex:1;display:flex;flex-direction:column;gap:0.4rem;">
          <!-- Speaker + Narrator toggle -->
          <div style="display:grid;grid-template-columns:1fr auto;gap:0.5rem;align-items:center;">
            <div>
              <label class="field-label" style="font-size:0.58rem;">Personagem (vazio = narrador)</label>
              <input class="field-input" style="font-size:0.8rem;" placeholder="Ex: Mirdan" value="${escHtml(line.speaker||'')}"
                oninput="updateDialogueLine('${nodeId}',${i},'speaker',this.value)">
            </div>
            <div style="padding-top:1.1rem;">
              <label style="display:flex;align-items:center;gap:0.35rem;font-size:0.65rem;cursor:pointer;color:var(--stone-light);white-space:nowrap;">
                <input type="checkbox" ${line.narrator?'checked':''} style="accent-color:#88aaff;"
                  onchange="updateDialogueLine('${nodeId}',${i},'narrator',this.checked)">
                Narrador
              </label>
            </div>
          </div>

          <!-- Portrait emoji/url -->
          <div style="display:grid;grid-template-columns:1fr auto;gap:0.5rem;align-items:center;">
            <div>
              <label class="field-label" style="font-size:0.58rem;">Portrait — emoji ou imagem</label>
              <input class="field-input" style="font-size:0.85rem;" placeholder="Ex: 🧙 ou envie uma imagem →" value="${escHtml(line.portrait||'')}"
                oninput="updateDialogueLine('${nodeId}',${i},'portrait',this.value)">
            </div>
            <div style="padding-top:1.1rem;">
              <label class="btn-sm" style="cursor:pointer;font-size:0.6rem;padding:0.25em 0.5em;">
                📁
                <input type="file" accept="image/*" style="display:none;" onchange="uploadDialoguePortrait('${nodeId}',${i},this)">
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Text -->
      <div>
        <label class="field-label" style="font-size:0.58rem;">Fala</label>
        <textarea class="field-textarea" style="min-height:65px;font-family:'Crimson Text',serif;font-size:0.9rem;font-style:${isNarrator?'italic':'normal'};"
          oninput="updateDialogueLine('${nodeId}',${i},'text',this.value)">${escHtml(line.text||'')}</textarea>
      </div>

      <!-- Move buttons -->
      <div style="display:flex;justify-content:flex-end;gap:0.3rem;margin-top:0.3rem;">
        ${i > 0 ? `<button class="btn-sm" style="font-size:0.55rem;padding:0.15em 0.4em;" onclick="moveDialogueLine('${nodeId}',${i},-1)">↑</button>` : ''}
        ${i < lines.length-1 ? `<button class="btn-sm" style="font-size:0.55rem;padding:0.15em 0.4em;" onclick="moveDialogueLine('${nodeId}',${i},1)">↓</button>` : ''}
      </div>
    </div>`;
  }).join('');

  return `
  <div class="dialogue-editor-panel">
    <div class="dialogue-editor-label">
      💬 Diálogos da Cena
      <span style="font-family:'Crimson Text',serif;font-size:0.7rem;letter-spacing:0;font-style:italic;font-weight:400;text-transform:none;color:var(--stone-light);margin-left:0.3em;">
        — exibidos antes das escolhas
      </span>
      <button class="btn-sm" style="margin-left:auto;border-color:#88aaff;color:#88aaff;" onclick="addDialogueLine('${nodeId}')">+ Fala</button>
    </div>
    ${lines.length === 0
      ? `<div style="color:var(--stone);font-size:0.78rem;font-style:italic;padding:0.3rem 0;">
          Nenhum diálogo. Clique em "+ Fala" para criar falas que aparecem antes das escolhas.
         </div>`
      : linesHtml
    }
  </div>`;
}

function addDialogueLine(nodeId) {
  const node = editorAdventure.nodes[nodeId];
  if (!node) return;
  if (!node.dialogues) node.dialogues = [];
  node.dialogues.push({ speaker: '', portrait: '', text: '', narrator: false });
  renderNodeEditor(nodeId);
  // Scroll to dialogue panel
  setTimeout(() => {
    const panel = document.querySelector('.dialogue-editor-panel');
    if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 80);
}

function removeDialogueLine(nodeId, idx) {
  const node = editorAdventure.nodes[nodeId];
  if (!node || !node.dialogues) return;
  node.dialogues.splice(idx, 1);
  renderNodeEditor(nodeId);
}

function updateDialogueLine(nodeId, idx, key, value) {
  const node = editorAdventure.nodes[nodeId];
  if (!node || !node.dialogues || !node.dialogues[idx]) return;
  node.dialogues[idx][key] = value;
  // Refresh portrait preview live
  if (key === 'portrait' || key === 'speaker' || key === 'narrator') {
    renderNodeEditor(nodeId);
  }
}

function moveDialogueLine(nodeId, idx, dir) {
  const node = editorAdventure.nodes[nodeId];
  if (!node || !node.dialogues) return;
  const lines = node.dialogues;
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= lines.length) return;
  [lines[idx], lines[newIdx]] = [lines[newIdx], lines[idx]];
  renderNodeEditor(nodeId);
}

function uploadDialoguePortrait(nodeId, idx, input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const SIZE = 80;
      const canvas = document.createElement('canvas');
      canvas.width = SIZE; canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      // Pixel-art downscale
      const px = document.createElement('canvas');
      const SCALE = 4;
      px.width = Math.round(SIZE / SCALE); px.height = Math.round(SIZE / SCALE);
      const pctx = px.getContext('2d');
      pctx.imageSmoothingEnabled = false;
      pctx.drawImage(img, 0, 0, px.width, px.height);
      ctx.drawImage(px, 0, 0, SIZE, SIZE);
      const dataUrl = canvas.toDataURL('image/png');
      updateDialogueLine(nodeId, idx, 'portrait', dataUrl);
      notify('Portrait carregado!');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ═══════════════════════════════════════════════════════════
//  COMBAT SYSTEM
// ═══════════════════════════════════════════════════════════

// Runtime combat state
let combatState = null;

// Default enemy template (editor uses this as base)
function defaultEnemy() {
  return {
    name: 'Inimigo',
    icon: '👹',
    vida: 30,
    vidaMax: 30,
    attrs: { forca: 3, destreza: 2, constituicao: 2 },
    xpReward: 0,
    fleeAllowed: true,
    defeatPenalty: 1,  // vida da jornada perdida ao ser derrotado (0 = sem penalidade)
    defeatNode: '',    // cena ao perder o combate
    victoryNode: '',   // cena ao vencer
    fleeNode: '',      // cena ao fugir (vazio = victoryNode)
    victoryText: '',
    defeatText: '',
    fleeText: '',
  };
}

// ── Launch combat from a scene node ──
function startCombat(nodeId) {
  const node = activeSidequest
    ? activeSidequest.nodes[nodeId]
    : currentAdventure?.nodes[nodeId];
  if (!node || !node.combat) return;

  // Apply tag modifiers to a working copy of the combat config
  const cfg = applyCombatTagModifiers(node.combat);

  // ── Skip to victory if tag modifier says so ──
  if (cfg._skipToVictory) {
    notify(`⚔ ${cfg.name || 'Inimigo'} — vitória automática por habilidade!`);
    setTimeout(() => {
      const nextNode = cfg.victoryNode;
      if (nextNode) {
        if (activeSidequest && activeSidequest.nodes[nextNode]) renderSqScene(nextNode);
        else if (currentAdventure?.nodes[nextNode]) renderScene(nextNode);
      }
    }, 800);
    return;
  }

  // ── Determine player attack attribute (primaryAttr of class, fallback forca) ──
  const playerAttackAttr = character.primaryAttr || 'forca';
  const ATTR_NAMES = { forca:'Força', destreza:'Destreza', inteligencia:'Inteligência', carisma:'Carisma', sabedoria:'Sabedoria', constituicao:'Constituição' };
  const ATTR_ICONS = { forca:'⚔️', destreza:'🗡️', inteligencia:'📚', carisma:'🎶', sabedoria:'🏹', constituicao:'🛡️' };

  combatState = {
    round: 1,
    playerDefending: false,
    enemyVida: cfg.vidaMax || cfg.vida || 8,
    enemyVidaMax: cfg.vidaMax || cfg.vida || 8,
    cfg,
    sourceNodeId: nodeId,
    ended: false,
    playerAttackAttr,   // ← class primary attribute
    specialAction: cfg._specialAction || null,
  };

  // Resetar vida de combate do jogador a cada novo combate
  character.vidaCombate    = character.vidaCombateMax;

  // Show overlay
  const overlay = document.getElementById('combat-overlay');
  overlay.style.display = 'flex';

  // Populate UI
  document.getElementById('combat-title').textContent = cfg.name || 'Combate';
  document.getElementById('cb-enemy-name').textContent = cfg.name || 'Inimigo';
  document.getElementById('cb-enemy-icon').textContent = cfg.icon || '👹';
  document.getElementById('cb-player-name').textContent = character.name || 'Herói';

  // Player attrs shown — highlight primary attack attr
  const attrChips = ['forca','destreza','constituicao'].map(key => {
    const icon = ATTR_ICONS[key] || '⚔️';
    const val  = character.attrs[key];
    const isPrimary = key === playerAttackAttr;
    return `<div class="combat-attr-chip${isPrimary ? ' primary-attr' : ''}">${icon} ${val}${isPrimary ? ' ★' : ''}</div>`;
  });
  document.getElementById('cb-player-attrs').innerHTML = attrChips.join('');

  // Enemy attrs shown
  const ea = cfg.attrs || {};
  document.getElementById('cb-enemy-attrs').innerHTML =
    `<div class="combat-attr-chip">⚔️ ${ea.forca||1}</div>` +
    `<div class="combat-attr-chip">🗡️ ${ea.destreza||1}</div>` +
    `<div class="combat-attr-chip">🛡️ ${ea.constituicao||1}</div>`;

  // Attack hint — show actual attribute used
  const attackAttrName = ATTR_NAMES[playerAttackAttr] || playerAttackAttr;
  document.getElementById('cb-attack-hint').textContent = `${attackAttrName} vs Destreza`;

  // Special action button
  const specialBtn = document.getElementById('cb-btn-special');
  if (specialBtn) {
    if (combatState.specialAction) {
      specialBtn.style.display = '';
      specialBtn.textContent = combatState.specialAction.label || '✨ Ação Especial';
      specialBtn.title = combatState.specialAction.desc || '';
    } else {
      specialBtn.style.display = 'none';
    }
  }

  // Flee hint
  document.getElementById('cb-flee-hint').textContent =
    cfg.fleeAllowed === false ? 'Não permitido' : 'Destreza vs Destreza';

  // Hide/show flee
  document.getElementById('cb-btn-flee').disabled = cfg.fleeAllowed === false;

  // End panel hidden, actions shown
  document.getElementById('combat-end-panel').style.display = 'none';
  document.getElementById('combat-actions').style.display = 'grid';
  document.getElementById('combat-roll-zone').style.display = 'none';

  // Reset log
  const log = document.getElementById('combat-log');
  log.innerHTML = '';
  combatLog(`O combate começa! ${cfg.name || 'Inimigo'} avança.`, 'system');

  updateCombatBars();
  updateCombatRound();
}

function combatLog(msg, cls = '') {
  const log = document.getElementById('combat-log');
  const el = document.createElement('div');
  el.className = 'combat-log-entry' + (cls ? ' ' + cls : '');
  el.textContent = msg;
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
}

function updateCombatBars() {
  if (!combatState) return;
  const vidaCombatePct = Math.max(0, Math.round((character.vidaCombate / character.vidaCombateMax) * 100));
  const enemyPct       = Math.max(0, Math.round((combatState.enemyVida / combatState.enemyVidaMax) * 100));
  document.getElementById('cb-player-vida').textContent = `${character.vidaCombate}/${character.vidaCombateMax}`;
  document.getElementById('cb-enemy-vida').textContent  = `${combatState.enemyVida}/${combatState.enemyVidaMax}`;
  document.getElementById('cb-player-vida-bar').style.width = vidaCombatePct + '%';
  document.getElementById('cb-enemy-vida-bar').style.width  = enemyPct + '%';
}

function updateCombatRound() {
  document.getElementById('combat-round-label').textContent = `Turno ${combatState.round}`;
}

function setCombatActionsDisabled(disabled) {
  ['cb-btn-attack','cb-btn-defend','cb-btn-flee'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = disabled || (id === 'cb-btn-flee' && combatState?.cfg?.fleeAllowed === false);
  });
}

// Shake animation helper
function shakeFighter(side) {
  const icon = document.querySelector(`.combat-fighter.combat-${side} .combat-fighter-icon`);
  if (!icon) return;
  icon.classList.remove('shake');
  void icon.offsetWidth;
  icon.classList.add('shake');
  setTimeout(() => icon.classList.remove('shake'), 400);
}

// ── Roll animation (returns promise resolving after animation) ──
function showCombatRoll(label, attrVal, diffVal) {
  return new Promise(resolve => {
    const zone = document.getElementById('combat-roll-zone');
    zone.style.display = 'block';
    document.getElementById('combat-roll-label').textContent = label;
    document.getElementById('combat-roll-num').textContent = '—';
    document.getElementById('combat-roll-result').textContent = '';
    document.getElementById('combat-roll-result').className = 'combat-roll-result';

    const roll = Math.floor(Math.random() * 100) + 1;
    const chance = Math.min(95, Math.max(15, Math.round((attrVal / diffVal) * 60 + 10)));
    const success = roll <= chance;

    let frame = 0;
    const anim = setInterval(() => {
      document.getElementById('combat-roll-num').textContent = Math.floor(Math.random()*100)+1;
      frame++;
      if (frame >= 10) {
        clearInterval(anim);
        document.getElementById('combat-roll-num').textContent = roll;
        resolve({ roll, chance, success });
      }
    }, 55);
  });
}

function hideCombatRoll() {
  document.getElementById('combat-roll-zone').style.display = 'none';
}

// ── Calculate damage ──
// Attacker forca + 1d4, defender destreza reduces, constituição as armor
function calcDamage(attackerForca, defenderDestreza, defenderCon, defenderIsDefending) {
  const base = Math.max(1, attackerForca) + Math.floor(Math.random() * 4) + 1; // forca + d4
  const dodge = Math.floor(defenderDestreza / 2);
  const armor = Math.floor(defenderCon / 3) + (defenderIsDefending ? 2 : 0);
  return Math.max(1, base - dodge - armor);
}

// ── Enemy turn (simple AI) ──
async function enemyTurn() {
  if (!combatState || combatState.ended) return;

  const cfg = combatState.cfg;
  const ea = cfg.attrs || {};

  // Enemy always attacks (simple AI — could be extended)
  combatLog(`${cfg.name || 'Inimigo'} ataca!`, 'enemy');

  // Enemy hit roll: enemy destreza vs player constituicao
  const eDestreza = ea.destreza || 2;
  const pCon = character.attrs.constituicao || 1;
  const { roll, chance, success } = await showCombatRoll(
    `${cfg.name || 'Inimigo'} tenta acertar`,
    eDestreza, pCon + 2
  );

  const resultEl = document.getElementById('combat-roll-result');
  if (success) {
    const dmg = calcDamage(ea.forca || 2, character.attrs.destreza, character.attrs.constituicao, combatState.playerDefending);
    resultEl.className = 'combat-roll-result hit';
    resultEl.textContent = `✦ ACERTOU — ${dmg} de dano!`;
    await sleep(800);
    hideCombatRoll();
    shakeFighter('player');
    character.vidaCombate = Math.max(0, character.vidaCombate - dmg);
    renderCharHud();
    updateCombatBars();
    combatLog(`${cfg.name || 'Inimigo'} causa ${dmg} de dano. Sua vida de combate: ${character.vidaCombate}/${character.vidaCombateMax}`, 'enemy');

    if (character.vidaCombate <= 0) {
      await sleep(400);
      endCombat('lose');
      return;
    }
  } else {
    resultEl.className = 'combat-roll-result miss';
    resultEl.textContent = `✗ ERROU`;
    await sleep(800);
    hideCombatRoll();
    combatLog(`${cfg.name || 'Inimigo'} errou o ataque.`, 'system');
  }

  // Next round
  combatState.playerDefending = false;
  combatState.round++;
  updateCombatRound();
  document.getElementById('cb-player-status').textContent = '';
  setCombatActionsDisabled(false);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Player action ──
async function combatAction(action) {
  if (!combatState || combatState.ended) return;
  setCombatActionsDisabled(true);

  const cfg = combatState.cfg;
  const ea = cfg.attrs || {};

  if (action === 'attack') {
    combatLog(`Você ataca ${cfg.name || 'Inimigo'}!`, 'player');

    // Player hit roll: use primary class attribute vs enemy destreza
    const attackAttr = combatState.playerAttackAttr || 'forca';
    const pAtk = character.attrs[attackAttr] || 1;
    const eDestreza = ea.destreza || 2;
    const ATTR_NAMES2 = { forca:'Força', destreza:'Destreza', inteligencia:'Inteligência', carisma:'Carisma', sabedoria:'Sabedoria', constituicao:'Constituição' };

    const { roll, chance, success } = await showCombatRoll(
      `Teste de ${ATTR_NAMES2[attackAttr]||attackAttr} (${pAtk}) vs Destreza inimiga (${eDestreza})`,
      pAtk, eDestreza + 1
    );

    const resultEl = document.getElementById('combat-roll-result');
    const isCrit = roll <= Math.floor(chance * 0.15) + 1;

    if (success) {
      const dmg = calcDamage(pAtk, ea.destreza || 1, ea.constituicao || 1, false) + (isCrit ? 3 : 0);
      if (isCrit) {
        resultEl.className = 'combat-roll-result crit';
        resultEl.textContent = `✦ CRÍTICO! ${dmg} de dano!`;
      } else {
        resultEl.className = 'combat-roll-result hit';
        resultEl.textContent = `✦ ACERTOU — ${dmg} de dano!`;
      }
      await sleep(800);
      hideCombatRoll();
      shakeFighter('enemy');
      combatState.enemyVida = Math.max(0, combatState.enemyVida - dmg);
      updateCombatBars();
      combatLog(`Você causa ${dmg} de dano.${isCrit?' GOLPE CRÍTICO!':''} Vida do inimigo: ${combatState.enemyVida}/${combatState.enemyVidaMax}`, 'player');

      if (combatState.enemyVida <= 0) {
        await sleep(400);
        endCombat('win');
        return;
      }
    } else {
      resultEl.className = 'combat-roll-result miss';
      resultEl.textContent = `✗ ERROU`;
      await sleep(800);
      hideCombatRoll();
      combatLog(`Seu ataque não encontrou o alvo.`, 'system');
    }

    await sleep(300);
    await enemyTurn();

  } else if (action === 'defend') {
    combatState.playerDefending = true;
    document.getElementById('cb-player-status').textContent = '🛡 Defendendo';
    combatLog(`Você assume postura defensiva — reduzindo o dano recebido.`, 'player');
    await sleep(400);
    await enemyTurn();

  } else if (action === 'special') {
    // Special action unlocked by a tag modifier
    const special = combatState.specialAction;
    if (!special) return;
    combatLog(`✨ ${special.label || 'Ação Especial'}! ${special.desc || ''}`, 'player');

    // Special actions can deal bonus damage or debuff the enemy
    const dmg = special.damage || 5;
    combatState.enemyVida = Math.max(0, combatState.enemyVida - dmg);
    updateCombatBars();
    combatLog(`Causa ${dmg} de dano especial. Vida do inimigo: ${combatState.enemyVida}/${combatState.enemyVidaMax}`, 'player');
    if (combatState.enemyVida <= 0) {
      await sleep(400);
      endCombat('win');
      return;
    }
    // Special is one-use
    combatState.specialAction = null;
    const specialBtn = document.getElementById('cb-btn-special');
    if (specialBtn) specialBtn.style.display = 'none';
    await sleep(300);
    await enemyTurn();

  } else if (action === 'flee') {
    if (cfg.fleeAllowed === false) return;

    combatLog(`Você tenta fugir!`, 'player');
    const pDestreza = character.attrs.destreza || 1;
    const eDestreza = ea.destreza || 2;

    const { roll, chance, success } = await showCombatRoll(
      `Teste de Destreza (${pDestreza}) para fugir`,
      pDestreza, eDestreza + 2
    );

    const resultEl = document.getElementById('combat-roll-result');
    if (success) {
      resultEl.className = 'combat-roll-result flee-ok';
      resultEl.textContent = `✦ FUGIU COM SUCESSO`;
      await sleep(800);
      hideCombatRoll();
      combatLog(`Você escapa do combate!`, 'player');
      await sleep(400);
      endCombat('flee');
    } else {
      resultEl.className = 'combat-roll-result flee-fail';
      resultEl.textContent = `✗ NÃO CONSEGUIU FUGIR`;
      await sleep(800);
      hideCombatRoll();
      combatLog(`A fuga falhou — o inimigo bloqueia seu caminho!`, 'enemy');
      await sleep(300);
      await enemyTurn();
    }
  }
}

// ── End combat ──
function endCombat(outcome) {
  if (!combatState) return;
  combatState.ended = true;

  const cfg = combatState.cfg;
  document.getElementById('combat-actions').style.display = 'none';
  const endPanel = document.getElementById('combat-end-panel');
  endPanel.style.display = 'block';

  const resultEl = document.getElementById('combat-end-result');
  const rewardsEl = document.getElementById('combat-end-rewards');

  combatState._outcome = outcome;

  if (outcome === 'win') {
    resultEl.className = 'combat-end-result win';
    resultEl.textContent = '⚔ VITÓRIA ⚔';
    rewardsEl.textContent = cfg.victoryText || 'O inimigo foi derrotado.';
    combatLog('✦ VITÓRIA! O inimigo foi derrotado.', 'result-win');
    if (cfg.xpReward) addScore(cfg.xpReward, 'choice', `Combate: ${cfg.name}`);
    if (cfg.victoryTagEffects) applyTagEffects(cfg.victoryTagEffects);

  } else if (outcome === 'lose') {
    resultEl.className = 'combat-end-result lose';
    resultEl.textContent = '💀 DERROTA 💀';

    // Aplicar penalidade de vida da jornada configurada pelo criador (padrão: 1)
    const penalty = (cfg.defeatPenalty != null) ? cfg.defeatPenalty : 1;
    let penaltyText = '';
    if (penalty > 0) {
      character.vida = Math.max(0, character.vida - penalty);
      renderCharHud();
      penaltyText = ` Você perde ${penalty} de vida.`;
    }

    const defeatMsg = (cfg.defeatText || 'Você foi derrotado.') + penaltyText;
    rewardsEl.textContent = defeatMsg;
    combatLog(`✦ DERROTA. Você sucumbiu em combate.${penaltyText}`, 'result-lose');
    if (cfg.defeatTagEffects) applyTagEffects(cfg.defeatTagEffects);

    // Se a penalidade zerou a vida da jornada, aciona morte — mas só após fechar o overlay
    if (character.vida <= 0) {
      setTimeout(() => {
        document.getElementById('combat-overlay').style.display = 'none';
        combatState = null;
        triggerStatusDeath('vida');
      }, 1800);
      return;
    }

  } else if (outcome === 'flee') {
    resultEl.className = 'combat-end-result flee';
    resultEl.textContent = '💨 RECUOU';
    rewardsEl.textContent = cfg.fleeText || 'Você fugiu do confronto.';
    combatLog('Você recuou do combate.', 'system');
  }
}

function closeCombat() {
  if (!combatState) return;
  const cfg = combatState.cfg;
  const outcome = combatState._outcome;

  document.getElementById('combat-overlay').style.display = 'none';

  // Navigate to appropriate next scene
  let nextNode = null;
  if (outcome === 'win')   nextNode = cfg.victoryNode;
  if (outcome === 'lose')  nextNode = cfg.defeatNode;
  if (outcome === 'flee')  nextNode = cfg.fleeNode || cfg.victoryNode;

  combatState = null;

  if (nextNode) {
    if (activeSidequest && activeSidequest.nodes[nextNode]) {
      renderSqScene(nextNode);
    } else if (currentAdventure?.nodes[nextNode]) {
      renderScene(nextNode);
    } else {
      notify('Cena de destino do combate não encontrada: ' + nextNode);
    }
  } else {
    notify('Configure a cena de destino do combate no editor.');
  }
}

// ── Hook into renderScene: if node has combat config, start combat instead of showing choices ──
// (called from renderScene after building choices area)
function checkAndStartCombat(nodeId) {
  const node = activeSidequest
    ? activeSidequest.nodes[nodeId]
    : currentAdventure?.nodes[nodeId];
  if (!node || !node.combat) return false;
  // Replace choices with a "enter combat" button
  const choicesSection = document.getElementById('choices-section');
  choicesSection.innerHTML = `
    <div class="ending-banner" style="border-color:rgba(139,26,26,0.5);background:rgba(139,26,26,0.05);">
      <div class="ending-type defeat" style="letter-spacing:0.3em;">⚔ COMBATE ⚔</div>
      <div class="ending-title" style="color:#e07070;font-size:1.2rem;">${escHtmlRuntime(node.combat.name || 'Inimigo')}</div>
      <div style="font-family:'IM Fell English',serif;color:var(--stone-light);font-size:0.9rem;font-style:italic;margin-bottom:1.5rem;">
        Vida: ${node.combat.vidaMax || node.combat.vida || 30} &nbsp;·&nbsp; Força: ${node.combat.attrs?.forca||1} &nbsp;·&nbsp; Destreza: ${node.combat.attrs?.destreza||1}
      </div>
      <button class="btn-medieval" style="border-color:#cc4444;color:#e07070;margin:0 auto;" onclick="startCombat('${nodeId}')">⚔ Lutar</button>
    </div>`;
  return true;
}

// ═══════════════════════════════════════════════════════════
//  COMBAT EDITOR HELPERS
// ═══════════════════════════════════════════════════════════

function toggleNodeCombat(nodeId, enabled) {
  const node = editorAdventure.nodes[nodeId];
  if (!node) return;
  if (enabled) {
    if (!node.combat) node.combat = defaultEnemy();
  } else {
    delete node.combat;
  }
  renderNodeEditor(nodeId);
}

function updateCombat(nodeId, key, value) {
  const node = editorAdventure.nodes[nodeId];
  if (!node || !node.combat) return;
  node.combat[key] = value;
}

function updateCombatAttr(nodeId, attrKey, value) {
  const node = editorAdventure.nodes[nodeId];
  if (!node || !node.combat) return;
  if (!node.combat.attrs) node.combat.attrs = {};
  node.combat.attrs[attrKey] = Math.max(1, Math.min(10, value));
}

function buildCombatEditorHtml(nodeId, node, allNodeIds) {
  const hasCombat = !!node.combat;
  const c = node.combat || defaultEnemy();

  const nodeOptions = allNodeIds.map(id =>
    `<option value="${id}" ${c.victoryNode===id?'selected':''}>${escHtml(editorAdventure.nodes[id]?.title||id)}</option>`
  ).join('');
  const nodeOptionsDefeat = allNodeIds.map(id =>
    `<option value="${id}" ${c.defeatNode===id?'selected':''}>${escHtml(editorAdventure.nodes[id]?.title||id)}</option>`
  ).join('');
  const nodeOptionsFlee = allNodeIds.map(id =>
    `<option value="${id}" ${c.fleeNode===id?'selected':''}>${escHtml(editorAdventure.nodes[id]?.title||id)}</option>`
  ).join('');

  const COMBAT_ATTRS = [
    { key: 'forca',       icon: '⚔️', name: 'Força' },
    { key: 'destreza',    icon: '🗡️', name: 'Destreza' },
    { key: 'constituicao',icon: '🛡️', name: 'Constituição' },
  ];

  return `
    <div class="combat-editor-panel">
      <div class="combat-editor-label">
        ⚔ Combate nesta Cena
        <label style="margin-left:auto;display:flex;align-items:center;gap:0.4rem;font-size:0.7rem;cursor:pointer;color:var(--parchment-dark);">
          <input type="checkbox" ${hasCombat?'checked':''} onchange="toggleNodeCombat('${nodeId}',this.checked)" style="accent-color:#cc4444;">
          Ativar combate
        </label>
      </div>
      ${hasCombat ? `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;margin-bottom:0.6rem;">
        <div class="field-group" style="margin:0;">
          <label class="field-label" style="font-size:0.6rem;">Nome do Inimigo</label>
          <input class="field-input" value="${escHtml(c.name||'')}" onchange="updateCombat('${nodeId}','name',this.value)" placeholder="Ex: Goblin Selvagem">
        </div>
        <div class="field-group" style="margin:0;">
          <label class="field-label" style="font-size:0.6rem;">Ícone (emoji)</label>
          <input class="field-input" value="${escHtml(c.icon||'👹')}" onchange="updateCombat('${nodeId}','icon',this.value)" placeholder="👹">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;margin-bottom:0.6rem;">
        <div class="field-group" style="margin:0;">
          <label class="field-label" style="font-size:0.6rem;">❤️ Vida máxima (combate)</label>
          <input class="field-input" type="number" min="1" max="999" value="${c.vidaMax||c.vida||30}" onchange="updateCombat('${nodeId}','vidaMax',+this.value);updateCombat('${nodeId}','vida',+this.value)">
        </div>
        <div class="field-group" style="margin:0;">
          <label class="field-label" style="font-size:0.6rem;">⭐ Recompensa (pontos)</label>
          <input class="field-input" type="number" min="0" max="9999" value="${c.xpReward||0}" onchange="updateCombat('${nodeId}','xpReward',+this.value)">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;margin-bottom:0.6rem;">
        <div class="field-group" style="margin:0;">
          <label class="field-label" style="font-size:0.6rem;">💔 Penalidade ao perder (vida da jornada)</label>
          <input class="field-input" type="number" min="0" max="99" value="${c.defeatPenalty ?? 1}" onchange="updateCombat('${nodeId}','defeatPenalty',+this.value)" title="Quantidade de vida da jornada perdida ao ser derrotado. 0 = sem penalidade.">
        </div>
        <div class="field-group" style="margin:0;display:flex;align-items:center;padding-top:1.1rem;">
          <span style="font-size:0.65rem;color:var(--stone);font-style:italic;">Derrota no combate não mata — reduz a vida da jornada.</span>
        </div>
      </div>
      <div style="margin-bottom:0.6rem;">
        <div class="field-label" style="font-size:0.6rem;margin-bottom:0.4rem;color:#e07070;">Atributos do Inimigo</div>
        ${COMBAT_ATTRS.map(a => `
          <div class="combat-attr-editor-row">
            <span>${a.icon}</span>
            <span style="font-family:'Cinzel',serif;font-size:0.65rem;color:var(--gold);">${a.name}</span>
            <input class="field-input" type="number" min="1" max="10" value="${(c.attrs||{})[a.key]||1}"
              onchange="updateCombatAttr('${nodeId}','${a.key}',+this.value)" style="padding:0.2rem 0.4rem;font-size:0.75rem;">
          </div>`).join('')}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;margin-bottom:0.6rem;">
        <div class="field-group" style="margin:0;">
          <label class="field-label" style="font-size:0.6rem;color:#7ecb8a;">✦ Cena ao Vencer</label>
          <select class="field-select" onchange="updateCombat('${nodeId}','victoryNode',this.value)">
            <option value="">— Selecionar —</option>${nodeOptions}
          </select>
        </div>
        <div class="field-group" style="margin:0;">
          <label class="field-label" style="font-size:0.6rem;color:#e07070;">✗ Cena ao Perder</label>
          <select class="field-select" onchange="updateCombat('${nodeId}','defeatNode',this.value)">
            <option value="">— Selecionar —</option>${nodeOptionsDefeat}
          </select>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;margin-bottom:0.6rem;">
        <div class="field-group" style="margin:0;">
          <label class="field-label" style="font-size:0.6rem;color:var(--stone-light);">💨 Cena ao Fugir (vazio = vitória)</label>
          <select class="field-select" onchange="updateCombat('${nodeId}','fleeNode',this.value)">
            <option value="">— Mesma de vitória —</option>${nodeOptionsFlee}
          </select>
        </div>
        <div class="field-group" style="margin:0;display:flex;align-items:center;padding-top:1.2rem;">
          <label style="display:flex;align-items:center;gap:0.4rem;font-size:0.72rem;cursor:pointer;color:var(--parchment-dark);">
            <input type="checkbox" ${c.fleeAllowed===false?'':'checked'} onchange="updateCombat('${nodeId}','fleeAllowed',this.checked)" style="accent-color:#cc4444;">
            Permitir fuga
          </label>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.4rem;">
        <div class="field-group" style="margin:0;">
          <label class="field-label" style="font-size:0.6rem;">Texto (vitória)</label>
          <input class="field-input" value="${escHtml(c.victoryText||'')}" onchange="updateCombat('${nodeId}','victoryText',this.value)" placeholder="Inimigo derrotado...">
        </div>
        <div class="field-group" style="margin:0;">
          <label class="field-label" style="font-size:0.6rem;">Texto (derrota)</label>
          <input class="field-input" value="${escHtml(c.defeatText||'')}" onchange="updateCombat('${nodeId}','defeatText',this.value)" placeholder="Você foi derrotado...">
        </div>
        <div class="field-group" style="margin:0;">
          <label class="field-label" style="font-size:0.6rem;">Texto (fuga)</label>
          <input class="field-input" value="${escHtml(c.fleeText||'')}" onchange="updateCombat('${nodeId}','fleeText',this.value)" placeholder="Você fugiu...">
        </div>
      </div>
      ` : `<div style="color:var(--stone);font-size:0.78rem;font-style:italic;padding:0.4rem 0;">Ative para configurar um inimigo nesta cena.</div>`}
      ${hasCombat ? buildCombatTagModifiersHtml(nodeId, c, allNodeIds) : ''}
    </div>`;
}

// ═══════════════════════════════════════════════════════════
//  RANDOM ENCOUNTER SYSTEM
//  Estrutura de um encontro:
//  {
//    id, title, icon, text,
//    type: 'beneficial' | 'neutral' | 'harmful',
//    weight: 1-10,          // peso relativo (mais peso = aparece mais)
//    once: false,           // true = só aparece uma vez por jornada
//    triggerNodes: [],      // cenas que podem disparar (vazio = qualquer cena)
//    requireTags: [],       // tags que o jogador DEVE ter
//    excludeTags: [],       // tags que impedem o encontro
//    grantTags: [],         // tags concedidas ao resolver
//    vida: 0,               // delta de vida da jornada (neg = dano)
//    sanidade: 0,           // delta de sanidade
//    attrDeltas: {},        // { forca:1, destreza:-1, ... }
//    points: 0              // pontos de score
//  }
// ═══════════════════════════════════════════════════════════

// ── Runtime state ──
let activeEncounter = null;

// Probability per eligible scene that AN encounter fires (pool is weighted)
const ENC_APPEAR_CHANCE = 0.40; // 40% chance per eligible scene

// Get encounter pool from current adventure
function getEncounters() {
  return currentAdventure?.randomEncounters || [];
}

// Check and possibly trigger a random encounter after entering a scene
// Called from renderScene (main story only, not during sidequests or other encounters)
function checkEncounterTrigger(nodeId) {
  const pool = getEncounters();
  if (!pool.length) return false;

  // Build weighted eligible list
  const eligible = pool.filter(enc => {
    if (enc._usedOnce) return false;                               // already used once
    if (enc.triggerNodes?.length && !enc.triggerNodes.includes(nodeId)) return false; // wrong scene
    if (enc.requireTags?.length && !enc.requireTags.every(t => hasTag(t))) return false;
    if (enc.excludeTags?.length &&  enc.excludeTags.some(t => hasTag(t))) return false;
    return true;
  });
  if (!eligible.length) return false;

  // Roll for trigger
  if (Math.random() > ENC_APPEAR_CHANCE) return false;

  // Weighted random pick
  const totalWeight = eligible.reduce((s, e) => s + (e.weight || 1), 0);
  let r = Math.random() * totalWeight;
  let chosen = eligible[eligible.length - 1];
  for (const enc of eligible) {
    r -= (enc.weight || 1);
    if (r <= 0) { chosen = enc; break; }
  }

  // Mark once-only encounters
  if (chosen.once) chosen._usedOnce = true;

  triggerEncounter(chosen, nodeId);
  return true;
}

// Show the encounter overlay
function triggerEncounter(enc, returnNodeId) {
  activeEncounter = { enc, returnNodeId };

  const overlay = document.getElementById('encounter-overlay');
  const badge = document.getElementById('enc-type-badge');
  const typeLabels = { beneficial: '✦ Encontro Benéfico', neutral: '🎲 Encontro', harmful: '⚠ Encontro Perigoso' };
  const typeClass = enc.type || 'neutral';

  badge.textContent = typeLabels[typeClass] || '🎲 Encontro';
  badge.className = 'encounter-type-badge ' + typeClass;

  document.getElementById('enc-icon').textContent = enc.icon || '🎲';
  document.getElementById('enc-title').textContent = enc.title || 'Encontro';
  document.getElementById('enc-text').innerHTML = interpolateText((enc.text || '').replace(/\n/g, '<br>'));

  // Build effects chips
  const effects = [];
  if (enc.vida)    effects.push({ label: `❤️ Vida ${enc.vida > 0 ? '+' : ''}${enc.vida}`,     cls: enc.vida > 0 ? 'pos' : 'neg' });
  if (enc.sanidade) effects.push({ label: `🧠 San ${enc.sanidade > 0 ? '+' : ''}${enc.sanidade}`, cls: enc.sanidade > 0 ? 'pos' : 'neg' });
  if (enc.attrDeltas) {
    const ANAMES = { forca:'Força', destreza:'Destreza', inteligencia:'Int', carisma:'Carisma', sabedoria:'Sab', constituicao:'Con' };
    Object.entries(enc.attrDeltas).forEach(([k, v]) => {
      if (v) effects.push({ label: `${ANAMES[k]||k} ${v>0?'+':''}${v}`, cls: v > 0 ? 'pos' : 'neg' });
    });
  }
  if (enc.points) effects.push({ label: `⭐ ${enc.points > 0 ? '+' : ''}${enc.points} pts`, cls: enc.points > 0 ? 'pos' : 'neg' });
  if (enc.grantTags?.length) enc.grantTags.forEach(t => effects.push({ label: `🏷 ${t}`, cls: 'tag' }));

  const efEl = document.getElementById('enc-effects');
  efEl.innerHTML = effects.map(e =>
    `<span class="enc-effect-chip ${e.cls}">${escHtmlRuntime(e.label)}</span>`
  ).join('');

  // Flash banner briefly before overlay (cosmetic)
  const flash = document.createElement('div');
  flash.className = 'enc-hud-flash';
  flash.textContent = '— Encontro —';
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 2500);

  overlay.style.display = 'flex';

  document.getElementById('enc-continue-btn').onclick = () => {
    overlay.style.display = 'none';
    resolveEncounter();
  };
}

// Apply encounter effects and return to story
function resolveEncounter() {
  if (!activeEncounter) return;
  const { enc, returnNodeId } = activeEncounter;
  activeEncounter = null;

  // Apply effects
  if (enc.vida)     changeVida(enc.vida);
  if (enc.sanidade) changeSanidade(enc.sanidade);
  if (enc.points)   addScore(enc.points, 'choice', `🎲 Encontro: ${enc.title}`);
  if (enc.attrDeltas) {
    Object.entries(enc.attrDeltas).forEach(([k, v]) => {
      if (v && character.attrs[k] !== undefined) {
        character.attrs[k] = Math.max(1, Math.min(ATTR_MAX, character.attrs[k] + v));
      }
    });
    renderCharHud();
  }
  if (enc.grantTags?.length) {
    enc.grantTags.forEach(t => setTag(t, true));
  }
}

// ── Reset encounter once-flags on adventure restart ──
function resetEncounterFlags() {
  const pool = currentAdventure?.randomEncounters || [];
  pool.forEach(enc => { delete enc._usedOnce; });
}

// ══════════════════════════════════════════════
//  ENCOUNTER EDITOR
// ══════════════════════════════════════════════

let selectedEncId = null;

function getEditorEncounters() {
  if (!editorAdventure.randomEncounters) editorAdventure.randomEncounters = [];
  return editorAdventure.randomEncounters;
}

function openEncounterEditor() {
  syncMetaToEditor();
  showScreen('screen-encounter-editor');
  renderEncList();
  if (selectedEncId) renderEncEditor(selectedEncId);
}

function renderEncList() {
  const list = document.getElementById('enc-list');
  const encs = getEditorEncounters();
  if (!encs.length) {
    list.innerHTML = '<div style="color:var(--stone);font-style:italic;text-align:center;padding:1.5rem;font-size:0.85rem;">Nenhum encontro criado ainda.</div>';
    return;
  }
  const typeIcons = { beneficial: '✦', neutral: '🎲', harmful: '⚠' };
  list.innerHTML = encs.map(enc => {
    const typeClass = enc.type || 'neutral';
    return `<div class="enc-slot-item ${enc.id === selectedEncId ? 'selected' : ''}" onclick="selectEnc('${enc.id}')">
      <div class="enc-slot-title">${typeIcons[typeClass]||'🎲'} ${escHtml(enc.title || '(sem título)')}</div>
      <div class="enc-slot-type ${typeClass}">${{beneficial:'Benéfico',neutral:'Neutro',harmful:'Maléfico'}[typeClass]||'Neutro'}${enc.once?' · Único':''}${enc.weight > 1 ? ` · Peso ${enc.weight}`:''}</div>
    </div>`;
  }).join('');
}

function selectEnc(id) {
  selectedEncId = id;
  renderEncList();
  renderEncEditor(id);
}

function addEncounter() {
  const id = 'enc_' + Date.now();
  getEditorEncounters().push({
    id,
    title: 'Novo Encontro',
    icon: '🎲',
    text: 'Descreva o que acontece durante este encontro...',
    type: 'neutral',
    weight: 1,
    once: false,
    triggerNodes: [],
    requireTags: [],
    excludeTags: [],
    grantTags: [],
    vida: 0,
    sanidade: 0,
    attrDeltas: {},
    points: 0,
  });
  selectedEncId = id;
  renderEncList();
  renderEncEditor(id);
}

function deleteEncounter() {
  if (!selectedEncId) return;
  const encs = getEditorEncounters();
  const idx = encs.findIndex(e => e.id === selectedEncId);
  if (idx < 0) return;
  encs.splice(idx, 1);
  selectedEncId = encs[0]?.id || null;
  renderEncList();
  if (selectedEncId) renderEncEditor(selectedEncId);
  else document.getElementById('enc-node-editor').innerHTML = '<div style="color:var(--stone);font-style:italic;text-align:center;padding:2rem;">Selecione ou crie um encontro.</div>';
}

function renderEncEditor(encId) {
  const enc = getEditorEncounters().find(e => e.id === encId);
  if (!enc) return;
  document.getElementById('enc-editing-label').textContent = `🎲 ${enc.title || 'Sem título'}`;

  const allMainNodes = Object.values(editorAdventure.nodes);
  const ATTRS_ENC = ['forca','destreza','inteligencia','carisma','sabedoria','constituicao'];
  const ATTR_NAMES_ENC = { forca:'⚔️ Força', destreza:'🗡️ Destreza', inteligencia:'📚 Int', carisma:'🎶 Carisma', sabedoria:'🏹 Sabedoria', constituicao:'🛡️ Con' };

  const attrRows = ATTRS_ENC.map(k => {
    const v = (enc.attrDeltas || {})[k] || 0;
    const cls = v > 0 ? 'pos' : v < 0 ? 'neg' : '';
    return `<div style="display:flex;align-items:center;gap:0.4rem;margin-bottom:0.3rem;">
      <span style="font-size:0.75rem;min-width:7rem;color:var(--parchment-dark);">${ATTR_NAMES_ENC[k]}</span>
      <button class="reward-delta-btn neg" onclick="changeEncAttr('${encId}','${k}',-1)">−</button>
      <span class="reward-val ${cls}" style="min-width:2rem;text-align:center;">${v > 0 ? '+' : ''}${v}</span>
      <button class="reward-delta-btn" onclick="changeEncAttr('${encId}','${k}',1)">+</button>
    </div>`;
  }).join('');

  const triggerChecks = allMainNodes.map(n => {
    const checked = (enc.triggerNodes || []).includes(n.id);
    return `<label style="display:flex;align-items:center;gap:0.5rem;font-size:0.75rem;color:var(--parchment-dark);margin-bottom:0.3rem;cursor:pointer;">
      <input type="checkbox" value="${n.id}" ${checked ? 'checked' : ''} onchange="toggleEncTrigger('${encId}','${n.id}',this.checked)" style="accent-color:#e8a44a;">
      <span>${escHtml(n.title || n.id)}</span>
    </label>`;
  }).join('') || '<div style="color:var(--stone);font-size:0.75rem;font-style:italic;">Crie cenas na história principal primeiro.</div>';

  document.getElementById('enc-node-editor').innerHTML = `
    <div class="field-group">
      <label class="field-label">Título do Encontro</label>
      <input class="field-input" value="${escHtml(enc.title)}" oninput="updateEnc('${encId}','title',this.value)">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;margin-bottom:1rem;">
      <div class="field-group" style="margin:0;">
        <label class="field-label">Ícone (emoji)</label>
        <input class="field-input" value="${escHtml(enc.icon||'🎲')}" style="font-size:1.5rem;text-align:center;" oninput="updateEnc('${encId}','icon',this.value)">
      </div>
      <div class="field-group" style="margin:0;">
        <label class="field-label">Tipo</label>
        <select class="field-select" style="border-color:rgba(232,164,74,0.4);" onchange="updateEnc('${encId}','type',this.value);renderEncList();">
          <option value="beneficial" ${enc.type==='beneficial'?'selected':''}>✦ Benéfico</option>
          <option value="neutral"    ${enc.type==='neutral'   ?'selected':''}>🎲 Neutro</option>
          <option value="harmful"    ${enc.type==='harmful'   ?'selected':''}>⚠ Maléfico</option>
        </select>
      </div>
    </div>
    <div class="field-group">
      <label class="field-label">Texto narrativo do Encontro</label>
      <textarea class="field-textarea" style="min-height:120px;font-family:'Crimson Text',serif;font-size:0.9rem;" oninput="updateEnc('${encId}','text',this.value)">${escHtml(enc.text)}</textarea>
      <div style="font-size:0.65rem;color:var(--stone);margin-top:0.3rem;font-style:italic;">Use {{nome}}, {{forca}}, etc. para personalizar o texto.</div>
    </div>

    <!-- Chance e comportamento -->
    <div style="border:1px solid rgba(232,164,74,0.18);padding:0.8rem 1rem;margin-bottom:1rem;">
      <div class="field-label" style="margin-bottom:0.6rem;color:#f0c070;">⚙ Comportamento</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;margin-bottom:0.5rem;">
        <div>
          <label class="field-label" style="font-size:0.6rem;">Peso (1 = normal, 10 = muito frequente)</label>
          <input class="field-input" type="number" min="1" max="10" value="${enc.weight||1}" onchange="updateEnc('${encId}','weight',+this.value)">
        </div>
        <div style="display:flex;align-items:flex-end;padding-bottom:0.3rem;">
          <label style="display:flex;align-items:center;gap:0.5rem;font-size:0.75rem;cursor:pointer;color:var(--parchment-dark);">
            <input type="checkbox" ${enc.once?'checked':''} onchange="updateEnc('${encId}','once',this.checked);renderEncList();" style="accent-color:#e8a44a;">
            Ocorre apenas uma vez por jornada
          </label>
        </div>
      </div>
    </div>

    <!-- Gatilhos -->
    <div style="border:1px solid rgba(232,164,74,0.18);padding:0.8rem 1rem;margin-bottom:1rem;">
      <div class="field-label" style="margin-bottom:0.4rem;color:#f0c070;">🗺 Gatilhos de Cena</div>
      <div style="font-size:0.68rem;color:var(--stone);font-style:italic;margin-bottom:0.6rem;">Deixe tudo desmarcado para que o encontro possa aparecer em qualquer cena.</div>
      ${triggerChecks}
    </div>

    <!-- Condições de Tag -->
    <div style="border:1px solid rgba(180,120,220,0.2);padding:0.8rem 1rem;margin-bottom:1rem;">
      <div class="field-label" style="margin-bottom:0.5rem;color:#c8a8ff;">🏷 Condições de Tag</div>
      <div class="field-group" style="margin-bottom:0.5rem;">
        <label class="field-label" style="font-size:0.6rem;">Requer estas tags (separadas por vírgula)</label>
        <input class="field-input" placeholder="ex: PossuiAmuleto, FoiAoForte" value="${escHtml((enc.requireTags||[]).join(', '))}" onchange="updateEncTagList('${encId}','requireTags',this.value)">
      </div>
      <div class="field-group" style="margin-bottom:0.5rem;">
        <label class="field-label" style="font-size:0.6rem;">Bloqueado se tiver estas tags (separadas por vírgula)</label>
        <input class="field-input" placeholder="ex: JaConheceMago" value="${escHtml((enc.excludeTags||[]).join(', '))}" onchange="updateEncTagList('${encId}','excludeTags',this.value)">
      </div>
      <div class="field-group" style="margin:0;">
        <label class="field-label" style="font-size:0.6rem;">Concede estas tags ao ocorrer (separadas por vírgula)</label>
        <input class="field-input" placeholder="ex: EncontrouMercador" value="${escHtml((enc.grantTags||[]).join(', '))}" onchange="updateEncTagList('${encId}','grantTags',this.value)">
      </div>
    </div>

    <!-- Efeitos -->
    <div style="border:1px solid rgba(232,164,74,0.18);padding:0.8rem 1rem;margin-bottom:1rem;">
      <div class="field-label" style="margin-bottom:0.6rem;color:#f0c070;">⚡ Efeitos ao Ocorrer</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.5rem;margin-bottom:0.7rem;">
        <div>
          <label class="field-label" style="font-size:0.6rem;">❤️ Vida (±)</label>
          <input class="field-input" type="number" min="-99" max="99" value="${enc.vida||0}" onchange="updateEnc('${encId}','vida',+this.value)" style="border-color:rgba(204,68,68,0.4);">
        </div>
        <div>
          <label class="field-label" style="font-size:0.6rem;">🧠 Sanidade (±)</label>
          <input class="field-input" type="number" min="-99" max="99" value="${enc.sanidade||0}" onchange="updateEnc('${encId}','sanidade',+this.value)" style="border-color:rgba(147,112,219,0.4);">
        </div>
        <div>
          <label class="field-label" style="font-size:0.6rem;">⭐ Pontos (±)</label>
          <input class="field-input" type="number" min="-9999" max="9999" value="${enc.points||0}" onchange="updateEnc('${encId}','points',+this.value)" style="border-color:rgba(201,162,39,0.4);">
        </div>
      </div>
      <div class="field-label" style="font-size:0.62rem;margin-bottom:0.5rem;color:var(--stone-light);">Alterações de Atributos:</div>
      ${attrRows}
    </div>
  `;
}

function updateEnc(encId, key, value) {
  const enc = getEditorEncounters().find(e => e.id === encId);
  if (!enc) return;
  enc[key] = value;
  if (key === 'title') {
    document.getElementById('enc-editing-label').textContent = '🎲 ' + (value || 'Sem título');
    renderEncList();
  }
}

function toggleEncTrigger(encId, nodeId, checked) {
  const enc = getEditorEncounters().find(e => e.id === encId);
  if (!enc) return;
  if (!enc.triggerNodes) enc.triggerNodes = [];
  if (checked) { if (!enc.triggerNodes.includes(nodeId)) enc.triggerNodes.push(nodeId); }
  else { enc.triggerNodes = enc.triggerNodes.filter(id => id !== nodeId); }
}

function changeEncAttr(encId, attrKey, delta) {
  const enc = getEditorEncounters().find(e => e.id === encId);
  if (!enc) return;
  if (!enc.attrDeltas) enc.attrDeltas = {};
  enc.attrDeltas[attrKey] = Math.max(-5, Math.min(5, (enc.attrDeltas[attrKey] || 0) + delta));
  renderEncEditor(encId);
}

function updateEncTagList(encId, field, value) {
  const enc = getEditorEncounters().find(e => e.id === encId);
  if (!enc) return;
  enc[field] = value.split(',').map(t => t.trim()).filter(Boolean);
}

// ═══════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════
loadSavedAdventures();
renderAdventureGrid();