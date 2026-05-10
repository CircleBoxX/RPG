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
  vida: 6, vidaMax: 6,
  sanidade: 6, sanidadeMax: 6,
};
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
  if (id === 'screen-char') {
    document.getElementById('char-name').value = character.name || '';
    document.querySelectorAll('.class-btn').forEach(b => b.classList.remove('selected'));
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
  // Reset SQ completion flags
  if (currentAdventure.sidequests) {
    currentAdventure.sidequests.forEach(sq => { delete sq._completed; });
  }
  resetScore();
  renderCharHud();
  renderScene(currentNodeId);
}

// ── Text interpolation: {{nome}}, {{forca}}, {{destreza}}, etc.
function interpolateText(text) {
  if (!text) return text;
  const attrLabels = {
    forca: 'Força', destreza: 'Destreza', inteligencia: 'Inteligência',
    carisma: 'Carisma', sabedoria: 'Sabedoria', constituicao: 'Constituição'
  };
  return text
    .replace(/\{\{nome\}\}/gi, `<em>${character.name || 'Aventureiro'}</em>`)
    .replace(/\{\{(\w+)\}\}/gi, (_, key) => {
      const k = key.toLowerCase();
      if (character.attrs[k] !== undefined) {
        return `<em>${character.attrs[k]}</em>`;
      }
      if (attrLabels[k]) return `<em>${attrLabels[k]}</em>`;
      return `{{${key}}}`;
    });
}

function confirmCharAndStart() {
  const nameInput = document.getElementById('char-name').value.trim();
  character.name = nameInput || 'Aventureiro';
  // Calcular vida e sanidade com base nos atributos finais
  character.vidaMax    = calcMaxVida(character.attrs);
  character.vida       = character.vidaMax;
  character.sanidadeMax = calcMaxSanidade(character.attrs);
  character.sanidade   = character.sanidadeMax;
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
    `<div class="char-hud-attr" style="flex-direction:column;align-items:flex-start;gap:0;">` +
      `<div style="display:flex;align-items:center;gap:0.25rem;">` +
        `<span>❤️</span><span style="font-size:0.65rem;color:#e06060;">VID</span>` +
        `<span style="color:#ff8888;font-weight:700;">${character.vida}/${character.vidaMax}</span>` +
      `</div>${barStyle(vidaPct, '#cc4444')}` +
    `</div>` +
    `<div class="char-hud-attr" style="flex-direction:column;align-items:flex-start;gap:0;">` +
      `<div style="display:flex;align-items:center;gap:0.25rem;">` +
        `<span>🧠</span><span style="font-size:0.65rem;color:#9370db;">SAN</span>` +
        `<span style="color:#c8a8ff;font-weight:700;">${character.sanidade}/${character.sanidadeMax}</span>` +
      `</div>${barStyle(sanPct, '#9370db')}` +
    `</div>`;

  hud.innerHTML =
    `<span style="color:var(--gold-light);font-family:'Cinzel',serif;font-size:0.75rem;margin-right:0.3rem;">${character.name}</span>` +
    ATTRS.map(a => `<div class="char-hud-attr">${a.icon} <span>${a.name.substring(0,3).toUpperCase()}</span><span>${character.attrs[a.key]}</span></div>`).join('') +
    statusHtml;
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
        setTimeout(() => checkSidequestTrigger(nodeId), 600);
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
        const btn = document.createElement('button');
        btn.className = 'choice-btn';

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
          // Apply vida/sanidade changes from the choice itself (before roll)
          if (c.vida)     changeVida(c.vida);
          if (c.sanidade) changeSanidade(c.sanidade);
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

  const previewVida     = calcMaxVida(character.attrs);
  const previewSanidade = calcMaxSanidade(character.attrs);

  container.innerHTML = ATTRS.map(a => {
    const val = character.attrs[a.key];
    const fillPct = ((val - ATTR_MIN) / (ATTR_MAX - ATTR_MIN)) * 100;
    // Hint for constituicao and sabedoria showing derived stat
    let derivedHint = '';
    if (a.key === 'constituicao') derivedHint = `<span style="color:#ff8888;font-size:0.6rem;margin-left:0.5rem;">❤️ Vida máx: ${previewVida}</span>`;
    if (a.key === 'sabedoria')    derivedHint = `<span style="color:#c8a8ff;font-size:0.6rem;margin-left:0.5rem;">🧠 Sanidade máx: ${previewSanidade}</span>`;
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

function applyClass(cls) {
  document.querySelectorAll('.class-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('class-' + cls)?.classList.add('selected');
  const preset = CLASS_PRESETS[cls];
  if (!preset) return;
  character.attrs = { ...preset };
  renderAttrRows();
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

  // Find eligible sidequests: have this node as a trigger, not yet completed
  const eligible = sqs.filter(sq =>
    sq.triggerNodes && sq.triggerNodes.includes(nodeId) &&
    !sq._completed
  );
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
  // Reset character attrs to initial class preset if possible (or go to char screen)
  character.attrs = { forca:1, destreza:1, inteligencia:1, carisma:1, sabedoria:1, constituicao:1 };
  character.vidaMax = calcMaxVida(character.attrs);
  character.vida = character.vidaMax;
  character.sanidadeMax = calcMaxSanidade(character.attrs);
  character.sanidade = character.sanidadeMax;
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
    vida: 8,
    vidaMax: 8,
    attrs: { forca: 3, destreza: 2, constituicao: 2 },
    xpReward: 0,
    fleeAllowed: true,
    defeatNode: '',   // cena ao perder o combate
    victoryNode: '',  // cena ao vencer
    fleeNode: '',     // cena ao fugir (vazio = victoryNode)
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

  const cfg = node.combat;

  combatState = {
    round: 1,
    playerDefending: false,
    enemyVida: cfg.vidaMax || cfg.vida || 8,
    enemyVidaMax: cfg.vidaMax || cfg.vida || 8,
    cfg,
    sourceNodeId: nodeId,
    ended: false,
  };

  // Show overlay
  const overlay = document.getElementById('combat-overlay');
  overlay.style.display = 'flex';

  // Populate UI
  document.getElementById('combat-title').textContent = cfg.name || 'Combate';
  document.getElementById('cb-enemy-name').textContent = cfg.name || 'Inimigo';
  document.getElementById('cb-enemy-icon').textContent = cfg.icon || '👹';
  document.getElementById('cb-player-name').textContent = character.name || 'Herói';

  // Player attrs shown
  document.getElementById('cb-player-attrs').innerHTML =
    `<div class="combat-attr-chip">⚔️ ${character.attrs.forca}</div>` +
    `<div class="combat-attr-chip">🗡️ ${character.attrs.destreza}</div>` +
    `<div class="combat-attr-chip">🛡️ ${character.attrs.constituicao}</div>`;

  // Enemy attrs shown
  const ea = cfg.attrs || {};
  document.getElementById('cb-enemy-attrs').innerHTML =
    `<div class="combat-attr-chip">⚔️ ${ea.forca||1}</div>` +
    `<div class="combat-attr-chip">🗡️ ${ea.destreza||1}</div>` +
    `<div class="combat-attr-chip">🛡️ ${ea.constituicao||1}</div>`;

  // Attack hint (attribute used)
  document.getElementById('cb-attack-hint').textContent = 'Força vs Destreza';

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
  const vidaPct    = Math.max(0, Math.round((character.vida / character.vidaMax) * 100));
  const enemyPct   = Math.max(0, Math.round((combatState.enemyVida / combatState.enemyVidaMax) * 100));
  document.getElementById('cb-player-vida').textContent = `${character.vida}/${character.vidaMax}`;
  document.getElementById('cb-enemy-vida').textContent  = `${combatState.enemyVida}/${combatState.enemyVidaMax}`;
  document.getElementById('cb-player-vida-bar').style.width = vidaPct + '%';
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
    character.vida = Math.max(0, character.vida - dmg);
    renderCharHud();
    updateCombatBars();
    combatLog(`${cfg.name || 'Inimigo'} causa ${dmg} de dano. Sua vida: ${character.vida}/${character.vidaMax}`, 'enemy');

    if (character.vida <= 0) {
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

    // Player hit roll: player forca vs enemy destreza
    const pForca = character.attrs.forca || 1;
    const eDestreza = ea.destreza || 2;

    const { roll, chance, success } = await showCombatRoll(
      `Teste de Força (${pForca}) vs Destreza inimiga (${eDestreza})`,
      pForca, eDestreza + 1
    );

    const resultEl = document.getElementById('combat-roll-result');
    const isCrit = roll <= Math.floor(chance * 0.15) + 1;

    if (success) {
      const dmg = calcDamage(pForca, ea.destreza || 1, ea.constituicao || 1, false) + (isCrit ? 3 : 0);
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
  } else if (outcome === 'lose') {
    resultEl.className = 'combat-end-result lose';
    resultEl.textContent = '💀 DERROTA 💀';
    rewardsEl.textContent = cfg.defeatText || 'Você foi derrotado.';
    combatLog('✦ DERROTA. Você sucumbiu em combate.', 'result-lose');
    // Se a vida zerou, fechar o overlay de combate e acionar o sistema de morte
    // sem esperar o clique do botão (evita dois overlays empilhados)
    if (character.vida <= 0) {
      setTimeout(() => {
        document.getElementById('combat-overlay').style.display = 'none';
        combatState = null;
        triggerStatusDeath('vida');
      }, 1200);
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

  // Se vida zerou, aciona sistema de morte (overlay de combate já foi fechado acima)
  if (outcome === 'lose' && character.vida <= 0) {
    triggerStatusDeath('vida');
    return;
  }

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
        Vida: ${node.combat.vidaMax || node.combat.vida || 8} &nbsp;·&nbsp; Força: ${node.combat.attrs?.forca||1} &nbsp;·&nbsp; Destreza: ${node.combat.attrs?.destreza||1}
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
          <label class="field-label" style="font-size:0.6rem;">❤️ Vida máxima</label>
          <input class="field-input" type="number" min="1" max="999" value="${c.vidaMax||c.vida||8}" onchange="updateCombat('${nodeId}','vidaMax',+this.value);updateCombat('${nodeId}','vida',+this.value)">
        </div>
        <div class="field-group" style="margin:0;">
          <label class="field-label" style="font-size:0.6rem;">⭐ Recompensa (pontos)</label>
          <input class="field-input" type="number" min="0" max="9999" value="${c.xpReward||0}" onchange="updateCombat('${nodeId}','xpReward',+this.value)">
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
    </div>`;
}

// ═══════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════
loadSavedAdventures();
renderAdventureGrid();
