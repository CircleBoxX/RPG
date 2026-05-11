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
function calcMaxVida(attrs)     { return 5 + (attrs.constituicao || 1); }
function calcMaxSanidade(attrs) { return 5 + (attrs.sabedoria    || 1); }

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
}];
