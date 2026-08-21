# docs-param-manager

Documentação central do produto **Param Manager**, cobrindo os subprojetos do
workspace: a biblioteca cliente `param-manager`, a API `fast-param-manager` e o
frontend `front-param-manager` (ainda vazio).

Cada subprojeto continua com o seu próprio `README.md` e o seu próprio
changelog. Este repositório é o lugar da documentação que atravessa os três —
o que só faz sentido lendo produto inteiro, não um artefato de cada vez.

## O site

**https://matheuslpolidoro.github.io/docs-param-manager/** — em português e
inglês, com seletor de idioma e de versão na barra superior.

Ele é publicado em dois lugares a partir do mesmo `main`, e não é redundância
por descuido: o interno é o que a rede fechada alcança e continua no ar sem
internet.

| Onde | URL | Quem publica |
|---|---|---|
| GitHub Pages (público) | https://matheuslpolidoro.github.io/docs-param-manager/ | `.github/workflows/pages.yml` |
| GitLab Pages (interno) | http://docs-param-manager-2714dc.pages.127.0.0.1.nip.io:8090 | job `pages` do `.gitlab-ci.yml` |

## Conteúdo

21 páginas, cada uma em **português e inglês**:

| Seção | Páginas |
|---|---|
| Produto | visão geral, arquitetura, compatibilidade, glossário |
| API | visão geral, instalação, configuração, autenticação, endpoints, tipos de parâmetro, observabilidade |
| Cliente | visão geral, instalação, configuração, uso, cache e offline, empacotamento |
| Segurança | envelope criptográfico |
| Outros | início, changelog |

O conteúdo foi escrito **conferindo o código**, não a documentação existente
dos subprojetos — que diverge da implementação em vários pontos conhecidos. Onde
os dois discordam, as páginas daqui dizem qual é o comportamento real.

## Stack

- **mkdocs** + **mkdocs-material**, paleta `deep purple`
- **mkdocs-static-i18n** com estrutura por sufixo: `pagina.md` é português,
  `pagina.en.md` é inglês. O português é o idioma padrão e fica na raiz; o
  inglês fica em `/en/`
- **mkdocs-towncrier** para o rascunho do changelog
- Marca própria: `assets/logo.svg` no cabeçalho e `assets/favicon.svg` — o mesmo
  grafo de nós, sobre placa roxa, para funcionar em fundo claro e na aba do
  navegador
- **Sem seletor de versão** — ver a seção Publicação

### Recursos próprios deste site

**Download da página em `.md`**
:   `hooks/downloads.py` grava o fonte Markdown ao lado do HTML de cada página,
    em cada idioma. O botão vem de `overrides/main.html`. É cópia byte a byte do
    repositório — nenhum plugin de export no meio.

**Salvar em PDF**
:   Botão que chama `window.print()`. O PDF é gerado pelo navegador; a folha
    `@media print` em `assets/css/a11y.css` remove navegação e controles. **Não
    há geração de PDF no build** — isso exigiria um navegador headless dentro do
    runner de CI, que hoje não tem.

**Acessibilidade**
:   Não há página sobre o assunto — ela existiu e foi removida. O registro é o
    código: `assets/css/a11y.css`, com cada bloco citando o critério WCAG que
    atende, mais as verificações de `prefers-reduced-motion` em
    `assets/js/logo-animation.js` e `assets/js/terminal.js`, que nenhuma media
    query de CSS alcança.

## Ambiente

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
```

O PowerShell 5.1 não tem `&&`; encadeie com `cmd1; if ($?) { cmd2 }`.

## Comandos

```
task docs     # mkdocs serve em http://127.0.0.1:8010
task build    # mkdocs build --strict
task lint     # ruff check .
task format   # ruff format .
task fix      # ruff check . --fix
```

### Por que a porta é 8010

O default do mkdocs é **8000**, que já está tomada neste ambiente — é onde o
servidor MCP do Serena escuta. E o mapa de portas do produto ocupa quase todo o
resto: 8001 é o `task run` da API, 8080 o nginx, 8081 o Keycloak, 8082 o Mongo
Express, 8090 o GitLab.

!!! danger "O erro não diz que a porta está ocupada"

    No Windows, disputar uma porta cujo socket foi aberto em modo exclusivo
    devolve `PermissionError: [WinError 10013]` — "acesso proibido pelas
    permissões" — e **não** o `10048` de porta em uso. A mensagem manda quem lê
    investigar firewall e antivírus, que não têm nada a ver.

    Quando acontecer, confira quem está na porta antes de qualquer outra coisa:

    ```powershell
    Get-NetTCPConnection -LocalPort 8010 | Select-Object State,OwningProcess
    Get-CimInstance Win32_Process -Filter "ProcessId = <pid>" | Select-Object CommandLine
    ```

    Vale conferir também `netsh interface ipv4 show excludedportrange protocol=tcp`:
    o Hyper-V reserva faixas inteiras, e uma porta dentro delas dá o mesmo
    `10013` sem ninguém estar escutando.

`--strict` é o que vale. Além dos avisos normais do mkdocs, o `mkdocs.yml`
liga a validação de **âncoras**, então um link para uma seção que não existe
reprova o build em vez de virar um clique que não leva a lugar nenhum.

**Ative a venv antes de buildar.** O `mkdocs-towncrier` chama o executável
`towncrier` por subprocesso, então ele precisa do `.venv\Scripts` no `PATH`.
Rodar `python -m mkdocs build` com a venv desativada quebra com um
`FileNotFoundError [WinError 2]` que não menciona o towncrier em lugar nenhum.

## Armadilha de dependência já paga

**Não volte `pymdown-extensions` para `10.15`.** Esse pin, herdado do
`requirements-dev.txt` do `param-manager`, é incompatível com `Markdown 3.8` e
faz **toda cerca de código genérica** — ` ```python `, ` ```bash ` — sair como
parágrafo literal, com as crases à mostra.

O sintoma engana por dois motivos: as cercas declaradas em `custom_fences`
continuam funcionando, então o `mermaid` renderiza normal e parece que o
`superfences` está de pé; e o build fica **verde**, inclusive com `--strict`.
Só se percebe olhando a página.

O pin correto é `10.21.3`, que corrige e ainda respeita o `~=10.2` exigido pelo
`mkdocs-material` 9.6.12 — a linha 11.x viola esse pin.

## Escrevendo

- Página nova precisa das **duas** versões: `pagina.md` e `pagina.en.md`. Sem a
  segunda o build não quebra — o `fallback_to_default` serve a versão em
  português no site em inglês, em silêncio.
- Entrada nova no `nav` precisa da tradução correspondente em
  `nav_translations`, no bloco do locale `en`.
- Âncora de link interno usa o slug do **título traduzido**. Nomes de variável
  mantêm underscore: `#read_auth_mode`, não `#read-auth-mode`.
- Toda imagem precisa de `alt`, e imagem em bloco HTML precisa de sintaxe
  Markdown com `markdown` no `div` — senão o caminho não é reescrito e a imagem
  quebra no build em inglês, que fica um nível abaixo.

## Convenções

- Commits: `[TIPO] Frase imperativa em português.`
- O `TIPO` vem do vocabulário towncrier **deste** repositório, declarado no
  `pyproject.toml`. É o mesmo do `param-manager` (`fix`, `docs`, `infra`,
  `chore`, ...) e **não** o do `fast-param-manager`, que é outro.
- Mudança visível ao leitor precisa de um fragmento em `chanlogs.d/`.
- `CHANGELOG.md` é gerado pelo towncrier — nunca editar à mão.

## Publicação

Os dois destinos estão na tabela do começo deste arquivo. O que segue é a
mecânica de cada um — e ela difere, porque o provedor difere.

### GitLab Pages (interno)

O job `pages` roda **só no branch padrão** e costura duas ferramentas que não se
encaixam sozinhas — o mike versiona empurrando para uma branch, o Pages publica
`public/` de um artefato:

1. `mike deploy --branch gh-pages` grava a versão e o `versions.json`.
2. `git push origin gh-pages` persiste, para as versões sobreviverem entre
   pipelines.
3. `git archive gh-pages | tar -x -C public` extrai a árvore para o que o Pages
   publica.

### Requisitos que não são óbvios

| Item | Por quê |
|---|---|
| Variável `MIKE_TOKEN` | Token de projeto com `write_repository`. **O `CI_JOB_TOKEN` não empurra para o repositório** |
| `GIT_DEPTH: '0'` no job | Push a partir de clone raso é recusado com *shallow update not allowed* |
| Imagem `python:3.13` cheia | A `slim` não traz `git`, de que o mike e o push dependem |

!!! danger "Variável protegida exige branch protegido"

    `MIKE_TOKEN` está marcada como *Protected*, então **só é injetada em jobs de
    branches protegidos**. O `main` precisa continuar protegido. Se a proteção
    cair, o job **não falha** — ele entra no caminho degradado, publica sem
    persistir a `gh-pages` e fica verde. O sintoma só aparece na versão
    seguinte, quando a anterior some do seletor.

### GitHub Pages (público)

`.github/workflows/pages.yml`, no push para `main`. É a metade mais simples:
o GitHub Pages publica a branch direto, então `mike --push` já basta — não há
árvore para extrair, e o `GITHUB_TOKEN` com `contents: write` cobre o push,
dispensando o token de projeto e o caminho degradado acima.

O `mkdocs build --strict` roda como passo separado, e não como opção do `mike`:
o `mike deploy` **não repassa opções ao mkdocs**, e o que viesse depois de `--`
seria lido como alias posicional, criando uma versão de nome inválido na
`gh-pages`.

    O sinal de que o token foi de fato usado é o `last_used_at` dele deixar de
    ser `null`, em `Settings → Access Tokens`.

O token expira em **2027-08-08**. Renove antes disso, ou a publicação passa a
degradar em silêncio pelo mesmo caminho.

## Decisão registrada: assets herdados removidos

O repositório nasceu clonando a marca e os assets do site do `param-manager`.
Depois que a documentação foi escrita, **nada disso estava mais em uso** e a
maior parte estava quebrada. Tudo saiu:

| Removido | Por quê |
|---|---|
| `assets/js/LogoAnimation.js` — **17 MB** | Órfão: a página inicial passou a usar a marca estática, e nenhum `.md` referenciava mais o script |
| `assets/js/termynal.js`, `termynal-init.js`, `assets/css/termynal.css` | Nenhuma página usa `.termynal` |
| `assets/css/extra.css` | As cinco classes que sobraram — `.copy-btn` e quatro de cor — não são usadas em lugar nenhum |
| `mkdocs-terminal` no `requirements-dev.txt` | Não é o tema deste site, nem aparece no `mkdocs.yml` |

O `termynal-init.js` merece nota, porque era **código ativo e defeituoso**: além
do inicializador do termynal, ele carregava um seletor de fontes que dependia de
símbolos inexistentes aqui, e um `startLoop(9000)` que chamava
`renderLogoAnimation()` **a cada nove segundos**. Como o script da animação só
era carregado na página inicial, toda página do site lançava
`renderLogoAnimation is not defined` em laço infinito — e, na inicial, teria
redesenhado a animação indefinidamente, o que contraria o critério WCAG 2.2.2.

Resultado: `docs/assets` caiu de **17 MB para 28 KB**.

## Decisão registrada: sem `mkdocs-gen-files`

O site do `param-manager` gera uma página "Estrutura" com
`mkdocs-gen-files` + `docs/gen_tree.py`. Isso foi montado aqui e **removido
depois**: o `mkdocs-gen-files` não se entende com o `mkdocs-static-i18n` — a
página gerada cai em `Unhandled file case` e nunca entra no `nav`, reprovando o
build estrito.

Saíram junto o `gen_tree.py`, o `filetree.js` e os 895 ícones em
`assets/svgs/` (8,7 MB), que existiam só para alimentar aquela página.
