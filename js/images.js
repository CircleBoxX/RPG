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
