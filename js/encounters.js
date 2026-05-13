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

  // Reset all phases
  document.getElementById('enc-responses-area').style.display = 'none';
  document.getElementById('enc-roll-area').style.display = 'none';
  document.getElementById('enc-effects-area').style.display = 'none';
  document.getElementById('enc-continue-btn').style.display = 'none';

  // Flash banner briefly before overlay (cosmetic)
  const flash = document.createElement('div');
  flash.className = 'enc-hud-flash';
  flash.textContent = '— Encontro —';
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 2500);

  overlay.style.display = 'flex';

  // ── If the encounter has response options, show them ──
  const responses = enc.responses || [];
  if (responses.length > 0) {
    _showEncounterResponses(enc, responses);
  } else {
    // Legacy: no responses — show effects immediately and a continue button
    _showEncounterEffectsAndContinue(enc, enc);
  }
}

// Build and show encounter response choices
function _showEncounterResponses(enc, responses) {
  const area = document.getElementById('enc-responses-area');
  const list = document.getElementById('enc-responses-list');

  list.innerHTML = responses.map((resp, i) => {
    let badge = '';
    if (resp.attrCheck) {
      const attrVal = character.attrs[resp.attrCheck] || 1;
      const chance = calcSuccessChance(attrVal, resp.difficulty || 5);
      const tier = chance >= 75 ? 'easy' : chance >= 50 ? 'medium' : chance >= 30 ? 'hard' : 'vhard';
      const attrInfo = ATTRS.find(a => a.key === resp.attrCheck);
      badge = `<span class="choice-attr-badge ${tier}">${attrInfo?.icon || ''} ${attrInfo?.name || resp.attrCheck} · ${chance}%</span>`;
    }
    return `<button class="enc-response-btn" onclick="_selectEncounterResponse(${i})">
      <span class="choice-num">${String.fromCharCode(73 + i)}.</span>
      <span>${escHtmlRuntime(resp.text || '')}${badge}</span>
    </button>`;
  }).join('');

  area.style.display = 'block';
}

// Called when player picks a response
function _selectEncounterResponse(idx) {
  const enc = activeEncounter?.enc;
  if (!enc) return;
  const responses = enc.responses || [];
  const resp = responses[idx];
  if (!resp) return;

  // Hide response buttons
  document.getElementById('enc-responses-area').style.display = 'none';

  if (resp.attrCheck) {
    // Do an attribute roll, then show outcome
    _doEncounterRoll(enc, resp);
  } else {
    // No roll — use the response's direct effects (or successOutcome as default branch)
    const outcome = {
      vida:       resp.successVida      ?? resp.vida      ?? 0,
      sanidade:   resp.successSanidade  ?? resp.sanidade  ?? 0,
      points:     resp.successPoints    ?? resp.points    ?? 0,
      attrDeltas: resp.successAttrDeltas || resp.attrDeltas || {},
      grantTags:  resp.successGrantTags  || resp.grantTags  || [],
    };
    // Show response text if present
    if (resp.successText || resp.text) {
      const txtEl = document.getElementById('enc-roll-outcome-text');
      const rollArea = document.getElementById('enc-roll-area');
      const displayText = resp.successText || '';
      if (displayText) {
        txtEl.innerHTML = interpolateText(displayText.replace(/\n/g, '<br>'));
        rollArea.style.display = 'block';
        setTimeout(() => _showEncounterEffectsAndContinue(enc, outcome), 400);
        return;
      }
    }
    _showEncounterEffectsAndContinue(enc, outcome);
  }
}

// Attribute roll within an encounter
function _doEncounterRoll(enc, resp) {
  const attrKey = resp.attrCheck;
  const difficulty = resp.difficulty || 5;
  const attrVal = character.attrs[attrKey] || 1;
  const attrInfo = ATTRS.find(a => a.key === attrKey);
  const chance = calcSuccessChance(attrVal, difficulty);
  const roll = Math.floor(Math.random() * 100) + 1;
  const success = roll <= chance;

  const rollArea = document.getElementById('enc-roll-area');
  rollArea.style.display = 'block';

  document.getElementById('enc-roll-attr-name').textContent =
    `Teste de ${attrInfo?.name || attrKey} (${attrVal}) · Dificuldade ${difficulty}`;
  const numEl = document.getElementById('enc-roll-number');
  const vsEl  = document.getElementById('enc-roll-vs');
  const resEl = document.getElementById('enc-roll-result');
  const txtEl = document.getElementById('enc-roll-outcome-text');

  numEl.style.color = 'var(--gold)';
  vsEl.textContent  = '';
  resEl.className   = 'roll-result';
  resEl.textContent = '';
  txtEl.textContent = '';

  // Animate number
  let frame = 0;
  const anim = setInterval(() => {
    numEl.textContent = Math.floor(Math.random() * 100) + 1;
    frame++;
    if (frame >= 14) {
      clearInterval(anim);
      numEl.textContent = roll;
      numEl.style.color = success ? '#4a8' : '#cc4444';
      vsEl.textContent  = `Precisava ≤ ${chance} para ter sucesso`;
      resEl.className   = 'roll-result ' + (success ? 'success' : 'failure');
      resEl.textContent = success ? '✦ SUCESSO ✦' : '✦ FALHOU ✦';

      // Build outcome object from success/fail branches on the response
      const outcome = success
        ? {
            vida:       resp.successVida      ?? 0,
            sanidade:   resp.successSanidade  ?? 0,
            points:     resp.successPoints    ?? 0,
            attrDeltas: resp.successAttrDeltas || {},
            grantTags:  resp.successGrantTags  || [],
          }
        : {
            vida:       resp.failVida      ?? 0,
            sanidade:   resp.failSanidade  ?? 0,
            points:     resp.failPoints    ?? 0,
            attrDeltas: resp.failAttrDeltas || {},
            grantTags:  resp.failGrantTags  || [],
          };

      // Show outcome flavour text
      const outcomeText = success ? (resp.successText || '') : (resp.failText || '');
      if (outcomeText) {
        txtEl.innerHTML = interpolateText(outcomeText.replace(/\n/g, '<br>'));
      }

      // After short delay show effects + continue
      setTimeout(() => _showEncounterEffectsAndContinue(enc, outcome), 1000);
    }
  }, 60);
}

// Build effects chips for a given effect source (enc or response outcome)
function _buildEffectChips(src) {
  const effects = [];
  const ANAMES = { forca:'Força', destreza:'Destreza', inteligencia:'Int', carisma:'Carisma', sabedoria:'Sab', constituicao:'Con' };
  if (src.vida)     effects.push({ label: `❤️ Vida ${src.vida > 0 ? '+' : ''}${src.vida}`,       cls: src.vida > 0 ? 'pos' : 'neg' });
  if (src.sanidade) effects.push({ label: `🧠 San ${src.sanidade > 0 ? '+' : ''}${src.sanidade}`, cls: src.sanidade > 0 ? 'pos' : 'neg' });
  if (src.attrDeltas) {
    Object.entries(src.attrDeltas).forEach(([k, v]) => {
      if (v) effects.push({ label: `${ANAMES[k]||k} ${v>0?'+':''}${v}`, cls: v > 0 ? 'pos' : 'neg' });
    });
  }
  if (src.points) effects.push({ label: `⭐ ${src.points > 0 ? '+' : ''}${src.points} pts`, cls: src.points > 0 ? 'pos' : 'neg' });
  if (src.grantTags?.length) src.grantTags.forEach(t => effects.push({ label: `🏷 ${t}`, cls: 'tag' }));
  return effects;
}

// Show effects chips then enable the continue button
function _showEncounterEffectsAndContinue(enc, effectSrc) {
  // Merge enc-level base effects with the outcome/response effects
  const combined = {
    vida:       (enc.vida      || 0) + (effectSrc !== enc ? (effectSrc.vida      || 0) : 0),
    sanidade:   (enc.sanidade  || 0) + (effectSrc !== enc ? (effectSrc.sanidade  || 0) : 0),
    points:     (enc.points    || 0) + (effectSrc !== enc ? (effectSrc.points    || 0) : 0),
    attrDeltas: { ...enc.attrDeltas, ...effectSrc.attrDeltas },
    grantTags:  [...(enc.grantTags || []), ...(effectSrc.grantTags || [])],
  };
  // If effectSrc IS enc (no responses), just use enc directly
  const src = effectSrc === enc ? enc : combined;

  const effects = _buildEffectChips(src);
  const efEl = document.getElementById('enc-effects');
  efEl.innerHTML = effects.length
    ? effects.map(e => `<span class="enc-effect-chip ${e.cls}">${escHtmlRuntime(e.label)}</span>`).join('')
    : `<span style="font-size:0.8rem;color:var(--stone);font-style:italic;">Sem efeitos adicionais.</span>`;

  document.getElementById('enc-effects-area').style.display = 'block';

  const btn = document.getElementById('enc-continue-btn');
  btn.style.display = 'block';
  btn.onclick = () => {
    document.getElementById('encounter-overlay').style.display = 'none';
    _applyEncounterEffects(src);
  };
}

// Apply encounter effects and return to story
function _applyEncounterEffects(src) {
  if (src.vida)     changeVida(src.vida);
  if (src.sanidade) changeSanidade(src.sanidade);
  if (src.points)   addScore(src.points, 'choice', `🎲 Encontro`);
  if (src.attrDeltas) {
    Object.entries(src.attrDeltas).forEach(([k, v]) => {
      if (v && character.attrs[k] !== undefined) {
        character.attrs[k] = Math.max(1, Math.min(ATTR_MAX, character.attrs[k] + v));
      }
    });
    renderCharHud();
  }
  if (src.grantTags?.length) {
    src.grantTags.forEach(t => setTag(t, true));
  }
  activeEncounter = null;
}

// Legacy wrapper kept for any external callers
function resolveEncounter() {
  if (!activeEncounter) return;
  _applyEncounterEffects(activeEncounter.enc);
  activeEncounter = null;
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
    responses: [],   // { text, attrCheck, difficulty, successText, failText, successVida, failVida, successSanidade, failSanidade, successPoints, failPoints, successGrantTags, failGrantTags }
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
  // ─── refactored: uses CSS classes from encounter.css for visual consistency ───

  const allMainNodes = Object.values(editorAdventure.nodes);
  const ATTRS_ENC = ['forca','destreza','inteligencia','carisma','sabedoria','constituicao'];
  const ATTR_NAMES_ENC = { forca:'⚔️ Força', destreza:'🗡️ Destreza', inteligencia:'📚 Int', carisma:'🎶 Carisma', sabedoria:'🏹 Sabedoria', constituicao:'🛡️ Con' };
  const ATTR_KEYS_FOR_SELECT = [
    { key: '', label: '— Nenhum teste —' },
    { key: 'forca', label: '⚔️ Força' },
    { key: 'destreza', label: '🗡️ Destreza' },
    { key: 'inteligencia', label: '📚 Inteligência' },
    { key: 'carisma', label: '🎶 Carisma' },
    { key: 'sabedoria', label: '🏹 Sabedoria' },
    { key: 'constituicao', label: '🛡️ Constituição' },
  ];

  // ── Base attribute delta rows ──
  const attrRows = ATTRS_ENC.map(k => {
    const v = (enc.attrDeltas || {})[k] || 0;
    const cls = v > 0 ? 'pos' : v < 0 ? 'neg' : '';
    return `<div class="enc-attr-row">
      <span class="enc-attr-label">${ATTR_NAMES_ENC[k]}</span>
      <button class="reward-delta-btn neg" onclick="changeEncAttr('${encId}','${k}',-1)">−</button>
      <span class="reward-val ${cls}" style="min-width:2rem;text-align:center;">${v > 0 ? '+' : ''}${v}</span>
      <button class="reward-delta-btn" onclick="changeEncAttr('${encId}','${k}',1)">+</button>
    </div>`;
  }).join('');

  // ── Trigger node checkboxes ──
  const triggerChecks = allMainNodes.map(n => {
    const checked = (enc.triggerNodes || []).includes(n.id);
    return `<label style="display:flex;align-items:center;gap:0.5rem;font-size:0.75rem;color:var(--parchment-dark);margin-bottom:0.3rem;cursor:pointer;">
      <input type="checkbox" value="${n.id}" ${checked ? 'checked' : ''} onchange="toggleEncTrigger('${encId}','${n.id}',this.checked)" style="accent-color:#e8a44a;">
      <span>${escHtml(n.title || n.id)}</span>
    </label>`;
  }).join('') || '<div style="color:var(--stone);font-size:0.75rem;font-style:italic;">Crie cenas na história principal primeiro.</div>';

  // ── Response cards ──
  const responses = enc.responses || [];
  const attrSelectOpts = ATTR_KEYS_FOR_SELECT.map(a =>
    `<option value="${a.key}">${a.label}</option>`
  ).join('');

  const responseCards = responses.map((resp, i) => {
    const hasRoll = !!resp.attrCheck;
    return `
    <div class="enc-resp-card" id="enc-resp-card-${encId}-${i}">
      <div class="enc-resp-card-header">
        <span class="enc-resp-card-title">RESPOSTA ${i+1}</span>
        <button class="enc-resp-remove" onclick="removeEncResponse('${encId}',${i})" title="Remover">✕</button>
      </div>

      <div class="field-group" style="margin-bottom:0.5rem;">
        <label class="field-label" style="font-size:0.6rem;">Texto do botão (o que o jogador vê)</label>
        <input class="field-input" style="font-family:'IM Fell English',serif;font-size:0.88rem;"
          value="${escHtml(resp.text || '')}"
          oninput="updateEncResponse('${encId}',${i},'text',this.value)"
          placeholder="Ex: Enfrentar a criatura corajosamente">
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.6rem;">
        <div>
          <label class="field-label" style="font-size:0.6rem;">Teste de Atributo</label>
          <select class="field-select" style="border-color:rgba(232,164,74,0.3);font-size:0.8rem;"
            onchange="updateEncResponse('${encId}',${i},'attrCheck',this.value);renderEncEditor('${encId}');">
            ${ATTR_KEYS_FOR_SELECT.map(a => `<option value="${a.key}" ${resp.attrCheck===a.key?'selected':''}>${a.label}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="field-label" style="font-size:0.6rem;">Dificuldade (1–10)</label>
          <input class="field-input" type="number" min="1" max="10"
            value="${resp.difficulty || 5}"
            onchange="updateEncResponse('${encId}',${i},'difficulty',+this.value)"
            style="border-color:rgba(232,164,74,0.3);"
            ${hasRoll ? '' : 'disabled style="opacity:0.3;border-color:rgba(232,164,74,0.1);"'}>
        </div>
      </div>

      <!-- Sucesso / Efeito -->
      <div class="enc-resp-success-block">
        <div class="enc-resp-block-label success">✦ ${hasRoll ? 'SUCESSO' : 'EFEITO'}</div>
        <div class="field-group" style="margin-bottom:0.4rem;">
          <label class="field-label" style="font-size:0.6rem;">${hasRoll ? 'Texto de sucesso (narrativa)' : 'Texto da resolução (narrativa)'}</label>
          <textarea class="field-textarea" style="min-height:55px;font-family:'IM Fell English',serif;font-size:0.83rem;"
            oninput="updateEncResponse('${encId}',${i},'successText',this.value)"
            placeholder="O que acontece ao ${hasRoll ? 'ter sucesso' : 'escolher isso'}...">${escHtml(resp.successText || '')}</textarea>
        </div>
        <div class="enc-resp-delta-grid">
          <div>
            <label class="field-label" style="font-size:0.55rem;">❤️ Vida</label>
            <input class="field-input" type="number" min="-99" max="99" value="${resp.successVida||0}"
              onchange="updateEncResponse('${encId}',${i},'successVida',+this.value)"
              style="font-size:0.8rem;border-color:rgba(204,68,68,0.3);">
          </div>
          <div>
            <label class="field-label" style="font-size:0.55rem;">🧠 San</label>
            <input class="field-input" type="number" min="-99" max="99" value="${resp.successSanidade||0}"
              onchange="updateEncResponse('${encId}',${i},'successSanidade',+this.value)"
              style="font-size:0.8rem;border-color:rgba(147,112,219,0.3);">
          </div>
          <div>
            <label class="field-label" style="font-size:0.55rem;">⭐ Pts</label>
            <input class="field-input" type="number" min="-9999" max="9999" value="${resp.successPoints||0}"
              onchange="updateEncResponse('${encId}',${i},'successPoints',+this.value)"
              style="font-size:0.8rem;border-color:rgba(201,162,39,0.3);">
          </div>
        </div>
        <div class="field-group" style="margin-top:0.4rem;margin-bottom:0;">
          <label class="field-label" style="font-size:0.55rem;">Tags concedidas no ${hasRoll ? 'sucesso' : 'efeito'} (vírgula)</label>
          <input class="field-input" style="font-size:0.78rem;" placeholder="ex: VenceuLadrao"
            value="${escHtml((resp.successGrantTags||[]).join(', '))}"
            onchange="updateEncResponseTags('${encId}',${i},'successGrantTags',this.value)">
        </div>
      </div>

      ${hasRoll ? `<!-- Falha -->
      <div class="enc-resp-fail-block">
        <div class="enc-resp-block-label fail">✦ FALHA</div>
        <div class="field-group" style="margin-bottom:0.4rem;">
          <label class="field-label" style="font-size:0.6rem;">Texto de falha (narrativa)</label>
          <textarea class="field-textarea" style="min-height:55px;font-family:'IM Fell English',serif;font-size:0.83rem;"
            oninput="updateEncResponse('${encId}',${i},'failText',this.value)"
            placeholder="O que acontece ao falhar...">${escHtml(resp.failText || '')}</textarea>
        </div>
        <div class="enc-resp-delta-grid">
          <div>
            <label class="field-label" style="font-size:0.55rem;">❤️ Vida</label>
            <input class="field-input" type="number" min="-99" max="99" value="${resp.failVida||0}"
              onchange="updateEncResponse('${encId}',${i},'failVida',+this.value)"
              style="font-size:0.8rem;border-color:rgba(204,68,68,0.3);">
          </div>
          <div>
            <label class="field-label" style="font-size:0.55rem;">🧠 San</label>
            <input class="field-input" type="number" min="-99" max="99" value="${resp.failSanidade||0}"
              onchange="updateEncResponse('${encId}',${i},'failSanidade',+this.value)"
              style="font-size:0.8rem;border-color:rgba(147,112,219,0.3);">
          </div>
          <div>
            <label class="field-label" style="font-size:0.55rem;">⭐ Pts</label>
            <input class="field-input" type="number" min="-9999" max="9999" value="${resp.failPoints||0}"
              onchange="updateEncResponse('${encId}',${i},'failPoints',+this.value)"
              style="font-size:0.8rem;border-color:rgba(201,162,39,0.3);">
          </div>
        </div>
        <div class="field-group" style="margin-top:0.4rem;margin-bottom:0;">
          <label class="field-label" style="font-size:0.55rem;">Tags concedidas na falha (vírgula)</label>
          <input class="field-input" style="font-size:0.78rem;" placeholder="ex: FoiDetectado"
            value="${escHtml((resp.failGrantTags||[]).join(', '))}"
            onchange="updateEncResponseTags('${encId}',${i},'failGrantTags',this.value)">
        </div>
      </div>` : ''}
    </div>`;
  }).join('');

  document.getElementById('enc-node-editor').innerHTML = `
    <!-- Cabeçalho básico -->
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

    <!-- Texto narrativo do encontro (intro) -->
    <div class="field-group">
      <label class="field-label">Texto de Introdução do Encontro</label>
      <textarea class="field-textarea" style="min-height:100px;font-family:'Crimson Text',serif;font-size:0.9rem;" oninput="updateEnc('${encId}','text',this.value)">${escHtml(enc.text)}</textarea>
      <div style="font-size:0.65rem;color:var(--stone);margin-top:0.3rem;font-style:italic;">Narração inicial exibida ao jogador. Use {{nome}}, {{forca}}, etc.</div>
    </div>

    <!-- Comportamento -->
    <div class="enc-section">
      <div class="enc-section-header">⚙ Comportamento</div>
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
    <div class="enc-section">
      <div class="enc-section-header">🗺 Gatilhos de Cena</div>
      <div class="enc-section-hint">Deixe tudo desmarcado para que o encontro possa aparecer em qualquer cena.</div>
      ${triggerChecks}
    </div>

    <!-- Tags -->
    <div class="enc-section purple">
      <div class="enc-section-header purple">🏷 Condições de Tag</div>
      <div class="field-group" style="margin-bottom:0.5rem;">
        <label class="field-label" style="font-size:0.6rem;">Requer estas tags (separadas por vírgula)</label>
        <input class="field-input" placeholder="ex: PossuiAmuleto, FoiAoForte" value="${escHtml((enc.requireTags||[]).join(', '))}" onchange="updateEncTagList('${encId}','requireTags',this.value)">
      </div>
      <div class="field-group" style="margin-bottom:0.5rem;">
        <label class="field-label" style="font-size:0.6rem;">Bloqueado se tiver estas tags (separadas por vírgula)</label>
        <input class="field-input" placeholder="ex: JaConheceMago" value="${escHtml((enc.excludeTags||[]).join(', '))}" onchange="updateEncTagList('${encId}','excludeTags',this.value)">
      </div>
      <div class="field-group" style="margin:0;">
        <label class="field-label" style="font-size:0.6rem;">Concede estas tags ao ocorrer — sem respostas (vírgula)</label>
        <input class="field-input" placeholder="ex: EncontrouMercador" value="${escHtml((enc.grantTags||[]).join(', '))}" onchange="updateEncTagList('${encId}','grantTags',this.value)">
      </div>
    </div>

    <!-- Efeitos base (sem respostas) -->
    <div class="enc-section">
      <div class="enc-section-header">⚡ Efeitos Base <span style="font-weight:400;font-size:0.6rem;color:var(--stone);text-transform:none;letter-spacing:0;">(aplicados quando NÃO há respostas configuradas)</span></div>
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
      <div class="enc-section-header" style="margin-bottom:0.5rem;">Alterações de Atributos</div>
      ${attrRows}
    </div>

    <!-- Respostas interativas -->
    <div class="enc-section blue">
      <div class="enc-section-header blue">
        <span>🎮 Respostas do Jogador</span>
        <button class="btn-sm" onclick="addEncResponse('${encId}')"
          style="border-color:rgba(100,160,255,0.4);color:#88b8ff;">+ Adicionar</button>
      </div>
      <div class="enc-section-hint">
        Dê ao jogador opções de reação. Cada resposta pode ter um teste de atributo com narrativas e efeitos distintos para sucesso e falha.
        Se nenhuma resposta for configurada, os <strong>Efeitos Base</strong> acima são aplicados automaticamente.
      </div>
      <div id="enc-responses-editor-${encId}">
        ${responseCards || '<div style="color:var(--stone);font-size:0.78rem;font-style:italic;text-align:center;padding:1rem 0;">Nenhuma resposta configurada. Clique em + Adicionar.</div>'}
      </div>
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

// ── Response CRUD helpers ──
function addEncResponse(encId) {
  const enc = getEditorEncounters().find(e => e.id === encId);
  if (!enc) return;
  if (!enc.responses) enc.responses = [];
  enc.responses.push({
    text: '',
    attrCheck: '',
    difficulty: 5,
    successText: '',
    failText: '',
    successVida: 0,
    failVida: 0,
    successSanidade: 0,
    failSanidade: 0,
    successPoints: 0,
    failPoints: 0,
    successGrantTags: [],
    failGrantTags: [],
  });
  renderEncEditor(encId);
}

function removeEncResponse(encId, idx) {
  const enc = getEditorEncounters().find(e => e.id === encId);
  if (!enc || !enc.responses) return;
  enc.responses.splice(idx, 1);
  renderEncEditor(encId);
}

function updateEncResponse(encId, idx, field, value) {
  const enc = getEditorEncounters().find(e => e.id === encId);
  if (!enc || !enc.responses?.[idx]) return;
  enc.responses[idx][field] = value;
}

function updateEncResponseTags(encId, idx, field, value) {
  const enc = getEditorEncounters().find(e => e.id === encId);
  if (!enc || !enc.responses?.[idx]) return;
  enc.responses[idx][field] = value.split(',').map(t => t.trim()).filter(Boolean);
}

// ═══════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════
loadSavedAdventures();