// ═══════════════════════════════════════════════════════════
//  ITEM EDITOR — Sistema completo de itens
// ═══════════════════════════════════════════════════════════

let currentItemId = null;

// Tipos de efeito para consumíveis
const CONSUMABLE_EFFECT_TYPES = [
  { key: 'vida_restore',        label: '❤️ Restaurar Vida da Jornada',         hasAttr: false, hasDuration: false },
  { key: 'vida_combat_restore', label: '💊 Restaurar Vida de Combate',          hasAttr: false, hasDuration: false },
  { key: 'sanidade_restore',    label: '🧠 Restaurar Sanidade',                 hasAttr: false, hasDuration: false },
  { key: 'attr_temp',           label: '⬆ Bônus Temporário de Atributo',       hasAttr: true,  hasDuration: true  },
  { key: 'attr_perm',           label: '✦ Bônus Permanente de Atributo',        hasAttr: true,  hasDuration: false },
  { key: 'weapon_poison',       label: '☠ Envenenar Arma (dano/turno combate)', hasAttr: false, hasDuration: true  },
  { key: 'weapon_fire',         label: '🔥 Inflamar Arma (+dano fogo)',          hasAttr: false, hasDuration: true  },
  { key: 'weapon_bleed',        label: '🩸 Sangramento na Arma',                hasAttr: false, hasDuration: true  },
  { key: 'shield_temp',         label: '🛡 Escudo Temporário (absorve dano)',    hasAttr: false, hasDuration: true  },
  { key: 'tag_apply',           label: '🏷 Aplicar Tag',                         hasAttr: false, hasDuration: false },
  { key: 'cure_status',         label: '✨ Curar Efeito Negativo (remove veneno/sangramento)', hasAttr: false, hasDuration: false },
];

const ITEM_ATTRS = [
  { key: 'forca',        label: '⚔ Força'         },
  { key: 'destreza',     label: '🗡 Destreza'      },
  { key: 'inteligencia', label: '📚 Inteligência'  },
  { key: 'carisma',      label: '🎶 Carisma'       },
  { key: 'sabedoria',    label: '🏹 Sabedoria'     },
  { key: 'constituicao', label: '🛡 Constituição'  },
];

function showItemEditor() {
  if (typeof syncMetaToEditor === 'function') syncMetaToEditor();

  if (!document.getElementById('screen-item-editor')) {
    const el = document.createElement('div');
    el.id = 'screen-item-editor';
    el.className = 'screen';
    el.style.overflowY = 'auto';
    el.innerHTML = `
      <div style="max-width:1300px;margin:0 auto;padding:1rem 1.5rem 0;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.2rem;flex-wrap:wrap;gap:0.8rem;">
          <button class="back-link" onclick="showScreen('screen-editor')">← Voltar ao Editor</button>
          <span style="font-family:'Cinzel',serif;color:var(--gold);font-size:1rem;letter-spacing:0.1em;">🎒 ITENS DA AVENTURA</span>
          <button class="btn-medieval" onclick="createNewItem()">+ Novo Item</button>
        </div>
      </div>
      <div class="editor-layout" style="padding:0 1.5rem;">
        <div class="editor-panel">
          <div class="panel-header">Itens Criados</div>
          <div class="panel-body" id="item-list"></div>
        </div>
        <div class="editor-panel" id="item-edit-panel" style="display:none;overflow-y:auto;max-height:85vh;">
          <div class="panel-header" style="display:flex;justify-content:space-between;align-items:center;">
            <span id="item-editing-label" style="color:var(--gold);">Editar Item</span>
            <button class="btn-sm red" onclick="deleteCurrentItem()">Excluir</button>
          </div>
          <div class="panel-body" id="item-form-body"></div>
        </div>
      </div>
    `;
    document.getElementById('screen-editor').insertAdjacentElement('afterend', el);
  }

  showScreen('screen-item-editor');
  if (!editorAdventure.items) editorAdventure.items = {};
  refreshItemList();
}

// ── Renderiza o formulário completo do item ──
function renderItemForm(it) {
  const isEq = it.equippable;
  const b = it.bonuses || {};
  const c = it.curses  || {};
  const effects = it.consumableEffects || [];

  // Atributos (bônus)
  const attrBonusInputs = ITEM_ATTRS.map(a =>
    `<div style="display:flex;flex-direction:column;align-items:center;gap:0.2rem;">
       <span style="font-size:0.58rem;color:var(--stone-light);">${a.label}</span>
       <input type="number" class="field-input points-mini-input" id="ib-${a.key}" value="${b[a.key]||''}" placeholder="0" title="${a.label}" style="width:52px;">
     </div>`
  ).join('');

  // Stats de combate (bônus)
  const combatBonusInputs = [
    { key:'dano',    label:'⚔ Dano',    color:'#e07070' },
    { key:'precisao',label:'🎯 Acerto', color:'#e0c060' },
    { key:'resist',  label:'🛡 Armadura',color:'#80c0e0' },
    { key:'esquiva', label:'💨 Esquiva', color:'#80e0a0' },
  ].map(s =>
    `<div style="display:flex;flex-direction:column;align-items:center;gap:0.2rem;">
       <span style="font-size:0.58rem;color:${s.color};">${s.label}</span>
       <input type="number" class="field-input points-mini-input" id="ib-${s.key}" value="${b[s.key]||''}" placeholder="0" style="width:52px;">
     </div>`
  ).join('');

  // Atributos (maldições)
  const attrCurseInputs = ITEM_ATTRS.map(a =>
    `<div style="display:flex;flex-direction:column;align-items:center;gap:0.2rem;">
       <span style="font-size:0.58rem;color:#cc6060;">-${a.label}</span>
       <input type="number" class="field-input points-mini-input" id="ic-${a.key}" value="${c[a.key]||''}" placeholder="0" style="width:52px;">
     </div>`
  ).join('');

  // Stats de combate (maldições)
  const combatCurseInputs = [
    { key:'dano',    label:'⚔ Dano'    },
    { key:'precisao',label:'🎯 Acerto' },
    { key:'resist',  label:'🛡 Arm'    },
    { key:'esquiva', label:'💨 Esq'    },
  ].map(s =>
    `<div style="display:flex;flex-direction:column;align-items:center;gap:0.2rem;">
       <span style="font-size:0.58rem;color:#cc6060;">-${s.label}</span>
       <input type="number" class="field-input points-mini-input" id="ic-${s.key}" value="${c[s.key]||''}" placeholder="0" style="width:52px;">
     </div>`
  ).join('');

  // Efeitos consumíveis
  const effectsHtml = effects.map((eff, i) => buildConsumableEffectRow(eff, i)).join('');

  const form = document.getElementById('item-form-body');
  if (!form) return;

  form.innerHTML = `
    <!-- Identidade -->
    <div style="display:flex;gap:0.8rem;margin-bottom:0.8rem;align-items:flex-end;">
      <div style="flex:1;">
        <label class="field-label">Nome do Item</label>
        <input type="text" class="field-input" id="item-name" value="${escHtml(it.name||'')}" placeholder="Ex: Poção de Vida">
      </div>
      <div style="width:70px;">
        <label class="field-label">Ícone</label>
        <input type="text" class="field-input" id="item-icon" value="${escHtml(it.icon||'')}" placeholder="🧪" style="text-align:center;font-size:1.3rem;">
      </div>
      <div style="width:95px;">
        <label class="field-label">🪙 Preço</label>
        <input type="number" class="field-input" id="item-price" value="${it.price||0}" min="0">
      </div>
    </div>

    <div style="margin-bottom:0.8rem;">
      <label class="field-label">Descrição</label>
      <textarea class="field-textarea" id="item-desc" rows="2" placeholder="Uma poção que cura ferimentos...">${escHtml(it.desc||'')}</textarea>
    </div>

    <!-- Tipo e Slot -->
    <div style="display:flex;gap:0.8rem;margin-bottom:0.8rem;flex-wrap:wrap;align-items:flex-end;">
      <div>
        <label class="field-label">Tipo</label>
        <select class="field-select" id="item-equippable" onchange="onItemTypeChange()">
          <option value="false" ${!isEq?'selected':''}>🧪 Consumível</option>
          <option value="true"  ${isEq ?'selected':''}>⚔ Equipável</option>
        </select>
      </div>
      <div id="item-slot-div" style="display:${isEq?'block':'none'};">
        <label class="field-label">Slot</label>
        <select class="field-select" id="item-slot">
          <option value="arma"     ${it.slot==='arma'    ?'selected':''}>⚔ Arma</option>
          <option value="armadura" ${it.slot==='armadura'?'selected':''}>🛡 Armadura</option>
          <option value="acessorio"${it.slot==='acessorio'?'selected':''}>💍 Acessório</option>
        </select>
      </div>
      <div id="item-classreq-div" style="display:${isEq?'block':'none'};flex:1;min-width:130px;">
        <label class="field-label">Req. de Classe</label>
        <input type="text" class="field-input" id="item-classreq" value="${escHtml(it.classReq||'')}" placeholder="Vazio = Qualquer">
      </div>
    </div>

    <!-- SEÇÃO: BÔNUS (apenas equipáveis) -->
    <div id="item-bonuses-section" style="display:${isEq?'block':'none'};">
      <div style="border-top:1px solid rgba(201,162,39,0.25);padding-top:0.8rem;margin-bottom:0.8rem;">
        <div style="font-family:'Cinzel',serif;font-size:0.62rem;color:var(--gold);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:0.7rem;">✦ Bônus ao Equipar</div>

        <div style="margin-bottom:0.6rem;">
          <div style="font-size:0.6rem;color:var(--stone-light);margin-bottom:0.4rem;letter-spacing:0.08em;">ATRIBUTOS</div>
          <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">${attrBonusInputs}</div>
        </div>

        <div style="margin-bottom:0.6rem;">
          <div style="font-size:0.6rem;color:var(--stone-light);margin-bottom:0.4rem;letter-spacing:0.08em;">COMBATE</div>
          <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">${combatBonusInputs}</div>
        </div>

        <div>
          <label class="field-label" style="font-size:0.58rem;">Tags Concedidas (vírgula)</label>
          <input type="text" class="field-input" id="ib-tags" value="${escHtml((b.tags||[]).join(', '))}" placeholder="afiado, flamejante" style="margin-top:0.3rem;">
        </div>
      </div>

      <div style="border-top:1px solid rgba(204,68,68,0.25);padding-top:0.8rem;margin-bottom:0.8rem;">
        <div style="font-family:'Cinzel',serif;font-size:0.62rem;color:#cc4444;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:0.7rem;">☠ Maldições (Penalidades)</div>

        <div style="margin-bottom:0.6rem;">
          <div style="font-size:0.6rem;color:#cc8080;margin-bottom:0.4rem;letter-spacing:0.08em;">ATRIBUTOS</div>
          <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">${attrCurseInputs}</div>
        </div>

        <div style="margin-bottom:0.6rem;">
          <div style="font-size:0.6rem;color:#cc8080;margin-bottom:0.4rem;letter-spacing:0.08em;">COMBATE</div>
          <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">${combatCurseInputs}</div>
        </div>

        <div>
          <label class="field-label" style="font-size:0.58rem;">Tags de Maldição (vírgula)</label>
          <input type="text" class="field-input" id="ic-tags" value="${escHtml((c.tags||[]).join(', '))}" placeholder="amaldiçoado, pesado" style="margin-top:0.3rem;">
        </div>
      </div>
    </div>

    <!-- SEÇÃO: EFEITOS CONSUMÍVEIS -->
    <div id="item-consumable-section" style="display:${!isEq?'block':'none'};">
      <div style="border-top:1px solid rgba(100,180,255,0.2);padding-top:0.8rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.6rem;">
          <div style="font-family:'Cinzel',serif;font-size:0.62rem;color:#88aaff;letter-spacing:0.12em;text-transform:uppercase;">⚗ Efeitos ao Usar</div>
          <button class="btn-sm" style="font-size:0.6rem;border-color:rgba(136,170,255,0.5);color:#88aaff;" onclick="addConsumableEffect()">+ Efeito</button>
        </div>
        <div id="consumable-effects-list">
          ${effectsHtml || '<div style="color:var(--stone);font-size:0.78rem;font-style:italic;">Nenhum efeito. Clique em "+ Efeito".</div>'}
        </div>
      </div>
    </div>

    <div style="margin-top:1.2rem;">
      <button class="btn-sm" onclick="saveCurrentItem()">💾 Salvar Item</button>
    </div>
  `;
}

function buildConsumableEffectRow(eff, i) {
  const typeDef = CONSUMABLE_EFFECT_TYPES.find(t => t.key === eff.type) || CONSUMABLE_EFFECT_TYPES[0];
  const typeOptions = CONSUMABLE_EFFECT_TYPES.map(t =>
    `<option value="${t.key}" ${eff.type===t.key?'selected':''}>${t.label}</option>`
  ).join('');

  const attrOptions = ITEM_ATTRS.map(a =>
    `<option value="${a.key}" ${eff.attr===a.key?'selected':''}>${a.label}</option>`
  ).join('');

  const attrSelect = typeDef.hasAttr
    ? `<select class="field-select" style="font-size:0.65rem;padding:0.2rem 0.3rem;"
         onchange="updateConsumableEffect(${i},'attr',this.value)">${attrOptions}</select>` : '';

  const valInput = `<div style="display:flex;align-items:center;gap:0.25rem;">
    <span style="font-size:0.58rem;color:var(--stone-light);">Val:</span>
    <input class="points-mini-input" type="number" min="0" max="999" value="${eff.value||1}"
      onchange="updateConsumableEffect(${i},'value',+this.value)">
  </div>`;

  const durInput = typeDef.hasDuration
    ? `<div style="display:flex;align-items:center;gap:0.25rem;">
        <span style="font-size:0.58rem;color:var(--stone-light);">Dur(turnos):</span>
        <input class="points-mini-input" type="number" min="1" max="20" value="${eff.duration||3}"
          onchange="updateConsumableEffect(${i},'duration',+this.value)">
       </div>` : '';

  const tagInput = eff.type === 'tag_apply'
    ? `<input class="field-input" style="font-size:0.65rem;flex:1;" placeholder="nome_tag"
         value="${escHtml(eff.tag||'')}" onchange="updateConsumableEffect(${i},'tag',this.value)">` : '';

  return `<div style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;
                      background:rgba(136,170,255,0.04);border:1px solid rgba(136,170,255,0.15);
                      padding:0.4rem 0.6rem;margin-bottom:0.35rem;">
    <select class="field-select" style="font-size:0.65rem;flex:2;min-width:200px;"
      onchange="updateConsumableEffect(${i},'type',this.value);renderItemForm(editorAdventure.items[currentItemId])">
      ${typeOptions}
    </select>
    ${attrSelect}
    ${valInput}
    ${durInput}
    ${tagInput}
    <button class="btn-sm red" style="font-size:0.5rem;padding:0.1rem 0.3rem;margin-left:auto;"
      onclick="removeConsumableEffect(${i})">✕</button>
  </div>`;
}

function onItemTypeChange() {
  const isEq = document.getElementById('item-equippable').value === 'true';
  document.getElementById('item-slot-div').style.display       = isEq ? 'block' : 'none';
  document.getElementById('item-classreq-div').style.display   = isEq ? 'block' : 'none';
  document.getElementById('item-bonuses-section').style.display    = isEq ? 'block' : 'none';
  document.getElementById('item-consumable-section').style.display = isEq ? 'none'  : 'block';
}

// ── Consumable effect CRUD ──
function addConsumableEffect() {
  if (!currentItemId) return;
  const it = editorAdventure.items[currentItemId];
  if (!it) return;
  if (!it.consumableEffects) it.consumableEffects = [];
  it.consumableEffects.push({ type: 'vida_restore', value: 2, duration: 0, attr: 'forca', tag: '' });
  renderItemForm(it);
}

function removeConsumableEffect(idx) {
  if (!currentItemId) return;
  const it = editorAdventure.items[currentItemId];
  if (!it?.consumableEffects) return;
  it.consumableEffects.splice(idx, 1);
  renderItemForm(it);
}

function updateConsumableEffect(idx, key, value) {
  if (!currentItemId) return;
  const it = editorAdventure.items[currentItemId];
  if (!it?.consumableEffects?.[idx]) return;
  it.consumableEffects[idx][key] = value;
}

// ── List ──
function refreshItemList() {
  const list = document.getElementById('item-list');
  if (!list) return;
  const items = editorAdventure.items || {};
  const keys = Object.keys(items);
  if (!keys.length) {
    list.innerHTML = '<div style="color:var(--stone);font-style:italic;text-align:center;padding:1.5rem;font-size:0.85rem;">Nenhum item criado ainda.</div>';
    return;
  }
  list.innerHTML = keys.map(id => {
    const it = items[id];
    const sel = id === currentItemId;
    const typeLabel = it.equippable
      ? 'Equipável (' + it.slot + ')'
      : (it.consumableEffects?.length ? 'Consumível' : 'Item Especial');
    return '<div class="enc-slot-item' + (sel ? ' selected' : '') + '" onclick="selectItem(\'' + id + '\')">' +
      '<div class="enc-slot-title">' + (it.icon || '\uD83D\uDCE6') + ' ' + escHtml(it.name || '—') + '</div>' +
      '<div class="enc-slot-type">' + typeLabel + ' · 🪙 ' + (it.price || 0) + '</div>' +
      '</div>';
  }).join('');
}

function createNewItem() {
  const id = 'item_' + genId();
  if (!editorAdventure.items) editorAdventure.items = {};
  editorAdventure.items[id] = {
    id, name: 'Novo Item', icon: '📦', desc: '', price: 10,
    equippable: false, slot: 'arma', classReq: '',
    bonuses: {}, curses: {}, consumableEffects: []
  };
  selectItem(id);
  refreshItemList();
}

function selectItem(id) {
  currentItemId = id;
  const it = editorAdventure.items[id];
  if (!it) return;
  document.getElementById('item-edit-panel').style.display = 'block';
  const lbl = document.getElementById('item-editing-label');
  if (lbl) lbl.textContent = 'Editando: ' + (it.name || '—');
  renderItemForm(it);
  refreshItemList();
}

function saveCurrentItem() {
  if (!currentItemId || !editorAdventure.items[currentItemId]) return;
  const it = editorAdventure.items[currentItemId];

  it.name      = document.getElementById('item-name').value  || 'Sem Nome';
  it.icon      = document.getElementById('item-icon').value  || '📦';
  it.price     = parseInt(document.getElementById('item-price').value) || 0;
  it.desc      = document.getElementById('item-desc').value;
  it.equippable= document.getElementById('item-equippable').value === 'true';
  it.slot      = document.getElementById('item-slot')?.value || 'arma';
  it.classReq  = document.getElementById('item-classreq')?.value || '';

  if (it.equippable) {
    it.bonuses = {};
    it.curses  = {};
    // Atributos — bônus
    ITEM_ATTRS.forEach(a => {
      const v = parseInt(document.getElementById('ib-' + a.key)?.value);
      if (v) it.bonuses[a.key] = v;
    });
    // Combate — bônus
    ['dano','precisao','resist','esquiva'].forEach(k => {
      const v = parseInt(document.getElementById('ib-' + k)?.value);
      if (v) it.bonuses[k] = v;
    });
    const bTags = document.getElementById('ib-tags')?.value || '';
    if (bTags.trim()) it.bonuses.tags = bTags.split(',').map(s=>s.trim()).filter(Boolean);

    // Atributos — maldições
    ITEM_ATTRS.forEach(a => {
      const v = parseInt(document.getElementById('ic-' + a.key)?.value);
      if (v) it.curses[a.key] = v;
    });
    // Combate — maldições
    ['dano','precisao','resist','esquiva'].forEach(k => {
      const v = parseInt(document.getElementById('ic-' + k)?.value);
      if (v) it.curses[k] = v;
    });
    const cTags = document.getElementById('ic-tags')?.value || '';
    if (cTags.trim()) it.curses.tags = cTags.split(',').map(s=>s.trim()).filter(Boolean);
    // Consumable effects cleared when equippable
    it.consumableEffects = [];
  }
  // (consumableEffects already updated live via updateConsumableEffect)

  const lbl = document.getElementById('item-editing-label');
  if (lbl) lbl.textContent = 'Editando: ' + it.name;
  refreshItemList();
  notify('✅ Item "' + it.name + '" salvo!');
}

function deleteCurrentItem() {
  if (!currentItemId) return;
  if (!confirm('Excluir este item da aventura?')) return;
  delete editorAdventure.items[currentItemId];
  currentItemId = null;
  document.getElementById('item-edit-panel').style.display = 'none';
  refreshItemList();
}
