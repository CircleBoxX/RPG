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

    if ((node.combat || node.combatId) && !node.ending) {
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

  OverlayManager.enqueue(() => {
    document.getElementById('roll-attr-name').textContent =
      `Teste de ${attrInfo?.name||attrKey} (${attrVal}) · Dificuldade ${difficulty}`;
    document.getElementById('roll-choice-text').textContent = choice.text;
    document.getElementById('roll-dice').textContent = '🎲';
    document.getElementById('roll-number').style.color = 'var(--gold)';

    OverlayManager.setActive('roll-overlay');

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
      OverlayManager.closeActive('roll-overlay');
      if (success && choice.pointsSuccess) addScore(choice.pointsSuccess, 'roll', `◈ Sucesso: ${choice.text.substring(0,30)}`);
      if (!success && choice.pointsFail)   addScore(choice.pointsFail,   'roll', `◈ Falha: ${choice.text.substring(0,30)}`);
      if (nextNode && activeSidequest?.nodes?.[nextNode]) {
        renderSqScene(nextNode);
      } else {
        endSidequest(success);
      }
    };
  });
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

  OverlayManager.enqueue(() => {
    OverlayManager.setActive('sq-result-overlay');

    document.getElementById('sq-result-continue-btn').onclick = () => {
      OverlayManager.closeActive('sq-result-overlay');
      const badge = document.getElementById('sq-hud-badge');
      if (badge) badge.remove();
      renderCharHud();
      // Return to main story
      if (sqReturnNodeId) {
        renderScene(sqReturnNodeId);
      }
      sqReturnNodeId = null;
    };
  });
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
