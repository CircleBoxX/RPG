// ═══════════════════════════════════════════════════════════
//  COMBAT EDITOR HELPERS
// ═══════════════════════════════════════════════════════════

// ─── Mini panel shown inside scene editor ───
// Only shows: has combat? + select which combat ID
function buildCombatRefHtml(nodeId, node) {
  const hasCombat = !!node.combatId;
  const combats = getCombatDefs();
  const combatIds = Object.keys(combats);

  const options = combatIds.map(cid => {
    const c = combats[cid];
    return `<option value="${cid}" ${node.combatId === cid ? 'selected' : ''}>${escHtml(c.name || cid)} (${cid})</option>`;
  }).join('');

  return `
    <div class="combat-editor-panel" style="border-color:rgba(204,68,68,0.3);">
      <div class="combat-editor-label" style="color:#e07070;">
        ⚔ Combate nesta Cena
        <label style="margin-left:auto;display:flex;align-items:center;gap:0.4rem;font-size:0.7rem;cursor:pointer;color:var(--parchment-dark);">
          <input type="checkbox" ${hasCombat ? 'checked' : ''} onchange="toggleNodeCombatRef('${nodeId}',this.checked)" style="accent-color:#cc4444;">
          Ativar combate
        </label>
      </div>
      ${hasCombat ? `
      <div class="field-group" style="margin:0;">
        <label class="field-label" style="font-size:0.6rem;">ID do Combate</label>
        ${combatIds.length ? `
        <select class="field-select" onchange="updateNodeCombatRef('${nodeId}',this.value)">
          <option value="">— Selecionar combate —</option>${options}
        </select>
        <div style="margin-top:0.4rem;display:flex;gap:0.5rem;align-items:center;">
          <span style="font-size:0.65rem;color:var(--stone);font-style:italic;">ID: <code style="color:var(--gold-light);">${escHtml(node.combatId || '—')}</code></span>
          <button class="btn-sm" style="font-size:0.6rem;border-color:#cc4444;color:#e07070;" onclick="openCombatEditor()">✎ Editar Combates</button>
        </div>` : `
        <div style="color:var(--stone);font-size:0.78rem;font-style:italic;padding:0.4rem 0;">
          Nenhum combate criado ainda.
          <button class="btn-sm" style="font-size:0.6rem;border-color:#cc4444;color:#e07070;margin-left:0.6rem;" onclick="openCombatEditor()">⚔ Criar Combate</button>
        </div>`}
      </div>` : `
      <div style="color:var(--stone);font-size:0.78rem;font-style:italic;padding:0.4rem 0;">Ative para vincular um combate a esta cena.</div>`}
    </div>`;
}

function toggleNodeCombatRef(nodeId, enabled) {
  const node = editorAdventure.nodes[nodeId];
  if (!node) return;
  if (enabled) {
    // Pick first available combat or leave empty
    const ids = Object.keys(getCombatDefs());
    node.combatId = ids[0] || '';
  } else {
    delete node.combatId;
  }
  renderNodeEditor(nodeId);
}

function updateNodeCombatRef(nodeId, combatId) {
  const node = editorAdventure.nodes[nodeId];
  if (!node) return;
  node.combatId = combatId;
}

// ─── Old inline toggleNodeCombat kept for data migration (converts node.combat → combatId) ───
function toggleNodeCombat(nodeId, enabled) {
  // legacy — redirect to new system
  toggleNodeCombatRef(nodeId, enabled);
}

function updateCombat(nodeId, key, value) {
  // legacy — operate on the combat def if node has combatId
  const node = editorAdventure.nodes[nodeId];
  if (!node?.combatId) return;
  const c = getCombatDefs()[node.combatId];
  if (c) c[key] = value;
}

function updateCombatAttr(nodeId, attrKey, value) {
  const node = editorAdventure.nodes[nodeId];
  if (!node?.combatId) return;
  const c = getCombatDefs()[node.combatId];
  if (!c) return;
  if (!c.attrs) c.attrs = {};
  c.attrs[attrKey] = Math.max(1, Math.min(20, value));
}

// ═══════════════════════════════════════════════════════════
//  COMBAT DEFINITIONS — stored in editorAdventure.combats
// ═══════════════════════════════════════════════════════════

function getCombatDefs() {
  if (!editorAdventure.combats) editorAdventure.combats = {};
  return editorAdventure.combats;
}

let selectedCombatId = null;

function openCombatEditor() {
  syncMetaToEditor();
  showScreen('screen-combat-editor');
  renderCombatDefList();
  if (selectedCombatId && getCombatDefs()[selectedCombatId]) {
    renderCombatDefEditor(selectedCombatId);
  }
}

function addCombatDef() {
  const id = 'combat_' + Date.now();
  const c = defaultEnemy();
  c.id = id;
  c.name = 'Novo Inimigo';
  getCombatDefs()[id] = c;
  selectedCombatId = id;
  renderCombatDefList();
  renderCombatDefEditor(id);
}

function deleteCombatDef() {
  if (!selectedCombatId) return;
  // Check if any node references this combat
  const refs = Object.entries(editorAdventure.nodes || {})
    .filter(([, n]) => n.combatId === selectedCombatId)
    .map(([, n]) => n.title || n.id);
  if (refs.length) {
    alert(`Este combate está vinculado às cenas: ${refs.join(', ')}.\nDesvincule antes de excluir.`);
    return;
  }
  delete getCombatDefs()[selectedCombatId];
  selectedCombatId = null;
  renderCombatDefList();
  document.getElementById('combat-def-editor').innerHTML =
    '<div style="color:var(--stone);font-style:italic;text-align:center;padding:2rem;">Selecione ou crie um combate.</div>';
  document.getElementById('combat-editing-label').textContent = 'Editar Combate';
}

function renderCombatDefList() {
  const list = document.getElementById('combat-def-list');
  if (!list) return;
  const combats = getCombatDefs();
  const ids = Object.keys(combats);
  if (!ids.length) {
    list.innerHTML = '<div style="color:var(--stone);font-style:italic;text-align:center;padding:1.5rem;font-size:0.85rem;">Nenhum combate criado ainda.</div>';
    return;
  }
  // Build usage map
  const usedBy = {};
  Object.entries(editorAdventure.nodes || {}).forEach(([, n]) => {
    if (n.combatId) usedBy[n.combatId] = (usedBy[n.combatId] || 0) + 1;
  });

  list.innerHTML = ids.map(cid => {
    const c = combats[cid];
    const uses = usedBy[cid] || 0;
    const sel = cid === selectedCombatId;
    return `<div class="enc-slot-item${sel ? ' selected' : ''}" onclick="selectCombatDef('${cid}')">
      <div class="enc-slot-title">${escHtml(c.icon || '👹')} ${escHtml(c.name || 'Inimigo')}</div>
      <div class="enc-slot-type" style="color:${uses ? '#7ecb8a' : 'var(--stone)'};">
        ID: <code style="font-family:monospace;font-size:0.65rem;">${escHtml(cid)}</code>
        &nbsp;·&nbsp; ${uses ? `${uses} cena(s)` : 'sem vínculo'}
      </div>
    </div>`;
  }).join('');
}

function selectCombatDef(cid) {
  selectedCombatId = cid;
  renderCombatDefList();
  renderCombatDefEditor(cid);
}

function renderCombatDefEditor(cid) {
  const c = getCombatDefs()[cid];
  if (!c) return;
  const label = document.getElementById('combat-editing-label');
  if (label) label.textContent = `Editando: ${c.name || cid}`;

  const allNodeIds = Object.keys(editorAdventure.nodes || {});
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
    { key: 'forca',        icon: '⚔️', name: 'Força'         },
    { key: 'destreza',     icon: '🗡️', name: 'Destreza'      },
    { key: 'constituicao', icon: '🛡️', name: 'Constituição'  },
    { key: 'inteligencia', icon: '📚', name: 'Inteligência'  },
    { key: 'sabedoria',    icon: '🏹', name: 'Sabedoria'     },
    { key: 'carisma',      icon: '🎶', name: 'Carisma'       },
  ];

  const editor = document.getElementById('combat-def-editor');
  if (!editor) return;

  editor.innerHTML = `
    <div style="margin-bottom:0.8rem;padding:0.5rem 0.7rem;background:rgba(204,68,68,0.06);border:1px solid rgba(204,68,68,0.2);display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap;">
      <span style="font-family:'Cinzel',serif;font-size:0.58rem;letter-spacing:0.18em;color:var(--stone);text-transform:uppercase;">ID do Combate:</span>
      <code style="font-family:monospace;font-size:0.8rem;color:var(--gold-light);letter-spacing:0.05em;">${escHtml(cid)}</code>
      <span style="font-size:0.62rem;color:var(--stone);font-style:italic;">— use este ID para vincular nas cenas</span>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;margin-bottom:0.6rem;">
      <div class="field-group" style="margin:0;">
        <label class="field-label" style="font-size:0.6rem;">Nome do Inimigo</label>
        <input class="field-input" value="${escHtml(c.name||'')}" oninput="updateCombatDef('${cid}','name',this.value);renderCombatDefList()" placeholder="Ex: Goblin Selvagem">
      </div>
      <div class="field-group" style="margin:0;">
        <label class="field-label" style="font-size:0.6rem;">Ícone (emoji)</label>
        <input class="field-input" value="${escHtml(c.icon||'👹')}" oninput="updateCombatDef('${cid}','icon',this.value)" placeholder="👹">
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;margin-bottom:0.6rem;">
      <div class="field-group" style="margin:0;">
        <label class="field-label" style="font-size:0.6rem;">❤️ Vida máxima (combate)</label>
        <input class="field-input" type="number" min="1" max="999" value="${c.vidaMax||c.vida||30}" onchange="updateCombatDef('${cid}','vidaMax',+this.value);updateCombatDef('${cid}','vida',+this.value)">
      </div>
      <div class="field-group" style="margin:0;">
        <label class="field-label" style="font-size:0.6rem;">⭐ Recompensa (pontos)</label>
        <input class="field-input" type="number" min="0" max="9999" value="${c.xpReward||0}" onchange="updateCombatDef('${cid}','xpReward',+this.value)">
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;margin-bottom:0.6rem;">
      <div class="field-group" style="margin:0;">
        <label class="field-label" style="font-size:0.6rem;">💔 Penalidade ao perder (vida da jornada)</label>
        <input class="field-input" type="number" min="0" max="99" value="${c.defeatPenalty ?? 1}" onchange="updateCombatDef('${cid}','defeatPenalty',+this.value)">
      </div>
      <div class="field-group" style="margin:0;display:flex;align-items:center;padding-top:1.1rem;">
        <span style="font-size:0.65rem;color:var(--stone);font-style:italic;">Derrota no combate não mata — reduz a vida da jornada.</span>
      </div>
    </div>

    <div style="margin-bottom:0.6rem;">
      <div style="margin-bottom:0.7rem;">
        <div class="field-label" style="font-size:0.62rem;margin-bottom:0.5rem;color:#e07070;">⚙️ Mecânicas de Combate</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.5rem;margin-bottom:0.6rem;">
          <div class="field-group" style="margin:0;">
            <label class="field-label" style="font-size:0.58rem;color:#e09050;">⚔️ Atrib. de Dano</label>
            <select class="field-select" style="font-size:0.68rem;" onchange="updateCombatDef('${cid}','attackAttr',this.value)">
              ${COMBAT_ATTRS.map(a => `<option value="${a.key}" ${(c.attackAttr||'forca')===a.key?'selected':''}>${a.icon} ${a.name}</option>`).join('')}
            </select>
            <div style="font-size:0.55rem;color:var(--stone);margin-top:0.2rem;">Escala dano do ataque</div>
          </div>
          <div class="field-group" style="margin:0;">
            <label class="field-label" style="font-size:0.58rem;color:#e0d050;">🎯 Atrib. de Precisão</label>
            <select class="field-select" style="font-size:0.68rem;" onchange="updateCombatDef('${cid}','precisionAttr',this.value)">
              ${COMBAT_ATTRS.map(a => `<option value="${a.key}" ${(c.precisionAttr||'destreza')===a.key?'selected':''}>${a.icon} ${a.name}</option>`).join('')}
            </select>
            <div style="font-size:0.55rem;color:var(--stone);margin-top:0.2rem;">Chance de acertar</div>
          </div>
          <div class="field-group" style="margin:0;">
            <label class="field-label" style="font-size:0.58rem;color:#80c0e0;">🛡️ Atrib. de Defesa</label>
            <select class="field-select" style="font-size:0.68rem;" onchange="updateCombatDef('${cid}','defenseAttr',this.value)">
              ${COMBAT_ATTRS.map(a => `<option value="${a.key}" ${(c.defenseAttr||'constituicao')===a.key?'selected':''}>${a.icon} ${a.name}</option>`).join('')}
            </select>
            <div style="font-size:0.55rem;color:var(--stone);margin-top:0.2rem;">Reduz dano recebido</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.6rem;">
          <div class="field-group" style="margin:0;">
            <label class="field-label" style="font-size:0.58rem;">🎲 Dado de Dano</label>
            <select class="field-select" style="font-size:0.68rem;" onchange="updateCombatDef('${cid}','damageDie',+this.value)">
              ${[4,6,8,10,12].map(d => `<option value="${d}" ${(c.damageDie||6)===d?'selected':''}>d${d}</option>`).join('')}
            </select>
          </div>
          <div class="field-group" style="margin:0;">
            <label class="field-label" style="font-size:0.58rem;">➕ Bônus de Dano Fixo</label>
            <input class="field-input" type="number" min="0" max="50" value="${c.damageBonus||0}"
              onchange="updateCombatDef('${cid}','damageBonus',+this.value)" style="font-size:0.75rem;">
          </div>
        </div>
        <div style="font-size:0.58rem;color:var(--stone);font-style:italic;padding:0.3rem 0.5rem;background:rgba(0,0,0,0.15);border-left:2px solid rgba(204,68,68,0.3);margin-bottom:0.6rem;">
          Dano: <code style="color:var(--gold-light);">[Atrib.Dano] + d[Dado] + [Bônus]</code> &nbsp;·&nbsp;
          Acerto: <code style="color:var(--gold-light);">[Atrib.Precisão] vs Destreza do jogador</code>
        </div>
      </div>

      <div class="field-label" style="font-size:0.6rem;margin-bottom:0.4rem;color:#e07070;">📊 Atributos do Inimigo <span style="font-weight:normal;color:var(--stone);">(1–20)</span></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.3rem;">
        ${COMBAT_ATTRS.map(a => {
          const isDmg  = (c.attackAttr  ||'forca')       === a.key;
          const isPrec = (c.precisionAttr||'destreza')   === a.key;
          const isDef  = (c.defenseAttr ||'constituicao') === a.key;
          const badge  = isDmg  ? '<span style="font-size:0.48rem;background:rgba(224,144,80,0.25);color:#e09050;padding:0.05rem 0.25rem;border-radius:2px;margin-left:0.2rem;">DMG</span>'
                       : isPrec ? '<span style="font-size:0.48rem;background:rgba(224,208,80,0.25);color:#e0d050;padding:0.05rem 0.25rem;border-radius:2px;margin-left:0.2rem;">HIT</span>'
                       : isDef  ? '<span style="font-size:0.48rem;background:rgba(128,192,224,0.25);color:#80c0e0;padding:0.05rem 0.25rem;border-radius:2px;margin-left:0.2rem;">DEF</span>' : '';
          return `
          <div class="combat-attr-editor-row" style="${isDmg||isPrec||isDef?'border-left:2px solid rgba(224,144,80,0.35);padding-left:0.4rem;':''}">
            <span>${a.icon}</span>
            <span style="font-family:'Cinzel',serif;font-size:0.65rem;color:var(--gold);">${a.name}${badge}</span>
            <input class="field-input" type="number" min="1" max="20" value="${(c.attrs||{})[a.key]||1}"
              onchange="updateCombatDefAttr('${cid}','${a.key}',+this.value)" style="padding:0.2rem 0.4rem;font-size:0.75rem;">
          </div>`;
        }).join('')}
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;margin-bottom:0.6rem;">
      <div class="field-group" style="margin:0;">
        <label class="field-label" style="font-size:0.6rem;color:#7ecb8a;">✦ Cena ao Vencer</label>
        <select class="field-select" onchange="updateCombatDef('${cid}','victoryNode',this.value)">
          <option value="">— Selecionar —</option>${nodeOptions}
        </select>
      </div>
      <div class="field-group" style="margin:0;">
        <label class="field-label" style="font-size:0.6rem;color:#e07070;">✗ Cena ao Perder</label>
        <select class="field-select" onchange="updateCombatDef('${cid}','defeatNode',this.value)">
          <option value="">— Selecionar —</option>${nodeOptionsDefeat}
        </select>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;margin-bottom:0.6rem;">
      <div class="field-group" style="margin:0;">
        <label class="field-label" style="font-size:0.6rem;color:var(--stone-light);">💨 Cena ao Fugir (vazio = mesma de vitória)</label>
        <select class="field-select" onchange="updateCombatDef('${cid}','fleeNode',this.value)">
          <option value="">— Mesma de vitória —</option>${nodeOptionsFlee}
        </select>
      </div>
      <div class="field-group" style="margin:0;display:flex;align-items:center;padding-top:1.2rem;">
        <label style="display:flex;align-items:center;gap:0.4rem;font-size:0.72rem;cursor:pointer;color:var(--parchment-dark);">
          <input type="checkbox" ${c.fleeAllowed===false?'':'checked'} onchange="updateCombatDef('${cid}','fleeAllowed',this.checked)" style="accent-color:#cc4444;">
          Permitir fuga
        </label>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.4rem;margin-bottom:0.8rem;">
      <div class="field-group" style="margin:0;">
        <label class="field-label" style="font-size:0.6rem;">Texto (vitória)</label>
        <input class="field-input" value="${escHtml(c.victoryText||'')}" onchange="updateCombatDef('${cid}','victoryText',this.value)" placeholder="Inimigo derrotado...">
      </div>
      <div class="field-group" style="margin:0;">
        <label class="field-label" style="font-size:0.6rem;">Texto (derrota)</label>
        <input class="field-input" value="${escHtml(c.defeatText||'')}" onchange="updateCombatDef('${cid}','defeatText',this.value)" placeholder="Você foi derrotado...">
      </div>
      <div class="field-group" style="margin:0;">
        <label class="field-label" style="font-size:0.6rem;">Texto (fuga)</label>
        <input class="field-input" value="${escHtml(c.fleeText||'')}" onchange="updateCombatDef('${cid}','fleeText',this.value)" placeholder="Você fugiu...">
      </div>
    </div>

    ${buildCombatDefAbilitiesHtml(cid, c)}
    ${buildCombatDefTagModifiersHtml(cid, c, allNodeIds)}
  `;
}

function updateCombatDef(cid, key, value) {
  const c = getCombatDefs()[cid];
  if (c) c[key] = value;
}

function updateCombatDefAttr(cid, attrKey, value) {
  const c = getCombatDefs()[cid];
  if (!c) return;
  if (!c.attrs) c.attrs = {};
  c.attrs[attrKey] = Math.max(1, Math.min(20, value));
}

// ── Abilities for combat defs (reuse helpers but keyed by cid) ──
function buildCombatDefAbilitiesHtml(cid, c) {
  const abilities = c.abilities || [];
  const abHtml = abilities.map((ab, ai) => buildCombatDefAbilityHtml(cid, ab, ai)).join('');
  return `
  <div style="border:1px solid rgba(204,68,68,0.25);padding:0.8rem 1rem;margin-bottom:0.6rem;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.6rem;">
      <div style="font-family:'Cinzel',serif;font-size:0.65rem;letter-spacing:0.14em;color:#e07070;text-transform:uppercase;">⚡ Habilidades do Inimigo</div>
      <button class="btn-sm" style="border-color:#cc4444;color:#e07070;font-size:0.6rem;" onclick="addCombatDefAbility('${cid}')">+ Habilidade</button>
    </div>
    <div style="font-size:0.65rem;color:var(--stone);font-style:italic;margin-bottom:0.6rem;">
      Habilidades são ações especiais que o inimigo pode usar durante o combate — falas, debuffs, buffs, dano direto, cura e mais.
    </div>
    <div id="combat-def-abilities-${cid}">
      ${abHtml || '<div style="color:var(--stone);font-size:0.72rem;font-style:italic;">Nenhuma habilidade. Clique em "+ Habilidade" para criar.</div>'}
    </div>
  </div>`;
}

function buildCombatDefAbilityHtml(cid, ab, ai) {
  const effects = ab.effects || [];
  const quotes  = ab.quotes || [''];
  const trigCond = ab.triggerCondition || 'any';

  const effectRows = effects.map((eff, ei) => buildCombatDefEffectRowHtml(cid, ai, ei, eff)).join('');

  const quotesHtml = quotes.map((q, qi) => `
    <div style="display:flex;gap:0.3rem;align-items:center;margin-bottom:0.25rem;">
      <input class="field-input" style="flex:1;font-size:0.72rem;font-style:italic;" placeholder='Ex: "Você não escapará de mim!"'
        value="${escHtml(q)}" oninput="updateCombatDefAbility('${cid}',${ai},this,'quotes',${qi})">
      ${quotes.length > 1 ? `<button class="btn-sm red" style="font-size:0.55rem;padding:0.1rem 0.3rem;" onclick="removeCombatDefAbilityQuote('${cid}',${ai},${qi})">✕</button>` : ''}
    </div>`).join('');

  const extraTrigger = trigCond === 'roundMin'
    ? `<div style="display:flex;align-items:center;gap:0.4rem;margin-top:0.25rem;">
        <span style="font-size:0.62rem;color:var(--stone-light);">Turno mínimo:</span>
        <input class="points-mini-input" type="number" min="1" max="99" value="${ab.triggerRoundMin||2}"
          onchange="updateCombatDefAbility('${cid}',${ai},this,'triggerRoundMin')">
       </div>`
    : (trigCond === 'lowHp' || trigCond === 'highHp')
    ? `<div style="display:flex;align-items:center;gap:0.4rem;margin-top:0.25rem;">
        <span style="font-size:0.62rem;color:var(--stone-light);">% de HP inimigo:</span>
        <input class="points-mini-input" type="number" min="1" max="99" value="${ab.triggerHpPct||40}"
          onchange="updateCombatDefAbility('${cid}',${ai},this,'triggerHpPct')">
       </div>`
    : trigCond === 'playerLowHp'
    ? `<div style="display:flex;align-items:center;gap:0.4rem;margin-top:0.25rem;">
        <span style="font-size:0.62rem;color:var(--stone-light);">% de HP jogador:</span>
        <input class="points-mini-input" type="number" min="1" max="99" value="${ab.triggerPlayerHpPct||40}"
          onchange="updateCombatDefAbility('${cid}',${ai},this,'triggerPlayerHpPct')">
       </div>`
    : trigCond === 'everyN'
    ? `<div style="display:flex;align-items:center;gap:0.4rem;margin-top:0.25rem;">
        <span style="font-size:0.62rem;color:var(--stone-light);">A cada N turnos:</span>
        <input class="points-mini-input" type="number" min="2" max="20" value="${ab.triggerEveryN||3}"
          onchange="updateCombatDefAbility('${cid}',${ai},this,'triggerEveryN')">
       </div>`
    : '';

  return `
  <div style="border:1px solid rgba(204,68,68,0.2);background:rgba(60,10,10,0.18);padding:0.7rem 0.8rem;margin-bottom:0.6rem;position:relative;">
    <button style="position:absolute;top:0.35rem;right:0.4rem;background:none;border:none;color:var(--blood);cursor:pointer;font-size:0.95rem;" onclick="removeCombatDefAbility('${cid}',${ai})">✕</button>
    <div style="display:grid;grid-template-columns:2.5rem 1fr;gap:0.4rem;margin-bottom:0.5rem;">
      <input class="field-input" style="text-align:center;font-size:1.3rem;padding:0.2rem;" placeholder="💥"
        value="${escHtml(ab.icon||'💥')}" oninput="updateCombatDefAbility('${cid}',${ai},this,'icon')">
      <input class="field-input" style="font-family:'Cinzel',serif;font-size:0.8rem;" placeholder="Nome da Habilidade"
        value="${escHtml(ab.name||'')}" oninput="updateCombatDefAbility('${cid}',${ai},this,'name')">
    </div>
    <div style="margin-bottom:0.5rem;">
      <div style="font-size:0.6rem;color:#e0a060;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:0.3rem;">💬 Falas ao usar (uma será sorteada)</div>
      ${quotesHtml}
      <button class="btn-sm" style="font-size:0.55rem;margin-top:0.2rem;border-color:rgba(224,160,96,0.4);color:#e0a060;" onclick="addCombatDefAbilityQuote('${cid}',${ai})">+ Fala</button>
    </div>
    <div style="margin-bottom:0.5rem;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.3rem;">
        <div style="font-size:0.6rem;color:#e07070;letter-spacing:0.08em;text-transform:uppercase;">⚡ Efeitos</div>
        <button class="btn-sm" style="font-size:0.55rem;border-color:rgba(204,68,68,0.4);color:#e07070;" onclick="addCombatDefEffect('${cid}',${ai})">+ Efeito</button>
      </div>
      <div id="cdef-effects-${cid}-${ai}">
        ${effectRows || '<div style="font-size:0.65rem;color:var(--stone);font-style:italic;">Nenhum efeito adicionado.</div>'}
      </div>
    </div>
    <div style="border-top:1px dashed rgba(204,68,68,0.15);padding-top:0.5rem;margin-bottom:0.4rem;">
      <div style="font-size:0.6rem;color:var(--stone-light);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:0.3rem;">🎯 Condição de Uso</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.4rem;">
        <div>
          <label class="field-label" style="font-size:0.58rem;">Quando usar</label>
          <select class="field-select" style="font-size:0.7rem;" onchange="updateCombatDefAbility('${cid}',${ai},this,'triggerCondition');renderCombatDefEditor('${cid}')">
            ${ABILITY_TRIGGER_CONDITIONS.map(t => `<option value="${t.key}" ${trigCond===t.key?'selected':''}>${t.label}</option>`).join('')}
          </select>
          ${extraTrigger}
        </div>
        <div>
          <label class="field-label" style="font-size:0.58rem;">Chance por turno (%)</label>
          <input class="field-input" type="number" min="1" max="100" value="${ab.usageChance||50}"
            onchange="updateCombatDefAbility('${cid}',${ai},this,'usageChance')">
        </div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.4rem;">
      <div>
        <label class="field-label" style="font-size:0.58rem;">⏳ Cooldown (turnos após usar)</label>
        <input class="field-input" type="number" min="0" max="20" value="${ab.cooldown??2}"
          onchange="updateCombatDefAbility('${cid}',${ai},this,'cooldown')">
      </div>
      <div>
        <label class="field-label" style="font-size:0.58rem;">🔢 Máx. de usos (0 = ilimitado)</label>
        <input class="field-input" type="number" min="0" max="20" value="${ab.maxUses||0}"
          onchange="updateCombatDefAbility('${cid}',${ai},this,'maxUses')">
      </div>
    </div>
  </div>`;
}

function buildCombatDefEffectRowHtml(cid, ai, ei, eff) {
  const typeDef = ABILITY_EFFECT_TYPES.find(t => t.key === eff.type) || ABILITY_EFFECT_TYPES[0];
  const attrSelect = typeDef.hasAttr ? `
    <select class="field-select" style="font-size:0.62rem;padding:0.15rem 0.3rem;"
      onchange="updateCombatDefEffect('${cid}',${ai},${ei},'attr',this.value)">
      ${ABILITY_ATTRS.map(a => `<option value="${a.key}" ${eff.attr===a.key?'selected':''}>${a.label}</option>`).join('')}
    </select>` : '';
  const durInput = typeDef.hasDuration ? `
    <div style="display:flex;align-items:center;gap:0.25rem;">
      <span style="font-size:0.58rem;color:var(--stone-light);">dur:</span>
      <input class="points-mini-input" type="number" min="0" max="20" value="${eff.duration??2}"
        onchange="updateCombatDefEffect('${cid}',${ai},${ei},'duration',+this.value)">
    </div>` : '';
  return `
  <div style="display:flex;align-items:center;gap:0.3rem;flex-wrap:wrap;background:rgba(0,0,0,0.2);padding:0.3rem 0.4rem;margin-bottom:0.25rem;">
    <select class="field-select" style="font-size:0.62rem;padding:0.15rem 0.3rem;flex:1;min-width:160px;"
      onchange="updateCombatDefEffect('${cid}',${ai},${ei},'type',this.value);renderCombatDefEditor('${cid}')">
      ${ABILITY_EFFECT_TYPES.map(t => `<option value="${t.key}" ${eff.type===t.key?'selected':''}>${t.label}</option>`).join('')}
    </select>
    ${attrSelect}
    <div style="display:flex;align-items:center;gap:0.25rem;">
      <span style="font-size:0.58rem;color:var(--stone-light);">valor:</span>
      <input class="points-mini-input" type="number" min="1" max="99" value="${eff.value||1}"
        onchange="updateCombatDefEffect('${cid}',${ai},${ei},'value',+this.value)">
    </div>
    ${durInput}
    <button class="btn-sm red" style="font-size:0.5rem;padding:0.1rem 0.25rem;" onclick="removeCombatDefEffect('${cid}',${ai},${ei})">✕</button>
  </div>`;
}

function buildCombatDefTagModifiersHtml(cid, c, allNodeIds) {
  const mods = c.tagModifiers || [];
  const modsHtml = mods.map((mod, mi) => `
    <div style="background:rgba(100,60,160,0.08);border:1px solid rgba(180,120,220,0.18);padding:0.5rem 0.7rem;margin-bottom:0.4rem;display:flex;flex-wrap:wrap;gap:0.4rem;align-items:center;">
      <span style="font-size:0.6rem;color:var(--stone-light);">Tag:</span>
      <input class="field-input" style="width:100px;font-size:0.7rem;" value="${escHtml(mod.tag||'')}"
        oninput="updateCombatDefTagMod('${cid}',${mi},'tag',this.value)" placeholder="NomeTag">
      ${Object.entries({forca:'⚔️ F',destreza:'🗡️ D',constituicao:'🛡️ C',inteligencia:'📚 I',sabedoria:'🏹 S',carisma:'🎶 K'}).map(([k,lbl]) => `
        <div style="display:flex;align-items:center;gap:0.2rem;">
          <span style="font-size:0.6rem;color:var(--stone-light);">${lbl}:</span>
          <input class="points-mini-input" type="number" min="-10" max="10" value="${mod.attrDeltas?.[k]||0}"
            onchange="updateCombatDefTagModAttr('${cid}',${mi},'${k}',+this.value)">
        </div>`).join('')}
      <label style="display:flex;align-items:center;gap:0.2rem;font-size:0.62rem;color:var(--stone-light);">
        <input type="checkbox" ${mod.invert?'checked':''} onchange="updateCombatDefTagMod('${cid}',${mi},'invert',this.checked)"> ausente
      </label>
      <button class="btn-sm red" style="font-size:0.55rem;padding:0.1rem 0.3rem;margin-left:auto;" onclick="removeCombatDefTagMod('${cid}',${mi})">✕</button>
    </div>`).join('');

  return `
  <div style="border:1px solid rgba(180,120,220,0.2);padding:0.8rem 1rem;margin-bottom:0.6rem;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.5rem;">
      <div style="font-family:'Cinzel',serif;font-size:0.6rem;letter-spacing:0.12em;color:#b080e0;text-transform:uppercase;">🏷 Modificadores de Tag no Combate</div>
      <button class="btn-sm" style="font-size:0.6rem;" onclick="addCombatDefTagMod('${cid}')">+ Modificador de Tag</button>
    </div>
    <div id="cdef-tagmods-${cid}">${modsHtml || '<div style="color:var(--stone);font-size:0.72rem;font-style:italic;">Nenhum modificador.</div>'}</div>
    <div style="margin-top:0.5rem;display:grid;grid-template-columns:1fr 1fr;gap:0.4rem;">
      <div class="field-group" style="margin:0;">
        <label class="field-label" style="font-size:0.58rem;">Tags ao Vencer (vírgulas)</label>
        <input class="field-input" style="font-size:0.7rem;"
          value="${escHtml((c.victoryTagEffects||[]).map(e=>e.tag).join(', '))}"
          onchange="updateCombatDefTagList('${cid}','victoryTagEffects',this.value)">
      </div>
      <div class="field-group" style="margin:0;">
        <label class="field-label" style="font-size:0.58rem;">Tags ao Perder (vírgulas)</label>
        <input class="field-input" style="font-size:0.7rem;"
          value="${escHtml((c.defeatTagEffects||[]).map(e=>e.tag).join(', '))}"
          onchange="updateCombatDefTagList('${cid}','defeatTagEffects',this.value)">
      </div>
    </div>
  </div>`;
}

// ── Combat def CRUD ──
function getCombatDefAbility(cid, ai) {
  return getCombatDefs()[cid]?.abilities?.[ai];
}

function addCombatDefAbility(cid) {
  const c = getCombatDefs()[cid];
  if (!c) return;
  if (!c.abilities) c.abilities = [];
  const ab = defaultAbility();
  ab.id = 'ab_' + Date.now();
  c.abilities.push(ab);
  renderCombatDefEditor(cid);
}

function removeCombatDefAbility(cid, ai) {
  const c = getCombatDefs()[cid];
  if (!c?.abilities) return;
  c.abilities.splice(ai, 1);
  renderCombatDefEditor(cid);
}

function updateCombatDefAbility(cid, ai, el, key, subKey) {
  const ab = getCombatDefAbility(cid, ai);
  if (!ab) return;
  if (key === 'quotes' && subKey !== undefined) {
    if (!ab.quotes) ab.quotes = [''];
    ab.quotes[subKey] = el.value;
  } else {
    const val = el.type === 'checkbox' ? el.checked : (el.type === 'number' ? +el.value : el.value);
    ab[key] = val;
  }
}

function addCombatDefAbilityQuote(cid, ai) {
  const ab = getCombatDefAbility(cid, ai);
  if (!ab) return;
  if (!ab.quotes) ab.quotes = [''];
  ab.quotes.push('');
  renderCombatDefEditor(cid);
}

function removeCombatDefAbilityQuote(cid, ai, qi) {
  const ab = getCombatDefAbility(cid, ai);
  if (!ab?.quotes) return;
  ab.quotes.splice(qi, 1);
  if (!ab.quotes.length) ab.quotes = [''];
  renderCombatDefEditor(cid);
}

function addCombatDefEffect(cid, ai) {
  const ab = getCombatDefAbility(cid, ai);
  if (!ab) return;
  if (!ab.effects) ab.effects = [];
  ab.effects.push(defaultAbilityEffect());
  renderCombatDefEditor(cid);
}

function removeCombatDefEffect(cid, ai, ei) {
  const ab = getCombatDefAbility(cid, ai);
  if (!ab?.effects) return;
  ab.effects.splice(ei, 1);
  renderCombatDefEditor(cid);
}

function updateCombatDefEffect(cid, ai, ei, key, value) {
  const ab = getCombatDefAbility(cid, ai);
  if (!ab?.effects?.[ei]) return;
  ab.effects[ei][key] = value;
}

function addCombatDefTagMod(cid) {
  const c = getCombatDefs()[cid];
  if (!c) return;
  if (!c.tagModifiers) c.tagModifiers = [];
  c.tagModifiers.push({ tag:'', invert:false, attrDeltas:{}, vidaDelta:0, skipToVictory:false });
  renderCombatDefEditor(cid);
}

function removeCombatDefTagMod(cid, mi) {
  const c = getCombatDefs()[cid];
  if (!c?.tagModifiers) return;
  c.tagModifiers.splice(mi, 1);
  renderCombatDefEditor(cid);
}

function updateCombatDefTagMod(cid, mi, key, value) {
  const c = getCombatDefs()[cid];
  if (!c?.tagModifiers?.[mi]) return;
  c.tagModifiers[mi][key] = value;
}

function updateCombatDefTagModAttr(cid, mi, attrKey, value) {
  const c = getCombatDefs()[cid];
  if (!c?.tagModifiers?.[mi]) return;
  if (!c.tagModifiers[mi].attrDeltas) c.tagModifiers[mi].attrDeltas = {};
  c.tagModifiers[mi].attrDeltas[attrKey] = value;
}

function updateCombatDefTagList(cid, field, value) {
  const c = getCombatDefs()[cid];
  if (!c) return;
  const tags = value.split(',').map(t => t.trim()).filter(Boolean);
  c[field] = tags.map(tag => ({ tag, value: true }));
}

// ═══════════════════════════════════════════════════════════
//  COMBAT EDITOR HELPERS (legacy — kept for old node.combat data)
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  COMBAT ABILITIES EDITOR
// ═══════════════════════════════════════════════════════════

const ABILITY_EFFECT_TYPES = [
  // ── Dano / Cura ──
  { key: 'damage_player',      label: '💥 Dano Direto no Jogador',                   hasAttr: false, hasDuration: false },
  { key: 'damage_attr_scaled', label: '🔮 Dano Escalado por Atributo do Inimigo',    hasAttr: true,  hasDuration: false },
  { key: 'heal_self',          label: '💚 Cura no Inimigo',                          hasAttr: false, hasDuration: false },
  { key: 'life_steal',         label: '🩸 Roubo de Vida (dano → cura no inimigo)',   hasAttr: false, hasDuration: false },
  { key: 'drain_sanidade',     label: '🌀 Drenar Sanidade do Jogador',               hasAttr: false, hasDuration: false },
  { key: 'drain_vida_jornada', label: '💔 Drenar Vida da Jornada',                   hasAttr: false, hasDuration: false },
  // ── Atributos ──
  { key: 'debuff_player',      label: '⬇ Debuff no Jogador (atributo)',              hasAttr: true,  hasDuration: true  },
  { key: 'buff_self',          label: '⬆ Buff no Inimigo (atributo)',                hasAttr: true,  hasDuration: true  },
  { key: 'buff_player',        label: '⬆ Buff no Jogador (atributo)',                hasAttr: true,  hasDuration: true  },
  // ── Status negativos no jogador ──
  { key: 'poison',             label: '☠ Envenenar (dano por turno)',                hasAttr: false, hasDuration: true  },
  { key: 'bleed',              label: '🩸 Sangramento (dano acumulável)',             hasAttr: false, hasDuration: true  },
  { key: 'stun',               label: '💫 Atordoar (perde turnos)',                  hasAttr: false, hasDuration: true  },
  { key: 'blind',              label: '👁 Cegar (reduz acerto do jogador %)',        hasAttr: false, hasDuration: true  },
  { key: 'curse',              label: '💀 Amaldiçoar (dobra dano do inimigo)',       hasAttr: false, hasDuration: true  },
  { key: 'fear',               label: '😨 Medo (impede ataque por N turnos)',        hasAttr: false, hasDuration: true  },
  { key: 'silence',            label: '🔇 Silêncio (impede habilidades por N turnos)', hasAttr: false, hasDuration: true },
  { key: 'weaken',             label: '💢 Enfraquecer (reduz dano do jogador %)',    hasAttr: false, hasDuration: true  },
  // ── Buffs no inimigo ──
  { key: 'regen_self',         label: '💚 Regeneração (cura por turno)',              hasAttr: false, hasDuration: true  },
  { key: 'shield_self',        label: '🛡 Barreira (absorve X dano)',                 hasAttr: false, hasDuration: false },
  { key: 'counter',            label: '⚡ Contra-ataque (riposte no próx. ataque)',   hasAttr: false, hasDuration: true  },
  { key: 'dispel',             label: '✨ Dissipar (remove buffs/escudo do inimigo)', hasAttr: false, hasDuration: false },
];

const ABILITY_ATTRS = [
  { key:'forca',       label:'⚔️ Força'        },
  { key:'destreza',    label:'🗡️ Destreza'     },
  { key:'inteligencia',label:'📚 Inteligência' },
  { key:'carisma',     label:'🎶 Carisma'      },
  { key:'sabedoria',   label:'🏹 Sabedoria'    },
  { key:'constituicao',label:'🛡️ Constituição' },
];

const ABILITY_TRIGGER_CONDITIONS = [
  { key: 'any',         label: 'Qualquer turno'              },
  { key: 'roundMin',    label: 'A partir do turno X'         },
  { key: 'lowHp',       label: 'HP baixo (abaixo de %)'      },
  { key: 'highHp',      label: 'HP alto (acima de %)'        },
  { key: 'playerLowHp', label: 'Jogador com HP baixo (%)'    },
  { key: 'firstRound',  label: 'Apenas no 1º turno'          },
  { key: 'everyN',      label: 'A cada N turnos'             },
];

function buildAbilitiesEditorHtml(nodeId, c) {
  const abilities = c.abilities || [];

  const abHtml = abilities.map((ab, ai) => buildAbilityHtml(nodeId, ab, ai)).join('');

  return `
  <div style="border:1px solid rgba(204,68,68,0.25);padding:0.8rem 1rem;margin-top:0.8rem;margin-bottom:0.6rem;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.6rem;">
      <div style="font-family:'Cinzel',serif;font-size:0.65rem;letter-spacing:0.14em;color:#e07070;text-transform:uppercase;">
        ⚡ Habilidades do Inimigo
      </div>
      <button class="btn-sm" style="border-color:#cc4444;color:#e07070;font-size:0.6rem;" onclick="addCombatAbility('${nodeId}')">+ Habilidade</button>
    </div>
    <div style="font-size:0.65rem;color:var(--stone);font-style:italic;margin-bottom:0.6rem;">
      Habilidades são ações especiais que o inimigo pode usar durante o combate — com falas, debuffs, buffs, dano direto, cura e mais.
    </div>
    <div id="abilities-list-${nodeId}">
      ${abHtml || '<div style="color:var(--stone);font-size:0.72rem;font-style:italic;">Nenhuma habilidade. Clique em "+ Habilidade" para criar.</div>'}
    </div>
  </div>`;
}

function buildAbilityHtml(nodeId, ab, ai) {
  const effects = ab.effects || [];
  const quotes  = ab.quotes || [''];

  const effectRows = effects.map((eff, ei) => buildEffectRowHtml(nodeId, ai, ei, eff)).join('');

  const quotesHtml = quotes.map((q, qi) => `
    <div style="display:flex;gap:0.3rem;align-items:center;margin-bottom:0.25rem;">
      <input class="field-input" style="flex:1;font-size:0.72rem;font-style:italic;" placeholder='Ex: "Você não escapará de mim!"'
        value="${escHtml(q)}" oninput="updateAbilityQuote('${nodeId}',${ai},${qi},this.value)">
      ${quotes.length > 1 ? `<button class="btn-sm red" style="font-size:0.55rem;padding:0.1rem 0.3rem;" onclick="removeAbilityQuote('${nodeId}',${ai},${qi})">✕</button>` : ''}
    </div>`).join('');

  const trigCond = ab.triggerCondition || 'any';
  const extraTrigger = trigCond === 'roundMin'
    ? `<div style="display:flex;align-items:center;gap:0.4rem;margin-top:0.25rem;">
        <span style="font-size:0.62rem;color:var(--stone-light);">Turno mínimo:</span>
        <input class="points-mini-input" type="number" min="1" max="99" value="${ab.triggerRoundMin||2}"
          onchange="updateAbility('${nodeId}',${ai},'triggerRoundMin',+this.value)">
       </div>`
    : (trigCond === 'lowHp' || trigCond === 'highHp')
    ? `<div style="display:flex;align-items:center;gap:0.4rem;margin-top:0.25rem;">
        <span style="font-size:0.62rem;color:var(--stone-light);">% de HP inimigo:</span>
        <input class="points-mini-input" type="number" min="1" max="99" value="${ab.triggerHpPct||40}"
          onchange="updateAbility('${nodeId}',${ai},'triggerHpPct',+this.value)">
       </div>`
    : trigCond === 'playerLowHp'
    ? `<div style="display:flex;align-items:center;gap:0.4rem;margin-top:0.25rem;">
        <span style="font-size:0.62rem;color:var(--stone-light);">% de HP jogador:</span>
        <input class="points-mini-input" type="number" min="1" max="99" value="${ab.triggerPlayerHpPct||40}"
          onchange="updateAbility('${nodeId}',${ai},'triggerPlayerHpPct',+this.value)">
       </div>`
    : trigCond === 'everyN'
    ? `<div style="display:flex;align-items:center;gap:0.4rem;margin-top:0.25rem;">
        <span style="font-size:0.62rem;color:var(--stone-light);">A cada N turnos:</span>
        <input class="points-mini-input" type="number" min="2" max="20" value="${ab.triggerEveryN||3}"
          onchange="updateAbility('${nodeId}',${ai},'triggerEveryN',+this.value)">
       </div>`
    : '';

  return `
  <div style="border:1px solid rgba(204,68,68,0.2);background:rgba(60,10,10,0.18);padding:0.7rem 0.8rem;margin-bottom:0.6rem;position:relative;">
    <button style="position:absolute;top:0.35rem;right:0.4rem;background:none;border:none;color:var(--blood);cursor:pointer;font-size:0.95rem;" onclick="removeCombatAbility('${nodeId}',${ai})">✕</button>

    <!-- Name & Icon -->
    <div style="display:grid;grid-template-columns:2.5rem 1fr;gap:0.4rem;margin-bottom:0.5rem;">
      <input class="field-input" style="text-align:center;font-size:1.3rem;padding:0.2rem;" placeholder="💥"
        value="${escHtml(ab.icon||'💥')}" oninput="updateAbility('${nodeId}',${ai},'icon',this.value)">
      <input class="field-input" style="font-family:'Cinzel',serif;font-size:0.8rem;" placeholder="Nome da Habilidade"
        value="${escHtml(ab.name||'')}" oninput="updateAbility('${nodeId}',${ai},'name',this.value)">
    </div>

    <!-- Quotes -->
    <div style="margin-bottom:0.5rem;">
      <div style="font-size:0.6rem;color:#e0a060;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:0.3rem;">
        💬 Falas ao usar (uma será sorteada)
      </div>
      ${quotesHtml}
      <button class="btn-sm" style="font-size:0.55rem;margin-top:0.2rem;border-color:rgba(224,160,96,0.4);color:#e0a060;" onclick="addAbilityQuote('${nodeId}',${ai})">+ Fala</button>
    </div>

    <!-- Effects -->
    <div style="margin-bottom:0.5rem;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.3rem;">
        <div style="font-size:0.6rem;color:#e07070;letter-spacing:0.08em;text-transform:uppercase;">⚡ Efeitos</div>
        <button class="btn-sm" style="font-size:0.55rem;border-color:rgba(204,68,68,0.4);color:#e07070;" onclick="addAbilityEffect('${nodeId}',${ai})">+ Efeito</button>
      </div>
      <div id="effects-list-${nodeId}-${ai}">
        ${effectRows || '<div style="font-size:0.65rem;color:var(--stone);font-style:italic;">Nenhum efeito adicionado.</div>'}
      </div>
    </div>

    <!-- Trigger conditions -->
    <div style="border-top:1px dashed rgba(204,68,68,0.15);padding-top:0.5rem;margin-bottom:0.4rem;">
      <div style="font-size:0.6rem;color:var(--stone-light);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:0.3rem;">🎯 Condição de Uso</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.4rem;">
        <div>
          <label class="field-label" style="font-size:0.58rem;">Quando usar</label>
          <select class="field-select" style="font-size:0.7rem;" onchange="updateAbility('${nodeId}',${ai},'triggerCondition',this.value);renderNodeEditor('${nodeId}')">
            ${ABILITY_TRIGGER_CONDITIONS.map(t => `<option value="${t.key}" ${trigCond===t.key?'selected':''}>${t.label}</option>`).join('')}
          </select>
          ${extraTrigger}
        </div>
        <div>
          <label class="field-label" style="font-size:0.58rem;">Chance por turno (%)</label>
          <input class="field-input" type="number" min="1" max="100" value="${ab.usageChance||50}"
            onchange="updateAbility('${nodeId}',${ai},'usageChance',+this.value)">
        </div>
      </div>
    </div>

    <!-- Cooldown & uses -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.4rem;">
      <div>
        <label class="field-label" style="font-size:0.58rem;">⏳ Cooldown (turnos após usar)</label>
        <input class="field-input" type="number" min="0" max="20" value="${ab.cooldown??2}"
          onchange="updateAbility('${nodeId}',${ai},'cooldown',+this.value)">
      </div>
      <div>
        <label class="field-label" style="font-size:0.58rem;">🔢 Máx. de usos (0 = ilimitado)</label>
        <input class="field-input" type="number" min="0" max="20" value="${ab.maxUses||0}"
          onchange="updateAbility('${nodeId}',${ai},'maxUses',+this.value)">
      </div>
    </div>
  </div>`;
}

function buildEffectRowHtml(nodeId, ai, ei, eff) {
  const typeDef = ABILITY_EFFECT_TYPES.find(t => t.key === eff.type) || ABILITY_EFFECT_TYPES[0];

  const attrSelect = typeDef.hasAttr ? `
    <select class="field-select" style="font-size:0.62rem;padding:0.15rem 0.3rem;"
      onchange="updateAbilityEffect('${nodeId}',${ai},${ei},'attr',this.value)">
      ${ABILITY_ATTRS.map(a => `<option value="${a.key}" ${eff.attr===a.key?'selected':''}>${a.label}</option>`).join('')}
    </select>` : '';

  const durInput = typeDef.hasDuration ? `
    <div style="display:flex;align-items:center;gap:0.25rem;">
      <span style="font-size:0.58rem;color:var(--stone-light);">dur:</span>
      <input class="points-mini-input" type="number" min="0" max="20" value="${eff.duration??2}" title="Duração em turnos. 0 = até fim do combate."
        onchange="updateAbilityEffect('${nodeId}',${ai},${ei},'duration',+this.value)">
    </div>` : '';

  return `
  <div style="display:flex;align-items:center;gap:0.3rem;flex-wrap:wrap;background:rgba(0,0,0,0.2);padding:0.3rem 0.4rem;margin-bottom:0.25rem;">
    <select class="field-select" style="font-size:0.62rem;padding:0.15rem 0.3rem;flex:1;min-width:160px;"
      onchange="updateAbilityEffect('${nodeId}',${ai},${ei},'type',this.value);renderNodeEditor('${nodeId}')">
      ${ABILITY_EFFECT_TYPES.map(t => `<option value="${t.key}" ${eff.type===t.key?'selected':''}>${t.label}</option>`).join('')}
    </select>
    ${attrSelect}
    <div style="display:flex;align-items:center;gap:0.25rem;">
      <span style="font-size:0.58rem;color:var(--stone-light);">valor:</span>
      <input class="points-mini-input" type="number" min="1" max="99" value="${eff.value||1}"
        onchange="updateAbilityEffect('${nodeId}',${ai},${ei},'value',+this.value)">
    </div>
    ${durInput}
    <button class="btn-sm red" style="font-size:0.5rem;padding:0.1rem 0.25rem;" onclick="removeAbilityEffect('${nodeId}',${ai},${ei})">✕</button>
  </div>`;
}

// ── Ability CRUD helpers ──
function getNodeCombat(nodeId) {
  return editorAdventure.nodes[nodeId]?.combat;
}

function addCombatAbility(nodeId) {
  const c = getNodeCombat(nodeId);
  if (!c) return;
  if (!c.abilities) c.abilities = [];
  const ab = defaultAbility();
  ab.id = 'ab_' + Date.now() + '_' + c.abilities.length;
  c.abilities.push(ab);
  renderNodeEditor(nodeId);
}

function removeCombatAbility(nodeId, ai) {
  const c = getNodeCombat(nodeId);
  if (!c?.abilities) return;
  c.abilities.splice(ai, 1);
  renderNodeEditor(nodeId);
}

function updateAbility(nodeId, ai, key, value) {
  const c = getNodeCombat(nodeId);
  if (!c?.abilities?.[ai]) return;
  c.abilities[ai][key] = value;
}

function addAbilityQuote(nodeId, ai) {
  const c = getNodeCombat(nodeId);
  if (!c?.abilities?.[ai]) return;
  if (!c.abilities[ai].quotes) c.abilities[ai].quotes = [];
  c.abilities[ai].quotes.push('');
  renderNodeEditor(nodeId);
}

function removeAbilityQuote(nodeId, ai, qi) {
  const c = getNodeCombat(nodeId);
  if (!c?.abilities?.[ai]?.quotes) return;
  c.abilities[ai].quotes.splice(qi, 1);
  if (!c.abilities[ai].quotes.length) c.abilities[ai].quotes = [''];
  renderNodeEditor(nodeId);
}

function updateAbilityQuote(nodeId, ai, qi, value) {
  const c = getNodeCombat(nodeId);
  if (!c?.abilities?.[ai]) return;
  if (!c.abilities[ai].quotes) c.abilities[ai].quotes = [''];
  c.abilities[ai].quotes[qi] = value;
}

function addAbilityEffect(nodeId, ai) {
  const c = getNodeCombat(nodeId);
  if (!c?.abilities?.[ai]) return;
  if (!c.abilities[ai].effects) c.abilities[ai].effects = [];
  c.abilities[ai].effects.push(defaultAbilityEffect());
  renderNodeEditor(nodeId);
}

function removeAbilityEffect(nodeId, ai, ei) {
  const c = getNodeCombat(nodeId);
  if (!c?.abilities?.[ai]?.effects) return;
  c.abilities[ai].effects.splice(ei, 1);
  renderNodeEditor(nodeId);
}

function updateAbilityEffect(nodeId, ai, ei, key, value) {
  const c = getNodeCombat(nodeId);
  if (!c?.abilities?.[ai]?.effects?.[ei]) return;
  c.abilities[ai].effects[ei][key] = value;
}
//  Estrutura de um encontro: