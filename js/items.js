// ═══════════════════════════════════════════════════════════
//  ITEM SYSTEM (RUNTIME)
// ═══════════════════════════════════════════════════════════

// Adiciona um item ao inventário pelo ID
function giveItem(itemId) {
  if (!currentAdventure || !currentAdventure.items) return;
  const item = currentAdventure.items[itemId];
  if (!item) return;
  character.inventario.push(itemId);
  notify('✅ Recebeu: ' + item.icon + ' ' + item.name);
  renderCharHud();
}

// Remove uma cópia de um item do inventário
function removeItem(itemId) {
  const index = character.inventario.indexOf(itemId);
  if (index > -1) {
    character.inventario.splice(index, 1);
    for (const slot in character.equipamento) {
      if (character.equipamento[slot] === itemId) unequipItem(slot);
    }
    renderCharHud();
  }
}

// Verifica se o personagem possui o item
function hasItem(itemId) {
  return character.inventario.includes(itemId);
}

// Modifica o ouro do personagem
function changeOuro(delta) {
  character.ouro = Math.max(0, character.ouro + delta);
  if (delta > 0) notify('🪙 +' + delta + ' Ouro!');
  else if (delta < 0) notify('🪙 -' + Math.abs(delta) + ' Ouro');
  renderCharHud();
}

// ─── USAR ITEM (consumível) ────────────────────────────────
function useItem(itemId) {
  if (!currentAdventure || !currentAdventure.items) return;
  const item = currentAdventure.items[itemId];
  if (!item || item.equippable) return;

  const effects = item.consumableEffects || [];
  if (!effects.length) {
    notify('📦 ' + item.name + ' não tem efeito definido.');
    return;
  }

  let log = [];

  effects.forEach(eff => {
    switch (eff.type) {

      case 'vida_restore': {
        const amt = eff.value || 1;
        const old = character.vida;
        character.vida = Math.min(character.vidaMax, character.vida + amt);
        const gained = character.vida - old;
        if (gained > 0) log.push('❤️ +' + gained + ' Vida');
        break;
      }

      case 'vida_combat_restore': {
        const amt = eff.value || 1;
        const old = character.vidaCombate || 0;
        character.vidaCombate = Math.min(character.vidaCombateMax, old + amt);
        const gained = character.vidaCombate - old;
        if (gained > 0) log.push('💊 +' + gained + ' Vida de Combate');
        break;
      }

      case 'sanidade_restore': {
        const amt = eff.value || 1;
        const old = character.sanidade;
        character.sanidade = Math.min(character.sanidadeMax, character.sanidade + amt);
        const gained = character.sanidade - old;
        if (gained > 0) log.push('🧠 +' + gained + ' Sanidade');
        break;
      }

      case 'attr_temp': {
        const attr = eff.attr || 'forca';
        const val  = eff.value || 1;
        const dur  = eff.duration || 3;
        if (!character._tempBuffs) character._tempBuffs = [];
        character._tempBuffs.push({ attrKey: attr, value: val, scenesLeft: dur, source: item.name });
        if (character.attrs[attr] !== undefined) character.attrs[attr] += val;
        log.push('⬆ ' + attr + ' +' + val + ' por ' + dur + ' cenas');
        break;
      }

      case 'attr_perm': {
        const attr = eff.attr || 'forca';
        const val  = eff.value || 1;
        if (character.attrs[attr] !== undefined) character.attrs[attr] += val;
        log.push('✦ ' + attr + ' +' + val + ' permanente');
        break;
      }

      case 'weapon_poison': {
        const val = eff.value || 2;
        const dur = eff.duration || 3;
        // Registra poison pendente — será aplicado no próximo combate
        if (!character._pendingWeaponEffects) character._pendingWeaponEffects = [];
        character._pendingWeaponEffects.push({ type: 'weapon_poison', value: val, duration: dur });
        log.push('☠ Arma envenenada (' + val + ' dano/turno por ' + dur + ' turnos)');
        break;
      }

      case 'weapon_fire': {
        const val = eff.value || 3;
        const dur = eff.duration || 2;
        if (!character._pendingWeaponEffects) character._pendingWeaponEffects = [];
        character._pendingWeaponEffects.push({ type: 'weapon_fire', value: val, duration: dur });
        log.push('🔥 Arma inflamada (+' + val + ' dano por ' + dur + ' turnos)');
        break;
      }

      case 'weapon_bleed': {
        const val = eff.value || 2;
        const dur = eff.duration || 3;
        if (!character._pendingWeaponEffects) character._pendingWeaponEffects = [];
        character._pendingWeaponEffects.push({ type: 'weapon_bleed', value: val, duration: dur });
        log.push('🩸 Arma com sangramento por ' + dur + ' turnos');
        break;
      }

      case 'shield_temp': {
        // Escudo de combate — só faz efeito se em combate
        const val = eff.value || 5;
        const dur = eff.duration || 2;
        if (typeof combatEffects !== 'undefined' && combatEffects) {
          combatEffects.push({ type: 'shield_player', source: item.name, value: val, shieldHp: val, duration: dur, turnsLeft: dur });
          log.push('🛡 Escudo +' + val + ' pts por ' + dur + ' turnos');
        } else {
          log.push('🛡 (Escudo ativo apenas em combate)');
        }
        break;
      }

      case 'tag_apply': {
        const tag = eff.tag || '';
        if (tag && typeof setTag === 'function') {
          setTag(tag, true);
          log.push('🏷 Tag "' + tag + '" aplicada');
        }
        break;
      }

      case 'cure_status': {
        // Remove veneno, sangramento e outros efeitos negativos
        if (typeof combatEffects !== 'undefined' && combatEffects) {
          const toRemove = ['poison', 'bleed', 'blind', 'stun', 'weaken', 'fear', 'silence'];
          const before = combatEffects.length;
          combatEffects = combatEffects.filter(e => !toRemove.includes(e.type));
          const removed = before - combatEffects.length;
          log.push('✨ ' + removed + ' efeito(s) negativo(s) removido(s)');
        } else {
          log.push('✨ Nenhum efeito a curar');
        }
        break;
      }
    }
  });

  // Consome o item do inventário
  removeItem(itemId);
  renderCharHud();

  const summary = log.length ? log.join(' · ') : 'Sem efeito';
  notify(item.icon + ' ' + item.name + ': ' + summary);
}

// ─── EQUIPAR / DESEQUIPAR ─────────────────────────────────
function equipItem(itemId) {
  if (!currentAdventure || !currentAdventure.items) return false;
  const item = currentAdventure.items[itemId];
  if (!item || !item.equippable || !item.slot) return false;

  if (item.classReq && character.classKey !== item.classReq) {
    notify('❌ Exige a classe: ' + item.classReq);
    return false;
  }

  if (character.equipamento[item.slot]) unequipItem(item.slot, true);

  character.equipamento[item.slot] = itemId;
  if (item.bonuses?.tags) item.bonuses.tags.forEach(t => setTag(t, true));
  if (item.curses?.tags)  item.curses.tags.forEach(t  => setTag(t, true));

  recalculateCombatStats();
  renderCharHud();
  notify('⚔ ' + item.icon + ' ' + item.name + ' equipado!');
  return true;
}

function unequipItem(slot, skipRender = false) {
  const itemId = character.equipamento[slot];
  if (!itemId) return;
  const item = currentAdventure?.items?.[itemId];
  if (item) {
    if (item.bonuses?.tags) item.bonuses.tags.forEach(t => setTag(t, false));
    if (item.curses?.tags)  item.curses.tags.forEach(t  => setTag(t, false));
  }
  character.equipamento[slot] = null;
  recalculateCombatStats();
  if (!skipRender) renderCharHud();
}

// ─── GETTERS ──────────────────────────────────────────────
// Retorna o valor base + bônus/penalidades de todos os itens equipados
function getAttrTotal(attrKey) {
  let val = character.attrs[attrKey] || 1;
  for (const slot in character.equipamento) {
    const itemId = character.equipamento[slot];
    if (!itemId) continue;
    const item = currentAdventure?.items?.[itemId];
    if (!item) continue;
    if (item.bonuses?.[attrKey]) val += item.bonuses[attrKey];
    if (item.curses?.[attrKey])  val -= item.curses[attrKey];
  }
  return Math.max(1, val);
}

// Recalcula atributos secundários de combate (todos os slots)
function recalculateCombatStats() {
  character.combatStats = { danoBonus: 0, precisaoBonus: 0, armadura: 0, esquivaBonus: 0 };
  for (const slot in character.equipamento) {
    const itemId = character.equipamento[slot];
    if (!itemId) continue;
    const item = currentAdventure?.items?.[itemId];
    if (!item) continue;
    if (item.bonuses) {
      if (item.bonuses.dano)     character.combatStats.danoBonus    += item.bonuses.dano;
      if (item.bonuses.precisao) character.combatStats.precisaoBonus+= item.bonuses.precisao;
      if (item.bonuses.resist)   character.combatStats.armadura      += item.bonuses.resist;
      if (item.bonuses.esquiva)  character.combatStats.esquivaBonus  += item.bonuses.esquiva;
    }
    if (item.curses) {
      if (item.curses.dano)     character.combatStats.danoBonus    -= item.curses.dano;
      if (item.curses.precisao) character.combatStats.precisaoBonus-= item.curses.precisao;
      if (item.curses.resist)   character.combatStats.armadura      -= item.curses.resist;
      if (item.curses.esquiva)  character.combatStats.esquivaBonus  -= item.curses.esquiva;
    }
  }
}

// ─── HUD ──────────────────────────────────────────────────
function renderInventoryHud() {
  const ouroEl = document.getElementById('char-ouro-hud');
  if (ouroEl) ouroEl.textContent = character.ouro;

  const equipEl = document.getElementById('equipment-hud');
  const invEl   = document.getElementById('inventory-hud');
  if (!equipEl || !invEl) return;

  if (!currentAdventure || !currentAdventure.items) {
    equipEl.innerHTML = invEl.innerHTML = ''; return;
  }

  // ── Slots de equipamento ──
  const slotNames = { arma: '⚔ Arma', armadura: '🛡 Armadura', acessorio: '💍 Acessório' };
  let eqHtml = '';
  ['arma','armadura','acessorio'].forEach(slot => {
    const itemId = character.equipamento[slot];
    if (itemId) {
      const item = currentAdventure.items[itemId];
      const bonusTip = _buildBonusTip(item);
      eqHtml += `<div style="display:flex;justify-content:space-between;align-items:center;
                   background:rgba(201,162,39,0.06);padding:0.4rem 0.6rem;
                   border:1px solid rgba(201,162,39,0.15);margin-bottom:0.25rem;">
        <div style="display:flex;flex-direction:column;gap:0.1rem;">
          <span style="font-size:0.8rem;" title="${escHtmlRuntime(item.desc||'')}">${item.icon} ${escHtmlRuntime(item.name)}</span>
          ${bonusTip ? '<span style="font-size:0.6rem;color:#a0d0a0;">' + bonusTip + '</span>' : ''}
        </div>
        <button onclick="unequipItem('${slot}')" style="background:none;border:none;color:#cc4444;cursor:pointer;font-size:0.75rem;flex-shrink:0;">✕</button>
      </div>`;
    } else {
      eqHtml += `<div style="padding:0.35rem 0.6rem;border:1px dashed rgba(201,162,39,0.15);
                   opacity:0.45;font-size:0.72rem;margin-bottom:0.25rem;">${slotNames[slot]} livre</div>`;
    }
  });
  equipEl.innerHTML = eqHtml;

  // ── Bônus de Combate ──
  const statsHud   = document.getElementById('combat-stats-hud');
  const statsInner = document.getElementById('combat-stats-inner');
  if (statsHud && statsInner) {
    const cs = character.combatStats;
    const chips = [];
    if (cs.danoBonus)     chips.push('<span style="color:#e07070;">⚔ +' + cs.danoBonus    + '</span>');
    if (cs.precisaoBonus) chips.push('<span style="color:#e0c060;">🎯 +' + cs.precisaoBonus + '</span>');
    if (cs.armadura)      chips.push('<span style="color:#80c0e0;">🛡 +' + cs.armadura       + '</span>');
    if (cs.esquivaBonus)  chips.push('<span style="color:#80e0a0;">💨 +' + cs.esquivaBonus  + '</span>');
    statsHud.style.display = chips.length ? 'block' : 'none';
    statsInner.innerHTML = chips.join('  ');
  }

  // ── Efeitos de arma pendentes ──
  _renderPendingWeaponEffects();

  // ── Inventário ──
  if (!character.inventario.length) {
    invEl.innerHTML = '<div style="text-align:center;opacity:0.5;font-size:0.8rem;padding:1rem;">Vazio</div>';
    return;
  }

  const counts = {};
  character.inventario.forEach(id => { counts[id] = (counts[id] || 0) + 1; });

  let invHtml = '';
  for (const [itemId, count] of Object.entries(counts)) {
    const item = currentAdventure.items[itemId];
    if (!item) continue;

    let equipCount = 0;
    Object.values(character.equipamento).forEach(eq => { if (eq === itemId) equipCount++; });
    const available = count - equipCount;

    const bonusTip = item.equippable ? _buildBonusTip(item) : '';
    const effTip   = !item.equippable ? _buildEffectTip(item) : '';

    invHtml += `<div style="display:flex;justify-content:space-between;align-items:center;
                  background:rgba(255,255,255,0.03);padding:0.4rem 0.6rem;
                  border:1px solid rgba(255,255,255,0.06);margin-bottom:0.25rem;">
      <div style="display:flex;flex-direction:column;gap:0.1rem;flex:1;min-width:0;">
        <span title="${escHtmlRuntime(item.desc||'')}">${item.icon} ${escHtmlRuntime(item.name)}${count>1?` <span style="font-size:0.68rem;color:var(--stone);">×${count}</span>`:''}</span>
        ${bonusTip ? '<span style="font-size:0.6rem;color:#a0d0a0;">' + bonusTip + '</span>' : ''}
        ${effTip   ? '<span style="font-size:0.6rem;color:#88aaff;">' + effTip   + '</span>' : ''}
      </div>
      <div style="display:flex;gap:0.3rem;flex-shrink:0;margin-left:0.4rem;">`;

    if (item.equippable && available > 0) {
      invHtml += `<button onclick="equipItem('${itemId}')"
        style="background:none;border:1px solid var(--gold);border-radius:3px;color:var(--gold);
               cursor:pointer;font-size:0.68rem;padding:0.15rem 0.4rem;">Equipar</button>`;
    } else if (item.equippable && available <= 0) {
      invHtml += `<span style="font-size:0.62rem;color:var(--stone);opacity:0.6;">Equipado</span>`;
    } else if (!item.equippable) {
      invHtml += `<button onclick="useItem('${itemId}')"
        style="background:none;border:1px solid #88aaff;border-radius:3px;color:#88aaff;
               cursor:pointer;font-size:0.68rem;padding:0.15rem 0.4rem;">Usar</button>`;
    }

    invHtml += '</div></div>';
  }

  if (!invHtml) invHtml = '<div style="text-align:center;opacity:0.5;font-size:0.8rem;padding:1rem;">Vazio</div>';
  invEl.innerHTML = invHtml;
}

// Helper: texto dos bônus/maldições de um equipável
function _buildBonusTip(item) {
  const parts = [];
  const b = item.bonuses || {};
  const c = item.curses  || {};
  if (b.dano)     parts.push('+' + b.dano + ' Dano');
  if (b.precisao) parts.push('+' + b.precisao + ' Acerto');
  if (b.resist)   parts.push('+' + b.resist + ' Arm');
  if (b.esquiva)  parts.push('+' + b.esquiva + ' Esq');
  if (b.forca)    parts.push('+' + b.forca + ' For');
  if (b.destreza) parts.push('+' + b.destreza + ' Des');
  if (b.inteligencia) parts.push('+' + b.inteligencia + ' Int');
  if (b.constituicao) parts.push('+' + b.constituicao + ' Con');
  if (c.dano)     parts.push('-' + c.dano + ' Dano');
  if (c.destreza) parts.push('-' + c.destreza + ' Des');
  if (c.esquiva)  parts.push('-' + c.esquiva + ' Esq');
  return parts.join(' · ');
}

// Helper: texto do efeito de um consumível
function _buildEffectTip(item) {
  const effs = item.consumableEffects || [];
  if (!effs.length) return '';
  const LABELS = {
    vida_restore: '❤️ Vida', vida_combat_restore: '💊 Vida Combate',
    sanidade_restore: '🧠 Sanidade', attr_temp: '⬆ Attr Temp',
    attr_perm: '✦ Attr Perm', weapon_poison: '☠ Veneno',
    weapon_fire: '🔥 Fogo', weapon_bleed: '🩸 Sangr.',
    shield_temp: '🛡 Escudo', tag_apply: '🏷 Tag', cure_status: '✨ Cura',
  };
  return effs.map(e => {
    const lbl = LABELS[e.type] || e.type;
    return lbl + (e.value ? ' +' + e.value : '');
  }).join(' · ');
}

// Helper: painel de efeitos de arma pendentes
function _renderPendingWeaponEffects() {
  const el = document.getElementById('weapon-effects-hud');
  if (!el) return;
  const pending = character._pendingWeaponEffects || [];
  if (!pending.length) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  el.innerHTML = '<div style="font-size:0.6rem;color:var(--stone);margin-bottom:0.3rem;letter-spacing:0.08em;">EFEITOS NA ARMA</div>' +
    pending.map(p => {
      const icons = { weapon_poison:'☠', weapon_fire:'🔥', weapon_bleed:'🩸' };
      return '<span style="font-size:0.72rem;margin-right:0.5rem;">' + (icons[p.type]||'✦') + ' ' + p.value + ' por ' + p.duration + ' turnos</span>';
    }).join('');
}
