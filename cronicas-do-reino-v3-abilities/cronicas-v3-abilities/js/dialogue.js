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

  OverlayManager.enqueue(() => {
    dlgState = {
      lines: node.dialogues,
      idx: 0,
      typing: false,
      fullText: '',
      afterCallback,
    };
    OverlayManager.setActive('dialogue-overlay');
    _dlgShowLine(0);
  });
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
  OverlayManager.closeActive('dialogue-overlay');
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
