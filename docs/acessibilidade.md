# Acessibilidade

Esta página declara o que este site faz por acessibilidade, como isso é
sustentado, e **o que ainda não foi verificado**. A última parte é a que
costuma faltar em declarações desse tipo.

## Meta

Conformidade com **WCAG 2.1 nível AA**.

## O que está implementado

### Navegação por teclado

- Toda funcionalidade é alcançável por teclado. Não há armadilha de foco.
- O link **pular para o conteúdo** é o primeiro item na ordem de tabulação e
  fica visível ao receber foco (WCAG 2.4.1).
- Os botões de ação da página — baixar `.md` e salvar em PDF — são elementos
  interativos nativos: um `<a>` e um `<button>`. Recebem foco e respondem a
  Enter e Espaço porque o navegador faz isso, não porque alguém programou.

### Foco visível

Um anel de foco de 3 px, com deslocamento, aplicado por `:focus-visible` — ou
seja, aparece na navegação por teclado e não polui o clique de mouse. A cor
muda entre o tema claro e o escuro para manter o contraste em ambos
(WCAG 2.4.7 e 1.4.11).

### Movimento

**Duas coisas se movem neste site, e as duas param.** A marca da página inicial
se desenha uma vez; os blocos de terminal digitam o comando uma vez. Fora isso
não há carrossel, autoplay nem contador — o que resta são transições de hover e
foco, que `prefers-reduced-motion: reduce` desliga.

O que sustenta os critérios 2.2.2 e 2.3.3, ponto a ponto:

- **Toca uma vez, não em laço.** Nenhuma das duas se repete sozinha. Repetir é
  uma escolha de quem lê, num botão.
- **Botão visível para parar, sempre na página.** Não aparece só no hover: um
  controle que exige mouse não existe para quem navega por teclado.
- **Não começa sozinho para quem pediu menos movimento.** Com
  `prefers-reduced-motion: reduce`, a marca fica no quadro parado e o terminal
  fica com o texto inteiro à vista. Os botões continuam ali para quem quiser
  ver a animação assim mesmo.
- **O terminal digita fora da tela.** Ele só começa quando o bloco entra no
  campo de visão — animação que termina antes de a pessoa chegar não é
  animação, é conteúdo que apareceu do nada.
- **Sem JavaScript não há movimento nenhum, e nada se perde.** O terminal já
  está escrito por inteiro no HTML — o script apaga e redigita — e a marca
  aparece no quadro final, estático.

Isso corrige, em vez de repetir, o que o site havia herdado do `param-manager`:
lá a animação se redesenhava **a cada nove segundos, em toda página**, por um
temporizador que nunca parava. Conteúdo em movimento contínuo, sem controle
para pausar, é exatamente o que o critério 2.2.2 proíbe. A animação voltou; o
laço não.

!!! warning "A media query de CSS não é o que segura isso"

    `prefers-reduced-motion` está no `a11y.css` e zera a duração de toda
    animação e transição **do CSS**. A marca e o terminal são temporizadores de
    JavaScript, que nenhuma media query alcança. Quem os segura é a verificação
    de `matchMedia` dentro de `assets/js/logo-animation.js` e
    `assets/js/terminal.js`. Tirar essa verificação reprova o critério sem
    mudar uma linha de CSS — e sem nada ficar vermelho no build.

### Tipografia e troca de fonte

A barra de ações no topo de cada página traz um seletor de **fonte do texto**,
ao lado dos botões de baixar `.md` e salvar em PDF. A escolha vale para o site
inteiro e fica guardada no navegador.

São quatro opções, e duas delas existem por acessibilidade e não por gosto:

| Opção | Para quê |
|---|---|
| Padrão do tema | Inter para texto, JetBrains Mono para código |
| Atkinson Hyperlegible | Desenhada pelo Braille Institute para separar as formas que mais se confundem na baixa visão — `I`/`l`/`1`, `O`/`0` |
| Source Serif 4 | Serifada, para quem lê texto longo melhor com serifa |
| Do sistema | A pilha nativa do aparelho, **sem baixar fonte nenhuma da web** |

Todo o texto do site é dimensionado em `rem` e `em`, nunca em pixel: o tamanho
de fonte configurado no navegador é respeitado, e a ampliação até 200 % não
produz rolagem horizontal (WCAG 1.4.4 e 1.4.10).

### Contraste

A paleta base vem do Material, que já mira AA. Os pontos onde a customização
deste site introduziu risco — a legenda de figura e a descrição dos cartões
sobre fundo colorido — têm cor corrigida explicitamente para os dois temas
(WCAG 1.4.3).

### Estrutura e semântica

- Um `<h1>` por página, hierarquia sem saltos.
- Tabelas de referência usam `<th>` de verdade.
- Toda imagem tem `alt`; ícones decorativos dentro de botões são
  `aria-hidden="true"` e `focusable="false"`, para que o leitor de tela anuncie
  só o rótulo de texto.
- A barra de ações é um `role="group"` com rótulo acessível.
- O `lang` do documento acompanha o idioma da página, definido pelo próprio
  mecanismo de tradução (WCAG 3.1.1).
- Os blocos de terminal saem da árvore de acessibilidade enquanto digitam e
  são substituídos por uma transcrição da sessão inteira. Leitor de tela não
  acompanha texto se montando caractere a caractere: recebe o resultado.

### Refluxo e zoom

Tabelas largas rolam dentro do próprio contêiner, nunca empurrando a página
para rolagem horizontal. O texto suporta ampliação até 200 % sem perda de
conteúdo (WCAG 1.4.4 e 1.4.10).

### Alvos de toque

Os botões de ação têm 44 px de altura mínima (WCAG 2.5.5).

### Impressão

A folha de impressão — que é o que produz o PDF — remove navegação e controles,
aumenta o contraste para preto sobre branco e **revela o destino dos links
externos** ao lado do texto. Num papel não existe hover, e um link cujo destino
não aparece é informação perdida.

## Duas coisas em texto, não só em cor

O site nunca usa cor como único portador de informação. Avisos e alertas
carregam um ícone e um rótulo textual além da cor de fundo.

## Como isso não se perde

As regras de acessibilidade vivem num arquivo próprio,
`docs/assets/css/a11y.css`, e **cada bloco cita o critério WCAG que atende**. A
intenção é prática: quem for mexer no CSS um ano depois consegue ver o que está
desfazendo antes de desfazer.

## O que ainda não foi verificado

Sendo honesto sobre o estado:

- **Nenhum teste automatizado de acessibilidade roda no CI.** Não há axe, pa11y
  nem Lighthouse no pipeline. O que existe é implementação cuidadosa, não
  verificação.
- **Não houve teste com leitor de tela real** — nem NVDA, nem JAWS, nem
  VoiceOver.
- **O contraste não foi medido com ferramenta.** As cores foram escolhidas para
  ficar acima do limiar, mas ninguém rodou um verificador em cada combinação.
- **Os diagramas dependem de um CDN externo.** O tema busca a biblioteca de
  diagramas em `unpkg.com` no carregamento da página. Sem internet — ou com o
  CDN bloqueado — os fluxogramas simplesmente não aparecem, e não há texto
  alternativo visível no lugar. A prosa em volta de cada diagrama descreve o que
  ele mostra, o que reduz o dano, mas não o elimina.

- **Duas dependências externas a mais, pela mesma porta dos diagramas.** As
  fontes vêm do `fonts.googleapis.com`. Sem rede elas não chegam e o texto cai
  na pilha do sistema, o que é degradação e não quebra — e a opção **Do
  sistema** no seletor de fonte elimina a dependência de vez, para quem lê num
  ambiente fechado.
- **A animação da marca custa 17 MB.** São quadros SVG gerados um a um. Ela é
  buscada só na página inicial, e só quando vai tocar — nunca nas outras 20
  páginas — mas numa conexão lenta é uma espera longa. Quem pediu menos
  movimento não paga nada disso: o arquivo nem chega a ser requisitado.

Nada disso invalida o que está implementado. Mas "segue WCAG AA" é uma
afirmação que precisa de medição para virar fato, e essa medição ainda não
aconteceu.

## Reportando um problema

Barreira de acessibilidade é defeito, e deve ser aberta como issue no projeto —
descrevendo a tecnologia assistiva, o navegador e o que deveria ter acontecido.
