// ═══════════════════════════════════════════════════════════
//  DATA — Aventuras built-in, atributos e classes
//  Edite este arquivo para modificar as aventuras padrão do jogo.
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  DATA — built-in adventure
// ═══════════════════════════════════════════════════════════
const BUILTIN_ADVENTURE = {
  meta: {
    id: "builtin-1",
    title: "A Espada do Destino",
    author: "Crônicas do Reino",
    desc: "Você é um jovem escudeiro quando uma lenda antiga ressurge. Escolhas difíceis moldarão seu destino e o do reino.",
    genre: "Fantasia Medieval",
    icon: "⚔️",
    startNode: "start"
  },
  nodes: {
    "start": {
      id: "start",
      title: "O Chamado da Floresta",
      text: "O sol mal desponta quando o mensageiro real galopa pelo portão da aldeia. Seu cavalo espuma, os olhos arregalados de pavor.\n\n«A Espada de Aldric foi roubada do Templo das Pedras!» — grita ele antes de desmaiar.\n\n{{nome}} é um escudeiro sem mestre, dormindo no celeiro da estalagem. Os aldeões murmuram com medo. Dizem que sem a espada, o dragão ancestral Vorthaan despertará em sete dias.",
      choices: [
        { text: "Oferecer-se para ir ao Templo das Pedras investigar", next: "temple" },
        { text: "Procurar o ancião Mirdan, que conhece a lenda da espada", next: "elder" },
        { text: "Ignorar tudo e cuidar de sua própria vida", next: "ignore" }
      ]
    },
    "temple": {
      id: "temple",
      title: "O Templo das Pedras Negras",
      text: "A jornada até o templo leva duas horas pela floresta densa. Ao chegar, você encontra rastros de botas militares na lama... e o cheiro de enxofre no ar.\n\nDentro do santuário vazio, uma única pena negra repousa sobre o altar. Não é de nenhuma ave que você conhece.\n\nEnquanto examina o altar, ouve vozes ao fundo — dois guardas com armaduras sem emblema.",
      choices: [
        { text: "Espiar os guardas para ouvir sua conversa", next: "spy" },
        { text: "Enfrentá-los diretamente e exigir respostas", next: "confront" },
        { text: "Fugir e levar a pena negra ao ancião Mirdan", next: "elder_with_feather" }
      ]
    },
    "elder": {
      id: "elder",
      title: "O Ancião Mirdan",
      text: "Mirdan vive numa cabana cheia de pergaminhos e fumaça de ervas. Ele escuta sua história com olhos fechados.\n\n«A Espada de Aldric só pode ser roubada por alguém que conhece o caminho secreto», murmura. «Apenas três pessoas sabiam: eu, o Sumo Sacerdote... e o Conde Harvan.»\n\nSeu olhar fica pesado. «O Conde partiu para o norte ontem à noite.»",
      choices: [
        { text: "Ir ao norte perseguir o Conde", next: "north_road" },
        { text: "Perguntar ao ancião se ele pode ajudar de outra forma", next: "elder_help" },
        { text: "Ir ao templo investigar primeiro", next: "temple" }
      ]
    },
    "ignore": {
      id: "ignore",
      title: "A Decisão do Covarde",
      text: "Você empacota seus poucos pertences e parte pela estrada do sul, longe de problemas que não são seus.\n\nTrês dias depois, no horizonte, uma coluna de fogo sobe ao céu. O rugido de Vorthaan sacode a terra sob seus pés.\n\nVocê sobreviveu. Mas o reino não.",
      choices: [],
      ending: { type: "defeat", title: "O Fugitivo" }
    },
    "spy": {
      id: "spy",
      title: "Segredos nas Sombras",
      text: "Você se esconde atrás de uma coluna rachada. Os guardas falam baixo:\n\n«O Conde quer a espada entregue no Porto das Garças ao amanhecer de quinta. O navio já está esperando.»\n\n«E o dragão?» — pergunta o mais novo, nervoso.\n\n«O Conde diz que isso é lenda de velhos», ri o outro. «O ouro é real.»\n\nVocê tem informações valiosas. Mas eles estão se aproximando.",
      choices: [
        { text: "Recuar silenciosamente e partir para o Porto das Garças", next: "harbor" },
        { text: "Tentar prender os guardas sozinho", next: "fight_guards" }
      ]
    },
    "confront": {
      id: "confront",
      title: "O Preço da Coragem",
      text: "Você ergue a voz. Os guardas se viram — há dois deles, armados e treinados.\n\nA luta é rápida e brutal. Você é jovem e rápido, mas eles são experientes. Um golpe no crânio te deixa caindo.\n\nQuando acorda, a noite caiu. Os guardas se foram, e você está sozinho no templo escuro com um hematoma enorme e nenhuma informação.",
      choices: [
        { text: "Voltar à aldeia e contar o que aconteceu", next: "village_report" },
        { text: "Procurar rastros deles pela floresta", next: "track_guards" }
      ]
    },
    "elder_with_feather": {
      id: "elder_with_feather",
      title: "A Pena Negra",
      text: "Mirdan examina a pena com dedos trêmulos. Sua face empalidece.\n\n«Isso... isso é pena de um Corvo das Sombras. Aves que só existem além das Montanhas Geladas.» Ele para. «Só o Conde Harvan realizou essa expedição há vinte anos.\»\n\nO ancião abre um baú enferrujado e retira um mapa. «O Conde tem um esconderijo no Porto das Garças. Você precisa ir antes do amanhecer de quinta-feira.»",
      choices: [
        { text: "Partir imediatamente para o Porto das Garças", next: "harbor" },
        { text: "Pedir que Mirdan venha junto", next: "harbor_with_elder" }
      ]
    },
    "north_road": {
      id: "north_road",
      title: "A Estrada do Norte",
      text: "Você segue as trilhas de cascos na estrada norte. Ao entardecer, alcança uma pousada onde o mesoneiro sussurra que um nobre rico parou ali na noite anterior — apressado, carregando um embrulho longo.",
      choices: [
        { text: "Continuar norte até o Porto das Garças", next: "harbor" },
        { text: "Voltar e buscar reforços", next: "village_report" }
      ]
    },
    "harbor": {
      id: "harbor",
      title: "O Porto das Garças",
      text: "O porto está silencioso antes do amanhecer. Lanternas balançam nos mastros de um navio de bandeira neutra.\n\nVocê avista o Conde Harvan na doca — gordo, de capa escarlate, conversando com um homem de traços orientais que segura um baú.\n\nA Espada de Aldric está sendo transferida. Você tem minutos.",
      choices: [
        { text: "Chamar a guarda do porto a plenos pulmões", next: "call_guards" },
        { text: "Roubar a espada durante a confusão de uma distração", next: "steal_back" },
        { text: "Confrontar o Conde publicamente como testemunha", next: "confront_count" }
      ]
    },
    "harbor_with_elder": {
      id: "harbor_with_elder",
      title: "Dois contra o Destino",
      text: "Mirdan concorda, apoiando-se em seu cajado. Na estrada, ele conta histórias sobre a forja da espada — como o ferreiro sagrado usou o último raio de uma tempestade eterna.\n\nNo porto, sua chegada com um ancião cria uma distração perfeita. O Conde não espera testemunhas.",
      choices: [
        { text: "Usar a distração para chamar a guarda do porto", next: "call_guards" },
        { text: "Mirdan distrai o Conde enquanto você pega a espada", next: "steal_back" }
      ]
    },
    "call_guards": {
      id: "call_guards",
      title: "A Lei do Reino",
      text: "Sua voz corta o silêncio do porto. Guardas acordam, tochas se acendem.\n\nO Conde tenta negar, mas você descreve com precisão o embrulho, o navio e o comprador. O ancião Mirdan — se ele foi com você — confirma tudo.\n\nO Conde Harvan é preso. A espada é recuperada e devolvida ao Templo antes do despertar de Vorthaan.\n\nO Rei convoca você à corte. Uma nova era começa.",
      choices: [],
      ending: { type: "victory", title: "O Herói da Lei" }
    },
    "steal_back": {
      id: "steal_back",
      title: "Das Sombras para a Luz",
      text: "Com agilidade de gato, você se infiltra na troca. Num momento de distração, seus dedos fecham em torno do cabo da espada.\n\nA lâmina pulsa com calor dourado ao toque — como se reconhecesse um portador digno.\n\nVocê foge pela escuridão do porto. O Conde grita, mas sem provas, não pode acusar ninguém.\n\nAo amanhecer, a Espada de Aldric repousa novamente no altar. O dragão Vorthaan dorme por mais um século.",
      choices: [],
      ending: { type: "victory", title: "O Ladrão Justo" }
    },
    "confront_count": {
      id: "confront_count",
      title: "Face a Face",
      text: "Você caminha em direção ao Conde com passos firmes.\n\n«Em nome do reino, Conde Harvan — o que está nesse embrulho?»\n\nO Conde ri frio. Mas o comprador oriental fica nervoso. E quando guardas do porto acordam com o alvoroço, o Conde comete um erro fatal: ordena a fuga.\n\nFugir é confessar. Os guardas prendem todos. A espada volta ao templo.\n\nVocê não ganhou nada material — mas seu nome ecoa pelas tavernas como o escudeiro que encarou um Conde.",
      choices: [],
      ending: { type: "victory", title: "O Destemido" }
    },
    "fight_guards": {
      id: "fight_guards",
      title: "Superado",
      text: "Dois contra um. Você luta com coragem, mas eles são veteranos.\n\nVocê acorda três dias depois no celeiro da aldeia. O prazo se encerrou. Ao sul, uma coluna de fogo marca o fim de uma era.",
      choices: [],
      ending: { type: "defeat", title: "O Bravo Derrotado" }
    },
    "village_report": {
      id: "village_report",
      title: "Tarde Demais",
      text: "Quando você reúne a guarda e volta, o navio já partiu. A espada se perdeu além do mar.\n\nSem a espada, o ritual de contenção falha. Vorthaan desperta — mas fraco, sem sua plena força. O reino sobrevive, mas anos difíceis virão.\n\nSua honestidade foi valiosa. Mas a oportunidade se foi.",
      choices: [],
      ending: { type: "neutral", title: "A Verdade Tardia" }
    },
    "elder_help": {
      id: "elder_help",
      title: "Sabedoria Antiga",
      text: "Mirdan fecha os olhos por um longo momento. Então abre um mapa velho.\n\n«Eu não posso cavalgar. Mas conheço o caminho secreto pelo qual o Conde deve ter entrado no templo — e por onde vai sair. O Porto das Garças.»\n\nEle pressiona o mapa em suas mãos. «Vá. O tempo é curto.»",
      choices: [
        { text: "Partir para o Porto das Garças", next: "harbor" }
      ]
    },
    "track_guards": {
      id: "track_guards",
      title: "Na Trilha",
      text: "Com a cabeça latejando, você segue as pegadas pela floresta até uma estrada que leva ao norte... em direção ao Porto das Garças.",
      choices: [
        { text: "Seguir para o Porto das Garças", next: "harbor" }
      ]
    }
  }
};

// ═══════════════════════════════════════════════════════════
//  ATTRIBUTES SYSTEM
// ═══════════════════════════════════════════════════════════
const ATTRS = [
  { key: 'forca',        name: 'Força',        icon: '⚔️',  desc: 'Combate físico, arrombamentos, intimidação' },
  { key: 'destreza',     name: 'Destreza',     icon: '🗡️',  desc: 'Furtividade, acrobacia, pontaria' },
  { key: 'inteligencia', name: 'Inteligência', icon: '📚',  desc: 'Magia, decifrar runas, estratégia' },
  { key: 'carisma',      name: 'Carisma',      icon: '🎶',  desc: 'Persuasão, negociação, liderança' },
  { key: 'sabedoria',    name: 'Sabedoria',    icon: '🌙',  desc: 'Percepção, vontade, resistência mental' },
  { key: 'constituicao', name: 'Constituição', icon: '🛡️',  desc: 'Resistência física, vigor, recuperação' },
];

const ATTR_MIN = 1;
const ATTR_MAX_CREATION = 5;  // máximo na criação de personagem
const ATTR_MAX = 10;          // máximo absoluto (com bônus de sidequests)
const FREE_POINTS = 7;        // pontos livres para distribuir além do mínimo base
const BASE_POINTS_USED = ATTRS.length * ATTR_MIN;
const TOTAL_POINTS = FREE_POINTS + BASE_POINTS_USED;

// Fórmulas de vida e sanidade derivadas dos atributos
// vida    = 5 + constituição  (mín 6, máx 15)
// sanidade = 5 + sabedoria    (mín 6, máx 15)
// vidaCombate = 10 + constituição * 2 + força  (resetada a cada combate)
function calcMaxVida(attrs)      { return 5 + (attrs.constituicao || 1); }
function calcMaxSanidade(attrs)  { return 5 + (attrs.sabedoria    || 1); }
function calcVidaCombate(attrs)  { return 10 + (attrs.constituicao || 1) * 2 + (attrs.forca || 1); }

const CLASS_PRESETS = {
  //                        FOR  DES  INT  CAR  SAB  CON   ← atributo principal
  warrior:  { forca:5, destreza:1, inteligencia:1, carisma:1, sabedoria:1, constituicao:1,  _primaryAttr: 'forca' },
  rogue:    { forca:1, destreza:5, inteligencia:1, carisma:1, sabedoria:1, constituicao:1,  _primaryAttr: 'destreza' },
  mage:     { forca:1, destreza:1, inteligencia:5, carisma:1, sabedoria:1, constituicao:1,  _primaryAttr: 'inteligencia' },
  bard:     { forca:1, destreza:1, inteligencia:1, carisma:5, sabedoria:1, constituicao:1,  _primaryAttr: 'carisma' },
  ranger:   { forca:1, destreza:1, inteligencia:1, carisma:1, sabedoria:5, constituicao:1,  _primaryAttr: 'sabedoria' },
  paladin:  { forca:1, destreza:1, inteligencia:1, carisma:1, sabedoria:1, constituicao:5,  _primaryAttr: 'constituicao' },
};

// ═══════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════
let adventures = [BUILTIN_ADVENTURE, {
  meta: {
    id: "test-adventure",
    title: "Campo de Testes",
    author: "Sistema",
    desc: "Aventura curta para testar escolhas, rolagens de atributo e sidequests. Sem enredo — só mecânicas.",
    genre: "Teste",
    icon: "🧪",
    startNode: "t_start"
  },
  nodes: {
    "t_start": {
      id: "t_start",
      title: "Cruzamento",
      text: "Você está num cruzamento de três caminhos. Não há nada de especial aqui — apenas uma pedra velha, um mercador sentado num toco, e o vento passando.\n\nEste é o Campo de Testes. Escolha um caminho para ver cada mecânica em ação.",
      choices: [
        { text: "Estrada da Esquerda — Teste de Atributo (com sucesso/falha)", next: "t_attr" },
        { text: "Estrada do Meio — Escolha simples sem rolagem", next: "t_simple" },
        { text: "Estrada da Direita — Levar ao fim da aventura", next: "t_end_neutral" }
      ]
    },
    "t_attr": {
      id: "t_attr",
      title: "A Ponte Instável",
      text: "Uma ponte de madeira velha atravessa um riacho. As tábuas rangem ao vento. Parece que aguenta — mas talvez não a um peso como o seu.\n\nVocê pode tentar atravessar com cuidado, forçando a travessia, ou simplesmente voltar.",
      choices: [
        { text: "Atravessar com agilidade (Teste de Destreza)", next: "t_attr_success", nextFail: "t_attr_fail", attrCheck: "destreza", difficulty: 4 },
        { text: "Forçar a passagem (Teste de Força)", next: "t_attr_success", nextFail: "t_attr_fail", attrCheck: "forca", difficulty: 6 },
        { text: "Voltar ao cruzamento", next: "t_start" }
      ]
    },
    "t_attr_success": {
      id: "t_attr_success",
      title: "Passagem Segura",
      text: "Você atravessa sem problemas. Do outro lado, um velho guerreiro aplaude com sarcasmo.\n\n«Impressionante. Uma ponte velha. Quero ver você fazer isso de olhos fechados.»\n\nVocê pode continuar adiante ou voltar ao cruzamento.",
      choices: [
        { text: "Continuar para o vilarejo além da ponte", next: "t_village" },
        { text: "Voltar ao cruzamento", next: "t_start" }
      ]
    },
    "t_attr_fail": {
      id: "t_attr_fail",
      title: "Molhado até os ossos",
      text: "Uma tábua cede. Você cai no riacho — fundo na cintura, corrente forte.\n\nVocê sai do outro lado escorrendo, mas ileso. O velho guerreiro na margem ri sem piedade.\n\n«Pelo menos chegou lá.»",
      choices: [
        { text: "Continuar para o vilarejo, envergonhado mas vivo", next: "t_village" },
        { text: "Voltar ao cruzamento com o orgulho machucado", next: "t_start" }
      ]
    },
    "t_village": {
      id: "t_village",
      title: "O Pequeno Vilarejo",
      text: "Um punhado de casas. Uma estalagem, uma ferraria, um poço.\n\nNada de extraordinário — exceto uma mulher velha na entrada que te olha com olhos muito atentos.\n\n«Aventureiro», ela diz, «você passou pela ponte. Isso significa que você não tem medo — ou não tem juízo. Em qualquer caso, poderia me fazer um favor?»",
      choices: [
        { text: "Escutá-la (a resposta dela aparecerá como sidequest, se configurada)", next: "t_end_neutral" },
        { text: "Ignorar a velha e ir embora", next: "t_end_neutral" }
      ]
    },
    "t_simple": {
      id: "t_simple",
      title: "A Taverna",
      text: "A Taverna do Tonel Partido tem três mesas, uma lareira e um taberneiro com cara de poucos amigos.\n\nEle bota um copo na mesa sem você pedir.\n\n«Você bebe ou não bebe. Aqui não tem meio-termo.»",
      choices: [
        { text: "Beber. Sem hesitar.", next: "t_simple_drink" },
        { text: "Recusar educadamente", next: "t_simple_refuse" }
      ]
    },
    "t_simple_drink": {
      id: "t_simple_drink",
      title: "Sabor de Carvão e Mel",
      text: "O líquido é escuro, quente e tem gosto de floresta. Não é ruim.\n\nO taberneiro acena com a cabeça, como se você tivesse passado num teste que não sabia que estava fazendo.\n\n«Você volta quando quiser», ele diz. É o mais próximo de um elogio que ele conhece.",
      choices: [
        { text: "Voltar ao cruzamento", next: "t_start" },
        { text: "Terminar a aventura aqui — fim neutro", next: "t_end_neutral" }
      ]
    },
    "t_simple_refuse": {
      id: "t_simple_refuse",
      title: "Sem Graça",
      text: "O taberneiro recolhe o copo sem expressão.\n\n«Tudo bem», ele diz — mas claramente não é tudo bem.\n\nVocê fica sentado em silêncio por um tempo constrangedor antes de se levantar.",
      choices: [
        { text: "Voltar ao cruzamento", next: "t_start" },
        { text: "Terminar a aventura aqui — fim neutro", next: "t_end_neutral" }
      ]
    },
    "t_end_neutral": {
      id: "t_end_neutral",
      title: "Fim do Teste",
      text: "Você chegou ao fim do Campo de Testes.\n\nSe sidequests foram configuradas nesta aventura, elas podem ter aparecido ao longo do caminho como escolhas naturais.\n\nOs sistemas testados: escolha simples, teste de atributo com sucesso e falha, cenas encadeadas, e sidequests integradas.",
      choices: [],
      ending: { type: "neutral", title: "Testes Concluídos" }
    }
  },
  sidequests: [
    {
      id: "sq_test_1",
      title: "O Pergaminho Perdido",
      desc: "Escutar o que a velha tem a dizer — ela parece saber de algo importante",
      declineText: "Não há tempo para conversa com estranhos",
      triggerNodes: ["t_start", "t_attr_success", "t_attr_fail"],
      startNode: "sqt_intro",
      nodes: {
        "sqt_intro": {
          id: "sqt_intro",
          title: "O Pedido da Velha",
          text: "A velha explica: perdeu um pergaminho importante perto da ponte. Provavelmente caiu quando o vento forte passou ontem.\n\nNão parece perigoso. Mas ela promete algo em troca — uma moeda ou dois, e uma bênção que ela diz valer mais que ouro.",
          choices: [
            { text: "Procurar o pergaminho com cuidado (Inteligência)", next: "sqt_found", nextFail: "sqt_fail", attrCheck: "inteligencia", difficulty: 3 },
            { text: "Tentar a sorte — vasculhar tudo de qualquer jeito", next: "sqt_found", nextFail: "sqt_fail", attrCheck: "sorte", difficulty: 5 }
          ]
        },
        "sqt_found": {
          id: "sqt_found",
          title: "O Pergaminho",
          text: "Você encontra o pergaminho enrolado sob uma pedra perto da margem. Ainda legível.\n\nA velha o recebe com mãos trêmulas. «É o registro de nascimento do meu neto», ela murmura. «Obrigada.»\n\nEla te passa uma moeda antiga e murmurar uma bênção que faz seus ombros ficarem mais leves.",
          choices: [],
          ending: { type: "victory", title: "O Pergaminho Devolvido" }
        },
        "sqt_fail": {
          id: "sqt_fail",
          title: "Perdido para Sempre",
          text: "Você vasculha a margem por um bom tempo — mas não encontra nada. O pergaminho deve ter sido levado pela correnteza.\n\nVocê volta com as mãos vazias. A velha fecha os olhos com tristeza.\n\n«Tudo bem», ela diz. «Não era culpa sua.»\n\nMas o peso da falha fica com você.",
          choices: [],
          ending: { type: "defeat", title: "Sem Notícias do Pergaminho" }
        }
      },
      attrRewards: { forca: 0, destreza: 0, inteligencia: 1, carisma: 1, sabedoria: 0, constituicao: 0 },
      failDebuffs:  { forca: 0, destreza: 0, inteligencia: 0, carisma: -1, sabedoria: -1, constituicao: 0 },
      failPenalty: true
    }
  ]
},

// ═══════════════════════════════════════════════════════════
//  CAMPO DE TESTES — cobre todos os sistemas do engine
// ═══════════════════════════════════════════════════════════
{
  meta: {
    id: "test-full",
    title: "Campo de Testes",
    author: "Sistema",
    desc: "Aventura técnica que testa cada mecânica: escolhas simples, testes de atributo, tags, combate com habilidades, encontros com respostas e sidequests. Sem enredo — só engrenagens.",
    genre: "Teste",
    icon: "🧪",
    startNode: "hub"
  },

  // ── Encontros aleatórios ─────────────────────────────────
  randomEncounters: [
    {
      id: "enc_wanderer",
      title: "O Andarilho Estranho",
      icon: "🧙",
      type: "neutral",
      text: "Um andarilho de manto puído cruza seu caminho. Ele te olha de cima a baixo com interesse.\n\n«Você parece o tipo de pessoa que sabe o que está fazendo — ou pelo menos fingi bem.»",
      weight: 2,
      once: false,
      triggerNodes: [],
      requireTags: [],
      excludeTags: ["conhece_andarilho"],
      grantTags: [],
      vida: 0, sanidade: 0, points: 0, attrDeltas: {},
      responses: [
        {
          text: "Conversar com ele — parece saber coisas",
          attrCheck: "carisma",
          difficulty: 4,
          successText: "Ele sorri e conta sobre um atalho que poucos conhecem. Sua confiança cresceu.",
          failText: "Ele franze a testa e vai embora sem dizer mais nada. Constrangedor.",
          successVida: 0, successSanidade: 1, successPoints: 15,
          successGrantTags: ["conhece_andarilho"],
          failVida: 0, failSanidade: 0, failPoints: 0,
          failGrantTags: ["conhece_andarilho"]
        },
        {
          text: "Ignorar e seguir em frente",
          attrCheck: "",
          difficulty: 5,
          successText: "Você passa sem olhar. Ele bufa algo ininteligível atrás de você.",
          failText: "",
          successVida: 0, successSanidade: 0, successPoints: 0,
          successGrantTags: ["conhece_andarilho"],
          failVida: 0, failSanidade: 0, failPoints: 0,
          failGrantTags: []
        },
        {
          text: "Pedir uma bênção (Sabedoria — perceber intenção)",
          attrCheck: "sabedoria",
          difficulty: 5,
          successText: "Você percebe que ele é genuíno. Ele murmura palavras antigas — você sente sua mente mais clara.",
          failText: "Você não consegue avaliar se ele é confiável. Ele ri e parte sem cumprir o pedido.",
          successVida: 0, successSanidade: 1, successPoints: 20,
          successGrantTags: ["abencado", "conhece_andarilho"],
          failVida: 0, failSanidade: -1, failPoints: 0,
          failGrantTags: ["conhece_andarilho"]
        }
      ]
    },
    {
      id: "enc_ambush",
      title: "Emboscada Relâmpago",
      icon: "⚠️",
      type: "harmful",
      text: "Uma figura salta das sombras! Uma faca roça seu braço antes de você reagir.\n\n«Bolsa ou sangue, aventureiro.»",
      weight: 1,
      once: true,
      triggerNodes: [],
      requireTags: [],
      excludeTags: ["evitou_emboscada"],
      grantTags: [],
      vida: 0, sanidade: 0, points: 0, attrDeltas: {},
      responses: [
        {
          text: "Contra-atacar com força bruta",
          attrCheck: "forca",
          difficulty: 5,
          successText: "Seu soco conecta. O bandido cai tonto e foge mancando. Você sai ileso e ainda mais confiante.",
          failText: "Você balança o punho, mas erra. Ele aproveita e acerta um golpe no estômago antes de fugir.",
          successVida: 1, successSanidade: 0, successPoints: 25,
          successGrantTags: ["evitou_emboscada"],
          failVida: -1, failSanidade: 0, failPoints: 0,
          failGrantTags: ["evitou_emboscada"]
        },
        {
          text: "Recuar rapidamente e fugir",
          attrCheck: "destreza",
          difficulty: 4,
          successText: "Você dança para trás e desaparece entre as sombras antes que ele possa te alcançar. Limpo.",
          failText: "Você tropeça na pressa. Ele te dá um chute de raspão enquanto foge.",
          successVida: 0, successSanidade: 0, successPoints: 10,
          successGrantTags: ["evitou_emboscada"],
          failVida: -1, failSanidade: -1, failPoints: 0,
          failGrantTags: ["evitou_emboscada"]
        },
        {
          text: "Blefar — fingir que está acompanhado",
          attrCheck: "carisma",
          difficulty: 6,
          successText: "«Ei, pessoal — por aqui!» O bandido olha para os lados, entra em pânico e foge. Você nunca esteve tão sozinho na vida.",
          failText: "Ele não acredita nem um segundo. Ri da sua cara e te acerta antes de sumir.",
          successVida: 0, successSanidade: 1, successPoints: 30,
          successGrantTags: ["evitou_emboscada"],
          failVida: -1, failSanidade: -1, failPoints: 0,
          failGrantTags: ["evitou_emboscada"]
        }
      ]
    },
    {
      id: "enc_cache",
      title: "Baú Esquecido",
      icon: "📦",
      type: "beneficial",
      text: "Meio escondido atrás de uma rocha, um baú de madeira sem cadeado. Alguém o deixou aqui — ou o perdeu.",
      weight: 2,
      once: true,
      triggerNodes: [],
      requireTags: [],
      excludeTags: [],
      grantTags: ["achou_bau"],
      vida: 1, sanidade: 0, points: 30, attrDeltas: {},
      responses: []
    }
  ],

  // ── Sidequests ───────────────────────────────────────────
  sidequests: [
    {
      id: "sq_scholar",
      title: "O Manuscrito Cifrado",
      desc: "Um estudioso perdeu um manuscrito raro — ele precisa de alguém para recuperá-lo antes do anoitecer.",
      declineText: "Não tenho tempo para isso agora.",
      triggerNodes: ["hub", "zone_library"],
      startNode: "sq_s_intro",
      nodes: {
        "sq_s_intro": {
          id: "sq_s_intro",
          title: "O Pedido do Estudioso",
          text: "Um homem de óculos grossos e dedos manchados de tinta te para no corredor.\n\n«Por favor — meu manuscrito sobre runas antigas caiu no poço de leitura durante o terremoto da semana passada. Não consigo descer lá, mas você parece... capaz.»\n\nEle aperta as mãos nervoso. «Há algo valioso nele para mim. E para você, claro.»",
          choices: [
            {
              text: "Descer no poço com uma corda (Força)",
              next: "sq_s_success", nextFail: "sq_s_fail",
              attrCheck: "forca", difficulty: 4,
              vidaFail: -1,
              pointsSuccess: 20
            },
            {
              text: "Usar um gancho improvisado (Destreza)",
              next: "sq_s_success", nextFail: "sq_s_fail",
              attrCheck: "destreza", difficulty: 5,
              pointsSuccess: 20
            },
            {
              text: "Analisar o poço antes de agir (Inteligência)",
              next: "sq_s_success", nextFail: "sq_s_partial",
              attrCheck: "inteligencia", difficulty: 3,
              pointsSuccess: 25
            }
          ]
        },
        "sq_s_success": {
          id: "sq_s_success",
          title: "Resgatado",
          text: "O manuscrito está úmido mas legível. O estudioso o recebe com lágrimas nos olhos.\n\n«É insubstituível. Obrigado.» Ele te passa uma bolsinha de moedas e uma anotação sobre como decifrar runas básicas.\n\nVocê sente que aprendeu algo hoje — mesmo que indiretamente.",
          choices: [],
          ending: { type: "victory", title: "O Manuscrito Salvo", points: 50 }
        },
        "sq_s_partial": {
          id: "sq_s_partial",
          title: "Meio Caminho",
          text: "Você analisa a situação com cuidado mas não consegue encontrar o manuscrito — apenas alguns fragmentos de página.\n\nO estudioso agradece mesmo assim. «Pelo menos salvou algumas páginas. Obrigado pela tentativa.»",
          choices: [],
          ending: { type: "neutral", title: "Fragmentos Recuperados", points: 15 }
        },
        "sq_s_fail": {
          id: "sq_s_fail",
          title: "Mãos Vazias",
          text: "Você tenta, mas o manuscrito está em um ponto inacessível — ou se desfez completamente na água.\n\nO estudioso fecha os olhos com resignação. «Obrigado pela tentativa. Não era sua culpa.»\n\nMas o peso de não ter conseguido fica.",
          choices: [],
          ending: { type: "defeat", title: "Manuscrito Perdido", points: 0 }
        }
      },
      attrRewards: { forca: 0, destreza: 0, inteligencia: 1, carisma: 0, sabedoria: 1, constituicao: 0 },
      failDebuffs:  { forca: 0, destreza: 0, inteligencia: 0, carisma: -1, sabedoria: 0, constituicao: 0 },
      failPenalty: true
    },
    {
      id: "sq_guardian",
      title: "O Guardião da Passagem",
      desc: "Um guardião ferido bloqueia a saída leste — ele precisa de ajuda, mas é orgulhoso demais para pedir.",
      declineText: "Não é problema meu.",
      triggerNodes: ["zone_combat", "hub"],
      startNode: "sq_g_intro",
      nodes: {
        "sq_g_intro": {
          id: "sq_g_intro",
          title: "O Guardião Teimoso",
          text: "Um guardião alto e mal-humorado bloqueia a passagem leste, apoiando-se no escudo. Sua armadura tem sangue seco na parte inferior.\n\nVocê nota que ele está mancando — mas quando te olha, endireita o corpo como se nada fosse.",
          choices: [
            {
              text: "Oferecer ajuda diretamente (Carisma — convencer o orgulhoso)",
              next: "sq_g_helped", nextFail: "sq_g_refused",
              attrCheck: "carisma", difficulty: 5,
              pointsSuccess: 30
            },
            {
              text: "Perceber a ferida e agir sem pedir permissão (Sabedoria + Constituição)",
              next: "sq_g_helped", nextFail: "sq_g_partial",
              attrCheck: "sabedoria", difficulty: 4,
              pointsSuccess: 25
            },
            {
              text: "Ignorar e tentar passar por ele assim mesmo",
              next: "sq_g_ignored"
            }
          ]
        },
        "sq_g_helped": {
          id: "sq_g_helped",
          title: "Orgulho Curado",
          text: "Resistência inicial, mas você insiste. Ele aceita a ajuda com um grumido — uma forma de obrigado.\n\nEnquanto você aplica o curativo improvisado, ele fala pela primeira vez sem hostilidade:\n\n«Você sabe o que está fazendo. A passagem está livre para você.»",
          choices: [],
          ending: { type: "victory", title: "O Guardião Aliado", points: 60 }
        },
        "sq_g_partial": {
          id: "sq_g_partial",
          title: "Aproximação Silenciosa",
          text: "Você age sem pedir — e ele deixa. A ferida está tratada, mesmo que toscamente.\n\nEle não agradece com palavras. Só abre a passagem sem olhar para você.\n\nÀs vezes o silêncio é suficiente.",
          choices: [],
          ending: { type: "neutral", title: "Tratado em Silêncio", points: 25 }
        },
        "sq_g_refused": {
          id: "sq_g_refused",
          title: "Recusa Seca",
          text: "«Não preciso de ajuda» — e o tom não aceita debate.\n\nVocê recua. Ele permanece ferido, orgulhoso e bloqueando a passagem.\n\nAlguns não querem ser salvos.",
          choices: [],
          ending: { type: "defeat", title: "Ajuda Recusada", points: 0 }
        },
        "sq_g_ignored": {
          id: "sq_g_ignored",
          title: "Empurra-Empurra",
          text: "Você tenta passar. Ele não move um centímetro.\n\nVocês ficam se encarando por dez segundos desconfortáveis antes de você desistir.\n\n«Boa tentativa», ele diz, pela primeira vez com algo parecido com humor.",
          choices: [],
          ending: { type: "neutral", title: "Impasse Amistoso", points: 5 }
        }
      },
      attrRewards: { forca: 0, destreza: 0, inteligencia: 0, carisma: 1, sabedoria: 0, constituicao: 1 },
      failDebuffs:  { forca: 0, destreza: 0, inteligencia: 0, carisma: 0, sabedoria: -1, constituicao: 0 },
      failPenalty: false
    }
  ],

  // ── Nós principais ───────────────────────────────────────
  nodes: {

    // ┌─────────────────────────────────────────────────────┐
    // │  HUB CENTRAL                                        │
    // └─────────────────────────────────────────────────────┘
    "hub": {
      id: "hub",
      title: "O Saguão dos Sistemas",
      text: "Você está no centro de uma câmara circular. Cinco arcos se abrem para zonas de teste distintas.\n\nPainel de pedra na parede central:\n\n«ZONA AZUL — Escolhas e Consequências\nZONA VERMELHA — Testes de Atributo\nZONA ROXA — Sistema de Tags\nZONA LARANJA — Combate\nZONA VERDE — Biblioteca (Sidequest)»\n\nO chão brilha levemente sob seus pés. Você está com {{vida}}/{{vidaMax}} de vida.",
      choices: [
        { text: "→ Zona Azul: Escolhas e Efeitos Diretos", next: "zone_choices" },
        { text: "→ Zona Vermelha: Testes de Atributo (todos os 6)", next: "zone_attrs" },
        { text: "→ Zona Roxa: Sistema de Tags", next: "zone_tags_intro" },
        { text: "→ Zona Laranja: Combate com Habilidades", next: "zone_combat" },
        { text: "→ Zona Verde: Biblioteca (ativa Sidequest)", next: "zone_library" },
        { text: "→ Saída: Encerramentos", next: "zone_endings" }
      ]
    },

    // ┌─────────────────────────────────────────────────────┐
    // │  ZONA AZUL — Escolhas com efeitos diretos           │
    // └─────────────────────────────────────────────────────┘
    "zone_choices": {
      id: "zone_choices",
      title: "Zona Azul: Escolhas e Efeitos",
      text: "Esta zona testa escolhas simples com efeitos de vida, sanidade e pontos aplicados diretamente — sem rolagem de dado.\n\nA poção verde restaura vida. A vermelha custa sanidade. A dourada dá pontos. O descanso recupera tudo um pouco.",
      choices: [
        {
          text: "Beber a poção verde (+1 Vida)",
          next: "zone_choices",
          vida: 1,
          points: 5
        },
        {
          text: "Provar a poção vermelha (−1 Sanidade, +20 pts — risco calculado)",
          next: "zone_choices",
          sanidade: -1,
          points: 20
        },
        {
          text: "Pegar a moeda dourada (+30 pts)",
          next: "zone_choices",
          points: 30
        },
        {
          text: "Descansar brevemente (+1 Vida, +1 Sanidade, −10 pts — custo de tempo)",
          next: "zone_choices",
          vida: 1,
          sanidade: 1,
          points: -10
        },
        { text: "← Voltar ao Saguão", next: "hub" }
      ]
    },

    // ┌─────────────────────────────────────────────────────┐
    // │  ZONA VERMELHA — Testes de Atributo                 │
    // └─────────────────────────────────────────────────────┘
    "zone_attrs": {
      id: "zone_attrs",
      title: "Zona Vermelha: Testes de Atributo",
      text: "Seis pedestais, cada um com um desafio diferente. Cada teste usa um atributo distinto.\n\nSucesso e falha levam a cenas diferentes — com textos e efeitos próprios.",
      choices: [
        { text: "⚔️ Pedestal da Força — Mover a pedra", next: "attr_forca" },
        { text: "🗡️ Pedestal da Destreza — Atravessar sem tocar", next: "attr_destreza" },
        { text: "📚 Pedestal da Inteligência — Decifrar a runa", next: "attr_inteligencia" },
        { text: "🎶 Pedestal do Carisma — Convencer o espectro", next: "attr_carisma" },
        { text: "🌙 Pedestal da Sabedoria — Perceber a armadilha", next: "attr_sabedoria" },
        { text: "🛡️ Pedestal da Constituição — Resistir ao veneno", next: "attr_constituicao" },
        { text: "← Voltar ao Saguão", next: "hub" }
      ]
    },

    "attr_forca": {
      id: "attr_forca",
      title: "A Pedra do Gigante",
      text: "Uma pedra esférica do tamanho de um barril sela a passagem. Pesada demais para qualquer homem comum.\n\nVocê vê marcas de mãos anteriores no granito — muita gente tentou antes.",
      choices: [
        {
          text: "Empurrar com tudo que você tem (Força, Dif. 5)",
          next: "attr_forca_ok", nextFail: "attr_forca_fail",
          attrCheck: "forca", difficulty: 5,
          pointsSuccess: 30, pointsFail: 5,
          vidaFail: -1
        },
        { text: "← Voltar", next: "zone_attrs" }
      ]
    },
    "attr_forca_ok": {
      id: "attr_forca_ok",
      title: "A Pedra Cede",
      text: "Com um grunhido surdo, a pedra rola. A passagem está aberta.\n\nSeus braços doem, mas a satisfação compensa. Uma ficha de cobre cai do interior — um troféu deixado por alguém.",
      choices: [{ text: "← Voltar aos pedestais", next: "zone_attrs" }]
    },
    "attr_forca_fail": {
      id: "attr_forca_fail",
      title: "Imóvel",
      text: "A pedra não se move nem um milímetro. Você tenta de novo — e de novo. No fim, você para ofegante, com as costas doendo.\n\nA pedra permanece indiferente.",
      choices: [{ text: "← Voltar aos pedestais", next: "zone_attrs" }]
    },

    "attr_destreza": {
      id: "attr_destreza",
      title: "O Corredor de Lâminas",
      text: "Lâminas pendulares cortam o ar em ritmo mecânico. O espaço entre elas é suficiente — para quem for rápido o bastante.",
      choices: [
        {
          text: "Atravessar no ritmo certo (Destreza, Dif. 5)",
          next: "attr_destreza_ok", nextFail: "attr_destreza_fail",
          attrCheck: "destreza", difficulty: 5,
          pointsSuccess: 30, pointsFail: 5,
          vidaFail: -1, sanidadeFail: 0
        },
        { text: "← Voltar", next: "zone_attrs" }
      ]
    },
    "attr_destreza_ok": {
      id: "attr_destreza_ok",
      title: "Passagem Perfeita",
      text: "Você lê o ritmo das lâminas como se fosse dança. Cada passo no momento exato. Do outro lado, você vira e faz uma mesura teatral para ninguém.\n\nNinguém viu, mas valeu.",
      choices: [{ text: "← Voltar aos pedestais", next: "zone_attrs" }]
    },
    "attr_destreza_fail": {
      id: "attr_destreza_fail",
      title: "Corte de Raspão",
      text: "Uma lâmina te acerta de raspão no ombro. Não é grave — mas dói, e o orgulho dói mais.\n\nVocê atravessa do outro lado mancando levemente.",
      choices: [{ text: "← Voltar aos pedestais", next: "zone_attrs" }]
    },

    "attr_inteligencia": {
      id: "attr_inteligencia",
      title: "A Runa Proibida",
      text: "Uma tábua de pedra exibe uma sequência de símbolos. Uma inscrição abaixo diz: «Diga o nome que está escrito aqui e a porta se abre. Diga errado e pague o preço.»\n\nVocê estuda os símbolos.",
      choices: [
        {
          text: "Decifrar a runa e pronunciar o nome (Inteligência, Dif. 5)",
          next: "attr_int_ok", nextFail: "attr_int_fail",
          attrCheck: "inteligencia", difficulty: 5,
          pointsSuccess: 35, pointsFail: 5,
          sanidadeFail: -1
        },
        { text: "← Voltar", next: "zone_attrs" }
      ]
    },
    "attr_int_ok": {
      id: "attr_int_ok",
      title: "Nome Correto",
      text: "«Valdris.» A palavra saiu errada por um segundo — e então a porta se abre com um clique suave.\n\nDo outro lado, um pergaminho em branco. Nada escrito. Mas de alguma forma você sente que o teste era a tradução, não a recompensa.",
      choices: [{ text: "← Voltar aos pedestais", next: "zone_attrs" }]
    },
    "attr_int_fail": {
      id: "attr_int_fail",
      title: "Resposta Errada",
      text: "Você fala um nome — o errado. Um pulso de energia invisível te empurra de volta um metro.\n\nNenhum dano físico. Mas algo na sua cabeça range desconfortavelmente.",
      choices: [{ text: "← Voltar aos pedestais", next: "zone_attrs" }]
    },

    "attr_carisma": {
      id: "attr_carisma",
      title: "O Espectro da Sala",
      text: "Uma figura translúcida flutua no centro da sala. Braços cruzados, expressão fechada.\n\n«Eu só deixo passar quem merece», diz o espectro. «Convença-me.»\n\nEle espera.",
      choices: [
        {
          text: "Argumentar com sinceridade (Carisma, Dif. 5)",
          next: "attr_car_ok", nextFail: "attr_car_fail",
          attrCheck: "carisma", difficulty: 5,
          pointsSuccess: 30, pointsFail: 5,
          sanidadeSuccess: 1, sanidadeFail: -1
        },
        { text: "← Voltar", next: "zone_attrs" }
      ]
    },
    "attr_car_ok": {
      id: "attr_car_ok",
      title: "Convencido",
      text: "O espectro escuta. Lentamente, seu rosto rígido suaviza.\n\n«Você... realmente acredita no que diz.» Ele se dissolve com um aceno de cabeça.\n\nA sala fica silenciosa, mas de um jeito que parece aprovação.",
      choices: [{ text: "← Voltar aos pedestais", next: "zone_attrs" }]
    },
    "attr_car_fail": {
      id: "attr_car_fail",
      title: "Não Convenceu",
      text: "O espectro ouve pacientemente — e então balança a cabeça.\n\n«Palavras vazias.» Ele permanece no lugar, implacável.\n\nVocê se retira sem ter chegado a lugar algum.",
      choices: [{ text: "← Voltar aos pedestais", next: "zone_attrs" }]
    },

    "attr_sabedoria": {
      id: "attr_sabedoria",
      title: "O Corredor Silencioso",
      text: "O corredor parece normal. Pedras lisas, luz estável, sem nada de suspeito.\n\nMas algo — uma sensação — te diz que nem tudo está certo aqui.",
      choices: [
        {
          text: "Parar e observar antes de entrar (Sabedoria, Dif. 4)",
          next: "attr_sab_ok", nextFail: "attr_sab_fail",
          attrCheck: "sabedoria", difficulty: 4,
          pointsSuccess: 30, pointsFail: 5,
          vidaFail: -1
        },
        {
          text: "Entrar direto — parece seguro",
          next: "attr_sab_fail",
          vida: -1
        },
        { text: "← Voltar", next: "zone_attrs" }
      ]
    },
    "attr_sab_ok": {
      id: "attr_sab_ok",
      title: "Percepção Aguçada",
      text: "Você para na entrada. Estuda o chão por um momento — e então vê: uma placa de pressão levemente mais clara que as outras, a dois passos de distância.\n\nVocê contorna pela borda da parede. No final do corredor, uma ficha prateada te espera.",
      choices: [{ text: "← Voltar aos pedestais", next: "zone_attrs" }]
    },
    "attr_sab_fail": {
      id: "attr_sab_fail",
      title: "Armadilha Ativada",
      text: "Seu pé pousa na placa. Um jato de vapor quente estoura da parede — não mata, mas queima.\n\nVocê sai do corredor bufando palavrões, com marcas vermelhas no braço.",
      choices: [{ text: "← Voltar aos pedestais", next: "zone_attrs" }]
    },

    "attr_constituicao": {
      id: "attr_constituicao",
      title: "O Cálice do Teste",
      text: "Um cálice de pedra está cheio de um líquido escuro e espesso. Uma inscrição no pedestal: «Beba. O forte passa. O fraco aprende.»",
      choices: [
        {
          text: "Beber o conteúdo do cálice (Constituição, Dif. 5)",
          next: "attr_con_ok", nextFail: "attr_con_fail",
          attrCheck: "constituicao", difficulty: 5,
          pointsSuccess: 35, pointsFail: 10,
          vidaFail: -2
        },
        { text: "← Voltar sem beber", next: "zone_attrs" }
      ]
    },
    "attr_con_ok": {
      id: "attr_con_ok",
      title: "O Corpo Resiste",
      text: "O líquido desce amargo como fel. Seu estômago revira — mas você fica de pé, imóvel.\n\nApós trinta segundos agonizantes, a sensação passa. No lugar dela, uma energia estranha e limpa.\n\nO cálice some. No pedestal, seu nome aparece gravado.",
      choices: [{ text: "← Voltar aos pedestais", next: "zone_attrs" }]
    },
    "attr_con_fail": {
      id: "attr_con_fail",
      title: "Muito Forte",
      text: "O líquido desce — e imediatamente vira de avesso. Você passa dez minutos péssimos encurvado.\n\nQuando finalmente se levanta, está pálido, trêmulo e humilhado.\n\nO cálice ainda está cheio. Como se nada tivesse acontecido.",
      choices: [{ text: "← Voltar aos pedestais", next: "zone_attrs" }]
    },

    // ┌─────────────────────────────────────────────────────┐
    // │  ZONA ROXA — Sistema de Tags                        │
    // └─────────────────────────────────────────────────────┘
    "zone_tags_intro": {
      id: "zone_tags_intro",
      title: "Zona Roxa: Tags e Memória",
      text: "Esta zona demonstra o sistema de tags — marcadores invisíveis que o jogo lembra sobre você.\n\nVocê ainda não tem nenhuma tag ativa aqui. Suas escolhas nesta zona vão criar e consumir tags, mostrando como elas alteram o que aparece.",
      choices: [
        { text: "Pegar o cristal azul (ganha tag: tem_cristal)", next: "zone_tags_cristal" },
        { text: "Falar com a sombra (ganha tag: falou_sombra)", next: "zone_tags_sombra" },
        { text: "← Voltar ao Saguão", next: "hub" }
      ]
    },
    "zone_tags_cristal": {
      id: "zone_tags_cristal",
      title: "O Cristal Azul",
      text: "O cristal pulsa levemente em sua mão. Algo nele ressoa.\n\nAgora você carrega o cristal. Isso vai mudar o que alguns NPCs têm a dizer.",
      choices: [
        {
          text: "Ir para a sala do oráculo",
          next: "zone_tags_oraculo",
          tagEffects: [{ tag: "tem_cristal", value: true }]
        }
      ]
    },
    "zone_tags_sombra": {
      id: "zone_tags_sombra",
      title: "A Sombra que Fala",
      text: "Uma sombra projetada na parede se move sozinha. Ela vira a cabeça para você.\n\n«Você ouviu. Isso é o suficiente por agora.»\n\nVocê não entendeu bem — mas algo ficou.",
      choices: [
        {
          text: "Ir para a sala do oráculo",
          next: "zone_tags_oraculo",
          tagEffects: [{ tag: "falou_sombra", value: true }]
        }
      ]
    },
    "zone_tags_oraculo": {
      id: "zone_tags_oraculo",
      title: "A Sala do Oráculo",
      text: "O oráculo é uma estátua com quatro braços e nenhuma boca. Três opções surgem na parede — mas algumas só aparecem para quem merece.",
      choices: [
        {
          text: "«Mostre o cristal» — [visível apenas com tem_cristal]",
          next: "zone_tags_cristal_result",
          tagRules: [{ tag: "tem_cristal", mode: "hide", invert: true }]
        },
        {
          text: "«Contar sobre a sombra» — [visível apenas com falou_sombra]",
          next: "zone_tags_sombra_result",
          tagRules: [{ tag: "falou_sombra", mode: "hide", invert: true }]
        },
        {
          text: "«Nada a mostrar» — [sempre visível]",
          next: "zone_tags_nada"
        },
        {
          text: "«Você teve as duas experiências» — [bloqueado sem ambas as tags]",
          next: "zone_tags_ambos_result",
          tagRules: [
            { tag: "tem_cristal", mode: "disable", invert: true },
            { tag: "falou_sombra", mode: "disable", invert: true }
          ]
        },
        { text: "← Voltar ao Saguão", next: "hub" }
      ]
    },
    "zone_tags_cristal_result": {
      id: "zone_tags_cristal_result",
      title: "A Resposta do Cristal",
      text: "A estátua estende um braço e toca o cristal. Ele brilha forte por um segundo — e então apaga.\n\n«Você carrega luz», diz uma voz que não vem de lugar nenhum. «Mas luz atrai sombra. Lembre disso.»",
      choices: [{ text: "← Voltar ao Oráculo", next: "zone_tags_oraculo" }]
    },
    "zone_tags_sombra_result": {
      id: "zone_tags_sombra_result",
      title: "A Resposta da Sombra",
      text: "A estátua inclina a cabeça. «Você ouviu o que não devia ser ouvido — e isso te torna mais importante do que imagina.»\n\nO silêncio depois disso pesa como algo concreto.",
      choices: [{ text: "← Voltar ao Oráculo", next: "zone_tags_oraculo" }]
    },
    "zone_tags_nada": {
      id: "zone_tags_nada",
      title: "Mãos Vazias",
      text: "A estátua olha para você — ou pelo menos dá essa sensação.\n\n«Você chegou aqui sem experiência. Isso também é uma resposta.»\n\nNão há julgamento. Apenas observação.",
      choices: [{ text: "← Voltar ao Oráculo", next: "zone_tags_oraculo" }]
    },
    "zone_tags_ambos_result": {
      id: "zone_tags_ambos_result",
      title: "Luz e Sombra Juntas",
      text: "A estátua se ilumina completamente por um instante.\n\n«Você carrega as duas faces. Poucos chegam aqui com ambas.»\n\nO oráculo se curva — a única vez que algo aqui te tratou como igual.",
      choices: [{ text: "← Voltar ao Oráculo", next: "zone_tags_oraculo" }]
    },

    // ┌─────────────────────────────────────────────────────┐
    // │  ZONA LARANJA — Combate                             │
    // └─────────────────────────────────────────────────────┘
    "zone_combat": {
      id: "zone_combat",
      title: "Zona Laranja: Combate",
      text: "Uma arena circular com três portas marcadas. O cheiro de metal e suor enche o ar.\n\nTrês encontros de dificuldades distintas — cada um demonstra mecânicas diferentes de combate.",
      choices: [
        { text: "Porta 1 — Recruta (combate simples, sem habilidades)", next: "combat_basic" },
        { text: "Porta 2 — Veterano (com habilidades, fuga permitida)", next: "combat_veteran" },
        { text: "Porta 3 — Guardião (habilidades múltiplas, sem fuga)", next: "combat_boss" },
        { text: "← Voltar ao Saguão", next: "hub" }
      ]
    },

    "combat_basic": {
      id: "combat_basic",
      title: "O Recruta",
      text: "Um jovem guarda em armadura polida demais te bloqueia com uma lança. Inexperiente — mas determinado.",
      combat: {
        name: "Recruta",
        icon: "🪖",
        vida: 18,
        vidaMax: 18,
        attrs: { forca: 2, destreza: 2, constituicao: 2 },
        xpReward: 30,
        fleeAllowed: true,
        defeatPenalty: 1,
        victoryNode: "combat_basic_win",
        defeatNode: "combat_basic_lose",
        fleeNode: "zone_combat",
        victoryText: "O recruta cai no chão bufando. Ele vai estar bem — provavelmente.",
        defeatText: "Ele era mais rápido do que parecia. Você recua com o orgulho machucado.",
        fleeText: "Você se afasta. Ele te deixa ir — novatos não insistem.",
        victoryTagEffects: [{ tag: "venceu_recruta", value: true }],
        defeatTagEffects: [],
        abilities: []
      },
      choices: []
    },
    "combat_basic_win": {
      id: "combat_basic_win",
      title: "Recruta Derrubado",
      text: "O recruta se levanta devagar, envergonhado mas ileso.\n\n«Bom combate», ele admite, enxugando a testa.\n\nVocê ganhou experiência — e uma tag que prova isso.",
      choices: [{ text: "← Voltar à Arena", next: "zone_combat" }]
    },
    "combat_basic_lose": {
      id: "combat_basic_lose",
      title: "Derrubado pelo Novato",
      text: "Ele ficou de pé, você não. Constrangedor.\n\nO recruta te estende a mão para levantar — pelo menos ele é cavalheiro.",
      choices: [{ text: "← Voltar à Arena", next: "zone_combat" }]
    },

    "combat_veteran": {
      id: "combat_veteran",
      title: "O Veterano",
      text: "Cicatrizes de batalha cruzam seu rosto. Ele te avalia com um olhar que já viu tudo.\n\n«Vamos ver o que você aprendeu.»",
      combat: {
        name: "Veterano",
        icon: "⚔️",
        vida: 28,
        vidaMax: 28,
        attrs: { forca: 4, destreza: 3, constituicao: 3 },
        xpReward: 60,
        fleeAllowed: true,
        defeatPenalty: 1,
        victoryNode: "combat_vet_win",
        defeatNode: "combat_vet_lose",
        fleeNode: "zone_combat",
        victoryText: "O veterano balança a cabeça com respeito. «Não esperava isso de você.»",
        defeatText: "Ele te derruba com um golpe limpo. «Volte quando tiver treinado mais.»",
        fleeText: "Ele deixa você recuar. «Saber quando fugir também é habilidade.»",
        victoryTagEffects: [{ tag: "venceu_veterano", value: true }],
        defeatTagEffects: [{ tag: "foi_derrotado_vet", value: true }],
        abilities: [
          {
            id: "ab_vet_golpe",
            name: "Golpe de Experiência",
            icon: "🗡️",
            quotes: [
              "«Você abriu uma guarda ali. Erro fatal.»",
              "«Vi esse movimento há vinte anos.»",
              "«Previsível.»"
            ],
            effects: [
              { type: "debuff_player", attr: "destreza", value: 1, duration: 2 }
            ],
            triggerCondition: "any",
            triggerRoundMin: 2,
            triggerHpPct: 50,
            usageChance: 40,
            cooldown: 3,
            maxUses: 0
          },
          {
            id: "ab_vet_regen",
            name: "Fôlego de Guerra",
            icon: "💪",
            quotes: [
              "«Não é a primeira vez que sangro em combate.»",
              "«Aprendi a aguentar mais do que isso.»"
            ],
            effects: [
              { type: "regen_self", attr: "vida", value: 3, duration: 2 }
            ],
            triggerCondition: "lowHp",
            triggerRoundMin: 1,
            triggerHpPct: 40,
            usageChance: 70,
            cooldown: 4,
            maxUses: 1
          }
        ]
      },
      choices: []
    },
    "combat_vet_win": {
      id: "combat_vet_win",
      title: "Respeito Ganho",
      text: "O veterano abaixa a arma devagar.\n\n«Você tem jeito.» Não é elogio fácil vindo dele.\n\nEle te passa uma moeda de treino como marcador — você venceu o segundo nível.",
      choices: [{ text: "← Voltar à Arena", next: "zone_combat" }]
    },
    "combat_vet_lose": {
      id: "combat_vet_lose",
      title: "Lição Difícil",
      text: "Você está no chão olhando para o teto.\n\n«Você tem potencial», diz o veterano acima de você. «Mas potencial não para um golpe.»\n\nEle te ajuda a levantar.",
      choices: [{ text: "← Voltar à Arena", next: "zone_combat" }]
    },

    "combat_boss": {
      id: "combat_boss",
      title: "O Guardião da Porta",
      text: "Ele usa uma máscara de ferro sem expressão. Em cada mão, uma espada curta. Não diz uma palavra.\n\nA porta atrás dele está trancada. Não há saída a não ser passar por ele.",
      combat: {
        name: "Guardião Mascarado",
        icon: "🎭",
        vida: 40,
        vidaMax: 40,
        attrs: { forca: 5, destreza: 4, constituicao: 4 },
        xpReward: 100,
        fleeAllowed: false,
        defeatPenalty: 2,
        victoryNode: "combat_boss_win",
        defeatNode: "combat_boss_lose",
        fleeNode: "",
        victoryText: "A máscara cai. Por baixo dela, nada — apenas ar. O Guardião era apenas uma construção de vontade e propósito.",
        defeatText: "Você cai. O Guardião pousa uma das espadas no chão ao seu lado — um sinal. Você pode tentar de novo quando estiver pronto.",
        victoryTagEffects: [{ tag: "venceu_guardiao", value: true }],
        defeatTagEffects: [],
        abilities: [
          {
            id: "ab_boss_stun",
            name: "Golpe Paralisante",
            icon: "⚡",
            quotes: [
              "«»",
              "«»"
            ],
            effects: [
              { type: "stun", attr: "forca", value: 1, duration: 1 }
            ],
            triggerCondition: "any",
            triggerRoundMin: 3,
            triggerHpPct: 100,
            usageChance: 35,
            cooldown: 4,
            maxUses: 2
          },
          {
            id: "ab_boss_blind",
            name: "Passo das Sombras",
            icon: "🌑",
            quotes: ["«»"],
            effects: [
              { type: "blind", attr: "destreza", value: 20, duration: 2 }
            ],
            triggerCondition: "any",
            triggerRoundMin: 2,
            triggerHpPct: 100,
            usageChance: 45,
            cooldown: 3,
            maxUses: 0
          },
          {
            id: "ab_boss_curse",
            name: "Maldição de Ferro",
            icon: "🩸",
            quotes: ["«»"],
            effects: [
              { type: "curse", attr: "forca", value: 2, duration: 1 }
            ],
            triggerCondition: "lowHp",
            triggerRoundMin: 1,
            triggerHpPct: 50,
            usageChance: 80,
            cooldown: 5,
            maxUses: 1
          }
        ]
      },
      choices: []
    },
    "combat_boss_win": {
      id: "combat_boss_win",
      title: "A Porta se Abre",
      text: "A figura desaparece em névoa. A porta atrás dela se abre devagar, revelando... outra sala de teste.\n\nClaro.\n\nMas você sente que provou algo — para o sistema, e para você mesmo.",
      choices: [{ text: "← Voltar à Arena", next: "zone_combat" }]
    },
    "combat_boss_lose": {
      id: "combat_boss_lose",
      title: "Ainda Não",
      text: "O Guardião para em frente a você. Não há crueldade no gesto — só encerramento.\n\nVocê vai tentar de novo. Quando estiver pronto.",
      choices: [{ text: "← Voltar à Arena", next: "zone_combat" }]
    },

    // ┌─────────────────────────────────────────────────────┐
    // │  ZONA VERDE — Biblioteca / Sidequest trigger        │
    // └─────────────────────────────────────────────────────┘
    "zone_library": {
      id: "zone_library",
      title: "A Biblioteca",
      text: "Estantes do chão ao teto. Livros que você nunca viu em lugar nenhum.\n\nUm estudioso de óculos grossos te vê entrar e se levanta de uma escrivaninha bagunçada.\n\nEsta zona ativa as sidequests configuradas. Se o estudioso te ofereceu uma missão — foi aqui.",
      choices: [
        {
          text: "Explorar as estantes em silêncio",
          next: "zone_library",
          sanidade: 1,
          points: 10
        },
        {
          text: "Perguntar ao estudioso sobre os livros restritos (Inteligência, Dif. 4)",
          next: "library_restricted_ok", nextFail: "library_restricted_fail",
          attrCheck: "inteligencia", difficulty: 4,
          pointsSuccess: 25, pointsFail: 5
        },
        { text: "← Voltar ao Saguão", next: "hub" }
      ]
    },
    "library_restricted_ok": {
      id: "library_restricted_ok",
      title: "A Seção Proibida",
      text: "O estudioso levanta uma sobrancelha, mas te deixa passar pela cancela.\n\nOs livros lá dentro são densos, escritos em línguas mortas. Mas em um deles, uma anotação marginal te diz algo que você vai carregar por um bom tempo.",
      choices: [{ text: "← Voltar à Biblioteca", next: "zone_library" }]
    },
    "library_restricted_fail": {
      id: "library_restricted_fail",
      title: "Acesso Negado",
      text: "O estudioso franze a testa. «Essa seção é restrita a pesquisadores credenciados.»\n\nEle volta para a escrivaninha. Conversa encerrada.",
      choices: [{ text: "← Voltar à Biblioteca", next: "zone_library" }]
    },

    // ┌─────────────────────────────────────────────────────┐
    // │  ZONA DE ENCERRAMENTOS                              │
    // └─────────────────────────────────────────────────────┘
    "zone_endings": {
      id: "zone_endings",
      title: "A Sala dos Encerramentos",
      text: "Três portas finais. Cada uma com uma placa.\n\nPorta Dourada: Vitória\nPorta Vermelha: Derrota\nPorta Cinza: Fim Neutro\n\nEsta sala demonstra os três tipos de encerramento do sistema.",
      choices: [
        { text: "Porta Dourada — Encerramento de Vitória", next: "ending_victory" },
        { text: "Porta Vermelha — Encerramento de Derrota", next: "ending_defeat" },
        { text: "Porta Cinza — Encerramento Neutro", next: "ending_neutral" },
        { text: "← Voltar ao Saguão", next: "hub" }
      ]
    },
    "ending_victory": {
      id: "ending_victory",
      title: "Teste Concluído com Êxito",
      text: "Você percorreu os sistemas, enfrentou o que havia para enfrentar, e chegou aqui com suas escolhas.\n\nO motor do jogo registrou tudo — cada tag, cada dado, cada ponto.\n\nÉ isso que a vitória parece: não ausência de falha, mas persistência apesar dela.",
      choices: [],
      ending: { type: "victory", title: "Arquiteto dos Sistemas", points: 100 }
    },
    "ending_defeat": {
      id: "ending_defeat",
      title: "Fim Antecipado",
      text: "Você escolheu a derrota. É um encerramento como qualquer outro — o sistema não julga.\n\nDerrotas têm textos próprios, pontuações menores, e podem desbloquear finais alternativos em aventuras reais.\n\nAqui, ela é só um encerramento limpo.",
      choices: [],
      ending: { type: "defeat", title: "Saída pela Porta Vermelha", points: 10 }
    },
    "ending_neutral": {
      id: "ending_neutral",
      title: "Um Fim sem Julgamento",
      text: "A porta cinza leva a uma sala vazia. Sem troféus, sem punição.\n\nO encerramento neutro é para histórias sem vencedor nem perdedor — onde o que importa é o que ficou no caminho.\n\nO sistema fecha aqui, sem fanfarra.",
      choices: [],
      ending: { type: "neutral", title: "O Caminho do Meio", points: 40 }
    }
  }
}
];