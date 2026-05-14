// ═══════════════════════════════════════════════════════════
//  EDITOR — adventure editor, scene nodes, classes, tag rules
// ═══════════════════════════════════════════════════════════

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
//  Cada classe: {
//    name, icon, desc,
//    primaryAttr,       — atributo de ATAQUE (acerto + dano principal)
//    damageAttr,        — atributo de DANO (separado, opcional)
//    dodgeAttr,         — atributo de ESQUIVA do jogador (reduz dano recebido)
//    defenseAttr,       — atributo de DEFESA/ARMADURA (absorção extra)
//    bonusVida,         — bônus fixo de vida de combate
//    attrPoints,        — { forca:N, destreza:N, ... } distribuição inicial
//    initialTags,       — "tag1, tag2, ..." — tags concedidas ao escolher
//    passiveDesc,       — texto de habilidade passiva (flavor)
//  }
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

// Soma de pontos de atributo customizados (para validação visual)
function classAttrTotal(cc) {
  const pts = cc.attrPoints || {};
  return ATTRS.reduce((s, a) => s + (pts[a.key] || ATTR_MIN), 0);
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

  const ATTR_OPT = ATTRS.map(a => ({ key: a.key, label: `${a.icon} ${a.name}` }));

  container.innerHTML = classes.map((cc, idx) => {
    const pts = cc.attrPoints || {};
    const total = classAttrTotal(cc);
    const overBudget = total > TOTAL_POINTS;

    // Attr distribution mini-grid
    const attrGrid = ATTRS.map(a => {
      const v = pts[a.key] || ATTR_MIN;
      return `
        <div style="display:flex;flex-direction:column;align-items:center;gap:0.1rem;">
          <span style="font-size:0.9rem;">${a.icon}</span>
          <span style="font-size:0.55rem;color:var(--stone);text-align:center;line-height:1.1;">${a.name.substring(0,3).toUpperCase()}</span>
          <div style="display:flex;align-items:center;gap:2px;">
            <button class="attr-btn" style="font-size:0.65rem;width:16px;height:16px;padding:0;"
              onclick="classAttrChange(${idx},'${a.key}',-1)" ${v<=ATTR_MIN?'disabled':''}>−</button>
            <span style="font-size:0.78rem;font-weight:bold;min-width:14px;text-align:center;">${v}</span>
            <button class="attr-btn" style="font-size:0.65rem;width:16px;height:16px;padding:0;"
              onclick="classAttrChange(${idx},'${a.key}',1)" ${v>=ATTR_MAX_CREATION||total>=TOTAL_POINTS?'disabled':''}>+</button>
          </div>
        </div>`;
    }).join('');

    const selAttr = (field, current, label) => `
      <div>
        <label class="field-label" style="font-size:0.58rem;">${label}</label>
        <select class="field-select" style="font-size:0.68rem;" onchange="updateCustomClass(${idx},'${field}',this.value)">
          <option value="">— padrão —</option>
          ${ATTR_OPT.map(o => `<option value="${o.key}" ${current===o.key?'selected':''}>${o.label}</option>`).join('')}
        </select>
      </div>`;

    return `
      <div style="border:1px solid rgba(201,162,39,0.22);padding:0.85rem 0.75rem;margin-bottom:0.7rem;
                  background:rgba(0,0,0,0.14);border-radius:3px;">

        <!-- Row 1: icon / name / desc / delete -->
        <div style="display:grid;grid-template-columns:52px 1fr auto;gap:0.5rem;align-items:start;margin-bottom:0.6rem;">
          <div>
            <label class="field-label" style="font-size:0.58rem;">Ícone</label>
            <input class="field-input" value="${escHtml(cc.icon||'⚔️')}"
              style="text-align:center;font-size:1.3rem;padding:0.15rem;width:100%;"
              oninput="updateCustomClass(${idx},'icon',this.value)">
          </div>
          <div style="display:flex;flex-direction:column;gap:0.3rem;">
            <div>
              <label class="field-label" style="font-size:0.58rem;">Nome</label>
              <input class="field-input" value="${escHtml(cc.name||'Nova Classe')}"
                oninput="updateCustomClass(${idx},'name',this.value)">
            </div>
            <div>
              <label class="field-label" style="font-size:0.58rem;">Descrição</label>
              <input class="field-input" value="${escHtml(cc.desc||'')}"
                placeholder="Ex: Especialista em furtividade e precisão..."
                oninput="updateCustomClass(${idx},'desc',this.value)">
            </div>
          </div>
          <button class="btn-sm red" style="margin-top:1.1rem;" onclick="deleteCustomClass(${idx})">✕</button>
        </div>

        <!-- Row 2: Combat attributes (4 selects) -->
        <div style="border-top:1px solid rgba(201,162,39,0.12);padding-top:0.55rem;margin-bottom:0.55rem;">
          <label class="field-label" style="font-size:0.6rem;margin-bottom:0.35rem;display:block;">
            ⚔ Atributos de Combate
            <span style="color:var(--stone);font-weight:normal;"> — deixe em branco para usar padrão do sistema</span>
          </label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.4rem;">
            ${selAttr('primaryAttr', cc.primaryAttr||'', '🎯 Ataque (acerto)')}
            ${selAttr('damageAttr',  cc.damageAttr ||'', '💥 Dano (bônus de dano)')}
            ${selAttr('dodgeAttr',   cc.dodgeAttr  ||'', '💨 Esquiva (reduz dano recebido)')}
            ${selAttr('defenseAttr', cc.defenseAttr||'', '🛡 Defesa (armadura)')}
          </div>
        </div>

        <!-- Row 3: Bonus vida + passive desc -->
        <div style="display:grid;grid-template-columns:100px 1fr;gap:0.4rem;margin-bottom:0.55rem;">
          <div>
            <label class="field-label" style="font-size:0.58rem;">❤ Bônus de Vida</label>
            <input class="field-input" type="number" min="-10" max="30"
              value="${cc.bonusVida||0}"
              style="font-size:0.78rem;text-align:center;"
              oninput="updateCustomClass(${idx},'bonusVida',+this.value)">
          </div>
          <div>
            <label class="field-label" style="font-size:0.58rem;">✨ Habilidade Passiva <span style="color:var(--stone);font-weight:normal;">(exibida na seleção)</span></label>
            <input class="field-input" value="${escHtml(cc.passiveDesc||'')}"
              placeholder="Ex: Furtividade — ataques surpresa causam dano duplo..."
              oninput="updateCustomClass(${idx},'passiveDesc',this.value)">
          </div>
        </div>

        <!-- Row 4: Initial tags -->
        <div style="margin-bottom:0.55rem;">
          <label class="field-label" style="font-size:0.58rem;">🏷 Tags Iniciais
            <span style="color:var(--stone);font-weight:normal;"> — concedidas ao escolher esta classe (separadas por vírgula)</span>
          </label>
          <input class="field-input" value="${escHtml((cc.initialTags||[]).join(', '))}"
            placeholder="Ex: guerreiro, portador_escudo, treinado_espada"
            oninput="updateClassTags(${idx},this.value)">
        </div>

        <!-- Row 4b: Class abilities -->
        <div style="margin-bottom:0.55rem;">
          <label class="field-label" style="font-size:0.58rem;">✦ Habilidades Concedidas
            <span style="color:var(--stone);font-weight:normal;"> — o jogador recebe essas habilidades ao escolher esta classe</span>
          </label>
          ${(function(){
            const allAbs = (editorAdventure.abilities||[]);
            if (!allAbs.length) return '<div style="font-size:0.72rem;color:var(--stone);font-style:italic;padding:0.3rem 0;">Nenhuma habilidade criada. Acesse <strong>✦ Habilidades</strong> para criar.</div>';
            const selected = cc.abilityIds || [];
            return '<div style="display:flex;flex-wrap:wrap;gap:0.35rem;margin-top:0.3rem;">' +
              allAbs.map(ab => {
                const isSel = selected.includes(ab.id);
                const typeColor = ab.type==='passive' ? '#80c8a0' : '#f0b860';
                return `<label style="display:flex;align-items:center;gap:0.3rem;cursor:pointer;font-size:0.72rem;padding:0.2rem 0.5rem;border-radius:3px;border:1px solid ${isSel?typeColor+'88':'rgba(90,80,64,0.3)'};background:${isSel?'rgba(0,0,0,0.3)':'transparent'};color:${isSel?typeColor:'var(--stone-light)'};">
                  <input type="checkbox" style="accent-color:${typeColor};" ${isSel?'checked':''} onchange="toggleClassAbility(${idx},'${ab.id}',this.checked)">
                  ${escHtml(ab.icon||'✦')} ${escHtml(ab.name)}
                  <span style="font-size:0.6rem;opacity:0.7;">(${ab.type==='passive'?'passiva':'ativa'})</span>
                </label>`;
              }).join('') + '</div>';
          })()}
        </div>

        <!-- Row 5: Attr point distribution -->
        <div style="border-top:1px solid rgba(201,162,39,0.12);padding-top:0.55rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem;">
            <label class="field-label" style="font-size:0.6rem;margin:0;">
              📊 Distribuição de Atributos
              <span style="color:var(--stone);font-weight:normal;"> — valores iniciais da classe no jogo</span>
            </label>
            <span style="font-size:0.65rem;color:${overBudget?'#e06060':'var(--stone)'};">
              ${total}/${TOTAL_POINTS} pts ${overBudget?'⚠ acima do limite':''}
            </span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:0.3rem;">
            ${attrGrid}
          </div>
          <div style="margin-top:0.35rem;display:flex;gap:0.4rem;">
            <button class="btn-sm" style="font-size:0.6rem;padding:0.15rem 0.5rem;"
              onclick="classAttrReset(${idx})">↺ Resetar</button>
            <button class="btn-sm" style="font-size:0.6rem;padding:0.15rem 0.5rem;"
              onclick="classAttrFromPrimary(${idx})">⚡ Auto (primário=5)</button>
          </div>
        </div>

      </div>`;
  }).join('');
}

function addCustomClass() {
  const classes = getEditorClasses();
  classes.push({ name: 'Nova Classe', icon: '⚔️', desc: '', attrPoints: {}, initialTags: [] });
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

function updateClassTags(idx, raw) {
  const classes = getEditorClasses();
  if (!classes[idx]) return;
  classes[idx].initialTags = raw.split(',').map(t => t.trim()).filter(Boolean);
}

function toggleClassAbility(idx, abId, enabled) {
  const classes = getEditorClasses();
  if (!classes[idx]) return;
  if (!classes[idx].abilityIds) classes[idx].abilityIds = [];
  if (enabled) {
    if (!classes[idx].abilityIds.includes(abId)) classes[idx].abilityIds.push(abId);
  } else {
    classes[idx].abilityIds = classes[idx].abilityIds.filter(id => id !== abId);
  }
}

function classAttrChange(idx, attrKey, delta) {
  const classes = getEditorClasses();
  if (!classes[idx]) return;
  if (!classes[idx].attrPoints) classes[idx].attrPoints = {};
  const pts = classes[idx].attrPoints;
  const cur = pts[attrKey] || ATTR_MIN;
  const total = classAttrTotal(classes[idx]);
  const next = cur + delta;
  if (next < ATTR_MIN || next > ATTR_MAX_CREATION) return;
  if (delta > 0 && total >= TOTAL_POINTS) return;
  pts[attrKey] = next;
  renderClassEditor();
}

function classAttrReset(idx) {
  const classes = getEditorClasses();
  if (!classes[idx]) return;
  classes[idx].attrPoints = {};
  renderClassEditor();
}

function classAttrFromPrimary(idx) {
  const classes = getEditorClasses();
  if (!classes[idx]) return;
  const primary = classes[idx].primaryAttr || 'forca';
  classes[idx].attrPoints = buildClassAttrs(primary);
  renderClassEditor();
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
        <!-- ── Ouro e Itens ── -->
        <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
          <span style="font-family:'Cinzel',serif;font-size:0.6rem;letter-spacing:0.1em;color:var(--gold);text-transform:uppercase;min-width:3rem;">🪙 Ouro</span>
          <div style="display:flex;align-items:center;gap:0.3rem;">
            <span style="font-size:0.6rem;color:var(--stone-light);">Recebe/Perde:</span>
            <input class="points-mini-input" type="number" value="${c.ouro||0}" min="-9999" max="9999"
              title="Altera o ouro (negativo pode exigir pagamento, positivo é ganho)"
              onchange="updateChoice('${nodeId}',${i},'ouro',+this.value)" style="border-color:rgba(201,162,39,0.4);">
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;margin-top:0.2rem;">
          <span style="font-family:'Cinzel',serif;font-size:0.6rem;letter-spacing:0.1em;color:var(--gold-light);text-transform:uppercase;min-width:3rem;">🎒 Itens</span>
          <div style="display:flex;align-items:center;gap:0.3rem;flex:1;">
            <span style="font-size:0.6rem;color:var(--stone-light);">Dar Itens (ID):</span>
            <input class="field-input" style="font-size:0.62rem;flex:1;" placeholder="Ex: item_1, item_2"
              value="${escHtml((c.itemRewards||[]).join(', '))}"
              onchange="updateChoiceItemRewards('${nodeId}',${i},this.value)">
          </div>
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
    ${buildCombatRefHtml(nodeId, node)}
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

function updateChoiceItemRewards(nodeId, idx, value) {
  const choice = editorAdventure.nodes[nodeId].choices[idx];
  if (!choice) return;
  const items = value.split(',').map(i => i.trim()).filter(Boolean);
  choice.itemRewards = items;
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
