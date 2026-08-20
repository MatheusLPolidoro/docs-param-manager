/*
 * Animação da marca — carregamento sob demanda e controle de reprodução.
 *
 * O desenho vem de `assets/js/LogoAnimation.js`, o mesmo arquivo gerado que
 * o `param-manager` usa. Ele tem 17 MB: são 510 quadros de SVG escritos
 * quadro a quadro em JavaScript. Duas consequências mandam no desenho
 * deste arquivo.
 *
 * 1. **Ele não pode entrar no `extra_javascript`.** Lá seria baixado em
 *    toda página do site, inclusive nas 20 que não têm animação nenhuma.
 *    Aqui o arquivo grande só é buscado na página que tem o bloco, e só
 *    quando a animação vai de fato tocar.
 *
 * 2. **Ele não pode tocar sozinho e para sempre.** A versão do
 *    `param-manager` roda `renderLogoAnimation()` num `setInterval` de 9
 *    segundos que nunca para — conteúdo em movimento contínuo, sem
 *    controle para pausar, que é exatamente o que a WCAG 2.2.2 proíbe.
 *    Foi por isso que a animação tinha sido removida deste site. Ela volta
 *    aqui com o que faltava: toca **uma vez**, tem botão de pausa visível
 *    enquanto toca, e não começa sozinha para quem pediu menos movimento
 *    ao sistema operacional (WCAG 2.3.3).
 *
 * Antes, durante a carga e depois do fim, o que aparece é o cartaz
 * estático (`assets/marca-animada.svg`). Sem ele a área ficaria em branco
 * nos três momentos: o último quadro do arquivo gerado limpa o SVG.
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
     ms. Só serve para saber quando trocar o rótulo do botão de "pausar"
     para "repetir" — se um dia o arquivo mudar de duração, o rótulo troca
     cedo ou tarde demais e nada mais quebra. */
  var DURATION_MS = 8500;

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

    var endTimer = null;
    var playing = false;

    function label(text, busy) {
      button.textContent = text;
      button.setAttribute('aria-label', text);
      button.disabled = Boolean(busy);
    }

    function showPoster() {
      playing = false;
      show(canvas, false);
      show(poster, true);
      if (canvas.replaceChildren) {
        canvas.replaceChildren();
      }
    }

    function stop() {
      if (endTimer) {
        clearTimeout(endTimer);
        endTimer = null;
      }
      stopDrawing();
      showPoster();
      label(window.pmText('animationReplay'));
    }

    function play() {
      label(window.pmText('animationLoading'), true);
      loadDrawing().then(
        function () {
          /* O arquivo gerado captura o elemento uma vez, na carga. Se a
             página trocou de conteúdo desde então, a referência dele é um
             nó que não está mais no documento — reatribuir é mais barato
             que recarregar 17 MB. */
          window.logoanimation = canvas;
          show(poster, false);
          show(canvas, true);
          playing = true;
          window.renderLogoAnimation();
          label(window.pmText('animationPause'));
          endTimer = setTimeout(function () {
            endTimer = null;
            showPoster();
            label(window.pmText('animationReplay'));
          }, DURATION_MS);
        },
        function () {
          showPoster();
          label(window.pmText('animationPlay'));
          block.setAttribute('data-pm-erro', window.pmText('animationFailed'));
        }
      );
    }

    button.addEventListener('click', function () {
      if (playing) {
        stop();
      } else {
        play();
      }
    });

    showPoster();
    label(window.pmText('animationPlay'));

    /* Só começa sozinha quando ninguém pediu o contrário. Com
       `prefers-reduced-motion` o bloco fica no cartaz estático e o botão
       continua ali — quem quiser ver a animação, vê; ela é que não se
       impõe. */
    if (!prefersReducedMotion()) {
      play();
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
