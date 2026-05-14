// ═══════════════════════════════════════════════════════════
//  GAME — character creation, scene rendering, attr rolls
// ═══════════════════════════════════════════════════════════

//  GAME ENGINE
// ═══════════════════════════════════════════════════════════
function startAdventure(adv) {
  pendingAdventure = adv;
  showScreen('screen-char');
}

// Restart same adventure with same character (skip char creation)
function restartCurrentAdventure() {
  if (!currentAdventure) return;
  // Limpa overlays que possam ter ficado abertos
  OverlayManager.forceCloseAll();
  combatState = null;
  currentNodeId = currentAdventure.meta.startNode;
  sceneCount = 0;
  history = [];
  epilogueLog = { mainEnding: null, sqResults: [], totalChoices: 0, sqCompleted: 0 };
  character.tags = {};
  character.abilityState = {};
  character.timedTags = [];
  character._tempBuffs = [];
  character.ouro = 0;
  character.inventario = [];
  character.equipamento = { arma: null, armadura: null, acessorio: null };
  character.combatStats = { danoBonus: 0, precisaoBonus: 0, armadura: 0, esquivaBonus: 0 };
  character._pendingWeaponEffects = [];
  // Re-apply passive abilities from class
  if (typeof applyPassiveAbilities === 'function') applyPassiveAbilities();
  // Reset SQ completion flags
  if (currentAdventure.sidequests) {
    currentAdventure.sidequests.forEach(sq => { delete sq._completed; });
  }
  resetEncounterFlags();
  resetScore();
  renderCharHud();
  renderScene(currentNodeId);
}

// ── Text interpolation: {{nome}}, {{forca}}, {{destreza}}, etc.
// Returns plain values — sem tags <em> para não poluir o diálogo visualmente.
function interpolateText(text) {
  if (!text) return text;
  const attrLabels = {
    forca: 'Força', destreza: 'Destreza', inteligencia: 'Inteligência',
    carisma: 'Carisma', sabedoria: 'Sabedoria', constituicao: 'Constituição'
  };
  return text
    .replace(/\{\{nome\}\}/gi, escHtmlRuntime(character.name || 'Aventureiro'))
    .replace(/\{\{(\w+)\}\}/gi, (_, key) => {
      const k = key.toLowerCase();
      // Retorna o valor numérico do atributo diretamente
      if (character.attrs[k] !== undefined) {
        return String(character.attrs[k]);
      }
      // Retorna o nome do atributo se for só o nome (ex: {{Força}} sem valor)
      if (attrLabels[k]) return attrLabels[k];
      // Classe do personagem atual (se definida)
      if (k === 'classe' && character.className) return escHtmlRuntime(character.className);
      return `{{${key}}}`;
    });
}

function confirmCharAndStart() {
  const nameInput = document.getElementById('char-name').value.trim();
  character.name = nameInput || 'Aventureiro';
  // Calcular vida e sanidade da jornada (baixas e escassas)
  character.vidaMax    = calcMaxVida(character.attrs);
  character.vida       = character.vidaMax;
  character.sanidadeMax = calcMaxSanidade(character.attrs);
  character.sanidade   = character.sanidadeMax;
  // Calcular vida de combate (grande, reseta a cada combate), com bônus de classe
  const classBonusVida = character.classBonusVida || 0;
  character.vidaCombateMax = calcVidaCombate(character.attrs) + classBonusVida;
  character.vidaCombate    = character.vidaCombateMax;
  // Reset tags (keep class tag which was set during applyClass)
  const classTags = {};
  for (const [k,v] of Object.entries(character.tags)) {
    if (k.startsWith('classe:')) classTags[k] = v;
  }
  character.tags = classTags;
  currentAdventure = pendingAdventure;
  currentNodeId = currentAdventure.meta.startNode;
  sceneCount = 0;
  history = [];
  epilogueLog = { mainEnding: null, sqResults: [], totalChoices: 0, sqCompleted: 0 };
  character.ouro = 0;
  character.inventario = [];
  character.equipamento = { arma: null, armadura: null, acessorio: null };
  character.combatStats = { danoBonus: 0, precisaoBonus: 0, armadura: 0, esquivaBonus: 0 };
  character._pendingWeaponEffects = [];
  resetScore();
  showScreen('screen-game');
  document.getElementById('game-title-bar').textContent = currentAdventure.meta.title;
  // Apply passive abilities (attr bonuses, tags, etc.) from class
  if (typeof applyPassiveAbilities === 'function') applyPassiveAbilities();
  renderCharHud();
  renderScene(currentNodeId);
}

function toggleCharSidebar() {
  const sidebar = document.getElementById('sidebar-char');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (sidebar && backdrop) {
    sidebar.classList.toggle('open');
    backdrop.classList.toggle('open');
  }
}

function renderCharHud() {
  const hud = document.getElementById('char-hud');
  if (!hud) return;
  if (!character.name) { hud.style.display = 'none'; return; }
  // We use inline block here, but CSS !important will override it when open
  hud.style.display = 'flex';

  const vidaPct    = Math.round((character.vida    / character.vidaMax)    * 100);
  const sanPct     = Math.round((character.sanidade / character.sanidadeMax) * 100);
  const barStyle   = (pct, color) =>
    `<div style="width:100%;height:4px;background:rgba(255,255,255,0.1);border-radius:0;overflow:hidden;margin-top:4px;">` +
    `<div style="width:${pct}%;height:100%;background:${color};transition:width 0.4s;"></div></div>`;

  const statusHtml =
    `<div class="char-hud-attr" style="flex-direction:column;align-items:flex-start;gap:0;" title="Vida">` +
      `<div style="display:flex;align-items:center;justify-content:space-between;width:100%;">` +
        `<div><span>❤️</span><span style="font-size:0.65rem;color:#e06060;margin-left:0.2rem;">VID</span></div>` +
        `<span style="color:#ff8888;font-weight:700;">${character.vida}/${character.vidaMax}</span>` +
      `</div>${barStyle(vidaPct, '#cc4444')}` +
    `</div>` +
    `<div class="char-hud-attr" style="flex-direction:column;align-items:flex-start;gap:0;" title="Sanidade">` +
      `<div style="display:flex;align-items:center;justify-content:space-between;width:100%;">` +
        `<div><span>🧠</span><span style="font-size:0.65rem;color:#9370db;margin-left:0.2rem;">SAN</span></div>` +
        `<span style="color:#c8a8ff;font-weight:700;">${character.sanidade}/${character.sanidadeMax}</span>` +
      `</div>${barStyle(sanPct, '#9370db')}` +
    `</div>`;

  hud.innerHTML =
    `<span>${character.name}</span>` +
    statusHtml +
    ATTRS.map(a => `<div class="char-hud-attr"><div>${a.icon} <span>${a.name}</span></div><span>${character.attrs[a.key]}</span></div>`).join('');
  renderTagsHud();
  if (typeof renderInventoryHud === 'function') renderInventoryHud();
}

// Modifica vida ou sanidade do personagem (+/- delta), atualiza o HUD e verifica morte/loucura
function changeVida(delta) {
  character.vida = Math.max(0, Math.min(character.vidaMax, character.vida + delta));
  renderCharHud();
  if (character.vida <= 0) triggerStatusDeath('vida');
}
function changeSanidade(delta) {
  character.sanidade = Math.max(0, Math.min(character.sanidadeMax, character.sanidade + delta));
  renderCharHud();
  if (character.sanidade <= 0) triggerStatusDeath('sanidade');
}

// Fim de jogo por vida ou sanidade zerada — registra derrota e vai para epílogo
function triggerStatusDeath(tipo) {
  const isVida = tipo === 'vida';
  const title   = isVida ? 'Sucumbiu aos Ferimentos' : 'A Mente se Partiu';
  const sceneName = isVida ? '— Vida esgotada —' : '— Sanidade esgotada —';

  // Registra como derrota no epilogue log (só se ainda não houve um ending)
  if (!epilogueLog.mainEnding) {
    epilogueLog.mainEnding = { type: 'defeat', title, sceneName };
  }

  OverlayManager.enqueue(() => {
    const overlay = document.createElement('div');
    overlay.id = 'death-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:var(--shadow);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;z-index:2000;animation:fadeIn 0.4s ease;';
    overlay.innerHTML = `
      <div style="text-align:center;max-width:380px;padding:2.5rem;background:var(--glass-bg);backdrop-filter:blur(10px);box-shadow:0 15px 40px rgba(0,0,0,0.8),inset 0 0 20px rgba(139,26,26,0.15);border:1px solid ${isVida ? 'rgba(139,26,26,0.8)' : 'rgba(74,32,128,0.8)'};border-radius:4px;">
        <div style="font-size:3rem;margin-bottom:1rem;">${isVida ? '💀' : '🌀'}</div>
        <div style="font-family:'Cinzel',serif;font-size:0.7rem;letter-spacing:0.3em;color:${isVida ? '#cc4444' : '#9370db'};text-transform:uppercase;margin-bottom:0.6rem;">
          ${isVida ? '✦ DERROTA ✦' : '✦ LOUCURA ✦'}
        </div>
        <div style="font-family:'Cinzel',serif;font-size:1.4rem;color:var(--parchment);margin-bottom:1.5rem;line-height:1.3;">
          ${title}
        </div>
        <div style="font-family:'IM Fell English',serif;font-style:italic;color:var(--stone-light);font-size:0.95rem;margin-bottom:2rem;">
          ${isVida ? 'Seus ferimentos foram graves demais. A jornada termina aqui.' : 'A escuridão consumiu sua mente. Não há mais retorno da loucura.'}
        </div>
        <button class="btn-medieval danger" onclick="OverlayManager.closeActive('death-overlay'); showEpilogue();">📜 Ver Epílogo</button>
      </div>`;
    document.body.appendChild(overlay);
    OverlayManager.setActive('death-overlay');
  });
}

function renderScene(nodeId) {
  const node = currentAdventure.nodes[nodeId];
  if (!node) { notify('Cena não encontrada: ' + nodeId); return; }

  sceneCount++;
  document.getElementById('game-stats').textContent = `Cena ${sceneCount}`;

  // Tick timed ability effects (tags, temp buffs, cooldowns) each scene
  if (typeof tickAbilityTimers === 'function') tickAbilityTimers();

  // Animate
  const card = document.getElementById('story-card');
  card.style.opacity = '0';
  card.style.transform = 'translateY(10px)';

  setTimeout(() => {
    document.getElementById('scene-title').innerHTML = interpolateText(node.title);
    document.getElementById('scene-text').innerHTML = interpolateText(node.text.replace(/\n/g, '<br>'));

    // Scene pixel art image (async, non-blocking)
    renderSceneImage(node);

    // ─── Process Node Rewards (Gold / Items) ───
    if (node.rewardGold) {
      changeOuro(node.rewardGold);
      delete node.rewardGold; // Only grant once per adventure session
    }
    if (node.rewardItems && node.rewardItems.length) {
      node.rewardItems.forEach(itemId => giveItem(itemId));
      delete node.rewardItems; // Only grant once
    }

    // Choices — always reset the whole section first to avoid stale #choices-list
    const choicesSection = document.getElementById('choices-section');
    choicesSection.innerHTML = '';

    // History log
    const historyLog = document.getElementById('history-log');
    if (historyLog) {
      historyLog.textContent = history.length > 0
        ? 'Caminho: ' + history.slice(-3).map(h => h.scene).join(' → ')
        : '';
    }

    card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    card.style.opacity = '1';
    card.style.transform = 'translateY(0)';

    // Dialogue plays first (if configured), then shows choices/endings
    startDialogue(node, () => {
      _renderSceneChoices(node, nodeId, choicesSection);
      // Check sidequest trigger (only on non-ending scenes, not during a sidequest)
      if (!node.ending && !activeSidequest) {
        setTimeout(() => {
          const sqTriggered = checkSidequestTrigger(nodeId);
          if (!sqTriggered) checkEncounterTrigger(nodeId);
        }, 600);
      }
    });
  }, 150);
}

// ── Renders choices/endings after dialogue finishes ──
function _renderSceneChoices(node, nodeId, choicesSection) {
  if (node.ending) {
    // Record the main ending in the epilogue log
    epilogueLog.mainEnding = {
      type: node.ending.type,
      title: node.ending.title || node.title,
      sceneName: node.title
    };
    // Award ending score points
    if (node.ending.points) addScore(node.ending.points, 'ending', `Final: ${node.ending.title || node.title}`);
    choicesSection.innerHTML = `
      <div class="ending-banner">
        <div class="ending-type ${node.ending.type}">${node.ending.type === 'victory' ? '✦ VITÓRIA ✦' : node.ending.type === 'defeat' ? '✦ DERROTA ✦' : '✦ FIM ✦'}</div>
        <div class="ending-title" style="color:${node.ending.type==='victory'?'var(--gold-light)':node.ending.type==='defeat'?'#cc4444':'var(--parchment-dark)'}">${node.ending.title}</div>
        <button class="btn-medieval" style="margin:0 auto;" onclick="showEpilogue()">📜 Ver Epílogo</button>
        <button class="btn-medieval secondary" style="margin:0.5rem auto 0;" onclick="restartCurrentAdventure()">↺ Jogar Novamente</button>
        <button class="btn-medieval secondary" style="margin:0.3rem auto 0;" onclick="showScreen('screen-select')">← Outras Aventuras</button>
      </div>`;
  } else {
    // Check for combat first
    if (checkAndStartCombat(nodeId)) {
      // Combat overlay will handle navigation
    } else {
      choicesSection.innerHTML = `<div class="choices-label">O que fazes?</div><div id="choices-list"></div>`;
      const cl = document.getElementById('choices-list');
      (node.choices || []).forEach((c, i) => {
        // ── Tag visibility check ──
        const visibility = evalChoiceTagVisibility(c);
        if (visibility === 'hide') return; // completely hidden

        const btn = document.createElement('button');
        btn.className = 'choice-btn';

        if (visibility === 'disabled') {
          btn.disabled = true;
          btn.style.opacity = '0.4';
          btn.style.cursor = 'not-allowed';
        }

        let badge = '';
        if (c.attrCheck) {
          const attrVal = character.attrs[c.attrCheck] || 1;
          const chance = calcSuccessChance(attrVal, c.difficulty || 5);
          const tier = chance >= 75 ? 'easy' : chance >= 50 ? 'medium' : chance >= 30 ? 'hard' : 'vhard';
          const attrInfo = ATTRS.find(a => a.key === c.attrCheck);
          badge = `<span class="choice-attr-badge ${tier}">${attrInfo?.icon || ''} ${attrInfo?.name || c.attrCheck} · ${chance}%</span>`;
        }

        // ── Gold cost badge ──
        let costBadge = '';
        if (c.goldCost) {
          costBadge = `<span style="color:var(--gold); font-size:0.75rem; margin-left:0.5rem; border:1px solid var(--gold); padding:1px 4px; border-radius:3px;">🪙 ${c.goldCost}</span>`;
        }

        btn.innerHTML = `<span class="choice-num">${String.fromCharCode(73 + i)}.</span><span>${c.text}${badge}${costBadge}</span>`;
        btn.onclick = () => {
          // Check gold cost
          if (c.goldCost && character.ouro < c.goldCost) {
            notify('🪙 Ouro insuficiente!');
            return;
          }
          if (c.goldCost) changeOuro(-c.goldCost);

          history.push({ scene: node.title, choice: c.text });
          epilogueLog.totalChoices++;
          // Award base choice points
          if (c.points) addScore(c.points, 'choice', `Escolha: ${c.text.substring(0,30)}`);
          // Apply tags from this choice
          if (c.tagEffects) applyTagEffects(c.tagEffects);
          // Apply vida/sanidade changes from the choice itself (before roll)
          if (c.vida)     changeVida(c.vida);
          if (c.sanidade) changeSanidade(c.sanidade);
          
          // Apply ouro and items
          if (c.ouro) changeOuro(c.ouro);
          if (c.itemRewards && c.itemRewards.length) {
            c.itemRewards.forEach(itemId => giveItem(itemId));
          }
          // Tag redirect overrides next
          const redirect = evalChoiceTagRedirect(c);
          if (redirect) {
            renderScene(redirect);
            return;
          }
          if (c.attrCheck) {
            doAttrRoll(c);
          } else {
            renderScene(c.next);
          }
        };
        cl.appendChild(btn);
      });
    } // end else (no combat)
  }
}
function renderAttrRows() {
  const container = document.getElementById('attr-rows');
  if (!container) return;
  const used = Object.values(character.attrs).reduce((a,b) => a+b, 0) - BASE_POINTS_USED;
  const remaining = FREE_POINTS - used;
  const pointsEl = document.getElementById('points-remaining');
  if (pointsEl) pointsEl.textContent = remaining + ' pontos restantes';

  const previewVida        = calcMaxVida(character.attrs);
  const previewSanidade    = calcMaxSanidade(character.attrs);
  const previewVidaCombate = calcVidaCombate(character.attrs);

  container.innerHTML = ATTRS.map(a => {
    const val = character.attrs[a.key];
    const fillPct = ((val - ATTR_MIN) / (ATTR_MAX - ATTR_MIN)) * 100;
    // Hint for constituicao and sabedoria showing derived stat
    let derivedHint = '';
    if (a.key === 'constituicao') derivedHint =
      `<span style="color:#ff8888;font-size:0.6rem;margin-left:0.5rem;">❤️ Vida: ${previewVida}</span>` +
      `<span style="color:#e07070;font-size:0.6rem;margin-left:0.4rem;">⚔️ Combate: ${previewVidaCombate}</span>`;
    if (a.key === 'sabedoria')    derivedHint = `<span style="color:#c8a8ff;font-size:0.6rem;margin-left:0.5rem;">🧠 Sanidade: ${previewSanidade}</span>`;
    return `
      <div class="attr-row">
        <div class="attr-icon">${a.icon}</div>
        <div class="attr-info">
          <div class="attr-name">${a.name}${derivedHint}</div>
          <div class="attr-desc">${a.desc}</div>
          <div class="attr-bar"><div class="attr-bar-fill" style="width:${fillPct}%"></div></div>
        </div>
        <div class="attr-controls">
          <button class="attr-btn" onclick="changeAttr('${a.key}',-1)" ${val <= ATTR_MIN ? 'disabled' : ''}>−</button>
          <div class="attr-value">${val}</div>
          <button class="attr-btn" onclick="changeAttr('${a.key}',1)" ${val >= ATTR_MAX_CREATION || remaining <= 0 ? 'disabled' : ''}>+</button>
        </div>
      </div>`;
  }).join('');
}

function changeAttr(key, delta) {
  const used = Object.values(character.attrs).reduce((a,b) => a+b, 0) - BASE_POINTS_USED;
  const remaining = FREE_POINTS - used;
  const val = character.attrs[key];
  if (delta > 0 && (remaining <= 0 || val >= ATTR_MAX_CREATION)) return;
  if (delta < 0 && val <= ATTR_MIN) return;
  character.attrs[key] = val + delta;
  renderAttrRows();
}

// applyClass: recebe index (classes customizadas) ou key string (classes padrão)
function applyClass(cls) {
  document.querySelectorAll('.class-btn').forEach(b => b.classList.remove('selected'));
  const btn = document.getElementById('class-' + cls);
  if (btn) btn.classList.add('selected');

  const customList = pendingAdventure?.meta?.classes;
  let desc = '';
  let passiveDesc = '';

  if (Array.isArray(customList) && customList.length > 0) {
    const cc = customList[cls];
    if (!cc) return;
    character.className   = cc.name || 'Aventureiro';
    character.classKey    = String(cls);
    character.primaryAttr = cc.primaryAttr  || 'forca';
    character.damageAttr  = cc.damageAttr   || cc.primaryAttr || 'forca';
    character.dodgeAttr   = cc.dodgeAttr    || 'destreza';
    character.defenseAttr = cc.defenseAttr  || 'constituicao';
    character.classBonusVida = cc.bonusVida || 0;
    desc = cc.desc || '';
    passiveDesc = cc.passiveDesc || '';

    // Aplicar distribuição de atributos personalizada (se definida)
    if (cc.attrPoints && Object.keys(cc.attrPoints).length > 0) {
      ATTRS.forEach(a => {
        if (cc.attrPoints[a.key] !== undefined) {
          character.attrs[a.key] = cc.attrPoints[a.key];
        }
      });
      renderAttrRows();
    }

    // Set class tag
    setTag('classe:' + (cc.name || 'aventureiro').toLowerCase().replace(/\s+/g,'_'), true);
    // Apply initial tags defined by the creator
    if (cc.initialTags && Array.isArray(cc.initialTags)) {
      cc.initialTags.forEach(tag => { if (tag) setTag(tag, true); });
    }
    // Legacy tags array
    if (cc.tags && Array.isArray(cc.tags)) applyTagEffects(cc.tags);
    // Grant abilities from this class
    if (cc.abilityIds && Array.isArray(cc.abilityIds)) {
      const allAbilities = pendingAdventure?.abilities || [];
      character.abilities = allAbilities.filter(ab => cc.abilityIds.includes(ab.id));
    }
  } else {
    const preset = CLASS_PRESETS[cls];
    if (!preset) return;
    character.className   = cls;
    character.classKey    = cls;
    character.primaryAttr = preset._primaryAttr || preset.primaryAttr || 'forca';
    character.damageAttr  = character.primaryAttr;
    character.dodgeAttr   = 'destreza';
    character.defenseAttr = 'constituicao';
    character.classBonusVida = 0;
    setTag('classe:' + cls.toLowerCase(), true);
  }

  // Mostra descrição + habilidade passiva da classe
  const descPanel = document.getElementById('class-desc-panel');
  if (descPanel) {
    if (desc || passiveDesc) {
      let html = '';
      if (desc) html += `<div style="margin-bottom:${passiveDesc?'0.4rem':'0'};">${escHtmlRuntime(desc)}</div>`;
      if (passiveDesc) html += `<div style="font-size:0.78rem;color:#b8a060;border-top:1px solid rgba(201,162,39,0.2);padding-top:0.35rem;margin-top:0.2rem;">✨ ${escHtmlRuntime(passiveDesc)}</div>`;
      descPanel.innerHTML = html;
      descPanel.style.display = 'block';
    } else {
      descPanel.style.display = 'none';
    }
  }
}

// Renderiza a grade de classes — usa lista customizada se a aventura tiver classes definidas
function renderCharClasses() {
  const descPanel = document.getElementById('class-desc-panel');
  if (descPanel) descPanel.style.display = 'none';
  const grid = document.getElementById('char-class-grid');
  if (!grid) return;

  const customList = pendingAdventure?.meta?.classes;

  if (Array.isArray(customList) && customList.length > 0) {
    // Classes da aventura: índice numérico como identificador do botão
    grid.innerHTML = customList.map((cc, idx) => {
      const desc = cc.desc ? escHtmlRuntime(cc.desc) : '';
      return `
        <button class="class-btn" onclick="applyClass(${idx})" id="class-${idx}" title="${desc}">
          <span class="class-icon">${cc.icon || '⚔️'}</span>
          <span>${escHtmlRuntime((cc.name || 'Classe').toUpperCase())}</span>
        </button>`;
    }).join('');
  } else {
    // Classes padrão do sistema — uma por atributo
    const defaultClasses = [
      { key: 'warrior', icon: '⚔️', label: 'GUERREIRO', primary: 'Força' },
      { key: 'rogue',   icon: '🗡️', label: 'LADINO',    primary: 'Destreza' },
      { key: 'mage',    icon: '📚', label: 'MAGO',       primary: 'Inteligência' },
      { key: 'bard',    icon: '🎶', label: 'BARDO',      primary: 'Carisma' },
      { key: 'ranger',  icon: '🏹', label: 'ARQUEIRO',   primary: 'Sabedoria' },
      { key: 'paladin', icon: '🛡️', label: 'PALADINO',   primary: 'Constituição' },
    ];
    grid.innerHTML = defaultClasses.map(c => `
      <button class="class-btn" onclick="applyClass('${c.key}')" id="class-${c.key}">
        <span class="class-icon">${c.icon}</span>
        <span>${c.label}</span>
      </button>`).join('');
  }
}

// ═══════════════════════════════════════════════════════════
//  ATTRIBUTE ROLL ENGINE
// ═══════════════════════════════════════════════════════════

// Success chance: attrVal/difficulty as base, scaled 15-95%
// Sabedoria dá bônus pequeno de chance (percepção e julgamento)
function calcSuccessChance(attrVal, difficulty) {
  const sabedoria = character.attrs['sabedoria'] || 1;
  const raw = (attrVal / difficulty) * 60 + 10 + (sabedoria - 1) * 1.5;
  return Math.round(Math.min(95, Math.max(15, raw)));
}

function doAttrRoll(choice) {
  const attrKey = choice.attrCheck;
  const difficulty = choice.difficulty || 5;
  const attrVal = character.attrs[attrKey] || 1;
  const attrInfo = ATTRS.find(a => a.key === attrKey);
  // Get passive ability bonuses for this attr roll
  const abilityBonus = (typeof getRollBonusesForAttr === 'function')
    ? getRollBonusesForAttr(attrKey)
    : { flatBonus: 0, extraAttrVal: 0 };
  const effectiveAttrVal = attrVal + (abilityBonus.extraAttrVal || 0);
  const baseChance = calcSuccessChance(effectiveAttrVal, difficulty);
  const chance = Math.round(Math.min(95, Math.max(15, baseChance + (abilityBonus.flatBonus || 0))));

  // Roll 1-100
  const roll = Math.floor(Math.random() * 100) + 1;
  const success = roll <= chance;
  const nextNode = success ? choice.next : (choice.nextFail || choice.next);

  // Show overlay
  OverlayManager.enqueue(() => {
    document.getElementById('roll-attr-name').textContent =
      `Teste de ${attrInfo?.name || attrKey} (${attrVal}) · Dificuldade ${difficulty}`;
    document.getElementById('roll-choice-text').textContent = choice.text;
    document.getElementById('roll-dice').textContent = '🎲';
    document.getElementById('roll-number').style.color = 'var(--gold)';

    OverlayManager.setActive('roll-overlay');

    // Animate number
    let frame = 0;
    const anim = setInterval(() => {
      document.getElementById('roll-number').textContent = Math.floor(Math.random() * 100) + 1;
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

    const btn = document.getElementById('roll-continue-btn');
    btn.onclick = () => {
      OverlayManager.closeActive('roll-overlay');
      // Award roll-specific points
      if (success && choice.pointsSuccess) addScore(choice.pointsSuccess, 'roll', `Sucesso: ${choice.text.substring(0,30)}`);
      if (!success && choice.pointsFail)   addScore(choice.pointsFail,   'roll', `Falha: ${choice.text.substring(0,30)}`);
      // Apply vida/sanidade changes from roll result
      if (success) {
        if (choice.vidaSuccess)     changeVida(choice.vidaSuccess);
        if (choice.sanidadeSuccess) changeSanidade(choice.sanidadeSuccess);
      } else {
        if (choice.vidaFail)        changeVida(choice.vidaFail);
        if (choice.sanidadeFail)    changeSanidade(choice.sanidadeFail);
      }
      renderScene(nextNode);
    };
  });
}

// ═══════════════════════════════════════════════════════════
//  IMPORT / EXPORT
