/*
 * Troca da fonte do texto.
 *
 * O Material expõe `--md-text-font` e `--md-code-font`, e monta a pilha
 * completa em volta delas (`--md-text-font-family: var(--md-text-font, _),
 * -apple-system, …`). Redefinir só essas duas variáveis basta para trocar
 * a fonte do site inteiro **sem** perder a cadeia de fallback — que é o
 * que salva a página quando a fonte da web não chega.
 *
 * Três decisões que valem estar escritas:
 *
 * - **A escolha vive no `localStorage`, por navegador.** Não há conta nem
 *   servidor; e uma preferência de leitura que se perde a cada página é
 *   pior do que não existir.
 * - **Uma das opções não baixa nada.** "Do sistema" usa a pilha nativa do
 *   aparelho. Este site é servido por um GitLab local e é lido em máquinas
 *   que nem sempre alcançam o `fonts.googleapis.com`; sem essa opção, quem
 *   está sem saída para a internet fica preso à fonte que não carregou.
 * - **Uma delas é a Atkinson Hyperlegible**, desenhada pelo Braille
 *   Institute para separar as formas que mais se confundem na baixa visão
 *   (I/l/1, O/0). É a razão de o controle existir na barra de ações, ao
 *   lado do "baixar .md", e não escondido num canto.
 *
 * O controle é montado por JavaScript de propósito. Um `<select>` escrito
 * no template apareceria mesmo com o JavaScript desligado, sem fazer nada
 * ao ser usado — um controle morto na tela é pior que controle nenhum.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'pm-fonte';
  var STYLE_ID = 'pm-estilo-fonte';

  /* `src` vazio = nenhuma requisição de rede. `text`/`code` vazios = mantém
     o que o tema já definiu no mkdocs.yml. */
  var OPTIONS = [
    { id: 'padrao', label: 'fontDefault', src: '', text: '', code: '' },
    {
      id: 'legivel',
      label: 'fontReadable',
      src: 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&display=swap',
      text: 'Atkinson Hyperlegible',
      code: '',
    },
    {
      id: 'serifada',
      label: 'fontSerif',
      src: 'https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap',
      text: 'Source Serif 4',
      code: '',
    },
    {
      id: 'sistema',
      label: 'fontSystem',
      src: '',
      text: 'system-ui',
      code: 'ui-monospace',
    },
  ];

  function optionById(id) {
    for (var i = 0; i < OPTIONS.length; i++) {
      if (OPTIONS[i].id === id) {
        return OPTIONS[i];
      }
    }
    return OPTIONS[0];
  }

  /* Modo privado e política de armazenamento bloqueada fazem o acesso ao
     localStorage lançar, não devolver null. Sem o try, a exceção derruba o
     script inteiro e leva junto o controle de fonte. */
  function readPreference() {
    try {
      return window.localStorage.getItem(STORAGE_KEY) || 'padrao';
    } catch (erro) {
      return 'padrao';
    }
  }

  function writePreference(id) {
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch (erro) {
      /* Preferência não persistida ainda vale para esta página. */
    }
  }

  function apply(id) {
    var option = optionById(id);
    var sheet = document.getElementById(STYLE_ID);
    if (!sheet) {
      sheet = document.createElement('style');
      sheet.id = STYLE_ID;
      document.head.appendChild(sheet);
    }

    var css = '';
    /* `@import` só é honrado no topo da folha; qualquer regra antes dele
       faz o navegador descartar a importação em silêncio. */
    if (option.src) {
      css += "@import url('" + option.src + "');";
    }
    var vars = '';
    if (option.text) {
      vars += '--md-text-font: "' + option.text + '";';
    }
    if (option.code) {
      vars += '--md-code-font: "' + option.code + '";';
    }
    if (vars) {
      css += ':root { ' + vars + ' }';
    }
    sheet.textContent = css;
  }

  function build(host) {
    var current = readPreference();

    var field = document.createElement('span');
    field.className = 'doc-actions__fonte';

    var label = document.createElement('label');
    label.className = 'doc-actions__rotulo';
    label.setAttribute('for', 'pm-fonte');
    label.textContent = window.pmText('fontLabel');

    var select = document.createElement('select');
    select.id = 'pm-fonte';
    select.className = 'doc-actions__select';
    select.title = window.pmText('fontHelp');

    for (var i = 0; i < OPTIONS.length; i++) {
      var item = document.createElement('option');
      item.value = OPTIONS[i].id;
      item.textContent = window.pmText(OPTIONS[i].label);
      if (OPTIONS[i].id === current) {
        item.selected = true;
      }
      select.appendChild(item);
    }

    select.addEventListener('change', function () {
      writePreference(select.value);
      apply(select.value);
    });

    field.appendChild(label);
    field.appendChild(select);
    host.appendChild(field);
  }

  function scan() {
    /* Aplicar em toda página, e não só onde o controle é montado: a
       preferência vale para o site inteiro. */
    apply(readPreference());

    var hosts = document.querySelectorAll('[data-pm-fonte]');
    for (var i = 0; i < hosts.length; i++) {
      if (!hosts[i].hasAttribute('data-pm-pronto')) {
        hosts[i].setAttribute('data-pm-pronto', '');
        build(hosts[i]);
      }
    }
  }

  if (window.document$ && typeof window.document$.subscribe === 'function') {
    window.document$.subscribe(scan);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }
})();
