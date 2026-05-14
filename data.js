// ═══════════════════════════════════════════════════════════
//  DATA — Configurações do Sistema e Aventura de Teste
// ═══════════════════════════════════════════════════════════

// ─── ATRIBUTOS DO SISTEMA ─────────────────────────────────
const ATTRS = [
  { key: 'forca',        name: 'Força',        icon: '⚔️',  desc: 'Combate físico, arrombamentos, intimidação' },
  { key: 'destreza',     name: 'Destreza',     icon: '🗡️',  desc: 'Furtividade, acrobacia, pontaria' },
  { key: 'inteligencia', name: 'Inteligência', icon: '📚',  desc: 'Magia, decifrar runas, estratégia' },
  { key: 'carisma',      name: 'Carisma',      icon: '🎶',  desc: 'Persuasão, negociação, liderança' },
  { key: 'sabedoria',    name: 'Sabedoria',    icon: '🌙',  desc: 'Percepção, vontade, resistência mental' },
  { key: 'constituicao', name: 'Constituição', icon: '🛡️',  desc: 'Resistência física, vigor, recuperação' },
];

const ATTR_MIN = 1;
const ATTR_MAX_CREATION = 5;
const ATTR_MAX = 10;
const FREE_POINTS = 7;
const BASE_POINTS_USED = ATTRS.length * ATTR_MIN;
const TOTAL_POINTS = FREE_POINTS + BASE_POINTS_USED;

// Fórmulas de vida e sanidade
function calcMaxVida(attrs)      { return 5 + (attrs.constituicao || 1); }
function calcMaxSanidade(attrs)  { return 5 + (attrs.sabedoria    || 1); }
function calcVidaCombate(attrs)  { return 10 + (attrs.constituicao || 1) * 2 + (attrs.forca || 1); }

// ─── CLASSES ──────────────────────────────────────────────
const CLASS_PRESETS = {
  warrior:  { forca:5, destreza:1, inteligencia:1, carisma:1, sabedoria:1, constituicao:1,  _primaryAttr: 'forca' },
  rogue:    { forca:1, destreza:5, inteligencia:1, carisma:1, sabedoria:1, constituicao:1,  _primaryAttr: 'destreza' },
  mage:     { forca:1, destreza:1, inteligencia:5, carisma:1, sabedoria:1, constituicao:1,  _primaryAttr: 'inteligencia' },
  bard:     { forca:1, destreza:1, inteligencia:1, carisma:5, sabedoria:1, constituicao:1,  _primaryAttr: 'carisma' },
  ranger:   { forca:1, destreza:1, inteligencia:1, carisma:1, sabedoria:5, constituicao:1,  _primaryAttr: 'sabedoria' },
  paladin:  { forca:1, destreza:1, inteligencia:1, carisma:1, sabedoria:1, constituicao:5,  _primaryAttr: 'constituicao' },
};

// ─── AVENTURA DE TESTE MESTRE ──────────────────────────────
const ULTIMATE_TEST_ADVENTURE = {
  meta: {
    id: "master-test",
    title: "O Laboratório do Reino",
    author: "Antigravity",
    desc: "Uma aventura técnica projetada para testar TODAS as mecânicas: Inventário, Equipamentos, Consumíveis, Ouro, Combate e Sidequests.",
    genre: "Teste de Sistemas",
    icon: "🧪",
    startNode: "start"
  },

  // Definição de ITENS para esta aventura
  items: {
    "espada_ferro": {
      id: "espada_ferro", name: "Espada de Ferro", icon: "⚔️", desc: "Uma espada básica mas afiada.",
      price: 20, equippable: true, slot: "arma", bonuses: { dano: 2, precisao: 5 }
    },
    "armadura_couro": {
      id: "armadura_couro", name: "Armadura de Couro", icon: "🛡️", desc: "Leve e flexível.",
      price: 30, equippable: true, slot: "armadura", bonuses: { resist: 1, esquiva: 5 }
    },
    "anel_sabio": {
      id: "anel_sabio", name: "Anel do Sábio", icon: "💍", desc: "Aumenta a clareza mental.",
      price: 50, equippable: true, slot: "acessorio", bonuses: { inteligencia: 1, sabedoria: 1 }
    },
    "pocao_vida": {
      id: "pocao_vida", name: "Poção de Vida", icon: "🧪", desc: "Restaura ferimentos leves.",
      price: 15, equippable: false, consumableEffects: [{ type: "vida_restore", value: 3 }]
    },
    "oleo_fogo": {
      id: "oleo_fogo", name: "Óleo de Fogo", icon: "🔥", desc: "Aplica chamas à sua arma para o próximo combate.",
      price: 25, equippable: false, consumableEffects: [{ type: "weapon_fire", value: 3, duration: 3 }]
    },
    "veneno_negro": {
      id: "veneno_negro", name: "Veneno Negro", icon: "☠️", desc: "Envenena a arma causando dano por turno.",
      price: 20, equippable: false, consumableEffects: [{ type: "weapon_poison", value: 2, duration: 4 }]
    },
    "elixir_forca": {
      id: "elixir_forca", name: "Elixir de Força", icon: "💪", desc: "Aumenta sua força temporariamente.",
      price: 40, equippable: false, consumableEffects: [{ type: "attr_temp", attr: "forca", value: 2, duration: 2 }]
    }
  },

  // Definição de COMBATES
  combats: {
    "dummy_fight": {
      id: "dummy_fight", name: "Espantalho de Treino", icon: "🎯",
      vidaMax: 20, vida: 20, xpReward: 50,
      attackAttr: "forca", precisionAttr: "destreza", damageDie: 4,
      victoryNode: "combat_victory",
      // Recompensas de Combate
      rewardGold: 25,
      rewardItems: ["pocao_vida"]
    }
  },

  nodes: {
    "start": {
      id: "start",
      title: "O Despertar no Laboratório",
      text: "Você acorda em uma sala cheia de engrenagens e frascos borbulhantes. Uma voz ecoa:\n\n«Bem-vindo ao teste final. Aqui, suas ferramentas e ouro são tão importantes quanto seus músculos.»\n\nSobre uma mesa, você encontra seu equipamento inicial e uma bolsa com 50 moedas de ouro.",
      // Recompensa inicial na cena
      rewardGold: 50,
      rewardItems: ["espada_ferro"],
      choices: [
        { text: "Equipar a espada e explorar a sala", next: "hub" }
      ]
    },

    "hub": {
      id: "hub",
      title: "Saguão de Testes",
      text: "O saguão central tem três portas principais. Painéis de vidro mostram seu status na lateral.\n\nVocê tem {{vida}}/{{vidaMax}} de vida e {{ouro}} moedas de ouro.",
      choices: [
        { text: "🛒 Ir ao Mercado (Testar Compra/Ouro)", next: "market" },
        { text: "⛰️ Ir à Floresta (Testar Atributos/Equipamento)", next: "forest" },
        { text: "⚔️ Ir à Arena (Testar Combate/Recompensas)", next: "arena" },
        { text: "🏁 Finalizar Teste", next: "ending" }
      ]
    },

    "market": {
      id: "market",
      title: "Mercado de Alquimia",
      text: "Um mercador robótico oferece itens especiais. Você precisa de ouro para comprá-los.\n\n(Dica: Abra a Sidebar para ver seu ouro atual).",
      choices: [
        { text: "Comprar Poção de Vida (15 🪙)", next: "market_buy", rewardItems: ["pocao_vida"], goldCost: 15 },
        { text: "Comprar Óleo de Fogo (25 🪙)", next: "market_buy", rewardItems: ["oleo_fogo"], goldCost: 25 },
        { text: "Comprar Veneno Negro (20 🪙)", next: "market_buy", rewardItems: ["veneno_negro"], goldCost: 20 },
        { text: "Voltar ao Saguão", next: "hub" }
      ]
    },

    "market_buy": {
      id: "market_buy",
      title: "Compra Realizada",
      text: "O mercador entrega o item com um clique metálico. «Use com sabedoria, aventureiro.»\n\nVocê pode testar o item agora mesmo abrindo seu inventário na barra lateral.",
      choices: [
        { text: "Voltar ao Mercado", next: "market" },
        { text: "Voltar ao Saguão", next: "hub" }
      ]
    },

    "forest": {
      id: "forest",
      title: "Trilha da Floresta",
      text: "Uma árvore caída bloqueia o caminho. Você pode tentar levantá-la ou pular por cima dela.\n\nSe você equipou a Espada de Ferro, seus bônus de atributo podem ajudar em certos testes!",
      choices: [
        { text: "Levantar o tronco (Força Dif 5)", next: "forest_success", nextFail: "forest_fail", attrCheck: "forca", difficulty: 5 },
        { text: "Saltar agilmente (Destreza Dif 4)", next: "forest_success", nextFail: "forest_fail", attrCheck: "destreza", difficulty: 4 },
        { text: "Voltar ao Saguão", next: "hub" }
      ]
    },

    "forest_success": {
      id: "forest_success",
      title: "Sucesso na Trilha",
      text: "Você passa com facilidade! No chão, você encontra uma Armadura de Couro abandonada.\n\nAbra o inventário e equipe-a para aumentar sua defesa.",
      rewardItems: ["armadura_couro"],
      choices: [
        { text: "Voltar ao Saguão", next: "hub" }
      ]
    },

    "forest_fail": {
      id: "forest_fail",
      title: "Fracasso na Trilha",
      text: "Você se atrapalha e acaba se machucando levemente (-1 Vida). A floresta é implacável.",
      vida: -1,
      choices: [
        { text: "Tentar novamente", next: "forest" },
        { text: "Voltar ao Saguão", next: "hub" }
      ]
    },

    "arena": {
      id: "arena",
      title: "Portão da Arena",
      text: "O mestre de armas te encara. «Pronto para testar sua lâmina? Se vencer, ganhará ouro e suprimentos.»\n\n(Dica: Use seus consumíveis antes de entrar, como o Óleo de Fogo, para ganhar bônus no combate!)",
      choices: [
        { text: "Entrar na Luta!", next: "dummy_fight", combatId: "dummy_fight" },
        { text: "Voltar ao Saguão", next: "hub" }
      ]
    },

    "combat_victory": {
      id: "combat_victory",
      title: "Vitória na Arena",
      text: "O espantalho foi destruído! O mestre de armas te joga uma bolsa de ouro e um anel mágico.\n\n«Nada mal. Você está pronto.»",
      rewardGold: 30,
      rewardItems: ["anel_sabio"],
      choices: [
        { text: "Voltar ao Saguão", next: "hub" }
      ]
    },

    "ending": {
      id: "ending",
      title: "Fim dos Testes",
      text: "Você explorou todas as alas do Laboratório. Seu personagem agora possui equipamentos, ouro e possivelmente marcas de batalha.\n\nObrigado por testar o sistema!",
      choices: [],
      ending: { type: "victory", title: "Mestre dos Sistemas" }
    }
  },

  // ─── SIDEQUEST DE TESTE ──────────────────────────────────
  sidequests: [
    {
      id: "sq_alchemy",
      title: "O Elixir Perdido",
      desc: "Um alquimista nervoso precisa de ajuda para recuperar um frasco que caiu no duto de ventilação.",
      declineText: "Não tenho tempo.",
      triggerNodes: ["hub", "market"],
      startNode: "sq_start",
      nodes: {
        "sq_start": {
          id: "sq_start",
          title: "O Alquimista",
          text: "«Por favor! Meu Elixir de Força rolou para dentro daquela grade! Meus braços não alcançam!»",
          choices: [
            { text: "Tentar alcançar com agilidade (Destreza Dif 5)", next: "sq_success", nextFail: "sq_fail", attrCheck: "destreza", difficulty: 5 },
            { text: "Ignorar o velho", next: "hub" }
          ]
        },
        "sq_success": {
          id: "sq_success",
          title: "Recuperado!",
          text: "Você recupera o frasco intacto. O alquimista pula de alegria.\n\n«Fique com um para você! É a minha melhor criação!»",
          rewardItems: ["elixir_forca"],
          choices: [],
          ending: { type: "victory", title: "Herói da Alquimia" }
        },
        "sq_fail": {
          id: "sq_fail",
          title: "Frasco Quebrado",
          text: "Você ouve um barulho de vidro quebrando. O cheiro de ervas fortes sobe pelo duto.\n\n«Oh não... meu trabalho de meses...»",
          choices: [],
          ending: { type: "defeat", title: "Falha Alquímica" }
        }
      }
    }
  ]
};

// ─── ARRAY DE AVENTURAS ────────────────────────────────────
let adventures = [ULTIMATE_TEST_ADVENTURE];