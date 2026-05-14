// ═══════════════════════════════════════════════════════════
//  SCORE & EPILOGUE
// ═══════════════════════════════════════════════════════════

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
  resetEncounterFlags();
  // Reset character attrs to initial class preset if possible (or go to char screen)
  character.attrs = { forca:1, destreza:1, inteligencia:1, carisma:1, sabedoria:1, constituicao:1 };
  character.vidaMax = calcMaxVida(character.attrs);
  character.vida = character.vidaMax;
  character.sanidadeMax = calcMaxSanidade(character.attrs);
  character.sanidade = character.sanidadeMax;
  character.vidaCombateMax = calcVidaCombate(character.attrs);
  character.vidaCombate    = character.vidaCombateMax;
  pendingAdventure = currentAdventure;
  showScreen('screen-char');
}

// ═══════════════════════════════════════════════════════════
//  DIALOGUE SYSTEM — Runtime
// ═══════════════════════════════════════════════════════════

