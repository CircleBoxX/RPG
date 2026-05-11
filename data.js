{
  "meta": {
    "id": "maldição-aetherion-001",
    "title": "A Maldição de Aetherion",
    "author": "Crônicas do Reino",
    "desc": "Uma profecia antiga ressurge quando a cidade de Valdris começa a apodrecer por dentro. Um herói improvável parte em busca da Pedra de Aetherion — mas o caminho está cheio de armadilhas, aliados inesperados e escolhas impossíveis.",
    "genre": "Fantasia Medieval",
    "icon": "🔮",
    "startNode": "prologo"
  },

  "nodes": {

    "prologo": {
      "id": "prologo",
      "title": "A Cidade que Apodrece",
      "text": "Valdris já foi a joia do reino — torres brancas, mercados ruidosos, fontes cantantes nas praças. Hoje, {{nome}}, você a encontra coberta de uma névoa negra que não dissipa nem ao meio-dia.\n\nCrianças não brincam nas ruas. Os mercadores fecharam as bancas. Um cheiro de prata queimada impregna tudo.\n\nVocê chegou até aqui seguindo rumores de trabalho e ouro. Em vez disso, encontrou uma cidade agonizante — e um bilhete enfiado sob a porta da estalagem:\n\n*«Procure a Arquivista Solenne, na Torre das Letras. Venha antes do anoitecer. — Um Amigo»*",
      "dialogues": [
        {
          "speaker": "",
          "narrator": true,
          "text": "A névoa negra pulsa levemente, como se respirasse. Algo nela observa você."
        },
        {
          "speaker": "Mesoneiro",
          "portrait": "🧔",
          "text": "Não fique na rua depois que o sino da torre tocar oito. Ninguém volta das ruas depois disso. Ninguém."
        }
      ],
      "choices": [
        { "text": "Ir à Torre das Letras procurar a Arquivista Solenne", "next": "torre_letras", "points": 10 },
        { "text": "Investigar a névoa negra pelas ruas antes", "next": "ruas_nevoa", "points": 5 },
        { "text": "Perguntar ao mesoneiro o que está acontecendo", "next": "mesoneiro_info" }
      ]
    },

    "mesoneiro_info": {
      "id": "mesoneiro_info",
      "title": "A Boca do Povo",
      "text": "O mesoneiro, chamado Bran, baixa a voz como se as paredes tivessem ouvidos.\n\n«Tudo começou há doze dias. Uma chuva de cinzas caiu por uma noite inteira e quando o sol saiu, a névoa já estava aqui. Primeiro foram os ratos — morrendo aos montes. Depois, dois guardas desapareceram na Praça da Âncora.»\n\nEle serve um copo de hidromél com mão trêmula.\n\n«A Arquivista Solenne diz que encontrou algo nos arquivos antigos. Uma profecia, ou assim ela chama. Os conselheiros do Lorde a mandaram calar, mas ela não calou. Daí a mandaram embora da câmara — mas ela ainda está na torre, estudando.»\n\n«Se alguém sabe o que é essa maldição», murmura ele, «é ela.»",
      "dialogues": [
        {
          "speaker": "Bran",
          "portrait": "🧔",
          "text": "O Lorde Caldwin disse que é só uma praga natural, que vai passar. Mas eu vi os olhos dele quando disse isso. Medo, aventureiro. Medo puro."
        }
      ],
      "choices": [
        { "text": "Ir à Torre das Letras agora mesmo", "next": "torre_letras", "points": 10 },
        { "text": "Pedir informações sobre o Lorde Caldwin primeiro", "next": "caldwin_rumor" }
      ]
    },

    "caldwin_rumor": {
      "id": "caldwin_rumor",
      "title": "O Lorde das Sombras",
      "text": "Bran hesita, olha para a porta, então se inclina.\n\n«Há seis meses, Caldwin fez uma viagem ao norte — às Ruínas de Aetherion. Voltou diferente. Mais pálido, mais seco. Olhos que às vezes parecem refletir a névoa mesmo quando está dentro de casa.»\n\n«E ninguém mais foi autorizado a entrar no porão do castelo desde então.»\n\nAs informações se encaixam como peças de um puzzle sinistro.",
      "choices": [
        { "text": "Ir à Torre das Letras — as peças estão se encaixando", "next": "torre_letras", "points": 15 },
        { "text": "Tentar se infiltrar no castelo antes de qualquer coisa", "next": "castelo_tentativa_precoce" }
      ]
    },

    "castelo_tentativa_precoce": {
      "id": "castelo_tentativa_precoce",
      "title": "Imprudência",
      "text": "Você tenta chegar ao castelo de Caldwin sem informações suficientes. As muralhas têm guardas posicionados a cada dez metros — muito mais do que o normal para uma cidade pequena.\n\nUm dos guardas te reconhece como recém-chegado e ordena que você se explique. Sem argumentos convincentes, você é escoltado de volta às ruas com um aviso para não tentar novamente.\n\nVocê perdeu tempo precioso. A névoa parece um pouco mais densa agora.",
      "choices": [
        { "text": "Ir à Torre das Letras, finalmente", "next": "torre_letras", "vida": -1 }
      ]
    },

    "ruas_nevoa": {
      "id": "ruas_nevoa",
      "title": "Mergulho na Escuridão",
      "text": "As ruas de Valdris à luz do dia já são opressivas. A névoa cobre tudo acima dos joelhos, silenciosa e fria.\n\nVocê caminha dois quarteirões quando vê algo que congela seu sangue: uma figura humana completamente estática no meio da rua, de pé, de olhos abertos — mas sem respirar. Uma criança de uns dez anos.\n\nEla não está morta. Mas também não está viva da forma que você conhece. É como se o tempo dela tivesse parado.",
      "dialogues": [
        {
          "speaker": "",
          "narrator": true,
          "text": "A névoa pulsa ao redor da criança como um coração negro."
        }
      ],
      "choices": [
        {
          "text": "Tentar tirar a criança dali com força",
          "attrCheck": "forca",
          "difficulty": 5,
          "next": "crianca_salva",
          "nextFail": "crianca_falha",
          "pointsSuccess": 50,
          "pointsFail": -10,
          "vidaFail": -1,
          "sanidadeSuccess": 1,
          "sanidadeFail": -1
        },
        { "text": "Observar de longe antes de agir", "next": "crianca_observar" },
        { "text": "Sair dali e ir direto à Torre das Letras", "next": "torre_letras", "sanidade": -1 }
      ]
    },

    "crianca_salva": {
      "id": "crianca_salva",
      "title": "Arrancada das Sombras",
      "text": "Com um esforço brutal, você arranca a menina da névoa. Ela desperta como de um pesadelo — ofegante, chorando, sem saber onde está.\n\nVocê a carrega até a estalagem de Bran. No caminho, ela sussurra entre soluços:\n\n«Havia uma voz na névoa. Dizia meu nome. Dizia para eu não me mover, que logo estaria em paz.»\n\nBran cuida dela. Você ganhou a gratidão de um pai aliviado — e uma informação: ela estava próxima à entrada das catacumbas sob a Praça da Âncora.",
      "choices": [
        { "text": "Ir à Torre das Letras com essa nova informação", "next": "torre_letras", "points": 60, "tagEffects": [{ "tag": "salvou_crianca", "value": true }] },
        { "text": "Investigar as catacumbas imediatamente", "next": "catacumbas_prematura" }
      ]
    },

    "crianca_falha": {
      "id": "crianca_falha",
      "title": "Repelido",
      "text": "A névoa ao redor da criança resistiu como uma parede de vidro. Você foi lançado para trás, aterrissando violentamente no calçamento.\n\nQuando você se levanta, a criança sumiu. A névoa fechou-se sobre o lugar onde ela estava.\n\nSua mão queima onde tocou a névoa. Algo nela não é natural — é hostil.",
      "choices": [
        { "text": "Ir à Torre das Letras com urgência", "next": "torre_letras", "sanidade": -1 }
      ]
    },

    "crianca_observar": {
      "id": "crianca_observar",
      "title": "O Olho que Tudo Vê",
      "text": "Você observa por minutos. A névoa ao redor da criança pulsa em intervalos regulares — exatamente como uma respiração. E quando uma rajada de vento ocasional dissipa um pouco a névoa, você vê símbolos gravados no calçamento abaixo dela.\n\nSímbolos antigos. Runas de aprisionamento.\n\nAlguém as colocou ali de propósito.",
      "choices": [
        {
          "text": "Tentar decifrar as runas",
          "attrCheck": "inteligencia",
          "difficulty": 6,
          "next": "runas_decifradas",
          "nextFail": "runas_falha",
          "pointsSuccess": 40
        },
        { "text": "Ir à Torre das Letras — a Arquivista pode saber sobre essas runas", "next": "torre_letras", "tagEffects": [{ "tag": "viu_runas", "value": true }] }
      ]
    },

    "runas_decifradas": {
      "id": "runas_decifradas",
      "title": "Língua Morta",
      "text": "As runas são do Velho Eldric — uma língua ritual proibida há três séculos. Você consegue ler fragmentos:\n\n*«...por cada alma presa, o Núcleo ganha um dia... sete almas, a Pedra acorda...»*\n\nSeu sangue esfria. Não é uma praga. É um ritual. E está progredindo.",
      "choices": [
        { "text": "Correr para a Torre das Letras", "next": "torre_letras", "points": 50, "tagEffects": [{ "tag": "conhece_ritual", "value": true }, { "tag": "viu_runas", "value": true }] }
      ]
    },

    "runas_falha": {
      "id": "runas_falha",
      "title": "Saber Insuficiente",
      "text": "Os símbolos são completamente opacos para você. Você copia-os num pedaço de couro com carvão — talvez alguém mais sábio possa decifrá-los.",
      "choices": [
        { "text": "Ir à Torre das Letras mostrar os símbolos", "next": "torre_letras", "tagEffects": [{ "tag": "tem_copia_runas", "value": true }] }
      ]
    },

    "catacumbas_prematura": {
      "id": "catacumbas_prematura",
      "title": "Escuridão sem Guia",
      "text": "As catacumbas são um labirinto sem iluminação. Sem conhecimento do layout ou do que enfrenta, você se perde por horas antes de conseguir sair.\n\nQuando emerge, está anoitecendo. O sino da torre toca oito. Você corre para dentro da estalagem.",
      "choices": [
        { "text": "Esperar o amanhecer e ir à Torre das Letras", "next": "torre_letras", "vida": -1, "sanidade": -1 }
      ]
    },

    "torre_letras": {
      "id": "torre_letras",
      "title": "A Arquivista",
      "text": "A Torre das Letras é uma construção de pedra cinza, sobrevivente de três incêndios e dois saques ao longo dos séculos. Por dentro, cheira a papel velho e tinta fermentada.\n\nA Arquivista Solenne tem uns sessenta anos mas se move com a energia de alguém da metade disso. Ela te olha por cima de óculos redondos, depois olha para a porta que você fechou, depois de volta para você.\n\n«Você chegou», diz ela, como se soubesse exatamente quem você é.",
      "dialogues": [
        {
          "speaker": "Solenne",
          "portrait": "👩‍🏫",
          "text": "Sente-se, {{nome}}. Tenho muito a dizer e pouco tempo para dizê-lo."
        },
        {
          "speaker": "Solenne",
          "portrait": "👩‍🏫",
          "text": "O que está acontecendo com Valdris não é uma praga. É a ressurreição de um ritual que não devia ser possível — o Ritual de Aetherion."
        },
        {
          "speaker": "Solenne",
          "portrait": "👩‍🏫",
          "text": "Há trezentos anos, o Feiticeiro Aetherion criou uma pedra capaz de drenar a vida de uma cidade inteira para alimentar seu próprio poder. Foi destruída — ou assim achávamos. Parece que alguém encontrou os fragmentos."
        }
      ],
      "choices": [
        { "text": "Perguntar quem está por trás disso", "next": "solenne_culpado" },
        {
          "text": "Mostrar as runas copiadas (se tiver)",
          "next": "solenne_runas",
          "tagRules": [{ "tag": "tem_copia_runas", "mode": "show" }, { "tag": "viu_runas", "mode": "show" }]
        },
        { "text": "Perguntar como parar o ritual", "next": "solenne_plano" }
      ]
    },

    "solenne_runas": {
      "id": "solenne_runas",
      "title": "Confirmação",
      "text": "Solenne examina sua cópia das runas com mãos que tremem levemente.\n\n«São runas de Aprisionamento de Alma. Do Velho Eldric.» Ela faz uma pausa longa. «Há sete locais na cidade onde almas estão presas. Cada uma que o ritual consome alimenta a Pedra.»\n\n«Você já viu um. Os outros estão...» Ela vai a um mapa na parede e marca seis pontos com tinta vermelha. «...aqui, aqui, aqui...»\n\nVocê ganhou um avanço precioso.",
      "choices": [
        { "text": "Perguntar quem está por trás disso", "next": "solenne_culpado", "points": 30 }
      ]
    },

    "solenne_culpado": {
      "id": "solenne_culpado",
      "title": "O Nome Não Dito",
      "text": "Solenne fecha os olhos por um momento.\n\n«O Lorde Caldwin. Ele visitou as Ruínas de Aetherion seis meses atrás e voltou com algo — um fragmento da Pedra original. Desde então, está reconstituindo o ritual passo a passo.»\n\n«Mas Caldwin não age sozinho. Há um Arauto — um ser que habita a névoa e serve como intermediário entre Caldwin e a Pedra. Não sei sua forma verdadeira.»\n\nEla pausa, pesarosa.\n\n«E há mais. Caldwin tem uma filha — Lyria. Ela foi uma de minhas alunas. Não acredito que ela sabe o que o pai faz.»",
      "choices": [
        { "text": "Perguntar como parar o ritual", "next": "solenne_plano" }
      ]
    },

    "solenne_plano": {
      "id": "solenne_plano",
      "title": "O Caminho Diante de Vós",
      "text": "Solenne desdobra um mapa antigo sobre a mesa.\n\n«A Pedra de Aetherion está sendo remontada no porão do castelo. Para destruí-la, você precisa de uma das três coisas: a Chama Sagrada do Templo de Arden — ao norte, nas montanhas. O Selo de Dissolução, que está nas catacumbas sob a cidade. Ou...» ela hesita, «...a própria magia de Aetherion invertida — o que exigiria convencer Caldwin a quebrar o ritual ele mesmo.»\n\n«Cada caminho é perigoso. Cada um pode funcionar. E você tem talvez três dias antes que o ritual esteja completo.»\n\nEla coloca uma bolsa com moedas na mesa.\n\n«Eu pagaria, mas não tenho mais o que pagar. Isso é tudo que me resta.»",
      "dialogues": [
        {
          "speaker": "Solenne",
          "portrait": "👩‍🏫",
          "text": "Seja qual for o caminho que escolher — volte vivo, {{nome}}. A cidade precisa de testemunhas do que aconteceu aqui."
        }
      ],
      "choices": [
        { "text": "Partir para as Catacumbas em busca do Selo de Dissolução", "next": "catacumbas_entrada", "points": 15, "tagEffects": [{ "tag": "missao_aceita", "value": true }] },
        { "text": "Ir ao norte em direção ao Templo de Arden buscar a Chama Sagrada", "next": "estrada_norte", "points": 15, "tagEffects": [{ "tag": "missao_aceita", "value": true }] },
        { "text": "Tentar contatar Lyria, filha de Caldwin, antes de qualquer coisa", "next": "busca_lyria", "points": 10, "tagEffects": [{ "tag": "missao_aceita", "value": true }] }
      ]
    },

    "busca_lyria": {
      "id": "busca_lyria",
      "title": "A Filha do Lorde",
      "text": "Lyria Caldwin é encontrada no jardim do castelo — a única parte que ainda tem cor, como se ela própria estivesse resistindo à névoa ao redor.\n\nEla é uma jovem de uns vinte anos, cabelos negros, um livro aberto nas mãos. Ela te olha com desconfiança quando você se aproxima.\n\n«Se meu pai mandou você, pode ir embora.»\n\nVocê explica quem é e o que sabe. Ela ouve em silêncio — mas você vê seu rosto mudar à medida que as peças se encaixam.",
      "dialogues": [
        {
          "speaker": "Lyria",
          "portrait": "👩",
          "text": "Eu sabia que algo estava errado. Desde que ele voltou das ruínas... mas eu não queria acreditar."
        },
        {
          "speaker": "Lyria",
          "portrait": "👩",
          "text": "Ele ficou obcecado com a imortalidade depois que minha mãe morreu. Eu entendo a dor, mas... isso..."
        }
      ],
      "choices": [
        {
          "text": "Tentar convencer Lyria a ajudar a parar o pai",
          "attrCheck": "carisma",
          "difficulty": 5,
          "next": "lyria_aliada",
          "nextFail": "lyria_incerta",
          "pointsSuccess": 80,
          "tagEffects": [{ "tag": "conhece_lyria", "value": true }]
        },
        { "text": "Apenas pedir informações sobre o castelo", "next": "lyria_info", "tagEffects": [{ "tag": "conhece_lyria", "value": true }] }
      ]
    },

    "lyria_aliada": {
      "id": "lyria_aliada",
      "title": "Uma Aliada Inesperada",
      "text": "As palavras certas, ditas com convicção genuína, funcionam.\n\nLyria fecha o livro com firmeza.\n\n«Muito bem. Mas preciso de prova do que você diz antes de agir contra meu próprio pai. Se você conseguir o Selo das Catacumbas ou a Chama do Templo, me encontre de volta aqui ao entardecer. Com provas, posso abrir o portão do porão por dentro.»\n\nEla passa um anel de prata para sua mão.\n\n«Mostre isso aos guardas do portão lateral. Eles me devem lealdade, não a Caldwin.»",
      "choices": [
        { "text": "Ir às Catacumbas buscar o Selo", "next": "catacumbas_entrada", "points": 30, "tagEffects": [{ "tag": "lyria_aliada", "value": true }, { "tag": "tem_anel_lyria", "value": true }] },
        { "text": "Ir ao norte buscar a Chama Sagrada", "next": "estrada_norte", "points": 30, "tagEffects": [{ "tag": "lyria_aliada", "value": true }, { "tag": "tem_anel_lyria", "value": true }] }
      ]
    },

    "lyria_incerta": {
      "id": "lyria_incerta",
      "title": "Hesitação",
      "text": "Lyria não foi convencida completamente — a lealdade filial é mais forte.\n\n«Eu preciso pensar. Venha me ver de volta quando tiver provas concretas do que está acontecendo.»\n\nNão é uma recusa. Mas também não é uma aliança.",
      "choices": [
        { "text": "Ir às Catacumbas buscar o Selo", "next": "catacumbas_entrada", "tagEffects": [{ "tag": "conhece_lyria", "value": true }] },
        { "text": "Ir ao norte buscar a Chama Sagrada", "next": "estrada_norte", "tagEffects": [{ "tag": "conhece_lyria", "value": true }] }
      ]
    },

    "lyria_info": {
      "id": "lyria_info",
      "title": "Mapa do Castelo",
      "text": "Lyria não se compromete, mas sua curiosidade a faz falar.\n\n«O porão tem duas entradas. A principal, guardada por soldados leais a meu pai. E uma passagem secreta — ela sai atrás da estátua de fundador na praça central.»\n\nUma informação valiosa.",
      "choices": [
        { "text": "Ir às Catacumbas buscar o Selo", "next": "catacumbas_entrada", "tagEffects": [{ "tag": "conhece_passagem", "value": true }] },
        { "text": "Ir ao norte buscar a Chama Sagrada", "next": "estrada_norte", "tagEffects": [{ "tag": "conhece_passagem", "value": true }] }
      ]
    },

    "catacumbas_entrada": {
      "id": "catacumbas_entrada",
      "title": "As Catacumbas da Âncora",
      "text": "A entrada das catacumbas fica na Praça da Âncora — um antigo alçapão de ferro enferrujado que qualquer habitante de Valdris sabe que não deve abrir.\n\nLá embaixo, o cheiro de pedra úmida e algo mais — algo velho e metálico, como sangue que secou há séculos.\n\nSeu lampião projeta sombras nas paredes onde ossos repousam em nichos. Mas há algo mais que ossos aqui — no chão, frescos rastros de botas. Alguém passou recentemente.",
      "choices": [
        { "text": "Seguir os rastros das botas", "next": "catacumbas_rastros" },
        { "text": "Buscar o Selo sistematicamente, sala por sala", "next": "catacumbas_busca" },
        { "text": "Tentar sentir a magia — o Selo deveria irradiar energia", "attrCheck": "sabedoria", "difficulty": 5, "next": "catacumbas_sentido", "nextFail": "catacumbas_busca", "pointsSuccess": 20 }
      ]
    },

    "catacumbas_rastros": {
      "id": "catacumbas_rastros",
      "title": "Pegadas no Pó",
      "text": "As pegadas levam a uma câmara mais profunda onde a parede tem marcas recentes — pedras removidas e repostas. Alguém esteve mexendo aqui.\n\nAtrás das pedras, você encontra: não o Selo, mas um diário encadernado em couro negro e uma espada com runas gravadas que pulsa levemente ao toque.\n\nO diário pertence a um agente de Caldwin. As anotações mostram que o Arauto — o ser da névoa — usou essas catacumbas para esconder partes do ritual antes de Caldwin assumir o controle.",
      "combat": {
        "name": "Espectro das Catacumbas",
        "icon": "💀",
        "vidaMax": 35,
        "attrs": { "forca": 3, "destreza": 4, "constituicao": 2 },
        "xpReward": 120,
        "defeatPenalty": 1,
        "fleeAllowed": true,
        "victoryNode": "catacumbas_espectro_vencido",
        "defeatNode": "catacumbas_derrota",
        "fleeNode": "catacumbas_fuga",
        "victoryText": "O espectro se dissolve em névoa com um gemido que ressoa pelas câmaras.",
        "defeatText": "O frio sobrenatural te paralisa. Você não pode se mover.",
        "fleeText": "Você corre pelos corredores, o espectro atrás de você, até conseguir distância suficiente.",
        "victoryTagEffects": [{ "tag": "venceu_espectro", "value": true }],
        "tagModifiers": [
          {
            "tag": "viu_runas",
            "invert": false,
            "attrDeltas": { "forca": -2 },
            "specialAction": { "label": "Invocar Runa", "damage": 15 }
          }
        ]
      },
      "choices": [
        { "text": "Continuar buscando o Selo", "next": "catacumbas_busca" }
      ]
    },

    "catacumbas_espectro_vencido": {
      "id": "catacumbas_espectro_vencido",
      "title": "Câmara Liberada",
      "text": "Com o espectro derrotado, a câmara parece respirar — como se uma pressão tivesse sido liberada.\n\nNas paredes, símbolos que antes brilhavam fracamente se apagam. Você encontra, em uma gaveta de pedra atrás do altar, o Selo de Dissolução — um disco de obsidiana com runas douradas gravadas em espiral.\n\nEle pulsa levemente em sua mão, quente apesar do frio da pedra.",
      "choices": [
        { "text": "Pegar o Selo e ir para o castelo enfrentar Caldwin", "next": "retorno_castelo", "points": 100, "tagEffects": [{ "tag": "tem_selo", "value": true }] }
      ]
    },

    "catacumbas_derrota": {
      "id": "catacumbas_derrota",
      "title": "Nas Profundezas do Frio",
      "text": "O espectro te prende numa câmara lateral. Você passa horas prisioneiro do frio sobrenatural até que ele finalmente perde interesse e se dissolve.\n\nVocê escapa das catacumbas machucado e sem o Selo.\n\nA única opção agora é tentar a Chama Sagrada no norte.",
      "choices": [
        { "text": "Ir ao norte em busca da Chama Sagrada", "next": "estrada_norte", "vida": -2, "sanidade": -1 }
      ]
    },

    "catacumbas_fuga": {
      "id": "catacumbas_fuga",
      "title": "Retirada",
      "text": "Você consegue escapar do espectro pelos corredores labirínticos, emergindo na praça da Âncora ofegante e com a tocha quase apagada.\n\nAs catacumbas são perigosas demais sem um plano melhor. Talvez a Chama Sagrada seja o caminho certo.",
      "choices": [
        { "text": "Mudar de plano — ir ao norte buscar a Chama Sagrada", "next": "estrada_norte", "vida": -1 }
      ]
    },

    "catacumbas_sentido": {
      "id": "catacumbas_sentido",
      "title": "O Sussurro da Magia",
      "text": "Você fecha os olhos e abre a percepção. Através da pedra e do silêncio, sente um pulso — regular, profundo, como um coração de pedra. Vem de baixo ainda, de uma câmara mais profunda que as outras.\n\nVocê navega pelos corredores com segurança, guiado pelo pulso, chegando diretamente à câmara do Selo.\n\nMas não está vazia.",
      "combat": {
        "name": "Guardião de Obsidiana",
        "icon": "🗿",
        "vidaMax": 45,
        "attrs": { "forca": 5, "destreza": 2, "constituicao": 4 },
        "xpReward": 150,
        "defeatPenalty": 2,
        "fleeAllowed": false,
        "victoryNode": "catacumbas_guardiao_vencido",
        "defeatNode": "catacumbas_derrota",
        "victoryText": "O guardião racha em duas partes iguais, e pedaços de obsidiana caem ao chão.",
        "defeatText": "A força esmagadora do guardião te joga contra a parede. Você perde a consciência.",
        "victoryTagEffects": [{ "tag": "venceu_guardiao", "value": true }]
      },
      "choices": []
    },

    "catacumbas_guardiao_vencido": {
      "id": "catacumbas_guardiao_vencido",
      "title": "O Selo Revelado",
      "text": "O Guardião cai. No pedestal que ele protegia, o Selo de Dissolução reluz — disco de obsidiana com espirais douradas que parecem mover-se lentamente.\n\nEle é extraordinariamente pesado para seu tamanho. Você o coloca em sua mochila com cuidado.",
      "choices": [
        { "text": "Ir para o castelo com o Selo", "next": "retorno_castelo", "points": 150, "tagEffects": [{ "tag": "tem_selo", "value": true }, { "tag": "caminho_das_catacumbas", "value": true }] }
      ]
    },

    "catacumbas_busca": {
      "id": "catacumbas_busca",
      "title": "A Busca Sistemática",
      "text": "Sala por sala, corredor por corredor — a busca leva horas e seu lampião está na metade do óleo.\n\nNa câmara mais profunda, você encontra o Selo de Dissolução sobre um altar — mas também um guardião de pedra que desperta ao seu toque.",
      "combat": {
        "name": "Guardião de Obsidiana",
        "icon": "🗿",
        "vidaMax": 45,
        "attrs": { "forca": 5, "destreza": 2, "constituicao": 4 },
        "xpReward": 150,
        "defeatPenalty": 2,
        "fleeAllowed": false,
        "victoryNode": "catacumbas_guardiao_vencido",
        "defeatNode": "catacumbas_derrota",
        "victoryText": "O guardião racha em duas partes iguais.",
        "defeatText": "Você é esmagado contra a parede de pedra.",
        "victoryTagEffects": [{ "tag": "venceu_guardiao", "value": true }]
      },
      "choices": []
    },

    "estrada_norte": {
      "id": "estrada_norte",
      "title": "A Estrada das Pedras Brancas",
      "text": "A estrada para o norte sobe através de colinas cobertas de carvalhos até que a neve começa a aparecer nos topos das montanhas. O ar aqui é mais limpo — a névoa de Valdris fica para trás com cada passo.\n\nMas o caminho não é seguro. Há botas no lodo que não são de viajantes comuns — são pesadas demais, espaçadas como quem carrega peso.\n\nSoldados de Caldwin. Ele enviou gente para bloquear o caminho ao templo.",
      "choices": [
        {
          "text": "Usar furtividade para evitar os soldados",
          "attrCheck": "destreza",
          "difficulty": 6,
          "next": "templo_arden",
          "nextFail": "emboscada_soldados",
          "pointsSuccess": 60
        },
        { "text": "Encontrar um caminho alternativo pelas colinas", "next": "colinas_desvio" },
        { "text": "Enfrentar os soldados diretamente", "next": "batalha_estrada" }
      ]
    },

    "emboscada_soldados": {
      "id": "emboscada_soldados",
      "title": "Descoberto",
      "text": "Você não foi furtivo o suficiente. Três soldados te cercam antes que você possa reagir.\n\nA luta é inevitável.",
      "combat": {
        "name": "Soldados de Caldwin",
        "icon": "⚔️",
        "vidaMax": 50,
        "attrs": { "forca": 4, "destreza": 3, "constituicao": 3 },
        "xpReward": 100,
        "defeatPenalty": 2,
        "fleeAllowed": true,
        "victoryNode": "templo_arden",
        "defeatNode": "capturado_soldados",
        "fleeNode": "colinas_desvio",
        "victoryText": "Os soldados recuam, feridos. O caminho está livre.",
        "defeatText": "Superado em número, você é capturado.",
        "fleeText": "Você mergulha morro abaixo antes que possam te cercar.",
        "victoryTagEffects": [{ "tag": "derrotou_soldados", "value": true }]
      },
      "choices": []
    },

    "capturado_soldados": {
      "id": "capturado_soldados",
      "title": "Prisioneiro de Caldwin",
      "text": "Você acorda acorrentado numa sala de pedra — provavelmente uma estação de vigia abandonada. Um dos soldados examina seus pertences.\n\nA noite avança. O ritual progride.\n\nMas as correntes são velhas. E você ainda tem seus atributos.",
      "choices": [
        {
          "text": "Tentar quebrar as correntes com força bruta",
          "attrCheck": "forca",
          "difficulty": 6,
          "next": "fuga_prisao",
          "nextFail": "prisao_longa",
          "vidaFail": -1
        },
        {
          "text": "Tentar convencer o guarda a te libertar",
          "attrCheck": "carisma",
          "difficulty": 7,
          "next": "guarda_convencido",
          "nextFail": "prisao_longa",
          "pointsSuccess": 50
        }
      ]
    },

    "guarda_convencido": {
      "id": "guarda_convencido",
      "title": "Consciência Desperta",
      "text": "O guarda mais jovem ouve sua história sobre o ritual com crescente palidez.\n\n«Se o Lorde realmente está fazendo isso...» ele murmura. Então olha para a porta e, após um silêncio longo, solta suas correntes.\n\n«Nunca me viu», diz ele.\n\nVocê tem um aliado inesperado — e informações: os soldados foram instruídos a prender qualquer um indo ao Templo de Arden. Caldwin sabe que a Chama Sagrada pode destruir sua Pedra.",
      "choices": [
        { "text": "Ir ao Templo de Arden com essa confirmação", "next": "templo_arden", "points": 70, "tagEffects": [{ "tag": "guarda_aliado", "value": true }] }
      ]
    },

    "fuga_prisao": {
      "id": "fuga_prisao",
      "title": "Ferro Dobrado",
      "text": "Com um esforço sobre-humano, você torce as argolas velhas até que cedam. Enquanto o guarda cochila, você escorrega para fora pela janela.\n\nO caminho para o templo ainda está à sua frente.",
      "choices": [
        { "text": "Continuar para o Templo de Arden", "next": "templo_arden", "vida": -1 }
      ]
    },

    "prisao_longa": {
      "id": "prisao_longa",
      "title": "Horas Perdidas",
      "text": "Você passa a noite preso. Pela manhã, quando os soldados vão checar outros postos, consegue se libertar com mais calma.\n\nMas você perdeu um dia inteiro. O ritual está mais avançado.",
      "choices": [
        { "text": "Ir ao templo — há ainda tempo", "next": "templo_arden", "vida": -1, "sanidade": -1 }
      ]
    },

    "colinas_desvio": {
      "id": "colinas_desvio",
      "title": "O Caminho dos Pastores",
      "text": "Você encontra uma trilha estreita usada por pastores para conduzir rebanhos entre as colinas. É mais longa, mas evita os soldados.\n\nNo caminho, um ancião pastor te vê e acena.\n\n«Se vai ao Templo de Arden», ele diz, «leva isso.» Ele coloca em suas mãos um frasco de azeite bento. «A Irmandade usa para iluminar os altares. Você vai precisar.»",
      "choices": [
        { "text": "Agradecer e continuar ao templo", "next": "templo_arden", "points": 20, "tagEffects": [{ "tag": "tem_azeite_bento", "value": true }] }
      ]
    },

    "batalha_estrada": {
      "id": "batalha_estrada",
      "title": "Confronto na Estrada",
      "text": "Você avança em direção aos soldados sem hesitar. Eles ficam surpresos — a maioria dos viajantes corre.\n\nA vantagem da surpresa é sua por uns cinco segundos.",
      "combat": {
        "name": "Tropa de Caldwin",
        "icon": "🪖",
        "vidaMax": 55,
        "attrs": { "forca": 4, "destreza": 3, "constituicao": 3 },
        "xpReward": 110,
        "defeatPenalty": 2,
        "fleeAllowed": true,
        "victoryNode": "templo_arden",
        "defeatNode": "capturado_soldados",
        "fleeNode": "colinas_desvio",
        "victoryText": "Os soldados recuam ante sua determinação. A estrada é sua.",
        "defeatText": "Três contra um — as probabilidades finalmente te alcançam.",
        "fleeText": "Você aproveita um momento de hesitação deles para desviar para as colinas.",
        "victoryTagEffects": [{ "tag": "derrotou_soldados", "value": true }]
      },
      "choices": []
    },

    "templo_arden": {
      "id": "templo_arden",
      "title": "O Templo nas Montanhas",
      "text": "O Templo de Arden é esculpido diretamente na rocha da montanha — uma fachada de pedra branca com colunas cobertas de musgo e uma chama eterna queimando acima da entrada, visível a quilômetros de distância.\n\nDentro, uma Irmandade de monges de hábitos azuis cuida do fogo sagrado há gerações.\n\nA Mestra do Templo, Irma Veshan, te recebe com expressão cautelosa.",
      "dialogues": [
        {
          "speaker": "Irma Veshan",
          "portrait": "🧕",
          "text": "Viemos a saber sobre a névoa de Valdris. Estávamos esperando que alguém viesse."
        },
        {
          "speaker": "Irma Veshan",
          "portrait": "🧕",
          "text": "A Chama Sagrada pode dissipar a magia de Aetherion — mas não pode ser simplesmente transportada. Ela precisa de um recipiente adequado."
        }
      ],
      "choices": [
        { "text": "Perguntar o que é um recipiente adequado", "next": "templo_recipiente" },
        {
          "text": "Oferecer o frasco de azeite bento como recipiente (se tiver)",
          "next": "templo_azeite",
          "tagRules": [{ "tag": "tem_azeite_bento", "mode": "show" }]
        }
      ]
    },

    "templo_azeite": {
      "id": "templo_azeite",
      "title": "O Frasco Perfeito",
      "text": "Veshan olha para o frasco de azeite bento com surpresa genuína.\n\n«O ancião Boros te deu isso? Ele foi monge aqui por quarenta anos.» Ela examina o frasco. «É o recipiente certo, sim. Purificado, abençoado, feito para conter o sagrado.»\n\nEla conduz você ao altar principal e, com um gesto preciso, transfere uma chama viva para dentro do frasco. A chama queima dentro do vidro sem consumir o azeite.\n\n«Não a apague e não a tampe. E aja rápido — ela dura trinta e seis horas.»",
      "choices": [
        { "text": "Agradecer e partir para o castelo de Caldwin", "next": "retorno_castelo", "points": 120, "tagEffects": [{ "tag": "tem_chama", "value": true }] }
      ]
    },

    "templo_recipiente": {
      "id": "templo_recipiente",
      "title": "O Preço da Chama",
      "text": "«A Chama precisa de um recipiente purificado — vidro bento, cristal sagrado ou cerâmica ritual.» Veshan pausa. «Temos um na câmara sagrada, mas está selado como parte de nosso próprio ritual anual.»\n\nEla cruza os braços.\n\n«Posso oferecer o recipiente — mas você precisará fazer algo por nós primeiro. Há um demônio menor aninhado na câmara das oferendas. Está lá há três dias e impedindo o acesso ao arquivo sagrado.»",
      "choices": [
        { "text": "Enfrentar o demônio na câmara das oferendas", "next": "templo_demonio" },
        {
          "text": "Tentar negociar com argumentos — a cidade está morrendo",
          "attrCheck": "carisma",
          "difficulty": 7,
          "next": "templo_negociado",
          "nextFail": "templo_demonio",
          "pointsSuccess": 30
        }
      ]
    },

    "templo_negociado": {
      "id": "templo_negociado",
      "title": "Urgência Reconhecida",
      "text": "Veshan ouve sua descrição da situação — crianças presas pela névoa, a cidade agonizando, o prazo — e sua expressão muda gradualmente.\n\n«Quando a balança pesa vidas de inocentes...» ela murmura. Então: «Muito bem. Mas você ainda precisa passar pela câmara das oferendas. O demônio não me deixa chegar ao recipiente.»",
      "choices": [
        { "text": "Enfrentar o demônio", "next": "templo_demonio" }
      ]
    },

    "templo_demonio": {
      "id": "templo_demonio",
      "title": "A Câmara Infestada",
      "text": "A câmara das oferendas cheira a enxofre. No centro, uma criatura de fumaça negra e olhos vermelhos ocupa o altar — um demônio menor, mas ainda assim mais que um homem pode esperar enfrentar levianamente.",
      "combat": {
        "name": "Demônio das Oferendas",
        "icon": "👿",
        "vidaMax": 40,
        "attrs": { "forca": 4, "destreza": 5, "constituicao": 2 },
        "xpReward": 130,
        "defeatPenalty": 1,
        "fleeAllowed": false,
        "victoryNode": "templo_demonio_vencido",
        "defeatNode": "templo_demonio_derrota",
        "victoryText": "O demônio se dissolve em fumaça negra com um guincho que ecoa pelas câmaras do templo.",
        "defeatText": "A fumaça negra te envolve e você perde a consciência.",
        "victoryTagEffects": [{ "tag": "purificou_templo", "value": true }],
        "tagModifiers": [
          {
            "tag": "tem_azeite_bento",
            "invert": false,
            "attrDeltas": { "forca": -3, "destreza": -2 },
            "specialAction": { "label": "Lançar Azeite Bento", "damage": 20 }
          }
        ]
      },
      "choices": []
    },

    "templo_demonio_vencido": {
      "id": "templo_demonio_vencido",
      "title": "A Chama é Sua",
      "text": "Com o demônio dissolvido, Veshan entra na câmara e recupera o recipiente sagrado — uma esfera de cristal do tamanho de um punho.\n\nCom cerimônia breve mas sincera, ela transfere a Chama Sagrada para dentro. Ela pulsa como um coração de ouro.\n\n«Que Arden guie seus passos», diz ela.",
      "choices": [
        { "text": "Partir para o castelo de Caldwin", "next": "retorno_castelo", "points": 150, "tagEffects": [{ "tag": "tem_chama", "value": true }] }
      ]
    },

    "templo_demonio_derrota": {
      "id": "templo_demonio_derrota",
      "title": "Repelido",
      "text": "O demônio é mais forte do que esperava. Você é expelido da câmara inconscientemente.\n\nOs monges te curam. Mas o tempo passou — e o recipiente ainda está lá dentro.\n\nVeshan oferece uma alternativa: você pode tentar recuperar o Selo das Catacumbas em vez disso. Ela pode enviar um monge para guiá-lo.",
      "choices": [
        { "text": "Aceitar a ajuda e ir às Catacumbas", "next": "catacumbas_entrada", "vida": -2 }
      ]
    },

    "retorno_castelo": {
      "id": "retorno_castelo",
      "title": "O Castelo de Caldwin",
      "text": "Você retorna a Valdris com o que precisa para acabar com o ritual.\n\nA névoa está mais densa agora — quase sólida em alguns lugares, e você ouve sussurros nela ao caminhar. O ritual está nos estágios finais.\n\nO castelo de Caldwin domina o centro da cidade. Guardas com olhos vazios patrulham as muralhas — soldados já tocados pela névoa.\n\nComo você vai entrar?",
      "choices": [
        {
          "text": "Usar o anel de Lyria para entrar pelo portão lateral",
          "next": "entrada_lyria",
          "tagRules": [{ "tag": "tem_anel_lyria", "mode": "show" }]
        },
        {
          "text": "Usar a passagem secreta atrás da estátua do fundador",
          "next": "passagem_secreta",
          "tagRules": [{ "tag": "conhece_passagem", "mode": "show" }]
        },
        {
          "text": "Escalar as muralhas e entrar pela força",
          "attrCheck": "forca",
          "difficulty": 7,
          "next": "escalar_muralha",
          "nextFail": "muralha_falha"
        },
        {
          "text": "Tentar se disfarçar de soldado de Caldwin",
          "attrCheck": "carisma",
          "difficulty": 6,
          "next": "disfrace_soldado",
          "nextFail": "disfrace_falha"
        }
      ]
    },

    "entrada_lyria": {
      "id": "entrada_lyria",
      "title": "A Cumplicidade de Lyria",
      "text": "Os guardas do portão lateral reconhecem o anel de Lyria e, após um momento de hesitação, abrem o portão.\n\nLyria está esperando do lado de dentro, seu rosto tenso.\n\n«Você voltou com o que precisa?» Ela olha para o que você carrega e fecha os olhos por um segundo. «Muito bem. O porão fica três andares abaixo. Vou levar você até a escada.»\n\nEla guia você pelos corredores do castelo, evitando os guardas que conhece. Nas profundezas, vocês ouvem um pulso — regular, como um tambor — vindo de baixo.",
      "choices": [
        { "text": "Descer ao porão com Lyria", "next": "porao_descida", "points": 50, "tagEffects": [{ "tag": "lyria_junto", "value": true }] }
      ]
    },

    "passagem_secreta": {
      "id": "passagem_secreta",
      "title": "Atrás do Fundador",
      "text": "A estátua de pedra na praça central tem uma placa que, ao ser pressionada no canto inferior esquerdo, revela uma escada estreita que desce.\n\nVocê a percorre no escuro até emergir num corredor no interior do castelo — abaixo do nível do chão. Em frente, a porta do porão está entreaberta.\n\nÉ quase fácil demais.",
      "choices": [
        { "text": "Entrar pelo porão com cuidado", "next": "porao_descida", "points": 40 }
      ]
    },

    "escalar_muralha": {
      "id": "escalar_muralha",
      "title": "Sobre as Pedras",
      "text": "A escalada é brutal mas você consegue. No alto da muralha, um guarda te vê — você o derruba antes que grite. Então desce para o pátio interno e encontra o acesso ao porão.",
      "choices": [
        { "text": "Descer ao porão", "next": "porao_descida", "vida": -1 }
      ]
    },

    "muralha_falha": {
      "id": "muralha_falha",
      "title": "Queda",
      "text": "Você escorrega a três metros do topo. A queda não é fatal mas é dolorosa. Guardas da patrulha te encontram — mas pela névoa e pela confusão, conseguem só te expulsar do perímetro.\n\nVocê precisa de outra entrada.",
      "choices": [
        {
          "text": "Tentar a passagem secreta atrás da estátua (se souber)",
          "next": "passagem_secreta",
          "tagRules": [{ "tag": "conhece_passagem", "mode": "show" }]
        },
        {
          "text": "Tentar o disfarce",
          "attrCheck": "carisma",
          "difficulty": 6,
          "next": "disfrace_soldado",
          "nextFail": "entrada_forcada",
          "vida": -1
        }
      ]
    },

    "disfrace_soldado": {
      "id": "disfrace_soldado",
      "title": "O Impostor",
      "text": "Você consegue uma armadura de um soldado desmaiado na rua — a névoa já o tinha afetado. Caminhando com confiança, passa pela guarda principal.\n\nLá dentro, você segue outros soldados até localizar a escada do porão.",
      "choices": [
        { "text": "Descer ao porão", "next": "porao_descida", "points": 30 }
      ]
    },

    "disfrace_falha": {
      "id": "disfrace_falha",
      "title": "Descoberto",
      "text": "Um sargento te reconhece como estranho — sua postura não é de soldado treinado. A perseguição começa.\n\nVocê foge pelos becos de Valdris e finalmente volta à praça do fundador — onde, por sorte, nota a placa na estátua que Lyria tinha mencionado.",
      "choices": [
        { "text": "Usar a passagem secreta atrás da estátua", "next": "passagem_secreta", "sanidade": -1 }
      ]
    },

    "entrada_forcada": {
      "id": "entrada_forcada",
      "title": "Força Bruta Final",
      "text": "Sem opções sutis, você simplesmente avança. A confusão da névoa trabalha a seu favor — os guardas estão desorientados e mal reagem antes que você já esteja dentro.",
      "choices": [
        { "text": "Correr para o porão", "next": "porao_descida", "vida": -2, "sanidade": -1 }
      ]
    },

    "porao_descida": {
      "id": "porao_descida",
      "title": "O Coração Podre",
      "text": "O porão de Caldwin é uma câmara de pedra negra onde nenhuma tocha queima — a luz vem da própria Pedra de Aetherion.\n\nEla está reunida no centro — seis fragmentos em torno de um núcleo pulsante de luz violeta escura. Ao redor dela, no chão, círculos concêntricos de runas brilham como brasa.\n\nE Lorde Caldwin está de pé atrás da Pedra, olhos completamente violeta, expressão de quem está além do diálogo.\n\nMas ao lado dele — correntes de névoa presas ao seu pulso — está o Arauto. Uma silhueta humanoide feita de sombra sólida.",
      "dialogues": [
        {
          "speaker": "Caldwin",
          "portrait": "👑",
          "text": "Você chegou mais longe do que esperava, {{nome}}. Impressionante para um aventureiro sem história."
        },
        {
          "speaker": "O Arauto",
          "portrait": "🌑",
          "text": "Elimine o intruso, Caldwin. O ritual está quase completo."
        },
        {
          "speaker": "Caldwin",
          "portrait": "👑",
          "text": "Você não entende o que está interrompendo. Com a Pedra completa, posso trazer minha esposa de volta. Posso reverter a morte. O reino inteiro se curará."
        }
      ],
      "choices": [
        { "text": "Tentar conversar com Caldwin — há dor humana ali", "next": "caldwin_conversa" },
        { "text": "Atacar o Arauto primeiro — ele é o verdadeiro perigo", "next": "combate_arauto" },
        {
          "text": "Usar o Selo de Dissolução na Pedra imediatamente",
          "next": "uso_selo",
          "tagRules": [{ "tag": "tem_selo", "mode": "show" }]
        },
        {
          "text": "Usar a Chama Sagrada na Pedra imediatamente",
          "next": "uso_chama",
          "tagRules": [{ "tag": "tem_chama", "mode": "show" }]
        }
      ]
    },

    "caldwin_conversa": {
      "id": "caldwin_conversa",
      "title": "A Dor de um Pai",
      "text": "«Elara morreu há dois anos», diz Caldwin, voz quebrando por um momento antes do violeta nos olhos se intensificar novamente. «Ela era a única pessoa que me tornava humano. Sem ela...»\n\nO Arauto tenta interromper, mas Caldwin levanta a mão.\n\n«Com a Pedra completa, a magia de Aetherion pode reverter morte. Ela voltará. O preço é apenas a energia vital de uma cidade que vai se recuperar com o tempo.»\n\nHá lógica quebrada ali — mas há também um homem destroçado.",
      "choices": [
        {
          "text": "«Elara não voltaria para um homem que matou crianças por ela»",
          "attrCheck": "sabedoria",
          "difficulty": 6,
          "next": "caldwin_quebrado",
          "nextFail": "caldwin_irredimivel",
          "pointsSuccess": 100,
          "tagEffects": [{ "tag": "tentou_redimir", "value": true }]
        },
        {
          "text": "«Isso não é querer ela de volta. É querer não sentir culpa»",
          "attrCheck": "carisma",
          "difficulty": 7,
          "next": "caldwin_quebrado",
          "nextFail": "caldwin_irredimivel",
          "pointsSuccess": 100,
          "tagEffects": [{ "tag": "tentou_redimir", "value": true }]
        },
        { "text": "Abandonar a tentativa — ele está além do alcance", "next": "combate_caldwin" }
      ]
    },

    "caldwin_quebrado": {
      "id": "caldwin_quebrado",
      "title": "O Véu se Rasga",
      "text": "As palavras certas atingem como uma flecha.\n\nCaldwin se imobiliza. O violeta nos olhos pulsa, luta — e por um segundo você vê o homem por baixo. Chorando. Perdido.\n\n«Ela nunca... ela nunca aprovaria...» ele sussurra.\n\nO Arauto ruge e avança para te matar — mas Caldwin se interpõe.\n\n«Não!» A voz dele racha. «Chega de isso.» Ele apontam para a Pedra: «Você. Destrua ela. Faça o que vieste fazer. Eu... vou segurar esse monstro.»\n\nEle e o Arauto entram em conflito direto. Você tem uma janela.",
      "choices": [
        {
          "text": "Usar o Selo de Dissolução agora",
          "next": "vitoria_redenção",
          "tagRules": [{ "tag": "tem_selo", "mode": "show" }]
        },
        {
          "text": "Usar a Chama Sagrada agora",
          "next": "vitoria_redenção",
          "tagRules": [{ "tag": "tem_chama", "mode": "show" }]
        },
        { "text": "Destruir a Pedra com suas próprias mãos", "next": "vitoria_sacrificio" }
      ]
    },

    "caldwin_irredimivel": {
      "id": "caldwin_irredimivel",
      "title": "Perdido",
      "text": "Caldwin fecha os olhos. Quando os abre, só há violeta.\n\n«Você não entende perda», diz ele friamente. «O Arauto, trate do intruso.»\n\nO ser de sombra avança.",
      "choices": [
        { "text": "Enfrentar o Arauto", "next": "combate_arauto" }
      ]
    },

    "combate_arauto": {
      "id": "combate_arauto",
      "title": "Sombra contra Luz",
      "text": "O Arauto é feito de névoa comprimida — cada golpe nele parece dissipar uma camada mas há sempre mais por baixo. Ele se move como sombra através da luz.",
      "combat": {
        "name": "O Arauto",
        "icon": "🌑",
        "vidaMax": 60,
        "attrs": { "forca": 5, "destreza": 6, "constituicao": 3 },
        "xpReward": 200,
        "defeatPenalty": 2,
        "fleeAllowed": false,
        "victoryNode": "arauto_derrotado",
        "defeatNode": "derrota_porao",
        "victoryText": "O Arauto se desfaz em névoa que se dissipa rapidamente, sem a vontade que o mantinha coeso.",
        "defeatText": "A névoa te envolve. Você sente sua consciência se dissolver.",
        "victoryTagEffects": [{ "tag": "derrotou_arauto", "value": true }],
        "tagModifiers": [
          {
            "tag": "tem_chama",
            "invert": false,
            "specialAction": { "label": "Lançar Chama Sagrada", "damage": 25 },
            "attrDeltas": { "forca": -3, "destreza": -2 }
          },
          {
            "tag": "purificou_templo",
            "invert": false,
            "attrDeltas": { "forca": -1, "destreza": -1 }
          }
        ]
      },
      "choices": []
    },

    "arauto_derrotado": {
      "id": "arauto_derrotado",
      "title": "A Névoa Recua",
      "text": "Com o Arauto dissolvido, Caldwin recua um passo. Os olhos violeta piscam — e por um momento, você vê o homem de volta.\n\nA Pedra ainda pulsa no centro da câmara.",
      "choices": [
        {
          "text": "Usar o Selo de Dissolução na Pedra",
          "next": "vitoria_combate",
          "tagRules": [{ "tag": "tem_selo", "mode": "show" }]
        },
        {
          "text": "Usar a Chama Sagrada na Pedra",
          "next": "vitoria_combate",
          "tagRules": [{ "tag": "tem_chama", "mode": "show" }]
        },
        { "text": "Tentar uma última vez convencer Caldwin a quebrar o ritual ele mesmo", "next": "caldwin_pos_arauto" }
      ]
    },

    "caldwin_pos_arauto": {
      "id": "caldwin_pos_arauto",
      "title": "O Homem Liberto",
      "text": "Sem o Arauto para alimentar a ilusão, Caldwin oscila. As correntes de magia que o conectam à Pedra ficam visíveis — fios de luz violeta entrando pelo peito dele.\n\n«Eu...» ele olha para as mãos, «... o que eu fiz?\"\n\nEle olha para você. «Ela nunca teria querido isso. Elara odiava violência.»\n\nEle fecha os olhos e, num gesto único de vontade, desfaz o círculo de runas com os próprios pés — quebrando o ritual.",
      "choices": [
        { "text": "Observar enquanto o ritual se desfaz", "next": "final_redenção_completa", "points": 200, "tagEffects": [{ "tag": "caldwin_redimido", "value": true }] }
      ]
    },

    "combate_caldwin": {
      "id": "combate_caldwin",
      "title": "O Lorde Corrompido",
      "text": "Caldwin não dará passagem. A magia da Pedra flui através dele — ele não é mais apenas um homem.",
      "combat": {
        "name": "Lorde Caldwin Corrompido",
        "icon": "👑",
        "vidaMax": 70,
        "attrs": { "forca": 5, "destreza": 4, "constituicao": 5, "inteligencia": 4 },
        "xpReward": 250,
        "defeatPenalty": 3,
        "fleeAllowed": false,
        "victoryNode": "caldwin_derrotado",
        "defeatNode": "derrota_porao",
        "victoryText": "Caldwin cai de joelhos. A luz violeta nos olhos se apaga. Ele é apenas um homem novamente.",
        "defeatText": "O poder de Aetherion é esmagador. Você cai.",
        "victoryTagEffects": [{ "tag": "derrotou_caldwin", "value": true }]
      },
      "choices": []
    },

    "caldwin_derrotado": {
      "id": "caldwin_derrotado",
      "title": "Queda do Tirano",
      "text": "Caldwin está de joelhos, humano novamente. A Pedra ainda pulsa — o ritual não foi interrompido, apenas seu condutor foi removido.\n\nVocê tem segundos antes que a energia se redirecione.",
      "choices": [
        {
          "text": "Usar o Selo de Dissolução na Pedra",
          "next": "vitoria_combate",
          "tagRules": [{ "tag": "tem_selo", "mode": "show" }]
        },
        {
          "text": "Usar a Chama Sagrada na Pedra",
          "next": "vitoria_combate",
          "tagRules": [{ "tag": "tem_chama", "mode": "show" }]
        },
        { "text": "Destruir a Pedra com tudo que tem", "next": "vitoria_sacrificio" }
      ]
    },

    "uso_selo": {
      "id": "uso_selo",
      "title": "O Selo em Ação",
      "text": "Você lança o Selo de Dissolução contra a Pedra. O disco de obsidiana com runas douradas toca o núcleo violeta —\n\n— e o mundo explode em luz branca.",
      "choices": [
        { "text": "Continuar...", "next": "explosao_final" }
      ]
    },

    "uso_chama": {
      "id": "uso_chama",
      "title": "A Chama que Devora o Escuro",
      "text": "Você lança a Chama Sagrada contra a Pedra. O fogo dourado alcança o núcleo violeta —\n\n— e as chamas sagradas e a magia corrompida se aniquilam mutuamente num jorro de luz.",
      "choices": [
        { "text": "Continuar...", "next": "explosao_final" }
      ]
    },

    "vitoria_sacrificio": {
      "id": "vitoria_sacrificio",
      "title": "O Preço da Bravura",
      "text": "Sem artefato sagrado, você usa o único recurso que sobrou — você mesmo.\n\nVocê mergulha as mãos no núcleo pulsante da Pedra. A energia de Aetherion te queima como ácido, mas você não recua — você canaliza tudo que tem, toda vida, toda vontade, e empurra de volta.\n\nA explosão te lança pela câmara.\n\nQuando a luz passa, a Pedra está em pó. E a névoa começa a se dissipar sobre Valdris.",
      "choices": [],
      "ending": {
        "type": "victory",
        "title": "O Sacrifício do Herói",
        "points": 500
      }
    },

    "explosao_final": {
      "id": "explosao_final",
      "title": "O Fim da Névoa",
      "text": "Quando a luz passa, você está de pé — machucado, exausto, mas de pé.\n\nA Pedra de Aetherion é pó.\n\nPelo teto de pedra do porão, você ouve — e é impossível, mas é real — o som de chuva. Chuva limpa, caindo sobre Valdris pela primeira vez em doze dias.\n\nA névoa se dissipou.",
      "choices": [
        { "text": "Subir e ver o que restou", "next": "epilogo_caldwin_vivo" }
      ]
    },

    "vitoria_combate": {
      "id": "vitoria_combate",
      "title": "Valdris Respira",
      "text": "A Pedra se desfaz. A luz violeta que permeava o porão apaga-se.\n\nLá em cima, através das pedras do castelo, você ouve uma coisa impossível e maravilhosa:\n\nAlguém rindo. Crianças. Vozes humanas normais, com alegria normal.\n\nA névoa acabou.",
      "choices": [
        { "text": "Subir para ver o que sobrou", "next": "epilogo_combate" }
      ]
    },

    "vitoria_redenção": {
      "id": "vitoria_redenção",
      "title": "Redenção e Dissolução",
      "text": "Com Caldwin segurando o Arauto, você tem os segundos que precisava.\n\nO Selo ou a Chama toca a Pedra —\n\nA explosão de luz dissipa tanto o Arauto quanto a magia da Pedra de uma vez. E quando o brilho passa, Caldwin está de joelhos, chorando — mas humano. Completamente humano.\n\nLá fora, a chuva começa a cair.",
      "choices": [
        { "text": "Ir ao lado de Caldwin", "next": "final_redenção" }
      ]
    },

    "derrota_porao": {
      "id": "derrota_porao",
      "title": "Valdris Cai",
      "text": "Você acordou fora do castelo — a névoa te expeliu como um corpo estranho.\n\nSem forças para tentar novamente, você observa da beira da cidade quando, ao amanhecer do terceiro dia, o ritual completa.\n\nA névoa engole Valdris.\n\nVocê sobreviveu. A cidade, não.",
      "choices": [],
      "ending": {
        "type": "defeat",
        "title": "A Cidade Perdida",
        "points": 50
      }
    },

    "final_redenção": {
      "id": "final_redenção",
      "title": "O Lorde e a Culpa",
      "text": "Caldwin permanece ajoelhado por um longo tempo.\n\n«Quanto...», ele sussurra, «... quanto mal fiz?»\n\n«Cinco almas presas», você responde. «Elas já estão sendo liberadas — a névoa está se dissipando. Mas o mal existe.»\n\nLyria desce as escadas e para ao ver o pai. Por um momento longo e tenso, pai e filha se encaram.\n\nThen Lyria ajoelha-se ao lado dele.\n\n«Você vai se entregar ao Conselho», ela diz com firmeza. «E eu vou estar lá.»\n\nCaldwin fecha os olhos e assente.",
      "choices": [
        { "text": "Deixar eles e ir ver Valdris se recuperar", "next": "final_vitoria_plena", "points": 150 }
      ]
    },

    "final_redenção_completa": {
      "id": "final_redenção_completa",
      "title": "Quando o Ritual se Desfaz",
      "text": "As runas no chão apagam-se uma a uma como estrelas ao amanhecer. A Pedra fragmenta-se silenciosamente — não com explosão, mas com a dignidade quieta de algo que nunca deveria ter existido voltando ao pó.\n\nAs cinco almas presas na névoa são liberadas. Você ouve seus suspiros — de alívio, não de dor.\n\nCaldwin permanece ajoelhado por um longo tempo. Quando se levanta, apenas você e ele estão na câmara.\n\n«Eu preciso pagar por isso», ele diz.\n\n«Sim», você concorda.",
      "choices": [],
      "ending": {
        "type": "victory",
        "title": "A Redenção de Valdris",
        "points": 600
      }
    },

    "epilogo_caldwin_vivo": {
      "id": "epilogo_caldwin_vivo",
      "title": "O Dia Depois",
      "text": "Valdris acorda como de um sonho ruim.\n\nAs crianças presas pela névoa se movem novamente. Os mercadores abrem as bancas. E a chuva limpa as cinzas das ruas.\n\nCaldwin está sob custódia do Conselho. Lyria — se ela foi sua aliada — está ao lado do pai durante o processo, nem defendendo nem acusando, apenas testemunhando.\n\nSolenne te encontra na praça central, óculos molhados de chuva.\n\n«Você salvou esta cidade», ela diz simplesmente. «Isso ficará nos arquivos. Em todas as cópias.»",
      "choices": [],
      "ending": {
        "type": "victory",
        "title": "O Guardião de Valdris",
        "points": 400
      }
    },

    "epilogo_combate": {
      "id": "epilogo_combate",
      "title": "Poeira e Chuva",
      "text": "A praça principal de Valdris está cheia de pessoas que não sabem bem o que aconteceu mas sabem que pode respirar novamente.\n\nCaldwin está preso. O Arauto é memória.\n\nSolenne te encontra com um sorriso cansado.\n\n«Você poderia ter feito diferente, mais limpo», diz ela. «Mas fez. E funcionou.»\n\nEla coloca uma medalha de bronze na sua mão — o símbolo da cidade. «Isso é tudo que Valdris tem para oferecer agora. Mas é real.»",
      "choices": [],
      "ending": {
        "type": "victory",
        "title": "O Lutador de Valdris",
        "points": 350
      }
    },

    "final_vitoria_plena": {
      "id": "final_vitoria_plena",
      "title": "Chuva sobre Valdris",
      "text": "A cidade se recupera com uma velocidade que surpreende até Solenne. Como se a névoa tivesse suprimido não só a vida, mas a vontade de viver — e ambas voltam juntas.\n\nTrês dias depois, quando você está se preparando para partir, Bran o mesoneiro bate à sua porta.\n\n«A Câmara de Valdris quer lhe oferecer casa e cargo aqui. Protetor da cidade.» Ele ri. «Sei que vai recusar. Aventureiros recusam sempre. Mas queriam que você soubesse que a oferta existe.»\n\nVocê sorri. A estrada chama.\n\nMas Valdris sempre terá uma cama para você.",
      "choices": [],
      "ending": {
        "type": "victory",
        "title": "O Lendário de Valdris",
        "points": 700
      }
    }

  },

  "sidequests": [
    {
      "id": "sq_ladrao_misericordioso",
      "title": "O Ladrão de Pão",
      "desc": "Um jovem ladrão foi capturado roubando comida para crianças presas pela névoa.",
      "declineText": "Não há tempo para disputas de justiça agora.",
      "triggerNodes": ["torre_letras", "catacumbas_entrada", "retorno_castelo"],
      "startNode": "sq_l_inicio",
      "nodes": {
        "sq_l_inicio": {
          "id": "sq_l_inicio",
          "title": "O Julgamento do Ladrão",
          "text": "Um guarda segura um jovem de uns dezesseis anos pelo colarinho. Uma bolsa de pão está espalhada no chão.\n\n«Ladrão!» grita o guarda. «Pego em flagrante na padaria do Mestre Grenn.»\n\nO rapaz — magro, assustado — te olha como se você fosse a última esperança.\n\n«As crianças na pensão estão com fome! A dona saiu ontem e não voltou. Eu só estava... eu só queria ajudar.»",
          "choices": [
            {
              "text": "Interceder pelo jovem",
              "attrCheck": "carisma",
              "difficulty": 5,
              "next": "sq_l_intercedeu",
              "nextFail": "sq_l_falhou",
              "pointsSuccess": 40
            },
            { "text": "Pagar a compensação pelo pão com seu próprio dinheiro", "next": "sq_l_pagou", "points": 30 },
            { "text": "Ignorar a situação", "next": "sq_l_ignorou" }
          ]
        },
        "sq_l_intercedeu": {
          "id": "sq_l_intercedeu",
          "title": "Palavras que Salvam",
          "text": "Suas palavras sobre as crianças na pensão convencem o guarda — ou pelo menos o envergonham suficientemente.\n\nO jovem é liberado. Você o ajuda a levar o pão às crianças e no caminho ele te conta algo útil:\n\n«Vi dois homens de capa preta entrar no castelo ontem à noite pela porta dos fundos. Carregavam algo pesado num baú.»\n\nUma informação sobre os movimentos de Caldwin.",
          "choices": [],
          "ending": { "type": "victory", "title": "Misericórdia Justa" }
        },
        "sq_l_falhou": {
          "id": "sq_l_falhou",
          "title": "Sem Palavras Suficientes",
          "text": "O guarda não cede. O jovem é levado preso.\n\nAs crianças na pensão ficam sem comida por mais um dia.\n\nVocê carrega o peso de uma intervenção mal-sucedida.",
          "choices": [],
          "ending": { "type": "defeat", "title": "Intenção sem Resultado" }
        },
        "sq_l_pagou": {
          "id": "sq_l_pagou",
          "title": "Generosidade Prática",
          "text": "Você compra o pão roubado e o dá ao jovem para levar às crianças.\n\nNão é heroico. É simplesmente certo. O rapaz te olha com gratidão genuína e passa uma informação sobre o castelo como gratidão.",
          "choices": [],
          "ending": { "type": "victory", "title": "Bem Feito sem Glória" }
        },
        "sq_l_ignorou": {
          "id": "sq_l_ignorou",
          "title": "Olhos Fechados",
          "text": "Você passa reto. A voz do jovem se afasta atrás de você.\n\nÉ uma coisa pequena. Mas pequenas coisas constroem o caráter.",
          "choices": [],
          "ending": { "type": "neutral", "title": "Indiferença" }
        }
      }
    },

    {
      "id": "sq_soldado_arrependido",
      "title": "O Desertores da Névoa",
      "desc": "Um soldado de Caldwin quer desertar — mas está com medo demais para agir sozinho.",
      "declineText": "Não me envolvo em desertores.",
      "triggerNodes": ["estrada_norte", "colinas_desvio", "batalha_estrada"],
      "startNode": "sq_s_inicio",
      "nodes": {
        "sq_s_inicio": {
          "id": "sq_s_inicio",
          "title": "O Soldado no Matagal",
          "text": "Na beira da estrada, escondido entre arbustos, um soldado de armadura com o emblema de Caldwin te faz sinal desesperado.\n\n«Por favor, não me denuncie. Eu sei o que Caldwin está fazendo. Vi coisas no castelo que não deveria ter visto.»\n\nEle está claramente aterrorizado. E tem informações.",
          "choices": [
            { "text": "Ouvir o que ele tem a dizer", "next": "sq_s_ouviu" },
            {
              "text": "Convencer o soldado a se juntar à sua causa",
              "attrCheck": "carisma",
              "difficulty": 6,
              "next": "sq_s_aliado",
              "nextFail": "sq_s_neutro",
              "pointsSuccess": 60
            },
            { "text": "Recusar — um desertor não é confiável", "next": "sq_s_recusou" }
          ]
        },
        "sq_s_ouviu": {
          "id": "sq_s_ouviu",
          "title": "Segredos do Castelo",
          "text": "O soldado — nome Ren — foi recrutado há três meses. Mas nos últimos dias viu coisas que o perturbaram: prisioneiros levados ao porão e nunca mais vistos. A Pedra pulsando com luz violeta. E o Arauto — ele o viu duas vezes e cada vez dormiu mal por uma semana.\n\n«Tem uma guarda secreta no porão», ele sussurra. «Quatro homens que não dormem. Só dois na entrada principal.»\n\nInformações táticas valiosas.",
          "choices": [],
          "ending": { "type": "victory", "title": "O Informante Temeroso" }
        },
        "sq_s_aliado": {
          "id": "sq_s_aliado",
          "title": "Um Reforço Inesperado",
          "text": "Ren decide que a lealdade ao reino pesa mais que a lealdade a Caldwin.\n\nEle te acompanha — não como guerreiro, mas como guia. Conhece o castelo por dentro e pode levar você por rotas sem patrulha.",
          "choices": [],
          "ending": { "type": "victory", "title": "O Desertor Redimido" }
        },
        "sq_s_neutro": {
          "id": "sq_s_neutro",
          "title": "Partida Solitária",
          "text": "Ren não tem coragem suficiente para se comprometer. Ele desaparece na floresta, provavelmente tentando fugir da região.\n\nVocê fica sozinho com suas próprias forças.",
          "choices": [],
          "ending": { "type": "neutral", "title": "Caminhos Separados" }
        },
        "sq_s_recusou": {
          "id": "sq_s_recusou",
          "title": "Ceticismo",
          "text": "Você passa reto, ignorando o soldado. Pode ter sido prudente. Pode ter sido um erro.\n\nNão há como saber agora.",
          "choices": [],
          "ending": { "type": "neutral", "title": "Desconfiança Útil" }
        }
      }
    },

    {
      "id": "sq_espelho_bruxa",
      "title": "A Vidente do Espelho Negro",
      "desc": "Uma bruxa idosa na cidade oferece uma visão do futuro — mas há sempre um preço.",
      "declineText": "Não me interessa bruxaria.",
      "triggerNodes": ["prologo", "mesoneiro_info", "torre_letras", "busca_lyria"],
      "startNode": "sq_e_inicio",
      "nodes": {
        "sq_e_inicio": {
          "id": "sq_e_inicio",
          "title": "A Velha do Espelho",
          "text": "Uma porta entreaberta, uma vela. Uma anciã de cabelos brancos te chama sem que você tenha batido.\n\n«Entra, {{nome}}. Sei o que você precisa.»\n\nEla tem um espelho negro na parede — não reflete nada. É como um buraco na realidade.\n\n«Posso mostrar o que você vai enfrentar. O caminho mais curto para o coração do porão. Mas o espelho cobra seu preço — uma lembrança. Só uma. Você escolhe qual.»",
          "choices": [
            { "text": "Aceitar — dar uma lembrança de infância", "next": "sq_e_aceitou_infancia", "sanidade": -1 },
            { "text": "Aceitar — dar uma lembrança dolorosa (que você não quer de volta)", "next": "sq_e_aceitou_dor" },
            {
              "text": "Tentar enganar o espelho — dar uma falsa memória",
              "attrCheck": "inteligencia",
              "difficulty": 8,
              "next": "sq_e_enganou",
              "nextFail": "sq_e_falhou_engano",
              "pointsSuccess": 80
            },
            { "text": "Recusar — não há preço que valha uma memória", "next": "sq_e_recusou" }
          ]
        },
        "sq_e_aceitou_infancia": {
          "id": "sq_e_aceitou_infancia",
          "title": "O Que Foi Dado",
          "text": "O espelho bebe uma memória — você lembra que havia algo, uma tarde, uma voz — mas os detalhes escorregam como água.\n\nEm troca, o espelho mostra: o porão do castelo, a Pedra, o Arauto — e uma fraqueza. Uma runa de contenção no lado norte da câmara. Se destruída, enfraquece o Arauto dramaticamente.",
          "choices": [],
          "ending": { "type": "victory", "title": "Preço de Sabedoria" }
        },
        "sq_e_aceitou_dor": {
          "id": "sq_e_aceitou_dor",
          "title": "Alívio e Revelação",
          "text": "Você oferece uma memória de dor — algo que carregou e não queria mais. O espelho a bebe com prazer.\n\nA vidente sorri com tristeza.\n\n«O espelho gosta de dor. Você se saiu bem.»\n\nA visão mostra o porão e seus segredos — incluindo uma fraqueza do Arauto e o caminho exato para a Pedra.",
          "choices": [],
          "ending": { "type": "victory", "title": "Dor Transformada em Sabedoria" }
        },
        "sq_e_enganou": {
          "id": "sq_e_enganou",
          "title": "O Truque do Mentiroso",
          "text": "Você constrói uma memória falsa — tão vívida e emocional que o espelho a aceita sem questionar.\n\nA vidente ri.\n\n«Criativo. E raro.» Ela acena com aprovação. «Sua visão, sem custo real.»\n\nO espelho mostra tudo que você precisa saber sobre o porão.",
          "choices": [],
          "ending": { "type": "victory", "title": "Sabedoria sem Preço" }
        },
        "sq_e_falhou_engano": {
          "id": "sq_e_falhou_engano",
          "title": "Espelho Impaciente",
          "text": "O espelho não aceita a falsidade. Ele toma uma memória real sem pedir permissão — uma boa, de quando você se sentiu mais vivo.\n\nMas dá a visão de qualquer jeito.\n\nA vidente te olha com piedade.",
          "choices": [],
          "ending": { "type": "neutral", "title": "Preço Cobrado à Força" }
        },
        "sq_e_recusou": {
          "id": "sq_e_recusou",
          "title": "Recusa Digna",
          "text": "«Não dou memórias a espelhos», você diz.\n\nA velha sorri.\n\n«A recusa também é uma resposta. Você tem mais coragem em suas recusas que muitos têm em suas aceitações.»\n\nNenhuma visão. Mas nenhuma perda.",
          "choices": [],
          "ending": { "type": "neutral", "title": "Integridade" }
        }
      }
    },

    {
      "id": "sq_arquivo_queimado",
      "title": "Os Arquivos em Chamas",
      "desc": "Alguém está tentando queimar os arquivos de Solenne — destruindo as provas do ritual.",
      "declineText": "Não há tempo para isso agora.",
      "triggerNodes": ["torre_letras", "solenne_plano", "solenne_culpado"],
      "startNode": "sq_a_inicio",
      "nodes": {
        "sq_a_inicio": {
          "id": "sq_a_inicio",
          "title": "Fumaça da Torre",
          "text": "Você vê fumaça saindo de uma janela da Torre das Letras. Solenne não está dentro — está na câmara principal.\n\nMas alguém está.\n\nVocê sobe as escadas correndo e encontra um homem de capa escura jogando óleo sobre pergaminhos e prestes a acender uma vela.",
          "choices": [
            {
              "text": "Atacar o incendiário antes que acenda a vela",
              "attrCheck": "destreza",
              "difficulty": 6,
              "next": "sq_a_deteve",
              "nextFail": "sq_a_falhou",
              "pointsSuccess": 60
            },
            {
              "text": "Salvar os pergaminhos primeiro, deixar o homem fugir",
              "next": "sq_a_salvou_arquivos",
              "points": 40
            }
          ]
        },
        "sq_a_deteve": {
          "id": "sq_a_deteve",
          "title": "O Incendiário Preso",
          "text": "Você chega a tempo. O homem é preso — e no interrogatório confirma ser um agente de Caldwin. Os arquivos estão seguros.\n\nSolenne examina os documentos salvos com mãos trêmulas de emoção.\n\n«Aqui», ela sussurra, apontando para um pergaminho antigo. «A fraqueza específica da Pedra de Aetherion. Com isso você sabe exatamente como desativá-la.»",
          "choices": [],
          "ending": { "type": "victory", "title": "Guardião do Conhecimento" }
        },
        "sq_a_falhou": {
          "id": "sq_a_falhou",
          "title": "Cinzas do Passado",
          "text": "O homem acende a vela antes que você chegue. Uma seção dos arquivos pega fogo antes de você conseguir apagar as chamas.\n\nO incendiário foge pela janela.\n\nAlgumas informações sobre a Pedra são perdidas para sempre.",
          "choices": [],
          "ending": { "type": "defeat", "title": "Perda Irreparável" }
        },
        "sq_a_salvou_arquivos": {
          "id": "sq_a_salvou_arquivos",
          "title": "Prioridade Correta",
          "text": "Você ignora o homem e se concentra nos arquivos — carregando os pergaminhos mais perto do agente fora da janela antes que ele possa alcançá-los.\n\nO incendiário foge. Mas o conhecimento sobreviveu.\n\nSolenne examina o que foi salvo e encontra informações úteis sobre a composição da Pedra.",
          "choices": [],
          "ending": { "type": "victory", "title": "Conhecimento Preservado" }
        }
      }
    }
  ],

  "randomEncounters": [
    {
      "id": "enc_viajante_ferido",
      "title": "O Viajante na Estrada",
      "type": "beneficial",
      "icon": "🧳",
      "weight": 2,
      "once": true,
      "text": "Um viajante solitário está sentado na beira do caminho, segurando o tornozelo com dor.\n\n«Torci o pé fugindo de uma patrulha de Caldwin. Se você puder me ajudar a chegar à próxima aldeia, posso compartilhar o que sei sobre o castelo.»\n\nVocê oferece ajuda. Em troca, ele te conta sobre uma passagem de serviço no lado leste do castelo, menos guardada do que a entrada principal.",
      "vida": 1,
      "points": 30,
      "grantTags": ["conhece_passagem_leste"]
    },
    {
      "id": "enc_corvo_mensageiro",
      "title": "O Corvo das Sombras",
      "type": "harmful",
      "icon": "🐦‍⬛",
      "weight": 1,
      "once": true,
      "text": "Um corvo de penas absolutamente negras pousa em seu ombro sem aviso. Seus olhos têm um brilho violeta.\n\nEle não é um corvo natural. Ele é um espiã do Arauto.\n\nA ave bica seu pescoço antes de você conseguir reagir e voa — mas você arranca uma pena enquanto vai embora.\n\nA pena é fria como metal. E quando você olha para ela, vê brevemente através dos olhos do Arauto — e sabe exatamente onde ele está agora.",
      "vida": -1,
      "sanidade": -1,
      "points": 20,
      "grantTags": ["viu_pelo_arauto"]
    },
    {
      "id": "enc_criança_mensagem",
      "title": "A Criança e o Bilhete",
      "type": "beneficial",
      "icon": "📜",
      "weight": 3,
      "once": true,
      "text": "Uma menina de uns oito anos te para com um bilhete dobrado.\n\n«Um senhor velho me deu isso e disse para dar a você. Disse que você tem cabelo como o aventureiro da história da estalagem.»\n\nO bilhete é da Arquivista Solenne: *«Descobri a localização da runa de ancoragem do Arauto. Está no nível -2 do porão, parede norte. Destrua-a e o Arauto perde metade de sua força. — S.»*",
      "points": 40,
      "grantTags": ["conhece_runa_arauto"]
    },
    {
      "id": "enc_fonte_envenenada",
      "title": "A Fonte Negra",
      "type": "harmful",
      "icon": "⛲",
      "weight": 2,
      "text": "A névoa está especialmente densa ao redor de uma fonte na praça. Sem perceber, você bebe um pouco da água turva enquanto passa.\n\nO sabor é estranho — mineral e amargo. Você cospe, mas o dano já foi feito.\n\nA magia de Aetherion permeia a água da cidade. Seu estômago revira por um tempo.",
      "vida": -2,
      "sanidade": -1
    },
    {
      "id": "enc_moeda_da_sorte",
      "title": "A Moeda Dourada",
      "type": "beneficial",
      "icon": "🪙",
      "weight": 2,
      "text": "No meio do caminho, reluzindo no chão como se a névoa não conseguisse tocá-la, há uma moeda de ouro com uma face de rosto sorridente gravada.\n\nNão é moeda do reino. Não é de nenhum reino que você conhece.\n\nMas quando você a pega, sente um calor que sobe pelo braço — revigorante, como sol de manhã.",
      "vida": 2,
      "sanidade": 1,
      "points": 15
    },
    {
      "id": "enc_soldado_perdido",
      "title": "O Soldado Tocado",
      "type": "harmful",
      "icon": "⚔️",
      "weight": 2,
      "text": "Um soldado de Caldwin, olhos meio-vazios pela névoa, te barra o caminho.\n\nEle não está completamente tomado — há ainda algo humano nele — mas está claramente não em si.\n\nEle tenta te atacar sem falar.",
      "vida": -1,
      "points": -10
    },
    {
      "id": "enc_ervas_medicinais",
      "title": "O Herbanário Surpresa",
      "type": "beneficial",
      "icon": "🌿",
      "weight": 3,
      "once": false,
      "text": "Um idoso abre uma janela sobre você e joga um pacote embrulhado em pano.\n\n«São ervas de cura! Fiz estoques antes da névoa começar. Leve, aventureiro — você parece precisar mais do que eu!»\n\nO pacote contém cataplasmas medicinais que, ao aplicar, restauram alguma vitalidade.",
      "vida": 2
    },
    {
      "id": "enc_visao_arauto",
      "title": "Sussurros na Névoa",
      "type": "harmful",
      "icon": "🌑",
      "weight": 1,
      "once": true,
      "text": "A névoa condensa de repente ao seu redor. Por um instante — apenas um instante — você vê a forma do Arauto dentro dela, olhando diretamente para você.\n\n*«Você está interferindo»*, diz uma voz que não é ouvida, é sentida. *«Pare agora e saírá com vida.»*\n\nO Arauto sabe que você está vindo.",
      "sanidade": -2,
      "points": -5
    },
    {
      "id": "enc_aldeao_informante",
      "title": "O Aldeão que Viu Tudo",
      "type": "beneficial",
      "icon": "🧑",
      "weight": 2,
      "once": true,
      "text": "Um aldeão nervoso te puxa para um beco.\n\n«Vi os homens de Caldwin transportando algo para o castelo na noite passada. Um baú com símbolos roxos. E um deles carregava o que parecia ser uma chave enorme — dourada, em formato de espiral.»\n\nVocê não sabe o que é a chave. Mas a informação fica guardada.",
      "points": 25,
      "grantTags": ["viu_chave_dourada"]
    }
  ]
}
