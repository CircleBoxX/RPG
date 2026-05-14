// ═══════════════════════════════════════════════════════════
//  ENGINE — Toda a lógica do jogo, editor e sidequests
//  Este arquivo depende de data.js (carregado antes no HTML).
// ═══════════════════════════════════════════════════════════

// genId precisa estar disponível aqui pois é usada na inicialização do editorAdventure.
// A definição canônica está em utils.js; esta é apenas uma garantia de ordem de carga.
function genId() { return Math.random().toString(36).substring(2, 8); }

let currentAdventure = null;
let currentNodeId = null;
let sceneCount = 0;
let history = [];

// ── Epilogue tracking ──
let epilogueLog = {
  mainEnding: null,      // { type, title, sceneName }
  sqResults: [],         // [{ sqId, sqTitle, outcome:'victory'|'defeat'|'skipped', endingTitle, endingName }]
  totalChoices: 0,
  sqCompleted: 0,
};

// Character state
let character = {
  name: '',
  attrs: { forca:1, destreza:1, inteligencia:1, carisma:1, sabedoria:1, constituicao:1 },
  vida: 3, vidaMax: 3,           // vida da jornada — baixa e escassa, persiste entre combates
  sanidade: 3, sanidadeMax: 3,   // sanidade da jornada — idem
  vidaCombate: 18, vidaCombateMax: 18, // vida de combate — grande, reseta a cada combate
  tags: {},          // { tagName: true/false } — set of active tags
  classKey: '',      // key/index of chosen class
  primaryAttr: '',   // primary attribute of chosen class (e.g. 'forca')
  abilities: [],     // [ AbilityDef ] — habilidades do jogador
  abilityState: {},  // { [abId]: { cooldownLeft, usesLeft } }
  timedTags: [],     // [ { tag, scenesLeft, source, isCombatTurn? } ]
  _tempBuffs: [],    // [ { attrKey, value, scenesLeft, source } ]
  ouro: 0,           // Dinheiro do personagem
  inventario: [],    // Array de IDs de itens
  equipamento: { arma: null, armadura: null, acessorio: null }, // IDs de itens equipados
  combatStats: {     // Atributos secundários de combate baseados em equipamentos e bônus passivos
    danoBonus: 0,
    precisaoBonus: 0,
    armadura: 0,
    esquivaBonus: 0
  }
};

// ═══════════════════════════════════════════════════════════
//  TAG SYSTEM
// ═══════════════════════════════════════════════════════════

// Set or remove a tag on the player character
function setTag(tagName, value) {
  if (!tagName) return;
  const key = tagName.trim().toLowerCase();
  if (value === false || value === null || value === undefined || value === '' || value === 'false') {
    delete character.tags[key];
  } else {
    character.tags[key] = true;
  }
  renderTagsHud();
}

// Check if player has a tag
function hasTag(tagName) {
  if (!tagName) return false;
  return !!character.tags[tagName.trim().toLowerCase()];
}

// Apply an array of tag-set instructions: [{tag, value}]
function applyTagEffects(tagEffects) {
  if (!Array.isArray(tagEffects)) return;
  tagEffects.forEach(e => {
    if (e && e.tag) setTag(e.tag, e.value !== false);
  });
}

// Render mini tag display in HUD
function renderTagsHud() {
  let el = document.getElementById('tags-hud');
  if (!el) return;
  const keys = Object.keys(character.tags);
  if (!keys.length) { el.style.display = 'none'; return; }
  el.style.display = 'flex';
  el.innerHTML = keys.map(k =>
    `<span class="tag-chip">${escHtmlRuntime(k)}</span>`
  ).join('');
}

// Evaluate choice tag rules — returns: 'show' | 'hide' | 'disabled'
// choice.tagRules = [ { tag, mode:'show'|'hide'|'disable'|'redirect', redirectNode, invert } ]
function evalChoiceTagVisibility(choice) {
  if (!choice.tagRules || !choice.tagRules.length) return 'show';
  for (const rule of choice.tagRules) {
    const present = hasTag(rule.tag);
    const matches = rule.invert ? !present : present;
    if (!matches) continue;
    if (rule.mode === 'hide')     return 'hide';
    if (rule.mode === 'disable')  return 'disabled';
    // 'show' rules just keep showing (default)
  }
  return 'show';
}

// Get redirect node from tag rules (first matching redirect rule)
function evalChoiceTagRedirect(choice) {
  if (!choice.tagRules || !choice.tagRules.length) return null;
  for (const rule of choice.tagRules) {
    const present = hasTag(rule.tag);
    const matches = rule.invert ? !present : present;
    if (matches && rule.mode === 'redirect' && rule.redirectNode) {
      return rule.redirectNode;
    }
  }
  return null;
}

// Apply combat tag modifiers to a combat cfg (returns a new modified copy)
function applyCombatTagModifiers(cfg) {
  if (!cfg.tagModifiers || !cfg.tagModifiers.length) return cfg;
  // Deep copy to avoid mutating the original
  const modified = JSON.parse(JSON.stringify(cfg));
  for (const mod of cfg.tagModifiers) {
    const present = hasTag(mod.tag);
    const matches = mod.invert ? !present : present;
    if (!matches) continue;
    // skipToVictory: auto-win
    if (mod.skipToVictory) {
      modified._skipToVictory = true;
    }
    // Attribute modifiers on the enemy
    if (mod.attrDeltas) {
      if (!modified.attrs) modified.attrs = {};
      for (const [attr, delta] of Object.entries(mod.attrDeltas)) {
        modified.attrs[attr] = Math.max(1, (modified.attrs[attr] || 1) + delta);
      }
    }
    // Vida modifier
    if (mod.vidaDelta) {
      modified.vidaMax = Math.max(1, (modified.vidaMax || 8) + mod.vidaDelta);
      modified.vida    = modified.vidaMax;
    }
    // Special action unlock
    if (mod.specialAction) {
      modified._specialAction = mod.specialAction;
    }
  }
  return modified;
}
let pendingAdventure = null; // adventure waiting for character creation

// Editor state
let editorAdventure = {
  meta: { id: genId(), title: "Minha Aventura", author: "", desc: "", genre: "Fantasia Medieval", icon: "⚔️", startNode: "" },
  nodes: {},
  combats: {},
  items: {}
};
let selectedNodeId = null;
