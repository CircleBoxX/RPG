// ═══════════════════════════════════════════════════════════
//  UTILS — escHtml, genId, notify, showScreen, pixel art
// ═══════════════════════════════════════════════════════════

// ── OVERLAY MANAGER ──
// Prevents overlays (dialogue, combat, encounters, rolls) from overlapping
const OverlayManager = {
  queue: [],
  activeOverlay: null,
  
  enqueue: function(openFn) {
    this.queue.push(openFn);
    this.checkQueue();
  },
  
  checkQueue: function() {
    if (this.activeOverlay || this.queue.length === 0) return;
    const nextFn = this.queue.shift();
    nextFn();
  },
  
  setActive: function(overlayId) {
    this.activeOverlay = overlayId;
    const el = document.getElementById(overlayId);
    if (el) el.style.display = 'flex';
  },
  
  closeActive: function(overlayId) {
    if (this.activeOverlay === overlayId) {
      const el = document.getElementById(overlayId);
      if (el) el.style.display = 'none';
      this.activeOverlay = null;
      setTimeout(() => this.checkQueue(), 150);
    }
  },
  
  forceCloseAll: function() {
    const overlays = ['dialogue-overlay', 'combat-overlay', 'sq-result-overlay', 'encounter-overlay', 'roll-overlay', 'death-overlay'];
    overlays.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (id === 'death-overlay') el.remove();
        else el.style.display = 'none';
      }
    });
    this.activeOverlay = null;
    this.queue = [];
  }
};

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

