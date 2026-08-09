# docs-param-manager

Documentação central do produto **Param Manager**, cobrindo os três subprojetos
do workspace: a biblioteca cliente `param-manager`, a API `fast-param-manager` e
o frontend `front-param-manager`.

Cada subprojeto continua com o seu próprio `README.md` e o seu próprio
changelog. Este repositório é o lugar da documentação que atravessa os três —
o que só faz sentido lendo produto inteiro, não um artefato de cada vez.

> **Estado atual: ambiente montado, documentação ainda não escrita.**
> O `nav` tem apenas a página inicial, o changelog e a estrutura.

## Stack

A mesma do site do `param-manager`, deliberadamente:

- **mkdocs** + **mkdocs-material**, `language: pt-BR`, paleta `deep purple`
- **mkdocs-towncrier** para o rascunho do changelog
- **mkdocs-gen-files** + `docs/gen_tree.py` para a página *Estrutura*
- **mike** declarado como provider de versão
- Marca e assets vindos do cliente: `logo.svg`, `extra.css`, `termynal`,
  `LogoAnimation.js` e o conjunto de ícones em `assets/svgs/`

## Ambiente

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
```

O PowerShell 5.1 não tem `&&`; encadeie com `cmd1; if ($?) { cmd2 }`.

## Comandos

```
task docs     # mkdocs serve
task build    # mkdocs build --strict
task lint     # ruff check .
task format   # ruff format .
task fix      # ruff check . --fix
```

`--strict` é o que vale: ele transforma warning em erro, então link quebrado e
página fora do `nav` reprovam no build, e não depois no site publicado.

**Ative a venv antes de buildar.** O `mkdocs-towncrier` chama o executável
`towncrier` por subprocesso, então ele precisa do `.venv\Scripts` no `PATH`.
Rodar `python -m mkdocs build` com a venv desativada quebra com um
`FileNotFoundError [WinError 2]` que não menciona o towncrier em lugar nenhum.

## Convenções

- Commits: `[TIPO] Frase imperativa em português.`
- O `TIPO` vem do vocabulário towncrier **deste** repositório, declarado no
  `pyproject.toml`. É o mesmo do `param-manager` (`fix`, `docs`, `infra`,
  `chore`, ...) e **não** o do `fast-param-manager`, que é outro.
- Mudança visível ao leitor precisa de um fragmento em `chanlogs.d/` antes de a
  tarefa ser considerada pronta.
- `CHANGELOG.md` é gerado pelo towncrier — nunca editar à mão.
- `docs/estrutura.md` é gerado no build por `docs/gen_tree.py`; não existe no
  repositório e não deve ser criado.

## Publicação

Ainda não decidida. O `.gitlab-ci.yml` valida o build e guarda `site/` como
artefato, mas não publica. A intenção registrada é GitLab Pages, que publica
por artefato de CI e não por branch — o fluxo do `mike` usado no `param-manager`
não se traduz direto.
