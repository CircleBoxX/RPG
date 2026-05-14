# Crônicas do Reino — Estrutura de Arquivos

## Como abrir
Abra `index.html` diretamente no navegador (ou sirva com um servidor local).

---

## Estrutura

```
cronicas/
├── index.html          ← HTML das telas (apenas marcação, sem lógica)
├── data.js             ← Aventuras embutidas, classes e atributos padrão
│
├── css/
│   ├── base.css             ← Variáveis CSS, reset, body, botões, utilitários
│   ├── game.css             ← Tela de jogo, cena, escolhas, HUD do personagem
│   ├── char.css             ← Criação de personagem
│   ├── adventure_select.css ← Grid de aventuras, cards
│   ├── score_epilogue.css   ← HUD de pontuação, tela de epílogo
│   ├── editor.css           ← Editor de aventuras, painéis, campos
│   ├── combat.css           ← Overlay de combate, arena, ações, log
│   ├── dialogue.css         ← Overlay de diálogo, sidequest result
│   └── encounter.css        ← Overlay de encontros, botões de resposta
│
└── js/
    ├── state.js             ← Estado global: personagem, aventura atual, tags
    ├── utils.js             ← escHtml, genId, notify, showScreen, pixel art
    ├── persistence.js       ← localStorage, grid de aventuras, import/export
    ├── game.js              ← Loop do jogo: criação de personagem, renderScene, rolls
    ├── editor.js            ← Editor de aventuras, nós/cenas, classes
    ├── images.js            ← Upload e renderização de imagens por cena
    ├── score.js             ← Sistema de pontuação + tela de epílogo
    ├── dialogue.js          ← Sistema de diálogos (runtime + editor)
    ├── combat_runtime.js    ← Máquina de estado do combate (turnos, IA, habilidades)
    ├── combat_editor.js     ← Editor de combates (novo sistema + legado)
    ├── sidequests.js        ← Sidequests (editor + runtime)
    └── encounters.js        ← Encontros aleatórios (editor + runtime)
```

---

## O que editar para cada tarefa

| Quero mudar...                        | Arquivo(s)                          |
|---------------------------------------|-------------------------------------|
| Cores, fontes, variáveis visuais      | `css/base.css`                      |
| Visual do combate                     | `css/combat.css`                    |
| Visual dos encontros                  | `css/encounter.css`                 |
| Visual dos diálogos                   | `css/dialogue.css`                  |
| Visual do editor                      | `css/editor.css`                    |
| Aventuras e classes padrão            | `data.js`                           |
| Adicionar nova tela ao HTML           | `index.html`                        |
| Lógica de atributos / criação de char | `js/game.js`                        |
| Salvar / carregar aventuras           | `js/persistence.js`                 |
| Editor de cenas / escolhas            | `js/editor.js`                      |
| Combate (turnos, dano, IA, status)    | `js/combat_runtime.js`              |
| Editor de combates                    | `js/combat_editor.js`               |
| Sidequests                            | `js/sidequests.js`                  |
| Encontros aleatórios                  | `js/encounters.js`                  |
| Diálogos                              | `js/dialogue.js`                    |
| Sistema de pontos / epílogo           | `js/score.js`                       |
| Upload de imagens nas cenas           | `js/images.js`                      |

---

## Ordem de carregamento dos scripts
Os scripts **devem** ser carregados na ordem definida no `index.html`:
`data.js` → `state.js` → `utils.js` → `persistence.js` → `game.js` → `editor.js`
→ `images.js` → `score.js` → `dialogue.js` → `combat_runtime.js` → `combat_editor.js`
→ `sidequests.js` → `encounters.js`

Isso garante que variáveis globais existam antes de serem usadas.
