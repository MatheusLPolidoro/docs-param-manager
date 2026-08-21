/*
 * Animação da marca — carregamento sob demanda, laço e controle de pausa.
 *
 * O desenho vem de `assets/js/LogoAnimation.js`, o mesmo arquivo gerado que
 * o `param-manager` usa. Ele tem 17 MB: são 510 quadros de SVG escritos
 * quadro a quadro em JavaScript. Daí a primeira regra deste arquivo: **ele não
 * pode entrar no `extra_javascript`**, onde seria baixado em todas as 21
 * páginas do site, inclusive nas 20 que não têm animação nenhuma. Aqui o
 * arquivo grande só é buscado na página que tem o bloco.
 *
 * A animação roda **em laço**, com 15 segundos de intervalo entre uma volta e
 * a seguinte. O que a versão herdada do `param-manager` fazia de errado não
 * era repetir — era repetir **sem nenhum jeito de parar**: um `setInterval` de
 * nove segundos, em toda página, sem controle na tela. É isso que a WCAG 2.2.2
 * proíbe, e o critério é satisfeito por um mecanismo de pausa, não pela
 * ausência de repetição. O mecanismo aqui é o botão, visível, sempre presente,
 * que interrompe o ciclo inteiro — a volta em curso e as futuras.
 *
 * Com `prefers-reduced-motion: reduce` nada começa sozinho e **não há laço**:
 * a página fica no cartaz estático, e o botão, se acionado, toca uma vez só.
 * Quem pediu menos movimento pode querer ver a animação; querer vê-la uma vez
 * não é pedir que ela recomece a cada 15 segundos (WCAG 2.3.3).
 *
 * Antes da carga, na pausa entre as voltas e depois de parada, o que aparece é
 * o cartaz estático (`assets/marca-animada.svg`). Sem ele a área ficaria em
 * branco nesses três momentos: o último quadro do arquivo gerado limpa o SVG.
 */
(function () {
  'use strict';

  /* Precisa ser lido agora, na avaliação síncrona do script: depois de
     qualquer `await` ou callback, `currentScript` já é null. A URL do
     arquivo grande é derivada da deste, e não escrita à mão, porque as
     páginas em inglês recebem `../assets/js/...` e uma constante fixa
     apontaria para `/en/assets/`, que não existe. */
  var ANIMATION_URL = (function () {
    var self = document.currentScript;
    return self
      ? self.src.replace(/[^/]+$/, 'LogoAnimation.js')
      : 'assets/js/LogoAnimation.js';
  })();

  /* Duração do arquivo gerado: o último temporizador dele dispara em 8500
     ms. Se um dia o arquivo mudar de duração, a volta é dada como encerrada
     cedo ou tarde demais e nada mais quebra. */
  var DURATION_MS = 8500;

  /* Intervalo entre uma volta e a próxima. */
  var PAUSE_MS = 15000;

  var loading = null;

  function prefersReducedMotion() {
    return (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  function loadDrawing() {
    if (typeof window.renderLogoAnimation === 'function') {
      return Promise.resolve();
    }
    if (loading) {
      return loading;
    }
    loading = new Promise(function (resolve, reject) {
      var tag = document.createElement('script');
      tag.src = ANIMATION_URL;
      tag.onload = resolve;
      tag.onerror = function () {
        loading = null;
        reject(new Error('LogoAnimation.js não carregou'));
      };
      document.head.appendChild(tag);
    });
    return loading;
  }

  /* O arquivo gerado guarda os temporizadores de cada quadro em
     `window.timeouts` e o alvo em `window.logoanimation`. Limpar a fila é
     o único jeito de parar no meio — ele não expõe nada melhor. */
  function stopDrawing() {
    var pending = window.timeouts;
    if (pending) {
      while (pending.length) {
        clearTimeout(pending.pop());
      }
    }
    window.ready = true;
  }

  /* `elemento.hidden = false` **não** funciona aqui, e falha em silêncio: a
     propriedade `hidden` é definida em `HTMLElement`, e o alvo da animação é
     um `<svg>`, que é um `SVGElement`. A atribuição cria um campo qualquer no
     objeto JavaScript, o atributo `hidden` do HTML permanece, e a regra
     `[hidden] { display: none }` continua valendo — a animação desenha os 29
     traços, corretamente, dentro de um elemento invisível. Foi assim que ela
     apareceu em branco na primeira captura de tela, com o botão dizendo
     "Pausar animação" e o console limpo. Mexer no atributo funciona para os
     dois tipos de elemento. */
  function show(element, visible) {
    if (visible) {
      element.removeAttribute('hidden');
    } else {
      element.setAttribute('hidden', '');
    }
  }

  function setUp(block) {
    var canvas = block.querySelector('#LogoAnimation');
    var poster = block.querySelector('.pm-marca__cartaz');
    if (!canvas || !poster) {
      return;
    }

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'pm-marca__controle';
    block.appendChild(button);

    /* `looping`: o ciclo está ligado — desenhando **ou** na pausa entre as
       voltas. É o que o botão desliga.
       `drawing`: uma volta está sendo desenhada agora. */
    var repeats = !prefersReducedMotion();
    var looping = false;
    var drawing = false;
    var frameTimer = null;
    var cycleTimer = null;

    function label(text, busy) {
      button.textContent = text;
      button.setAttribute('aria-label', text);
      button.disabled = Boolean(busy);
    }

    function toPoster() {
      drawing = false;
      show(canvas, false);
      show(poster, true);
      if (canvas.replaceChildren) {
        canvas.replaceChildren();
      }
    }

    function draw() {
      /* O arquivo gerado captura o elemento uma vez, na carga. Se a página
         trocou de conteúdo desde então, a referência dele é um nó que não
         está mais no documento — reatribuir é mais barato que recarregar
         17 MB. */
      window.logoanimation = canvas;
      show(poster, false);
      show(canvas, true);
      drawing = true;
      window.renderLogoAnimation();
      label(window.pmText('animationPause'));

      frameTimer = setTimeout(function () {
        frameTimer = null;
        toPoster();
        if (!looping) {
          return;
        }
        if (repeats) {
          scheduleNext();
        } else {
          looping = false;
          label(window.pmText('animationReplay'));
        }
      }, DURATION_MS);
    }

    /* Desenhar 510 quadros numa aba que ninguém está vendo é trabalho jogado
       fora, e o navegador estrangula os temporizadores de aba oculta o
       bastante para a volta sair truncada. O ciclo espera a aba voltar. */
    function scheduleNext() {
      if (document.hidden) {
        return;
      }
      cycleTimer = setTimeout(function () {
        cycleTimer = null;
        if (looping) {
          draw();
        }
      }, PAUSE_MS);
    }

    function stop() {
      looping = false;
      if (frameTimer) {
        clearTimeout(frameTimer);
        frameTimer = null;
      }
      if (cycleTimer) {
        clearTimeout(cycleTimer);
        cycleTimer = null;
      }
      stopDrawing();
      toPoster();
      label(window.pmText('animationPlay'));
    }

    function start() {
      looping = true;
      label(window.pmText('animationLoading'), true);
      loadDrawing().then(
        function () {
          if (looping) {
            draw();
          }
        },
        function () {
          looping = false;
          toPoster();
          label(window.pmText('animationPlay'));
          block.setAttribute('data-pm-erro', window.pmText('animationFailed'));
        }
      );
    }

    button.addEventListener('click', function () {
      if (looping) {
        stop();
      } else {
        start();
      }
    });

    document.addEventListener('visibilitychange', function () {
      if (!looping || !repeats) {
        return;
      }
      if (document.hidden) {
        if (cycleTimer) {
          clearTimeout(cycleTimer);
          cycleTimer = null;
        }
      } else if (!drawing && !cycleTimer) {
        scheduleNext();
      }
    });

    toPoster();
    label(window.pmText('animationPlay'));

    if (repeats) {
      start();
    }
  }

  function scan() {
    var blocks = document.querySelectorAll('[data-pm-logo]');
    for (var i = 0; i < blocks.length; i++) {
      if (!blocks[i].hasAttribute('data-pm-pronto')) {
        blocks[i].setAttribute('data-pm-pronto', '');
        setUp(blocks[i]);
      }
    }
  }

  /* `document$` é o observável que o Material emite a cada troca de
     página; usá-lo mantém isto funcionando se a navegação instantânea for
     ligada um dia. Quando não existe, o evento nativo basta. */
  if (window.document$ && typeof window.document$.subscribe === 'function') {
    window.document$.subscribe(scan);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }
})();
