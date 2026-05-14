// ═══════════════════════════════════════════════════════════
//  ABILITIES — Sistema de Habilidades do Jogador
//  Editor + Runtime de habilidades passivas e ativas
//
//  Estrutura de uma habilidade:
//  {
//    id: string,
//    name: string,
//    icon: string,
//    desc: string,               — descrição para o jogador
//    type: 'passive' | 'active',
//    context: 'combat' | 'exploration', — onde pode ser usada
//    cooldown: number,           — turnos de recarga (só para ativas em combate)
//    maxUses: number,            — 0 = ilimitado
//    requireTags: string[],      — tags necessárias para aparecer
//    excludeTags: string[],      — tags que bloqueiam
//    effects: AbilityEffect[]
//  }
//
//  AbilityEffect:
//  {
//    type: 'attr_bonus'          — bônus permanente num atributo
//          'attr_temp'           — bônus temporário num atributo (ativa, dura X turnos)
//          'roll_bonus'          — bônus fixo de % em testes de um atributo
//          'roll_attr'           — soma atributo extra ao valor de um teste
//          'tag_apply'           — aplica/remove uma tag
//          'tag_timed'           — aplica tag por N cenas/turnos, depois remove
//          'combat_dmg'          — dano direto ao inimigo (ativa em combate)
//          'combat_heal'         — cura ao jogador em combate (ativa)
//          'combat_shield'       — escudo temporário (ativa)
//          'combat_buff'         — buff de atributo em combate
//          'combat_debuff'       — debuff no inimigo em combate
//          'vida_bonus'          — bônus permanente de vida de jornada
//          'sanidade_bonus'      — bônus permanente de sanidade
//    attrKey: string,            — atributo alvo (para attr_bonus, roll_bonus, etc.)
//    value: number,
//    duration: number,           — duração em turnos/cenas (0 = permanente)
//    tag: string,                — tag name (para tag_apply/tag_timed)
//    tagValue: boolean,          — true = aplicar, false = remover (para tag_apply)
//  }
// ═══════════════════════════════════════════════════════════

// ── Runtime state ──
// character.abilities = [{ id, ...def }]  (definições das habilidades adquiridas)
// character.abilityState = { [id]: { cooldownLeft, usesLeft } }
// character.timedTags = [{ tag, turnsLeft, source }]  (tags temporárias em cenas)

let selectedAbilityId = null;

// ─── DEFAULTS ───────────────────────────────────────────────
function defaultAbility() {
  return {
    id: genId(),
    name: 'Nova Habilidade',
    icon: '✨',
    desc: '',
    type: 'passive',
    context: 'exploration',
    cooldown: 0,
    maxUses: 0,
    requireTags: [],
    excludeTags: [],
    effects: []
  };
}

function defaultEffect() {
  return { type: 'attr_bonus', attrKey: 'forca', value: 1, duration: 0, tag: '', tagValue: true };
}

// ─── ACCESSOR ───────────────────────────────────────────────
function getAbilityDefs() {
  if (!editorAdventure.abilities) editorAdventure.abilities = [];
  return editorAdventure.abilities;
}

// ═══════════════════════════════════════════════════════════
//  EDITOR
// ═══════════════════════════════════════════════════════════

function openAbilityEditor() {
  syncMetaToEditor();
  showScreen('screen-ability-editor');
  renderAbilityList();
  if (selectedAbilityId) {
    const found = getAbilityDefs().find(a => a.id === selectedAbilityId);
    if (found) renderAbilityDefEditor(found.id);
  }
}

function addAbilityDef() {
  const ab = defaultAbility();
  ab.id = 'ab_' + Date.now();
  getAbilityDefs().push(ab);
  selectedAbilityId = ab.id;
  renderAbilityList();
  renderAbilityDefEditor(ab.id);
}

function deleteAbilityDef() {
  if (!selectedAbilityId) return;
  const defs = getAbilityDefs();
  const idx = defs.findIndex(a => a.id === selectedAbilityId);
  if (idx === -1) return;
  defs.splice(idx, 1);
  selectedAbilityId = null;
  renderAbilityList();
  document.getElementById('ability-def-editor').innerHTML =
    '<div style="color:var(--stone);font-style:italic;text-align:center;padding:2rem;">Selecione ou crie uma habilidade.</div>';
  document.getElementById('ability-editing-label').textContent = 'Editar Habilidade';
}

function renderAbilityList() {
  const list = document.getElementById('ability-def-list');
  if (!list) return;
  const defs = getAbilityDefs();
  if (!defs.length) {
    list.innerHTML = '<div style="color:var(--stone);font-style:italic;text-align:center;padding:1.5rem;font-size:0.85rem;">Nenhuma habilidade criada.</div>';
    return;
  }
  list.innerHTML = defs.map(ab => {
    const isActive = ab.id === selectedAbilityId;
    const typeColor = ab.type === 'passive' ? '#80c8a0' : '#f0b860';
    const ctxColor  = ab.context === 'combat' ? '#e07070' : '#88aadd';
    const typeLabel = ab.type === 'passive' ? 'Passiva' : 'Ativa';
    const ctxLabel  = ab.context === 'combat' ? '⚔ Combate' : '🗺 Exploração';
    return `<div class="ability-list-item ${isActive ? 'selected' : ''}" onclick="selectAbility('${ab.id}')">
      <span style="font-size:1.1rem;">${escHtml(ab.icon || '✨')}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:600;color:var(--parchment);font-size:0.85rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(ab.name)}</div>
        <div style="display:flex;gap:0.4rem;margin-top:0.2rem;flex-wrap:wrap;">
          <span style="font-size:0.62rem;padding:0.08rem 0.35rem;border-radius:3px;background:rgba(0,0,0,0.3);color:${typeColor};border:1px solid ${typeColor}44;">${typeLabel}</span>
          <span style="font-size:0.62rem;padding:0.08rem 0.35rem;border-radius:3px;background:rgba(0,0,0,0.3);color:${ctxColor};border:1px solid ${ctxColor}44;">${ctxLabel}</span>
          ${ab.effects.length ? `<span style="font-size:0.62rem;padding:0.08rem 0.35rem;border-radius:3px;background:rgba(0,0,0,0.3);color:var(--stone-light);">${ab.effects.length} efeito${ab.effects.length>1?'s':''}</span>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

function selectAbility(id) {
  selectedAbilityId = id;
  renderAbilityList();
  renderAbilityDefEditor(id);
}

function renderAbilityDefEditor(id) {
  const defs = getAbilityDefs();
  const ab = defs.find(a => a.id === id);
  if (!ab) return;
  const el = document.getElementById('ability-def-editor');
  document.getElementById('ability-editing-label').textContent = `✎ ${ab.name || 'Habilidade'}`;

  const ATTR_OPTIONS = ATTRS.map(a =>
    `<option value="${a.key}">${a.icon} ${a.name}</option>`
  ).join('');

  const EFFECT_TYPE_LABELS = {
    attr_bonus:    '⬆ Bônus Permanente de Atributo',
    attr_temp:     '⏱ Bônus Temporário de Atributo',
    roll_bonus:    '🎲 Bônus Fixo em Teste (% extra)',
    roll_attr:     '🎲 Atributo Extra em Teste',
    tag_apply:     '🏷 Aplicar / Remover Tag',
    tag_timed:     '⌛ Tag Temporária',
    combat_dmg:    '💥 Dano (em combate)',
    combat_heal:   '💚 Cura (em combate)',
    combat_shield: '🛡 Escudo (em combate)',
    combat_buff:   '🔥 Buff de Atributo (em combate)',
    combat_debuff: '☠ Debuff no Inimigo (em combate)',
    vida_bonus:    '❤ Bônus de Vida de Jornada',
    sanidade_bonus:'✨ Bônus de Sanidade',
  };

  // Helper for effect row HTML
  const effectRow = (eff, effIdx) => {
    const isAttr     = ['attr_bonus','attr_temp','roll_bonus','roll_attr','combat_buff','combat_debuff'].includes(eff.type);
    const hasAttr    = isAttr;
    const hasValue   = !['tag_apply','tag_timed'].includes(eff.type) || eff.type === 'tag_timed';
    const hasDuration= ['attr_temp','tag_timed','combat_buff','combat_debuff','combat_shield'].includes(eff.type);
    const hasTag     = ['tag_apply','tag_timed'].includes(eff.type);
    const hasTagVal  = eff.type === 'tag_apply';

    const effTypeOpts = Object.entries(EFFECT_TYPE_LABELS).map(([k,v]) =>
      `<option value="${k}" ${eff.type===k?'selected':''}>${v}</option>`
    ).join('');

    const attrOpts = ATTRS.map(a =>
      `<option value="${a.key}" ${eff.attrKey===a.key?'selected':''}>${a.icon} ${a.name}</option>`
    ).join('');

    return `<div class="ability-effect-row" data-eff="${effIdx}">
      <div style="display:flex;gap:0.5rem;align-items:flex-start;flex-wrap:wrap;">
        <select class="field-select ability-effect-type" style="flex:2;min-width:160px;font-size:0.72rem;"
          onchange="updateEffect('${id}',${effIdx},'type',this.value)">${effTypeOpts}</select>

        ${hasAttr ? `<select class="field-select" style="flex:1;min-width:120px;font-size:0.72rem;"
          onchange="updateEffect('${id}',${effIdx},'attrKey',this.value)">${attrOpts}</select>` : ''}

        ${hasValue && eff.type !== 'tag_timed' ? `<div style="display:flex;align-items:center;gap:0.3rem;">
          <label style="font-size:0.65rem;color:var(--stone-light);">${eff.type==='roll_bonus'?'%':'Val'}</label>
          <input type="number" class="field-input" style="width:60px;font-size:0.72rem;" value="${eff.value||0}"
            onchange="updateEffect('${id}',${effIdx},'value',+this.value)">
        </div>` : ''}

        ${hasDuration ? `<div style="display:flex;align-items:center;gap:0.3rem;">
          <label style="font-size:0.65rem;color:var(--stone-light);">Dur.</label>
          <input type="number" class="field-input" style="width:55px;font-size:0.72rem;" value="${eff.duration||1}"
            min="1" onchange="updateEffect('${id}',${effIdx},'duration',+this.value)">
          <span style="font-size:0.62rem;color:var(--stone);">${eff.type==='tag_timed' ? 'cenas' : 'turnos'}</span>
        </div>` : ''}

        ${hasTag ? `<div style="display:flex;align-items:center;gap:0.3rem;flex:1;min-width:120px;">
          <label style="font-size:0.65rem;color:var(--stone-light);">Tag</label>
          <input type="text" class="field-input" style="flex:1;font-size:0.72rem;" value="${escHtml(eff.tag||'')}"
            placeholder="nome da tag" onchange="updateEffect('${id}',${effIdx},'tag',this.value)">
        </div>` : ''}

        ${hasTagVal ? `<div style="display:flex;align-items:center;gap:0.3rem;">
          <label style="font-size:0.65rem;color:var(--stone-light);">Ação</label>
          <select class="field-select" style="font-size:0.68rem;"
            onchange="updateEffect('${id}',${effIdx},'tagValue',this.value==='true')">
            <option value="true" ${eff.tagValue!==false?'selected':''}>Adicionar</option>
            <option value="false" ${eff.tagValue===false?'selected':''}>Remover</option>
          </select>
        </div>` : ''}

        <button class="btn-sm red" style="margin-left:auto;font-size:0.65rem;padding:0.15rem 0.4rem;"
          onclick="removeEffect('${id}',${effIdx})">✕</button>
      </div>

      ${eff.type === 'roll_bonus' || eff.type === 'roll_attr' ? `
        <div style="font-size:0.65rem;color:var(--stone);margin-top:0.3rem;font-style:italic;">
          ${eff.type === 'roll_bonus'
            ? `Adiciona +${eff.value||0}% na chance de sucesso ao rolar ${ATTRS.find(a=>a.key===eff.attrKey)?.name||eff.attrKey}.`
            : `Some o valor de ${ATTRS.find(a=>a.key===eff.attrKey)?.name||eff.attrKey} ao atributo principal do teste.`}
        </div>` : ''}

      ${eff.type === 'tag_timed' ? `
        <div style="font-size:0.65rem;color:var(--stone);margin-top:0.3rem;font-style:italic;">
          ${ab.type==='passive' ? 'Passiva: tag aplicada permanentemente.' : `Ativa: aplica a tag "${eff.tag||'...'}" por ${eff.duration||1} cena${(eff.duration||1)>1?'s':''}.`}
        </div>` : ''}
    </div>`;
  };

  el.innerHTML = `
    <!-- Row 1: Identity -->
    <div style="display:grid;grid-template-columns:auto 1fr auto;gap:0.8rem;align-items:end;margin-bottom:0.8rem;">
      <div class="field-group" style="margin:0;">
        <label class="field-label" style="font-size:0.58rem;">Ícone</label>
        <input class="field-input" style="width:52px;text-align:center;font-size:1.3rem;" value="${escHtml(ab.icon||'✨')}"
          oninput="updateAbilityField('${id}','icon',this.value)">
      </div>
      <div class="field-group" style="margin:0;">
        <label class="field-label" style="font-size:0.58rem;">Nome da Habilidade</label>
        <input class="field-input" value="${escHtml(ab.name)}"
          oninput="updateAbilityField('${id}','name',this.value)">
      </div>
      <div class="field-group" style="margin:0;">
        <label class="field-label" style="font-size:0.58rem;">Tipo</label>
        <select class="field-select" style="min-width:100px;" onchange="updateAbilityField('${id}','type',this.value);renderAbilityDefEditor('${id}')">
          <option value="passive" ${ab.type==='passive'?'selected':''}>✦ Passiva</option>
          <option value="active"  ${ab.type==='active' ?'selected':''}>⚡ Ativa</option>
        </select>
      </div>
    </div>

    <!-- Row 2: Context + cooldown + uses -->
    <div style="display:grid;grid-template-columns:1fr ${ab.type==='active'?'auto auto':''};gap:0.8rem;align-items:end;margin-bottom:0.8rem;">
      <div class="field-group" style="margin:0;">
        <label class="field-label" style="font-size:0.58rem;">Contexto de Uso</label>
        <select class="field-select" onchange="updateAbilityField('${id}','context',this.value);renderAbilityDefEditor('${id}')">
          <option value="exploration" ${ab.context==='exploration'?'selected':''}>🗺 Exploração (fora de combate)</option>
          <option value="combat"      ${ab.context==='combat'     ?'selected':''}>⚔ Combate (apenas durante batalhas)</option>
        </select>
      </div>
      ${ab.type==='active' ? `
      <div class="field-group" style="margin:0;">
        <label class="field-label" style="font-size:0.58rem;">⏳ Recarga (turnos)</label>
        <input type="number" class="field-input" style="width:70px;" min="0" value="${ab.cooldown||0}"
          onchange="updateAbilityField('${id}','cooldown',+this.value)">
      </div>
      <div class="field-group" style="margin:0;">
        <label class="field-label" style="font-size:0.58rem;">🔢 Usos Máx. (0=∞)</label>
        <input type="number" class="field-input" style="width:70px;" min="0" value="${ab.maxUses||0}"
          onchange="updateAbilityField('${id}','maxUses',+this.value)">
      </div>` : ''}
    </div>

    <!-- Row 3: Description -->
    <div class="field-group">
      <label class="field-label" style="font-size:0.58rem;">Descrição (exibida ao jogador)</label>
      <textarea class="field-textarea" style="min-height:50px;font-size:0.78rem;"
        oninput="updateAbilityField('${id}','desc',this.value)">${escHtml(ab.desc||'')}</textarea>
    </div>

    <!-- Row 4: Conditions -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.8rem;margin-bottom:0.8rem;">
      <div class="field-group" style="margin:0;">
        <label class="field-label" style="font-size:0.58rem;">🏷 Tags Necessárias <span style="color:var(--stone);font-weight:normal;">(vírgula)</span></label>
        <input class="field-input" style="font-size:0.72rem;" value="${escHtml((ab.requireTags||[]).join(', '))}"
          placeholder="ex: heroi, nobre"
          onchange="updateAbilityTagList('${id}','requireTags',this.value)">
      </div>
      <div class="field-group" style="margin:0;">
        <label class="field-label" style="font-size:0.58rem;">🚫 Tags Bloqueadoras <span style="color:var(--stone);font-weight:normal;">(vírgula)</span></label>
        <input class="field-input" style="font-size:0.72rem;" value="${escHtml((ab.excludeTags||[]).join(', '))}"
          placeholder="ex: maldito, exilado"
          onchange="updateAbilityTagList('${id}','excludeTags',this.value)">
      </div>
    </div>

    <!-- Row 5: Effects -->
    <div style="margin-top:0.8rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
        <span style="font-family:'Cinzel',serif;font-size:0.72rem;color:var(--gold-light);letter-spacing:0.05em;">EFEITOS DA HABILIDADE</span>
        <button class="btn-sm" style="font-size:0.65rem;" onclick="addEffect('${id}')">+ Adicionar Efeito</button>
      </div>
      <div style="font-size:0.68rem;color:var(--stone);font-style:italic;margin-bottom:0.6rem;">
        ${ab.type==='passive'
          ? '✦ Passiva: efeitos aplicados automaticamente e permanecem enquanto o jogador possuir a habilidade.'
          : ab.context==='combat'
          ? '⚔ Ativa de Combate: efeitos aplicados ao ser ativada durante uma batalha.'
          : '🗺 Ativa de Exploração: efeitos aplicados ao ser ativada na tela de jogo (fora de combate).'}
      </div>
      <div id="effects-list-${id}">
        ${ab.effects.length
          ? ab.effects.map((e,i) => effectRow(e,i)).join('')
          : '<div style="color:var(--stone);font-style:italic;font-size:0.8rem;padding:0.5rem 0;">Nenhum efeito adicionado.</div>'}
      </div>
    </div>

    <!-- Notes -->
    <div style="margin-top:1rem;padding:0.6rem 0.8rem;background:rgba(0,0,0,0.25);border-left:3px solid rgba(201,162,39,0.3);font-size:0.7rem;color:var(--stone-light);line-height:1.5;">
      <strong style="color:var(--gold-light);">💡 Dica:</strong>
      Para dar habilidades ao jogador, vincule-as às classes (<em>Classes do Personagem</em>) no Editor
      de Aventuras, ou dispare-as via escolhas de cena com efeito <em>grant_ability</em> (em breve).
      Habilidades de Combate só aparecem no botão especial durante batalhas.
      Habilidades de Exploração viram botões na tela de jogo se forem Ativas.
    </div>
  `;
}

// ─── Field update helpers ─────────────────────────────────
function updateAbilityField(id, field, value) {
  const ab = getAbilityDefs().find(a => a.id === id);
  if (!ab) return;
  ab[field] = value;
  if (field === 'name') document.getElementById('ability-editing-label').textContent = `✎ ${value}`;
  renderAbilityList();
}

function updateAbilityTagList(id, field, raw) {
  const ab = getAbilityDefs().find(a => a.id === id);
  if (!ab) return;
  ab[field] = raw.split(',').map(t => t.trim()).filter(Boolean);
}

function addEffect(id) {
  const ab = getAbilityDefs().find(a => a.id === id);
  if (!ab) return;
  if (!ab.effects) ab.effects = [];
  ab.effects.push(defaultEffect());
  renderAbilityDefEditor(id);
}

function removeEffect(id, idx) {
  const ab = getAbilityDefs().find(a => a.id === id);
  if (!ab) return;
  ab.effects.splice(idx, 1);
  renderAbilityDefEditor(id);
}

function updateEffect(id, idx, field, value) {
  const ab = getAbilityDefs().find(a => a.id === id);
  if (!ab || !ab.effects[idx]) return;
  ab.effects[idx][field] = value;
  // When type changes reset dependent fields
  if (field === 'type') renderAbilityDefEditor(id);
}

// ═══════════════════════════════════════════════════════════
//  RUNTIME — aplicação de habilidades durante o jogo
// ═══════════════════════════════════════════════════════════

// Called after character creation — apply all passive effects once
function applyPassiveAbilities() {
  const abs = character.abilities || [];
  abs.forEach(ab => {
    if (ab.type !== 'passive') return;
    if (!abilityConditionsMet(ab)) return;
    ab.effects.forEach(eff => applyPassiveEffect(eff, ab));
  });
  updateAbilitiesHud();
}

function applyPassiveEffect(eff, ab) {
  switch (eff.type) {
    case 'attr_bonus':
      if (character.attrs[eff.attrKey] !== undefined) {
        character.attrs[eff.attrKey] = Math.max(1, (character.attrs[eff.attrKey] || 1) + (eff.value || 0));
      }
      break;
    case 'vida_bonus':
      character.vidaMax     = Math.max(1, (character.vidaMax||1) + (eff.value||0));
      character.vida        = Math.min(character.vida, character.vidaMax);
      break;
    case 'sanidade_bonus':
      character.sanidadeMax = Math.max(1, (character.sanidadeMax||1) + (eff.value||0));
      character.sanidade    = Math.min(character.sanidade, character.sanidadeMax);
      break;
    case 'tag_apply':
    case 'tag_timed': // passiva = permanente
      if (eff.tag) setTag(eff.tag, eff.tagValue !== false);
      break;
    // roll_bonus and roll_attr are checked at roll time, not applied to attrs
    default: break;
  }
}

// ─── Roll bonuses from passive abilities ───────────────────
// Returns: { flatBonus: number, extraAttrVal: number }
// Call this in doAttrRoll to augment the success chance
function getRollBonusesForAttr(attrKey) {
  let flatBonus = 0;
  let extraAttrVal = 0;
  const abs = character.abilities || [];
  abs.forEach(ab => {
    if (!abilityConditionsMet(ab)) return;
    ab.effects.forEach(eff => {
      if (eff.attrKey !== attrKey) return;
      if (eff.type === 'roll_bonus')  flatBonus   += (eff.value || 0);
      if (eff.type === 'roll_attr')   extraAttrVal += (character.attrs[eff.attrKey] || 0);
    });
  });
  return { flatBonus, extraAttrVal };
}

// ─── Active ability execution (exploration) ────────────────
function activateExplorationAbility(abId) {
  const abs = character.abilities || [];
  const ab = abs.find(a => a.id === abId);
  if (!ab) return;
  if (ab.type !== 'active' || ab.context !== 'exploration') return;
  if (!abilityConditionsMet(ab)) { notify('⚠ Condições não atendidas.'); return; }

  // Check state
  if (!character.abilityState) character.abilityState = {};
  const st = character.abilityState[abId] || { cooldownLeft: 0, usesLeft: ab.maxUses || 0 };
  if (st.cooldownLeft > 0) { notify(`⏳ ${ab.name} em recarga (${st.cooldownLeft} cenas restantes).`); return; }
  if (ab.maxUses > 0 && st.usesLeft <= 0) { notify(`❌ ${ab.name} — sem usos restantes.`); return; }

  let log = [];
  ab.effects.forEach(eff => {
    switch (eff.type) {
      case 'attr_temp': {
        if (!character._tempBuffs) character._tempBuffs = [];
        character._tempBuffs.push({ attrKey: eff.attrKey, value: eff.value, scenesLeft: eff.duration || 1, source: ab.name });
        character.attrs[eff.attrKey] = (character.attrs[eff.attrKey]||1) + (eff.value||0);
        log.push(`⬆ ${ATTRS.find(a=>a.key===eff.attrKey)?.name||eff.attrKey} +${eff.value} por ${eff.duration||1} cena${(eff.duration||1)>1?'s':''}`);
        break;
      }
      case 'tag_apply':
        if (eff.tag) { setTag(eff.tag, eff.tagValue !== false); log.push(`🏷 Tag "${eff.tag}" ${eff.tagValue!==false ? 'aplicada' : 'removida'}`); }
        break;
      case 'tag_timed':
        if (eff.tag) {
          if (!character.timedTags) character.timedTags = [];
          // Remove existing
          character.timedTags = character.timedTags.filter(t => !(t.tag === eff.tag && t.source === ab.name));
          character.timedTags.push({ tag: eff.tag, scenesLeft: eff.duration||1, source: ab.name });
          setTag(eff.tag, true);
          log.push(`⌛ Tag "${eff.tag}" por ${eff.duration||1} cena${(eff.duration||1)>1?'s':''}`);
        }
        break;
      case 'vida_bonus':
        character.vidaMax = Math.max(1, (character.vidaMax||1) + (eff.value||0));
        character.vida = Math.min((character.vida||0) + Math.max(0,(eff.value||0)), character.vidaMax);
        log.push(`❤ Vida máx. +${eff.value}`);
        break;
      case 'sanidade_bonus':
        character.sanidadeMax = Math.max(1, (character.sanidadeMax||1) + (eff.value||0));
        character.sanidade = Math.min((character.sanidade||0) + Math.max(0,(eff.value||0)), character.sanidadeMax);
        log.push(`✨ Sanidade máx. +${eff.value}`);
        break;
      default: break;
    }
  });

  // Update state
  st.cooldownLeft = ab.cooldown || 0;
  if (ab.maxUses > 0) st.usesLeft = Math.max(0, (st.usesLeft || ab.maxUses) - 1);
  character.abilityState[abId] = st;

  renderCharHud();
  updateAbilitiesHud();
  if (log.length) notify(`${ab.icon||'✨'} <strong>${ab.name}</strong>: ${log.join(' · ')}`);
}

// Tick timed effects: call at each scene transition
function tickAbilityTimers() {
  // Timed tags
  if (character.timedTags) {
    character.timedTags.forEach(t => { t.scenesLeft = Math.max(0, (t.scenesLeft||1) - 1); });
    character.timedTags.forEach(t => { if (t.scenesLeft <= 0) setTag(t.tag, false); });
    character.timedTags = character.timedTags.filter(t => t.scenesLeft > 0);
  }
  // Temp attr buffs
  if (character._tempBuffs) {
    character._tempBuffs.forEach(b => {
      b.scenesLeft = Math.max(0, (b.scenesLeft||1) - 1);
      if (b.scenesLeft <= 0 && character.attrs[b.attrKey] !== undefined) {
        character.attrs[b.attrKey] = Math.max(1, (character.attrs[b.attrKey]||1) - (b.value||0));
      }
    });
    character._tempBuffs = character._tempBuffs.filter(b => b.scenesLeft > 0);
    renderCharHud();
  }
  // Exploration ability cooldowns
  if (character.abilityState) {
    Object.values(character.abilityState).forEach(st => {
      if (st.cooldownLeft > 0) st.cooldownLeft--;
    });
  }
  updateAbilitiesHud();
}

// ─── Combat ability helpers ─────────────────────────────────
// Returns active combat abilities the player can use this turn
function getPlayerCombatAbilities() {
  const abs = character.abilities || [];
  return abs.filter(ab => ab.type === 'active' && ab.context === 'combat' && abilityConditionsMet(ab));
}

// Execute a player ability in combat — returns text for combat log
async function executePlayerCombatAbility(abId) {
  const abs = character.abilities || [];
  const ab = abs.find(a => a.id === abId);
  if (!ab) return '';

  if (!character.abilityState) character.abilityState = {};
  const st = character.abilityState[abId] || { cooldownLeft: 0, usesLeft: ab.maxUses || 0 };
  if (st.cooldownLeft > 0 || (ab.maxUses > 0 && st.usesLeft <= 0)) return '';

  let log = [];
  for (const eff of ab.effects) {
    switch (eff.type) {
      case 'combat_dmg': {
        const dmg = Math.max(1, eff.value || 0);
        combatState.enemyHp = Math.max(0, (combatState.enemyHp||0) - dmg);
        log.push(`💥 ${dmg} de dano`);
        break;
      }
      case 'combat_heal': {
        const heal = Math.max(1, eff.value || 0);
        character.vidaCombate = Math.min(character.vidaCombateMax, (character.vidaCombate||0) + heal);
        log.push(`💚 +${heal} vida`);
        break;
      }
      case 'combat_shield': {
        combatEffects.push({ source: ab.name, type: 'shield_player', value: eff.value||0, shieldHp: eff.value||0, duration: eff.duration||2, turnsLeft: eff.duration||2 });
        log.push(`🛡 Escudo ${eff.value||0} pts`);
        break;
      }
      case 'combat_buff': {
        combatEffects.push({ source: ab.name, type: 'buff_player_ability', attr: eff.attrKey, value: eff.value||0, duration: eff.duration||2, turnsLeft: eff.duration||2 });
        character.attrs[eff.attrKey] = (character.attrs[eff.attrKey]||1) + (eff.value||0);
        log.push(`🔥 ${ATTRS.find(a=>a.key===eff.attrKey)?.name||eff.attrKey} +${eff.value||0} por ${eff.duration||2} turnos`);
        break;
      }
      case 'combat_debuff': {
        combatEffects.push({ source: ab.name, type: 'debuff_enemy_ability', attr: eff.attrKey, value: eff.value||0, duration: eff.duration||2, turnsLeft: eff.duration||2 });
        log.push(`☠ ${ATTRS.find(a=>a.key===eff.attrKey)?.name||eff.attrKey} do inimigo −${eff.value||0} por ${eff.duration||2} turnos`);
        break;
      }
      case 'tag_apply':
        if (eff.tag) { setTag(eff.tag, eff.tagValue !== false); log.push(`🏷 "${eff.tag}"`); }
        break;
      case 'tag_timed':
        if (eff.tag) {
          if (!character.timedTags) character.timedTags = [];
          character.timedTags = character.timedTags.filter(t => !(t.tag === eff.tag && t.source === ab.name));
          // In combat, duration = turns, tracked via timedTags with combat flag
          character.timedTags.push({ tag: eff.tag, scenesLeft: eff.duration||2, source: ab.name, isCombatTurn: true });
          setTag(eff.tag, true);
          log.push(`⌛ "${eff.tag}" por ${eff.duration||2} turnos`);
        }
        break;
      default: break;
    }
  }

  // Update state
  st.cooldownLeft = ab.cooldown || 0;
  if (ab.maxUses > 0) st.usesLeft = Math.max(0, (st.usesLeft || ab.maxUses) - 1);
  character.abilityState[abId] = st;

  return `${ab.icon||'✨'} ${ab.name}: ${log.join(', ')}`;
}

// Tick combat ability cooldowns (call at end of player turn in combat)
function tickCombatAbilityCooldowns() {
  if (!character.abilityState) return;
  const abs = getPlayerCombatAbilities();
  abs.forEach(ab => {
    const st = character.abilityState[ab.id];
    if (st && st.cooldownLeft > 0) st.cooldownLeft--;
  });
  // Tick combat timed buffs
  combatEffects.forEach(e => {
    if (e.type === 'buff_player_ability' && e.turnsLeft > 0) {
      e.turnsLeft--;
      if (e.turnsLeft <= 0 && character.attrs[e.attr] !== undefined) {
        character.attrs[e.attr] = Math.max(1, (character.attrs[e.attr]||1) - (e.value||0));
      }
    }
  });
  combatEffects = combatEffects.filter(e => !(e.type === 'buff_player_ability' && e.turnsLeft <= 0));
  // Tick combat timed tags
  if (character.timedTags) {
    character.timedTags.forEach(t => {
      if (t.isCombatTurn) { t.scenesLeft = Math.max(0, (t.scenesLeft||1) - 1); }
    });
    character.timedTags.forEach(t => { if (t.scenesLeft <= 0) setTag(t.tag, false); });
    character.timedTags = character.timedTags.filter(t => t.scenesLeft > 0);
  }
}

// ─── Conditions check ────────────────────────────────────────
function abilityConditionsMet(ab) {
  if (ab.requireTags?.length && !ab.requireTags.every(t => hasTag(t))) return false;
  if (ab.excludeTags?.length && ab.excludeTags.some(t => hasTag(t))) return false;
  return true;
}

// ─── HUD rendering (in-game abilities panel) ─────────────────
function updateAbilitiesHud() {
  const hud = document.getElementById('abilities-hud');
  if (!hud) return;
  const abs = character.abilities || [];
  const explorationActives = abs.filter(ab =>
    ab.type === 'active' && ab.context === 'exploration' && abilityConditionsMet(ab)
  );
  const passives = abs.filter(ab => ab.type === 'passive' && abilityConditionsMet(ab));

  if (!abs.length) { hud.style.display = 'none'; return; }
  hud.style.display = 'block';

  let html = '';

  if (passives.length) {
    html += `<div style="font-size:0.6rem;color:var(--stone);letter-spacing:0.08em;margin-bottom:0.3rem;">PASSIVAS</div>`;
    html += passives.map(ab => `
      <div class="ability-chip passive" title="${escHtml(ab.desc||ab.name)}">
        <span>${escHtml(ab.icon||'✦')}</span>
        <span style="font-size:0.7rem;">${escHtml(ab.name)}</span>
      </div>`).join('');
  }

  if (explorationActives.length) {
    html += `<div style="font-size:0.6rem;color:var(--stone);letter-spacing:0.08em;margin:0.5rem 0 0.3rem;">HABILIDADES</div>`;
    html += explorationActives.map(ab => {
      const st = (character.abilityState||{})[ab.id] || { cooldownLeft:0, usesLeft: ab.maxUses };
      const onCd = st.cooldownLeft > 0;
      const noUses = ab.maxUses > 0 && st.usesLeft <= 0;
      const disabled = onCd || noUses;
      const usesText = ab.maxUses > 0 ? ` (${st.usesLeft||0}/${ab.maxUses})` : '';
      const cdText   = onCd ? ` ⏳${st.cooldownLeft}` : '';
      return `<button class="ability-chip active-btn ${disabled?'disabled':''}"
        onclick="${disabled ? '' : `activateExplorationAbility('${ab.id}')`}"
        title="${escHtml(ab.desc||ab.name)}"
        ${disabled ? 'disabled' : ''}>
        <span>${escHtml(ab.icon||'⚡')}</span>
        <span style="font-size:0.7rem;">${escHtml(ab.name)}${usesText}${cdText}</span>
      </button>`;
    }).join('');
  }

  hud.innerHTML = html;
}

// ─── Build combat ability buttons for the player ─────────────
function buildPlayerAbilityButtons() {
  const abs = getPlayerCombatAbilities();
  if (!abs.length) return '';
  return abs.map(ab => {
    const st = (character.abilityState||{})[ab.id] || { cooldownLeft:0, usesLeft: ab.maxUses };
    const onCd   = st.cooldownLeft > 0;
    const noUses = ab.maxUses > 0 && st.usesLeft <= 0;
    const disabled = onCd || noUses;
    const usesText = ab.maxUses > 0 ? ` (${st.usesLeft||0})` : '';
    const cdText   = onCd ? ` ⏳${st.cooldownLeft}` : '';
    return `<button class="combat-btn ability-combat-btn ${disabled?'disabled':''}"
      style="border-color:rgba(128,200,160,0.5);color:#80c8a0;"
      onclick="${disabled ? '' : `doPlayerAbility('${ab.id}')`}"
      ${disabled ? 'disabled' : ''}
      title="${escHtml(ab.desc||'')}">
      ${escHtml(ab.icon||'✨')} ${escHtml(ab.name)}${usesText}${cdText}
    </button>`;
  }).join('');
}

// Called from combat_runtime when player picks ability action
async function doPlayerAbility(abId) {
  const log = await executePlayerCombatAbility(abId);
  if (log) combatLog(`✦ Jogador usa ${log}`, 'player-ability');
  tickCombatAbilityCooldowns();
  // Re-render combat UI to update button states
  if (typeof renderCombatUI === 'function') renderCombatUI();
}
