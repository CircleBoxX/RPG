// ═══════════════════════════════════════════════════════════
//  COMBAT SYSTEM
// ═══════════════════════════════════════════════════════════

// Runtime combat state
let combatState = null;

// Default enemy template (editor uses this as base)
function defaultEnemy() {
  return {
    name: 'Inimigo',
    icon: '👹',
    vida: 30,
    vidaMax: 30,
    attrs: { forca: 3, destreza: 2, constituicao: 2, inteligencia: 1, carisma: 1, sabedoria: 1 },
    attackAttr:    'forca',
    precisionAttr: 'destreza',
    defenseAttr:   'constituicao',
    damageDie:     6,
    damageBonus:   0,
    xpReward: 0,
    fleeAllowed: true,
    defeatPenalty: 1,
    defeatNode: '',
    victoryNode: '',
    fleeNode: '',
    victoryText: '',
    defeatText: '',
    fleeText: '',
    abilities: [],   // array de habilidades customizadas do inimigo
  };
}

// Default ability template
function defaultAbility() {
  return {
    id: 'ab_' + Date.now(),
    name: 'Nova Habilidade',
    icon: '💥',
    // Falas do inimigo ao usar a habilidade (uma é sorteada)
    quotes: [''],
    // Efeitos — podem ser combinados
    effects: [],
    // Condição de uso
    triggerCondition: 'any',   // 'any' | 'lowHp' | 'highHp' | 'roundMin'
    triggerRoundMin: 2,        // só usável a partir do turno X
    triggerHpPct: 40,          // % de hp (para lowHp/highHp)
    usageChance: 50,           // % de chance de usar por turno quando condição ok
    cooldown: 2,               // turnos de espera após usar
    maxUses: 0,                // 0 = ilimitado
  };
}

// Default ability effect template
function defaultAbilityEffect() {
  return {
    type: 'debuff_player',
    attr: 'forca',
    value: 1,
    duration: 2,
  };
}

// ═══════════════════════════════════════════════════════════
//  STATUS EFFECTS RUNTIME
//  combatEffects: array de efeitos ativos durante o combate
//  Tipos:
//   debuff_player  — reduz atributo do jogador por N turnos
//   buff_self      — aumenta atributo do inimigo por N turnos
//   buff_player    — aumenta atributo do jogador por N turnos
//   poison         — causa dano por turno ao jogador
//   bleed          — sangramento: dano menor mas acumula por stack
//   stun           — jogador perde o próximo turno
//   blind          — reduz chance de acerto do jogador por N turnos
//   curse          — dobra dano do próximo ataque do inimigo
//   regen_self     — inimigo recupera vida por turno
//   shield_self    — barreira que absorve X dano antes de quebrar
// ═══════════════════════════════════════════════════════════
let combatEffects = [];

// Checks if player is stunned (stun effect present)
function isPlayerStunned() {
  return combatEffects.some(e => e.type === 'stun' && e.turnsLeft > 0);
}

// Gets total blind penalty on player hit chance (0–40)
function getBlindPenalty() {
  return combatEffects
    .filter(e => e.type === 'blind' && e.turnsLeft > 0)
    .reduce((sum, e) => sum + (e.value || 15), 0);
}

// Gets curse multiplier for enemy damage (1 = normal, 2 = cursed)
function getCurseMultiplier() {
  return combatEffects.some(e => e.type === 'curse' && e.turnsLeft > 0) ? 2 : 1;
}

// Gets active enemy shield HP
function getEnemyShieldHp() {
  const s = combatEffects.find(e => e.type === 'shield_self');
  return s ? s.shieldHp : 0;
}

// Called at start of enemy turn — tick DoT effects and durations
async function tickCombatEffects() {
  const toRemove = [];

  for (const e of combatEffects) {
    // ── DoT effects: deal damage now ──
    if (e.type === 'poison' && e.turnsLeft > 0) {
      const dmg = Math.max(1, e.value || 2);
      character.vidaCombate = Math.max(0, character.vidaCombate - dmg);
      renderCharHud();
      updateCombatBars();
      combatLog(`☠ Veneno causa ${dmg} de dano! Vida: ${character.vidaCombate}/${character.vidaCombateMax}`, 'status-poison');
      if (character.vidaCombate <= 0) {
        await sleep(200);
        endCombat('lose');
        return;
      }
    }
    if (e.type === 'bleed' && e.turnsLeft > 0) {
      const dmg = Math.max(1, e.value || 1);
      character.vidaCombate = Math.max(0, character.vidaCombate - dmg);
      renderCharHud();
      updateCombatBars();
      combatLog(`🩸 Sangramento causa ${dmg} de dano! Vida: ${character.vidaCombate}/${character.vidaCombateMax}`, 'status-bleed');
      if (character.vidaCombate <= 0) {
        await sleep(200);
        endCombat('lose');
        return;
      }
    }
    if (e.type === 'regen_self' && e.turnsLeft > 0 && combatState) {
      const heal = Math.max(1, e.value || 2);
      const actual = Math.min(heal, combatState.enemyVidaMax - combatState.enemyVida);
      combatState.enemyVida = Math.min(combatState.enemyVidaMax, combatState.enemyVida + heal);
      updateCombatBars();
      updateEnemyHpTint();
      if (actual > 0)
        combatLog(`💚 Regeneração: inimigo recupera ${actual} de vida.`, 'enemy-heal');
    }

    // ── Tick duration ──
    if (e.duration > 0) {
      e.turnsLeft--;
      if (e.turnsLeft <= 0) {
        toRemove.push(e);
      }
    }
  }

  // Expire effects
  for (const e of toRemove) {
    const idx = combatEffects.indexOf(e);
    if (idx >= 0) combatEffects.splice(idx, 1);
    // Reverse stat changes
    if (e.type === 'debuff_player' && e.attr) {
      character.attrs[e.attr] = Math.max(1, (character.attrs[e.attr] || 1) + e.value);
      combatLog(`✦ '${e.source}' expirou — ${e.attr} restaurado.`, 'system');
      renderCharHud();
    } else if (e.type === 'buff_self' && e.attr && combatState) {
      combatState.cfg.attrs = combatState.cfg.attrs || {};
      combatState.cfg.attrs[e.attr] = Math.max(1, (combatState.cfg.attrs[e.attr] || 1) - e.value);
      combatLog(`✦ Buff '${e.source}' do inimigo expirou.`, 'system');
    } else if (e.type === 'buff_player' && e.attr) {
      character.attrs[e.attr] = Math.max(1, (character.attrs[e.attr] || 1) - e.value);
      combatLog(`✦ Buff '${e.source}' expirou.`, 'system');
      renderCharHud();
    } else if (e.type === 'stun') {
      combatLog(`✦ Atordoamento encerrou — você retoma o controle.`, 'system');
    } else if (e.type === 'blind') {
      combatLog(`✦ Visão restaurada.`, 'system');
    } else if (e.type === 'curse') {
      combatLog(`✦ Maldição dissipada.`, 'system');
    } else if (e.type === 'shield_self') {
      combatLog(`✦ Barreira do inimigo desapareceu.`, 'system');
    } else if (e.type === 'poison') {
      combatLog(`✦ Veneno neutralizado.`, 'system');
    } else if (e.type === 'bleed') {
      combatLog(`✦ Sangramento estancou.`, 'system');
    } else if (e.type === 'regen_self') {
      combatLog(`✦ Regeneração do inimigo cessou.`, 'system');
    } else if (e.type === 'fear') {
      combatLog(`✦ Medo dissipado — você retoma a coragem.`, 'system');
    } else if (e.type === 'silence') {
      combatLog(`✦ Silêncio encerrou — suas habilidades estão liberadas.`, 'system');
    } else if (e.type === 'weaken') {
      combatLog(`✦ Enfraquecimento acabou — sua força está restaurada.`, 'system');
    } else if (e.type === 'counter') {
      combatLog(`✦ Postura de contra-ataque do inimigo encerrou.`, 'system');
    }
  }

  updateCombatPlayerAttrs();
  updateStatusIcons();
}

function clearCombatEffects() {
  combatEffects.forEach(e => {
    if (e.type === 'debuff_player' && e.attr) {
      character.attrs[e.attr] = Math.max(1, (character.attrs[e.attr] || 1) + e.value);
    }
    if (e.type === 'buff_player' && e.attr) {
      character.attrs[e.attr] = Math.max(1, (character.attrs[e.attr] || 1) - e.value);
    }
  });
  combatEffects = [];
  renderCharHud();
  updateStatusIcons();
}

// Render status icon bar in the combat overlay
function updateStatusIcons() {
  const el = document.getElementById('combat-status-icons');
  if (!el) return;
  if (!combatEffects.length) { el.innerHTML = ''; return; }
  const STATUS_META = {
    poison:          { icon:'☠',  color:'#88cc44', label:'Veneno'       },
    bleed:           { icon:'🩸', color:'#cc3344', label:'Sangramento'  },
    stun:            { icon:'💫', color:'#ffdd44', label:'Atordoado'    },
    blind:           { icon:'👁', color:'#8866aa', label:'Cego'         },
    curse:           { icon:'💀', color:'#cc44cc', label:'Maldição'     },
    fear:            { icon:'😨', color:'#ff8844', label:'Medo'         },
    silence:         { icon:'🔇', color:'#aa88cc', label:'Silêncio'     },
    weaken:          { icon:'💢', color:'#cc6644', label:'Enfraquecido' },
    counter:         { icon:'⚡', color:'#ffcc44', label:'Contra-ataque'},
    debuff_player:   { icon:'⬇', color:'#ff6666', label:'Debuff'       },
    buff_player:     { icon:'⬆', color:'#66ff99', label:'Buff'         },
    regen_self:      { icon:'💚', color:'#44cc66', label:'Regen'        },
    shield_self:     { icon:'🛡', color:'#6699ff', label:'Escudo'       },
    buff_self:       { icon:'⬆', color:'#ff9944', label:'Buff(ini)'    },
  };
  el.innerHTML = combatEffects.map(e => {
    const meta = STATUS_META[e.type] || { icon:'?', color:'#aaa', label: e.type };
    const turnsText = e.duration > 0 ? ` ${e.turnsLeft}t` : '';
    const shieldText = e.type === 'shield_self' ? ` ${e.shieldHp}hp` : '';
    const title = `${meta.label}${turnsText || shieldText} — ${e.source}`;
    const isEnemy = ['buff_self','regen_self','shield_self'].includes(e.type);
    return `<span class="combat-status-chip" style="background:${meta.color}22;border-color:${meta.color}66;color:${meta.color};" title="${escHtmlRuntime(title)}">
      ${meta.icon}${turnsText}${shieldText}
      <span style="font-size:0.5rem;opacity:0.7;">${isEnemy ? '(ini)' : ''}</span>
    </span>`;
  }).join('');
}

function updateCombatPlayerAttrs() {
  if (!combatState) return;
  const playerAttackAttr = combatState.playerAttackAttr || 'forca';
  const ATTR_ICONS2 = { forca:'⚔️', destreza:'🗡️', inteligencia:'📚', carisma:'🎶', sabedoria:'🏹', constituicao:'🛡️' };
  const attrChips = ['forca','destreza','constituicao'].map(key => {
    const icon = ATTR_ICONS2[key] || '⚔️';
    const val  = character.attrs[key];
    const isPrimary = key === playerAttackAttr;
    // Highlight debuffed attrs
    const isDebuffed = combatEffects.some(e => e.type === 'debuff_player' && e.attr === key);
    const isBuffed   = combatEffects.some(e => e.type === 'buff_player'   && e.attr === key);
    const style = isDebuffed ? ' style="color:#ff6666;border-color:rgba(255,80,80,0.4);"'
                : isBuffed   ? ' style="color:#7ecb8a;border-color:rgba(126,203,138,0.4);"' : '';
    return `<div class="combat-attr-chip${isPrimary ? ' primary-attr' : ''}"${style}>${icon} ${val}${isPrimary ? ' ★' : ''}</div>`;
  });
  document.getElementById('cb-player-attrs').innerHTML = attrChips.join('');
}

// ── Launch combat from a scene node ──
function startCombat(nodeId) {
  const node = activeSidequest
    ? activeSidequest.nodes[nodeId]
    : currentAdventure?.nodes[nodeId];
  if (!node) return;

  // Resolve combat config: prefer combatId → adventure.combats, fallback to legacy node.combat
  const baseCfg = node.combatId
    ? (currentAdventure?.combats?.[node.combatId] || activeSidequest?.combats?.[node.combatId])
    : node.combat;
  if (!baseCfg) return;

  // Apply tag modifiers to a working copy of the combat config
  const cfg = applyCombatTagModifiers(baseCfg);

  // ── Skip to victory if tag modifier says so ──
  if (cfg._skipToVictory) {
    notify(`⚔ ${cfg.name || 'Inimigo'} — vitória automática por habilidade!`);
    setTimeout(() => {
      const nextNode = cfg.victoryNode;
      if (nextNode) {
        if (activeSidequest && activeSidequest.nodes[nextNode]) renderSqScene(nextNode);
        else if (currentAdventure?.nodes[nextNode]) renderScene(nextNode);
      }
    }, 800);
    return;
  }

  OverlayManager.enqueue(() => {
    // ── Determine player combat attributes from class (with fallbacks) ──
    const playerAttackAttr  = character.primaryAttr  || 'forca';
    const playerDamageAttr  = character.damageAttr   || playerAttackAttr;
    const playerDodgeAttr   = character.dodgeAttr    || 'destreza';
    const playerDefenseAttr = character.defenseAttr  || 'constituicao';
    const ATTR_NAMES = { forca:'Força', destreza:'Destreza', inteligencia:'Inteligência', carisma:'Carisma', sabedoria:'Sabedoria', constituicao:'Constituição' };
    const ATTR_ICONS = { forca:'⚔️', destreza:'🗡️', inteligencia:'📚', carisma:'🎶', sabedoria:'🏹', constituicao:'🛡️' };

    combatState = {
      round: 1,
      playerDefending: false,
      enemyVida: cfg.vidaMax || cfg.vida || 8,
      enemyVidaMax: cfg.vidaMax || cfg.vida || 8,
      cfg,
      sourceNodeId: nodeId,
      ended: false,
      playerAttackAttr,    // ← acerto
      playerDamageAttr,    // ← dano
      playerDodgeAttr,     // ← esquiva
      playerDefenseAttr,   // ← armadura
      specialAction: cfg._specialAction || null,
      abilityState: {},
    };

    (cfg.abilities || []).forEach(ab => {
      combatState.abilityState[ab.id] = {
        cooldownLeft: 0,
        usesLeft: ab.maxUses > 0 ? ab.maxUses : Infinity,
      };
    });

    clearCombatEffects();
    character.vidaCombate = character.vidaCombateMax;

    // ── Aplicar efeitos de arma pendentes (veneno/fogo/sangramento aplicado via consumível) ──
    if (character._pendingWeaponEffects && character._pendingWeaponEffects.length) {
      character._pendingWeaponEffects.forEach(weff => {
        if (weff.type === 'weapon_poison') {
          combatEffects.push({ type: 'poison', source: 'Veneno na Arma', value: weff.value, duration: weff.duration, turnsLeft: weff.duration });
        } else if (weff.type === 'weapon_fire') {
          combatEffects.push({ type: 'buff_self', attr: '_fireDmg', value: weff.value, source: 'Arma Flamejante', duration: weff.duration, turnsLeft: weff.duration });
          combatState._fireDmgBonus = (combatState._fireDmgBonus || 0) + weff.value;
        } else if (weff.type === 'weapon_bleed') {
          combatEffects.push({ type: 'bleed', source: 'Arma Sangrenta', value: weff.value, duration: weff.duration, turnsLeft: weff.duration, stacks: 1 });
        }
      });
      character._pendingWeaponEffects = [];
      if (typeof renderCharHud === 'function') renderCharHud();
    }

    OverlayManager.setActive('combat-overlay');

  // Populate UI
  document.getElementById('combat-title').textContent = cfg.name || 'Combate';
  document.getElementById('cb-enemy-name').textContent = cfg.name || 'Inimigo';
  document.getElementById('cb-enemy-icon').textContent = cfg.icon || '👹';
  document.getElementById('cb-player-name').textContent = character.name || 'Herói';

  // Player attrs shown — highlight primary attack attr
  const attrChips = ['forca','destreza','constituicao'].map(key => {
    const icon = ATTR_ICONS[key] || '⚔️';
    const val  = character.attrs[key];
    const isPrimary = key === playerAttackAttr;
    return `<div class="combat-attr-chip${isPrimary ? ' primary-attr' : ''}">${icon} ${val}${isPrimary ? ' ★' : ''}</div>`;
  });
  document.getElementById('cb-player-attrs').innerHTML = attrChips.join('');

  // Enemy attrs shown — display all non-zero, highlight configured roles
  const ea = cfg.attrs || {};
  const eAtkAttr  = cfg.attackAttr   || 'forca';
  const eHitAttr  = cfg.precisionAttr|| 'destreza';
  const eDefAttrK = cfg.defenseAttr  || 'constituicao';
  const ALL_ATTR_META = [
    {key:'forca',icon:'⚔️'},{key:'destreza',icon:'🗡️'},{key:'inteligencia',icon:'📚'},
    {key:'carisma',icon:'🎶'},{key:'sabedoria',icon:'🏹'},{key:'constituicao',icon:'🛡️'}
  ];
  const roleBadge = (k) => k===eAtkAttr?' <span style="font-size:0.45rem;color:#e09050;">DMG</span>'
                          : k===eHitAttr?' <span style="font-size:0.45rem;color:#e0d050;">HIT</span>'
                          : k===eDefAttrK?' <span style="font-size:0.45rem;color:#80c0e0;">DEF</span>' : '';
  document.getElementById('cb-enemy-attrs').innerHTML = ALL_ATTR_META
    .filter(a => (ea[a.key]||0) > 0)
    .map(a => `<div class="combat-attr-chip${a.key===eAtkAttr?' primary-attr':''}">${a.icon} ${ea[a.key]||1}${roleBadge(a.key)}</div>`)
    .join('');

  // Attack hint — show player attack/damage/dodge attrs
  const attackAttrName = ATTR_NAMES[playerAttackAttr] || playerAttackAttr;
  const damageAttrName = ATTR_NAMES[playerDamageAttr] || playerDamageAttr;
  const dodgeAttrName  = ATTR_NAMES[playerDodgeAttr]  || playerDodgeAttr;
  const eHitAttrName = ATTR_NAMES[eHitAttr] || eHitAttr;
  const hintParts = [`🎯 ${attackAttrName}`];
  if (playerDamageAttr !== playerAttackAttr) hintParts.push(`💥 ${damageAttrName}`);
  hintParts.push(`💨 ${dodgeAttrName}`);
  document.getElementById('cb-attack-hint').textContent = hintParts.join(' · ') + ` vs ${eHitAttrName}`;

  // Special action button
  const specialBtn = document.getElementById('cb-btn-special');
  if (specialBtn) {
    if (combatState.specialAction) {
      specialBtn.style.display = '';
      specialBtn.textContent = combatState.specialAction.label || '✨ Ação Especial';
      specialBtn.title = combatState.specialAction.desc || '';
    } else {
      specialBtn.style.display = 'none';
    }
  }

  // Flee hint
  document.getElementById('cb-flee-hint').textContent =
    cfg.fleeAllowed === false ? 'Não permitido' : 'Destreza vs Destreza';

  // Hide/show flee
  document.getElementById('cb-btn-flee').disabled = cfg.fleeAllowed === false;

  // End panel hidden, actions shown
  document.getElementById('combat-end-panel').style.display = 'none';
  document.getElementById('combat-actions').style.display = 'grid';
  document.getElementById('combat-roll-zone').style.display = 'none';
  renderCombatUI();

  // Reset log
  const log = document.getElementById('combat-log');
  log.innerHTML = '';
  const introMsgs = [
    `O confronto começa! ${cfg.name || 'Inimigo'} se prepara para o combate.`,
    `${cfg.name || 'Inimigo'} bloqueia seu caminho — não há como evitar!`,
    `A batalha tem início. ${cfg.name || 'Inimigo'} aguarda sua próxima ação.`,
    `${cfg.name || 'Inimigo'} rugiu e avançou. O combate é inevitável.`,
  ];
  combatLog(introMsgs[Math.floor(Math.random() * introMsgs.length)], 'system');

  updateCombatBars();
  updateCombatRound();

    // ← FIX: garante que os botões estejam habilitados ao iniciar o combate
    setCombatActionsDisabled(false);
  });
}

function combatLog(msg, cls = '') {
  const log = document.getElementById('combat-log');
  const el = document.createElement('div');
  el.className = 'combat-log-entry' + (cls ? ' ' + cls : '');
  // player-ability uses innerHTML for the bold name
  if (cls === 'player-ability') el.innerHTML = msg;
  else el.textContent = msg;
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
}

// Re-render ability buttons in combat (called when combat starts and after each action)
function renderCombatUI() {
  const el = document.getElementById('combat-ability-btns');
  if (!el) return;
  if (typeof buildPlayerAbilityButtons === 'function') {
    const html = buildPlayerAbilityButtons();
    el.innerHTML = html;
    el.style.display = html ? 'flex' : 'none';
  }
}

function updateCombatBars() {
  if (!combatState) return;
  const vidaCombatePct = Math.max(0, Math.round((character.vidaCombate / character.vidaCombateMax) * 100));
  const enemyPct       = Math.max(0, Math.round((combatState.enemyVida / combatState.enemyVidaMax) * 100));
  document.getElementById('cb-player-vida').textContent = `${character.vidaCombate}/${character.vidaCombateMax}`;
  document.getElementById('cb-enemy-vida').textContent  = `${combatState.enemyVida}/${combatState.enemyVidaMax}`;
  document.getElementById('cb-player-vida-bar').style.width = vidaCombatePct + '%';
  document.getElementById('cb-enemy-vida-bar').style.width  = enemyPct + '%';
}

function updateCombatRound() {
  document.getElementById('combat-round-label').textContent = `Turno ${combatState.round}`;
}

function setCombatActionsDisabled(disabled) {
  ['cb-btn-attack','cb-btn-defend','cb-btn-flee'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = disabled || (id === 'cb-btn-flee' && combatState?.cfg?.fleeAllowed === false);
  });
  // Also update ability buttons state
  if (!disabled && typeof renderCombatUI === 'function') renderCombatUI();
}

// Shake animation helper
function shakeFighter(side) {
  const icon = document.querySelector(`.combat-fighter.combat-${side} .combat-fighter-icon`);
  if (!icon) return;
  icon.classList.remove('shake');
  void icon.offsetWidth;
  icon.classList.add('shake');
  setTimeout(() => icon.classList.remove('shake'), 400);
}

// Pulse the enemy icon (crit hit)
function pulseEnemyIcon() {
  const icon = document.querySelector('.combat-fighter.combat-enemy .combat-fighter-icon');
  if (!icon) return;
  icon.classList.remove('pulse-crit');
  void icon.offsetWidth;
  icon.classList.add('pulse-crit');
  setTimeout(() => icon.classList.remove('pulse-crit'), 600);
}

// Tint enemy health bar red when low
function updateEnemyHpTint() {
  if (!combatState) return;
  const bar = document.getElementById('cb-enemy-vida-bar');
  const pct = combatState.enemyVida / combatState.enemyVidaMax;
  if (!bar) return;
  if (pct <= 0.25) {
    bar.style.background = 'linear-gradient(90deg, #8b0000, #cc2222)';
    bar.style.boxShadow = '0 0 8px rgba(200,0,0,0.5)';
  } else if (pct <= 0.5) {
    bar.style.background = 'linear-gradient(90deg, #8b3a00, #cc6622)';
    bar.style.boxShadow = '';
  } else {
    bar.style.background = '';
    bar.style.boxShadow = '';
  }
}

// ── Roll animation (returns promise resolving after animation) ──
function showCombatRoll(label, attrVal, diffVal, blindPenalty = 0) {
  return new Promise(resolve => {
    const zone = document.getElementById('combat-roll-zone');
    zone.style.display = 'block';
    zone.style.animation = 'none';
    void zone.offsetWidth;
    zone.style.animation = '';
    document.getElementById('combat-roll-label').textContent = label;
    const numEl = document.getElementById('combat-roll-num');
    const resultEl = document.getElementById('combat-roll-result');
    numEl.textContent = '?';
    numEl.style.color = 'var(--gold)';
    resultEl.textContent = '';
    resultEl.className = 'combat-roll-result';

    const roll = Math.floor(Math.random() * 100) + 1;
    const baseChance = Math.min(95, Math.max(15, Math.round((attrVal / diffVal) * 60 + 10)));
    const chance = Math.max(5, baseChance - blindPenalty);
    const success = roll <= chance;

    let frame = 0;
    const totalFrames = 14;
    const anim = setInterval(() => {
      numEl.textContent = Math.floor(Math.random()*100)+1;
      frame++;
      if (frame >= totalFrames) {
        clearInterval(anim);
        numEl.textContent = roll;
        numEl.style.color = success ? '#4ecb71' : '#cc4444';
        const chanceLabel = document.getElementById('combat-roll-chance-label');
        if (chanceLabel) chanceLabel.textContent = `Precisava ≤ ${chance}${blindPenalty>0?' (cegueira −'+blindPenalty+'%)':''}`;
        resolve({ roll, chance, success });
      }
    }, 50);
  });
}

function hideCombatRoll() {
  document.getElementById('combat-roll-zone').style.display = 'none';
}

// ── Calculate damage ──
// Attacker primary attr + dX (configured die) + bonus, defender destreza reduces, defense attr as armor
function calcDamage(attackerAttr, defenderDestreza, defenderDefAttr, defenderIsDefending, damageDie, damageBonus) {
  const die = damageDie || 6;
  const bonus = damageBonus || 0;
  const base = Math.max(1, attackerAttr) + Math.floor(Math.random() * die) + 1 + bonus;
  const dodge = Math.floor(defenderDestreza / 2);
  const armor = Math.floor(defenderDefAttr / 3) + (defenderIsDefending ? 3 : 0);
  return Math.max(1, base - dodge - armor);
}

// ── Enemy mood/flavor text pools ──
const ENEMY_ATTACK_MSGS = [
  (name) => `${name} avança com brutalidade!`,
  (name) => `${name} lança um golpe selvagem!`,
  (name) => `${name} ataca com fúria renovada!`,
  (name) => `${name} tenta romper sua defesa!`,
  (name) => `${name} investiga seu ponto fraco e ataca!`,
  (name) => `${name} desfere um golpe rápido!`,
];
const ENEMY_MISS_MSGS = [
  (name) => `${name} errou — você desviou no último momento.`,
  (name) => `O ataque de ${name} passa raspando.`,
  (name) => `${name} perdeu o equilíbrio e falhou.`,
  (name) => `Você antecipou o golpe de ${name} e recuou.`,
];
const ENEMY_HIT_MSGS = [
  (name, dmg) => `${name} acertou! Você sofre ${dmg} de dano.`,
  (name, dmg) => `O golpe de ${name} encontrou seu alvo — ${dmg} de dano.`,
  (name, dmg) => `Impacto! ${dmg} de dano de ${name}.`,
];
const PLAYER_HIT_MSGS = [
  (dmg) => `Golpe certeiro — ${dmg} de dano!`,
  (dmg) => `Você acerta com precisão — ${dmg} de dano!`,
  (dmg) => `Seu ataque encontra o alvo — ${dmg} de dano!`,
];
const PLAYER_MISS_MSGS = [
  () => `Seu ataque não encontrou o alvo.`,
  () => `O inimigo esquivou do seu golpe.`,
  () => `Você errou — o inimigo era mais rápido.`,
];

function randMsg(arr, ...args) {
  return arr[Math.floor(Math.random() * arr.length)](...args);
}

// ── Determine enemy AI action for this turn ──
// Returns: { action: 'attack'|'heavy'|'taunt'|'ability', ability?: cfg }
function enemyAI(cfg, enemyVida, enemyVidaMax, round) {
  const hpPct = (enemyVida / enemyVidaMax) * 100;
  const abilities = cfg.abilities || [];

  const playerHpPct = combatState ? (character.vidaCombate / character.vidaCombateMax) * 100 : 100;

  // Build list of usable abilities this round
  const usableAbilities = abilities.filter(ab => {
    const state = combatState?.abilityState?.[ab.id];
    if (!state) return false;
    if (state.cooldownLeft > 0) return false;
    if (state.usesLeft <= 0) return false;
    // Check trigger condition
    if (ab.triggerCondition === 'roundMin'    && round < (ab.triggerRoundMin || 2)) return false;
    if (ab.triggerCondition === 'lowHp'       && hpPct > (ab.triggerHpPct || 40)) return false;
    if (ab.triggerCondition === 'highHp'      && hpPct < (ab.triggerHpPct || 60)) return false;
    if (ab.triggerCondition === 'playerLowHp' && playerHpPct > (ab.triggerPlayerHpPct || 40)) return false;
    if (ab.triggerCondition === 'firstRound'  && round !== 1) return false;
    if (ab.triggerCondition === 'everyN'      && (round % (ab.triggerEveryN || 3)) !== 0) return false;
    return true;
  });

  // Try each usable ability by chance
  for (const ab of usableAbilities) {
    if (Math.random() * 100 < (ab.usageChance || 50)) {
      return { action: 'ability', ability: ab };
    }
  }

  // Fallback to base AI
  const roll = Math.random();
  if (hpPct < 30) {
    if (roll < 0.35) return { action: 'heavy' };
    if (roll < 0.50) return { action: 'taunt' };
    return { action: 'attack' };
  }
  if (roll < 0.65) return { action: 'attack' };
  if (roll < 0.80) return { action: 'heavy' };
  return { action: 'taunt' };
}

// ── Execute a custom enemy ability ──
async function executeEnemyAbility(ability) {
  const eName = combatState.cfg.name || 'Inimigo';
  const state = combatState.abilityState[ability.id];

  // Pick a random quote if any
  const quotes = (ability.quotes || []).filter(q => q && q.trim());
  if (quotes.length) {
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    combatLog(`💬 ${eName}: "${quote}"`, 'enemy-quote');
    await sleep(700);
  } else {
    combatLog(`⚡ ${eName} usa ${ability.icon || ''} ${ability.name}!`, 'enemy-heavy');
    await sleep(400);
  }

  // Apply each effect
  const effects = ability.effects || [];
  for (const eff of effects) {
    await applyAbilityEffect(eff, ability.name, eName);
  }

  // Update cooldown and uses
  if (state) {
    state.cooldownLeft = ability.cooldown > 0 ? ability.cooldown : 0;
    if (ability.maxUses > 0) state.usesLeft--;
  }
}

// Tick all ability cooldowns (called at end of enemy turn)
function tickAbilityCooldowns() {
  if (!combatState?.abilityState) return;
  Object.values(combatState.abilityState).forEach(s => {
    if (s.cooldownLeft > 0) s.cooldownLeft--;
  });
}

// Apply a single ability effect
async function applyAbilityEffect(eff, abilityName, eName) {
  const ATTR_LABELS = { forca:'Força', destreza:'Destreza', inteligencia:'Inteligência', carisma:'Carisma', sabedoria:'Sabedoria', constituicao:'Constituição' };
  const val      = Math.max(1, eff.value || 1);
  const duration = eff.duration ?? 2; // 0 = permanente no combate

  switch (eff.type) {

    case 'debuff_player': {
      const attr   = eff.attr || 'forca';
      const oldVal = character.attrs[attr] || 1;
      character.attrs[attr] = Math.max(1, oldVal - val);
      renderCharHud();
      updateCombatPlayerAttrs();
      if (duration > 0)
        combatEffects.push({ source: abilityName, type: 'debuff_player', attr, value: val, duration, turnsLeft: duration });
      const durText = duration > 0 ? ` por ${duration} turno${duration>1?'s':''}` : ' (permanente)';
      combatLog(`⬇ ${ATTR_LABELS[attr]||attr} −${val}${durText}! (${oldVal}→${character.attrs[attr]})`, 'enemy-debuff');
      shakeFighter('player');
      break;
    }

    case 'buff_self': {
      const attr   = eff.attr || 'forca';
      const ea     = combatState.cfg.attrs = combatState.cfg.attrs || {};
      const oldVal = ea[attr] || 1;
      ea[attr]     = Math.min(20, oldVal + val);
      if (duration > 0)
        combatEffects.push({ source: abilityName, type: 'buff_self', attr, value: val, duration, turnsLeft: duration });
      const durText = duration > 0 ? ` por ${duration} turno${duration>1?'s':''}` : '';
      combatLog(`⬆ ${eName}: ${ATTR_LABELS[attr]||attr} +${val}${durText}! (${oldVal}→${ea[attr]})`, 'enemy-buff');
      pulseEnemyIcon();
      break;
    }

    case 'buff_player': {
      const attr   = eff.attr || 'forca';
      const oldVal = character.attrs[attr] || 1;
      character.attrs[attr] = Math.min(20, oldVal + val);
      renderCharHud();
      updateCombatPlayerAttrs();
      if (duration > 0)
        combatEffects.push({ source: abilityName, type: 'buff_player', attr, value: val, duration, turnsLeft: duration });
      combatLog(`⬆ ${ATTR_LABELS[attr]||attr} +${val} por ${duration} turno${duration>1?'s':''}! (${oldVal}→${character.attrs[attr]})`, 'status-buff');
      break;
    }

    case 'damage_player': {
      const dmg = Math.max(1, val);
      shakeFighter('player');
      character.vidaCombate = Math.max(0, character.vidaCombate - dmg);
      renderCharHud();
      updateCombatBars();
      combatLog(`💥 Dano direto: ${dmg}! Vida: ${character.vidaCombate}/${character.vidaCombateMax}`, 'enemy-heavy');
      if (character.vidaCombate <= 0) { await sleep(300); endCombat('lose'); }
      break;
    }

    case 'heal_self': {
      const actual = Math.min(val, combatState.enemyVidaMax - combatState.enemyVida);
      combatState.enemyVida = Math.min(combatState.enemyVidaMax, combatState.enemyVida + val);
      updateCombatBars();
      updateEnemyHpTint();
      combatLog(`💚 ${eName} se cura: +${actual} vida. (${combatState.enemyVida}/${combatState.enemyVidaMax})`, 'enemy-heal');
      break;
    }

    case 'drain_sanidade': {
      changeSanidade(-val);
      combatLog(`🌀 Sanidade −${val}! (${character.sanidade}/${character.sanidadeMax})`, 'enemy-debuff');
      shakeFighter('player');
      break;
    }

    case 'drain_vida_jornada': {
      changeVida(-val);
      combatLog(`💔 Vida da jornada −${val}! (${character.vida}/${character.vidaMax})`, 'enemy-debuff');
      break;
    }

    // ── NOVOS EFEITOS ──

    case 'poison': {
      // Remove stack anterior do mesmo nome para evitar duplicata
      const existing = combatEffects.find(e => e.type === 'poison' && e.source === abilityName);
      if (existing) { existing.turnsLeft = duration; existing.value = val; }
      else combatEffects.push({ source: abilityName, type: 'poison', value: val, duration, turnsLeft: duration });
      combatLog(`☠ Envenenado! ${val} de dano por turno por ${duration} turno${duration>1?'s':''}.`, 'status-poison');
      shakeFighter('player');
      break;
    }

    case 'bleed': {
      // Sangramentos acumulam (cada stack é independente)
      combatEffects.push({ source: abilityName, type: 'bleed', value: val, duration, turnsLeft: duration });
      const stacks = combatEffects.filter(e => e.type === 'bleed').length;
      combatLog(`🩸 Sangramento! ${val} de dano/turno por ${duration} turno${duration>1?'s':''}. (${stacks} stack${stacks>1?'s':''})`, 'status-bleed');
      shakeFighter('player');
      break;
    }

    case 'stun': {
      // Remove stun anterior e coloca novo
      const idx = combatEffects.findIndex(e => e.type === 'stun');
      if (idx >= 0) combatEffects.splice(idx, 1);
      combatEffects.push({ source: abilityName, type: 'stun', value: 0, duration, turnsLeft: duration });
      combatLog(`💫 ATORDOADO! Você perde ${duration} turno${duration>1?'s':''}!`, 'status-stun');
      shakeFighter('player');
      // Flash the player area
      const playerArea = document.querySelector('.combat-fighter.combat-player');
      if (playerArea) {
        playerArea.classList.add('stun-flash');
        setTimeout(() => playerArea.classList.remove('stun-flash'), 600);
      }
      break;
    }

    case 'blind': {
      const idx = combatEffects.findIndex(e => e.type === 'blind' && e.source === abilityName);
      if (idx >= 0) combatEffects.splice(idx, 1);
      combatEffects.push({ source: abilityName, type: 'blind', value: val, duration, turnsLeft: duration });
      combatLog(`👁 CEGO! Chance de acerto reduzida em ${val}% por ${duration} turno${duration>1?'s':''}.`, 'status-blind');
      shakeFighter('player');
      break;
    }

    case 'curse': {
      const idx = combatEffects.findIndex(e => e.type === 'curse');
      if (idx >= 0) combatEffects.splice(idx, 1);
      combatEffects.push({ source: abilityName, type: 'curse', value: val, duration, turnsLeft: duration });
      combatLog(`💀 MALDIÇÃO! Dano do inimigo dobrado por ${duration} turno${duration>1?'s':''}!`, 'status-curse');
      shakeFighter('player');
      break;
    }

    case 'regen_self': {
      const idx = combatEffects.findIndex(e => e.type === 'regen_self' && e.source === abilityName);
      if (idx >= 0) combatEffects.splice(idx, 1);
      combatEffects.push({ source: abilityName, type: 'regen_self', value: val, duration, turnsLeft: duration });
      combatLog(`💚 ${eName} ativa regeneração: +${val} vida/turno por ${duration} turno${duration>1?'s':''}.`, 'enemy-heal');
      pulseEnemyIcon();
      break;
    }

    case 'shield_self': {
      const idx = combatEffects.findIndex(e => e.type === 'shield_self');
      if (idx >= 0) combatEffects.splice(idx, 1);
      combatEffects.push({ source: abilityName, type: 'shield_self', value: val, shieldHp: val, duration: 0, turnsLeft: 0 });
      combatLog(`🛡 ${eName} ergue uma barreira de ${val} de vida!`, 'enemy-buff');
      pulseEnemyIcon();
      break;
    }

    case 'damage_attr_scaled': {
      // Dano escalado por um atributo do inimigo (ex: Inteligência do mago)
      const attr      = eff.attr || combatState.cfg.attackAttr || 'forca';
      const attrVal2  = (combatState.cfg.attrs || {})[attr] || 1;
      const dmg       = Math.max(1, Math.floor(attrVal2 * 1.5) + val);
      shakeFighter('player');
      character.vidaCombate = Math.max(0, character.vidaCombate - dmg);
      renderCharHud();
      updateCombatBars();
      combatLog(`🔮 ${eName} usa ${ATTR_LABELS[attr]||attr} (${attrVal2}) — ${dmg} de dano mágico! Vida: ${character.vidaCombate}/${character.vidaCombateMax}`, 'enemy-heavy');
      if (character.vidaCombate <= 0) { await sleep(300); endCombat('lose'); }
      break;
    }

    case 'life_steal': {
      // Dano no jogador + cura no inimigo
      const dmg2 = Math.max(1, val);
      shakeFighter('player');
      character.vidaCombate = Math.max(0, character.vidaCombate - dmg2);
      renderCharHud();
      updateCombatBars();
      const healedAmt = Math.min(dmg2, combatState.enemyVidaMax - combatState.enemyVida);
      combatState.enemyVida = Math.min(combatState.enemyVidaMax, combatState.enemyVida + dmg2);
      updateCombatBars();
      updateEnemyHpTint();
      combatLog(`🩸 Roubo de vida! ${eName} drena ${dmg2} de vida (recupera ${healedAmt}).`, 'enemy-heavy');
      if (character.vidaCombate <= 0) { await sleep(300); endCombat('lose'); }
      break;
    }

    case 'fear': {
      // Remove medo anterior e aplica novo
      const fIdx = combatEffects.findIndex(e => e.type === 'fear');
      if (fIdx >= 0) combatEffects.splice(fIdx, 1);
      combatEffects.push({ source: abilityName, type: 'fear', value: 0, duration, turnsLeft: duration });
      combatLog(`😨 MEDO! Você não consegue atacar por ${duration} turno${duration>1?'s':''}!`, 'status-stun');
      shakeFighter('player');
      const playerArea2 = document.querySelector('.combat-fighter.combat-player');
      if (playerArea2) { playerArea2.classList.add('stun-flash'); setTimeout(() => playerArea2.classList.remove('stun-flash'), 600); }
      break;
    }

    case 'silence': {
      // Impede o inimigo de usar habilidades — na verdade aplica silêncio no inimigo (incomum — normalmente seria no jogador)
      // Aqui, silence no jogador: impede usar a ação especial por N turnos
      const sIdx = combatEffects.findIndex(e => e.type === 'silence');
      if (sIdx >= 0) combatEffects.splice(sIdx, 1);
      combatEffects.push({ source: abilityName, type: 'silence', value: 0, duration, turnsLeft: duration });
      combatLog(`🔇 SILÊNCIO! Suas habilidades especiais foram bloqueadas por ${duration} turno${duration>1?'s':''}!`, 'status-stun');
      shakeFighter('player');
      break;
    }

    case 'weaken': {
      // Reduz dano do jogador por N turnos (percentual)
      const wIdx = combatEffects.findIndex(e => e.type === 'weaken' && e.source === abilityName);
      if (wIdx >= 0) combatEffects.splice(wIdx, 1);
      combatEffects.push({ source: abilityName, type: 'weaken', value: val, duration, turnsLeft: duration });
      combatLog(`💢 ENFRAQUECIDO! Seu dano é reduzido em ${val}% por ${duration} turno${duration>1?'s':''}!`, 'enemy-debuff');
      shakeFighter('player');
      break;
    }

    case 'counter': {
      // Contra-ataque: próximo ataque do jogador causa dano de volta no jogador também
      const cIdx = combatEffects.findIndex(e => e.type === 'counter');
      if (cIdx >= 0) combatEffects.splice(cIdx, 1);
      combatEffects.push({ source: abilityName, type: 'counter', value: val, duration, turnsLeft: duration });
      combatLog(`⚡ ${eName} assume postura de contra-ataque! (${val} de dano de retorno por ${duration} turno${duration>1?'s':''})`, 'enemy-buff');
      pulseEnemyIcon();
      break;
    }

    case 'dispel': {
      // Remove todos os buffs ativos do inimigo (pelo jogador — raro mas possível em habilidade do inimigo que dissipa seus próprios debuffs)
      const before = combatEffects.length;
      // Remove debuffs no inimigo (buff_self expirado fica, remove os próprios debuffs_player também não faz sentido aqui)
      // Uso principal: inimigo dissipa SEUS debuffs (debuff_player que reverteu stat dele não existe, mas remove shield de jogador se existir)
      const removable = ['debuff_self', 'blind_self'];
      // Efeito mais útil: remove qualquer efeito negativo no inimigo que possamos rastrear
      // Na prática: o inimigo usa dispel para remover os próprios debuffs do jogador que se aplicariam a ele
      // Simplificado: remove buff_player (buffs no jogador que favorecem o jogador)
      const dispelled = combatEffects.filter(e => e.type === 'buff_player');
      dispelled.forEach(e => {
        if (e.attr) {
          character.attrs[e.attr] = Math.max(1, (character.attrs[e.attr]||1) - e.value);
        }
        combatEffects.splice(combatEffects.indexOf(e), 1);
      });
      renderCharHud();
      updateCombatPlayerAttrs();
      if (dispelled.length) {
        combatLog(`✨ ${eName} dissipa ${dispelled.length} buff(s) do jogador!`, 'system');
      } else {
        combatLog(`✨ ${eName} usa Dissipar — nenhum buff para remover.`, 'system');
      }
      break;
    }
  }

  updateStatusIcons();
  await sleep(300);
}

// ── Enemy turn (varied AI with abilities) ──
async function enemyTurn() {
  if (!combatState || combatState.ended) return;

  // Tick debuff/buff durations at start of enemy turn
  tickCombatEffects();
  tickAbilityCooldowns();

  const cfg = combatState.cfg;
  const ea = cfg.attrs || {};
  const eName = cfg.name || 'Inimigo';

  // Determine enemy action via AI
  const aiResult = enemyAI(cfg, combatState.enemyVida, combatState.enemyVidaMax, combatState.round);

  // ── CUSTOM ABILITY ──
  if (aiResult.action === 'ability') {
    await executeEnemyAbility(aiResult.ability);
    // After ability, if combat ended (damage_player), stop
    if (combatState?.ended) return;
    // Abilities don't automatically attack too — end turn
    combatState.playerDefending = false;
    combatState.round++;
    updateCombatRound();
    document.getElementById('cb-player-status').textContent = '';
    setEnemyStatus('');
    setCombatActionsDisabled(false);
    return;
  }

  // ── TAUNT: enemy postures ──
  if (aiResult.action === 'taunt') {
    const taunts = [
      `${eName} ruge e assume uma postura ameaçadora!`,
      `${eName} concentra forças — algo maior está vindo.`,
      `${eName} olha fixamente, aguardando o momento certo.`,
      `${eName} recua um passo e recarrega o fôlego.`,
    ];
    combatLog(taunts[Math.floor(Math.random() * taunts.length)], 'enemy-taunt');
    setEnemyStatus('⚡ Concentrando');
    combatState._enemyCharging = true;
    await sleep(500);
    combatState.playerDefending = false;
    combatState.round++;
    updateCombatRound();
    document.getElementById('cb-player-status').textContent = '';
    setCombatActionsDisabled(false);
    return;
  }

  // ── HEAVY / NORMAL ATTACK ──
  const isHeavy = aiResult.action === 'heavy' || combatState._enemyCharging;
  combatState._enemyCharging = false;

  if (isHeavy) {
    combatLog(`⚡ ${eName} descarrega um ataque poderoso!`, 'enemy-heavy');
    setEnemyStatus('⚡ Golpe Pesado');
  } else {
    combatLog(randMsg(ENEMY_ATTACK_MSGS, eName), 'enemy');
    setEnemyStatus('⚔ Atacando');
  }

  // Use configurable attrs from combat def (fallback to legacy forca/destreza/constituicao)
  const ePrecisionAttr = cfg.precisionAttr || 'destreza';
  const eAttackAttr    = cfg.attackAttr    || 'forca';
  const eDefenseAttr   = cfg.defenseAttr   || 'constituicao';
  const ePrecision = ea[ePrecisionAttr] || 2;
  const eAttack    = ea[eAttackAttr]    || 2;
  // Use player's class-defined dodge and defense attrs
  const pDodgeAttr   = combatState.playerDodgeAttr   || 'destreza';
  const pDefenseAttr = combatState.playerDefenseAttr || 'constituicao';
  const pDodge   = getAttrTotal(pDodgeAttr)   + (character.combatStats.esquivaBonus || 0);
  const pDefense = getAttrTotal(pDefenseAttr) + (character.combatStats.armadura || 0);
  const pCon = getAttrTotal('constituicao') + (character.combatStats.esquivaBonus || 0);
  const hitBonus = isHeavy ? 1.2 : 1;
  const ATTR_NAMES_RT = { forca:'Força', destreza:'Destreza', inteligencia:'Inteligência', carisma:'Carisma', sabedoria:'Sabedoria', constituicao:'Constituição' };
  const { roll, chance, success } = await showCombatRoll(
    `${eName} tenta acertar (${ATTR_NAMES_RT[ePrecisionAttr]||ePrecisionAttr})`,
    Math.round(ePrecision * hitBonus), pCon + 2
  );

  const resultEl = document.getElementById('combat-roll-result');
  if (success) {
    const baseDmg = calcDamage(eAttack, pDodge, pDefense, combatState.playerDefending, cfg.damageDie, cfg.damageBonus);
    let dmg = isHeavy ? Math.max(baseDmg, baseDmg + Math.floor(eAttack / 2)) : baseDmg;

    // Curse: dobra dano e expira o efeito
    const curseEffect = combatEffects.find(e => e.type === 'curse' && e.turnsLeft > 0);
    if (curseEffect) {
      dmg = dmg * 2;
      curseEffect.turnsLeft = 0; // consome a maldição
      combatLog(`💀 MALDIÇÃO ATIVADA — dano dobrado!`, 'status-curse');
      updateStatusIcons();
    }

    const wasDefending = combatState.playerDefending;
    resultEl.className = 'combat-roll-result hit' + (isHeavy ? ' crit' : '');
    resultEl.textContent = isHeavy
      ? `⚡ GOLPE PESADO — ${dmg} de dano!`
      : randMsg(ENEMY_HIT_MSGS, eName, dmg).replace(/^/, '✦ ');
    await sleep(900);
    hideCombatRoll();
    shakeFighter('player');
    character.vidaCombate = Math.max(0, character.vidaCombate - dmg);
    renderCharHud();
    updateCombatBars();
    const defNote = wasDefending ? ' (dano reduzido pela defesa)' : '';
    combatLog(`${eName} causa ${dmg} de dano.${defNote} Sua vida: ${character.vidaCombate}/${character.vidaCombateMax}`, 'enemy');

    if (character.vidaCombate <= 0) {
      await sleep(400);
      endCombat('lose');
      return;
    }
  } else {
    resultEl.className = 'combat-roll-result miss';
    const missMsg = combatState.playerDefending
      ? `🛡 Bloqueado! Sua defesa absorveu o ataque.`
      : `✗ ${randMsg(ENEMY_MISS_MSGS, eName)}`;
    resultEl.textContent = missMsg;
    await sleep(900);
    hideCombatRoll();
    combatLog(combatState.playerDefending
      ? `Sua postura defensiva bloqueou o ataque de ${eName}.`
      : randMsg(ENEMY_MISS_MSGS, eName), 'system');
  }

  setEnemyStatus('');
  combatState.playerDefending = false;
  combatState.round++;
  updateCombatRound();
  document.getElementById('cb-player-status').textContent = '';
  setCombatActionsDisabled(false);
}

function setEnemyStatus(text) {
  const el = document.getElementById('cb-enemy-status');
  if (el) el.textContent = text;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Player action ──
async function combatAction(action) {
  if (!combatState || combatState.ended) return;
  setCombatActionsDisabled(true);

  // ── ATORDOAMENTO / MEDO: jogador perde o turno ──
  if (isPlayerStunned() || combatEffects.some(e => e.type === 'fear' && e.turnsLeft > 0)) {
    const stunEffect = combatEffects.find(e => (e.type === 'stun' || e.type === 'fear') && e.turnsLeft > 0);
    const isFear = stunEffect?.type === 'fear';
    combatLog(isFear ? `😨 Você está com medo e não consegue atacar!` : `💫 Você está atordoado e não consegue agir!`, 'status-stun');
    if (stunEffect) {
      stunEffect.turnsLeft--;
      if (stunEffect.turnsLeft <= 0) {
        combatEffects.splice(combatEffects.indexOf(stunEffect), 1);
        combatLog(`✦ ${isFear ? 'Medo' : 'Atordoamento'} passou.`, 'system');
      }
    }
    updateStatusIcons();
    await sleep(600);
    await enemyTurn();
    return;
  }

  // ── SILÊNCIO: bloqueia ação especial ──
  const isSilenced = combatEffects.some(e => e.type === 'silence' && e.turnsLeft > 0);
  if (isSilenced && action === 'special') {
    combatLog(`🔇 Você está silenciado e não pode usar habilidades especiais!`, 'status-stun');
    await sleep(500);
    setCombatActionsDisabled(false);
    return;
  }

  const cfg = combatState.cfg;
  const ea = cfg.attrs || {};

  if (action === 'attack') {
    combatLog(`Você ataca ${cfg.name || 'Inimigo'}!`, 'player');

    const attackAttr = combatState.playerAttackAttr || 'forca';
    const damageAttr = combatState.playerDamageAttr || attackAttr;
    const pAtk = getAttrTotal(attackAttr) + (character.combatStats.precisaoBonus || 0);
    const pDmg = getAttrTotal(damageAttr) + (character.combatStats.danoBonus || 0);
    const eDestreza = ea.destreza || 2;
    const ATTR_NAMES2 = { forca:'Força', destreza:'Destreza', inteligencia:'Inteligência', carisma:'Carisma', sabedoria:'Sabedoria', constituicao:'Constituição' };

    // Blind reduz chance de acerto
    const blindPenalty = getBlindPenalty();
    const rollLabel = blindPenalty > 0
      ? `${ATTR_NAMES2[attackAttr]||attackAttr} (${pAtk}) vs Destreza (${eDestreza}) 👁−${blindPenalty}%`
      : `Teste de ${ATTR_NAMES2[attackAttr]||attackAttr} (${pAtk}) vs Destreza inimiga (${eDestreza})`;

    const { roll, chance, success } = await showCombatRoll(rollLabel, pAtk, eDestreza + 1, blindPenalty);

    const resultEl = document.getElementById('combat-roll-result');
    const isCrit = success && roll <= Math.max(1, Math.floor(chance * 0.12));

    if (success) {
      const eDefAttrPlayer = cfg.defenseAttr || 'constituicao';
      const baseDmg = calcDamage(pDmg, ea.destreza || 1, ea[eDefAttrPlayer] || 1, false, null, null);
      // Apply weaken effect (reduces player damage %)
      const weakenEff = combatEffects.find(e => e.type === 'weaken' && e.turnsLeft > 0);
      const weakenMult = weakenEff ? (1 - (weakenEff.value || 25) / 100) : 1;
      const dmg = Math.max(1, Math.round((isCrit ? baseDmg + Math.floor(pAtk / 2) + 2 : baseDmg) * weakenMult));
      if (isCrit) {
        resultEl.className = 'combat-roll-result crit';
        resultEl.textContent = `✦ CRÍTICO! ${dmg} de dano!`;
        pulseEnemyIcon();
      } else {
        resultEl.className = 'combat-roll-result hit';
        resultEl.textContent = `✦ ${randMsg(PLAYER_HIT_MSGS, dmg)}`;
      }
      await sleep(900);
      hideCombatRoll();
      shakeFighter('enemy');

      // ── ESCUDO: absorve dano antes de atingir a vida do inimigo ──
      const shield = combatEffects.find(e => e.type === 'shield_self');
      let actualDmg = dmg;
      if (shield && shield.shieldHp > 0) {
        const absorbed = Math.min(dmg, shield.shieldHp);
        shield.shieldHp -= absorbed;
        actualDmg = dmg - absorbed;
        combatLog(`🛡 Barreira absorveu ${absorbed} de dano! (${shield.shieldHp} restante)`, 'system');
        if (shield.shieldHp <= 0) {
          combatEffects.splice(combatEffects.indexOf(shield), 1);
          combatLog(`🛡 Barreira do inimigo foi quebrada!`, 'system');
        }
        updateStatusIcons();
      }

      combatState.enemyVida = Math.max(0, combatState.enemyVida - actualDmg);
      updateCombatBars();
      updateEnemyHpTint();
      let dmgLog = `Você causa ${actualDmg} de dano.${isCrit ? ' GOLPE CRÍTICO!' : ''}${weakenEff?' (enfraquecido)':''}`;
      dmgLog += ` Vida do inimigo: ${combatState.enemyVida}/${combatState.enemyVidaMax}`;
      combatLog(dmgLog, 'player');

      // ── CONTRA-ATAQUE: inimigo riposte ao ser atingido ──
      const counterEff = combatEffects.find(e => e.type === 'counter' && e.turnsLeft > 0);
      if (counterEff) {
        const counterDmg = Math.max(1, counterEff.value || 3);
        combatLog(`⚡ CONTRA-ATAQUE! ${combatState.cfg.name||'Inimigo'} reflete ${counterDmg} de dano!`, 'enemy-heavy');
        shakeFighter('player');
        character.vidaCombate = Math.max(0, character.vidaCombate - counterDmg);
        renderCharHud();
        updateCombatBars();
        counterEff.turnsLeft--;
        if (counterEff.turnsLeft <= 0) combatEffects.splice(combatEffects.indexOf(counterEff), 1);
        updateStatusIcons();
        if (character.vidaCombate <= 0) { await sleep(300); endCombat('lose'); return; }
      }

      if (combatState.enemyVida <= 0) {
        await sleep(400);
        endCombat('win');
        return;
      }
    } else {
      resultEl.className = 'combat-roll-result miss';
      const missMsg = blindPenalty > 0 ? `✗ Cego, você errou completamente.` : `✗ ${randMsg(PLAYER_MISS_MSGS)}`;
      resultEl.textContent = missMsg;
      await sleep(900);
      hideCombatRoll();
      combatLog(blindPenalty > 0 ? 'Cegueira atrapalhou seu ataque.' : randMsg(PLAYER_MISS_MSGS), 'system');
    }

    await sleep(300);
    await enemyTurn();

  } else if (action === 'defend') {
    combatState.playerDefending = true;
    document.getElementById('cb-player-status').textContent = '🛡 Defendendo';
    const defendMsgs = [
      'Você ergue o escudo e assume postura defensiva.',
      'Você recua um passo, focando em bloquear o próximo golpe.',
      'Postura defensiva — pronto para absorver o ataque.',
    ];
    combatLog(defendMsgs[Math.floor(Math.random() * defendMsgs.length)], 'player');
    await sleep(400);
    await enemyTurn();

  } else if (action === 'special') {
    // Special action unlocked by a tag modifier
    const special = combatState.specialAction;
    if (!special) return;
    combatLog(`✨ ${special.label || 'Ação Especial'}! ${special.desc || ''}`, 'player');

    // Special actions can deal bonus damage or debuff the enemy
    const dmg = special.damage || 5;
    combatState.enemyVida = Math.max(0, combatState.enemyVida - dmg);
    updateCombatBars();
    combatLog(`Causa ${dmg} de dano especial. Vida do inimigo: ${combatState.enemyVida}/${combatState.enemyVidaMax}`, 'player');
    if (combatState.enemyVida <= 0) {
      await sleep(400);
      endCombat('win');
      return;
    }
    // Special is one-use
    combatState.specialAction = null;
    const specialBtn = document.getElementById('cb-btn-special');
    if (specialBtn) specialBtn.style.display = 'none';
    await sleep(300);
    await enemyTurn();

  } else if (action === 'flee') {
    if (cfg.fleeAllowed === false) return;

    combatLog(`Você tenta fugir!`, 'player');
    const pDestreza = character.attrs.destreza || 1;
    const eDestreza = ea.destreza || 2;

    const { roll, chance, success } = await showCombatRoll(
      `Teste de Destreza (${pDestreza}) para fugir`,
      pDestreza, eDestreza + 2
    );

    const resultEl = document.getElementById('combat-roll-result');
    if (success) {
      resultEl.className = 'combat-roll-result flee-ok';
      resultEl.textContent = `✦ FUGIU COM SUCESSO`;
      await sleep(800);
      hideCombatRoll();
      combatLog(`Você escapa do combate!`, 'player');
      await sleep(400);
      endCombat('flee');
    } else {
      resultEl.className = 'combat-roll-result flee-fail';
      resultEl.textContent = `✗ NÃO CONSEGUIU FUGIR`;
      await sleep(800);
      hideCombatRoll();
      combatLog(`A fuga falhou — o inimigo bloqueia seu caminho!`, 'enemy');
      await sleep(300);
      await enemyTurn();
    }
  }
}

// ── End combat ──
function endCombat(outcome) {
  if (!combatState) return;
  combatState.ended = true;
  clearCombatEffects();

  const cfg = combatState.cfg;
  document.getElementById('combat-actions').style.display = 'none';
  const endPanel = document.getElementById('combat-end-panel');
  endPanel.style.display = 'block';

  const resultEl = document.getElementById('combat-end-result');
  const rewardsEl = document.getElementById('combat-end-rewards');

  combatState._outcome = outcome;

  if (outcome === 'win') {
    resultEl.className = 'combat-end-result win';
    resultEl.textContent = '⚔ VITÓRIA ⚔';
    rewardsEl.textContent = cfg.victoryText || 'O inimigo foi derrotado.';
    combatLog('✦ VITÓRIA! O inimigo foi derrotado.', 'result-win');
    if (cfg.xpReward) addScore(cfg.xpReward, 'choice', `Combate: ${cfg.name}`);
    
    // Support both old (ouroReward) and new (rewardGold) keys
    const gold = cfg.rewardGold || cfg.ouroReward;
    if (gold) changeOuro(gold);

    // Support both old (itemRewards) and new (rewardItems) keys
    const items = cfg.rewardItems || cfg.itemRewards;
    if (items && items.length) {
      items.forEach(itemId => giveItem(itemId));
    }
    
    if (cfg.victoryTagEffects) applyTagEffects(cfg.victoryTagEffects);
    if (typeof renderCharHud === 'function') renderCharHud();

  } else if (outcome === 'lose') {
    resultEl.className = 'combat-end-result lose';
    resultEl.textContent = '💀 DERROTA 💀';

    // Aplicar penalidade de vida da jornada configurada pelo criador (padrão: 1)
    const penalty = (cfg.defeatPenalty != null) ? cfg.defeatPenalty : 1;
    let penaltyText = '';
    if (penalty > 0) {
      character.vida = Math.max(0, character.vida - penalty);
      renderCharHud();
      penaltyText = ` Você perde ${penalty} de vida.`;
    }

    const defeatMsg = (cfg.defeatText || 'Você foi derrotado.') + penaltyText;
    rewardsEl.textContent = defeatMsg;
    combatLog(`✦ DERROTA. Você sucumbiu em combate.${penaltyText}`, 'result-lose');
    if (cfg.defeatTagEffects) applyTagEffects(cfg.defeatTagEffects);

    // Se a penalidade zerou a vida da jornada, aciona morte — mas só após fechar o overlay
    if (character.vida <= 0) {
      setTimeout(() => {
        OverlayManager.closeActive('combat-overlay');
        combatState = null;
        triggerStatusDeath('vida');
      }, 1800);
      return;
    }

  } else if (outcome === 'flee') {
    resultEl.className = 'combat-end-result flee';
    resultEl.textContent = '💨 RECUOU';
    rewardsEl.textContent = cfg.fleeText || 'Você fugiu do confronto.';
    combatLog('Você recuou do combate.', 'system');
  }
}

function closeCombat() {
  if (!combatState) return;
  const cfg = combatState.cfg;
  const outcome = combatState._outcome;

  OverlayManager.closeActive('combat-overlay');

  // Navigate to appropriate next scene
  let nextNode = null;
  if (outcome === 'win')   nextNode = cfg.victoryNode;
  if (outcome === 'lose')  nextNode = cfg.defeatNode;
  if (outcome === 'flee')  nextNode = cfg.fleeNode || cfg.victoryNode;

  combatState = null;

  if (nextNode) {
    if (activeSidequest && activeSidequest.nodes[nextNode]) {
      renderSqScene(nextNode);
    } else if (currentAdventure?.nodes[nextNode]) {
      renderScene(nextNode);
    } else {
      notify('Cena de destino do combate não encontrada: ' + nextNode);
    }
  } else {
    notify('Configure a cena de destino do combate no editor.');
  }
}

// ── Hook into renderScene: if node has combat config, start combat instead of showing choices ──
// (called from renderScene after building choices area)
function checkAndStartCombat(nodeId) {
  const node = activeSidequest
    ? activeSidequest.nodes[nodeId]
    : currentAdventure?.nodes[nodeId];
  if (!node) return false;

  // Resolve combat config: prefer combatId → adventure.combats, fallback to legacy node.combat
  const combatCfg = node.combatId
    ? (currentAdventure?.combats?.[node.combatId] || activeSidequest?.combats?.[node.combatId])
    : node.combat;
  if (!combatCfg) return false;

  // Replace choices with a "enter combat" button
  const choicesSection = document.getElementById('choices-section');
  choicesSection.innerHTML = `
    <div class="ending-banner" style="border-color:rgba(139,26,26,0.5);background:rgba(139,26,26,0.05);">
      <div class="ending-type defeat" style="letter-spacing:0.3em;">⚔ COMBATE ⚔</div>
      <div class="ending-title" style="color:#e07070;font-size:1.2rem;">${escHtmlRuntime(combatCfg.name || 'Inimigo')}</div>
      <div style="font-family:'IM Fell English',serif;color:var(--stone-light);font-size:0.9rem;font-style:italic;margin-bottom:1.5rem;">
        Vida: ${combatCfg.vidaMax || combatCfg.vida || 30} &nbsp;·&nbsp; Força: ${combatCfg.attrs?.forca||1} &nbsp;·&nbsp; Destreza: ${combatCfg.attrs?.destreza||1}
      </div>
      <button class="btn-medieval" style="border-color:#cc4444;color:#e07070;margin:0 auto;" onclick="startCombat('${nodeId}')">⚔ Lutar</button>
    </div>`;
  return true;
}

// ═══════════════════════════════════════════════════════════
//  COMBAT EDITOR HELPERS
// ═══════════════════════════════════════════════════════════
