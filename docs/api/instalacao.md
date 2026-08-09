# Instalação e execução

## Requisitos

- Python 3.10 ou superior para rodar local
- Docker e Docker Compose para subir a pilha completa
- Um MongoDB alcançável
- Um Keycloak, se for exercitar autenticação

## Ambiente local

```powershell
cd fast-param-manager
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

!!! note "PowerShell não é bash"

    O `README` do projeto traz comandos em bash (`cp`, `source venv/bin/activate`)
    que precisam de tradução. E o PowerShell 5.1 **não tem `&&`** — encadeie com
    `cmd1; if ($?) { cmd2 }`.

### Rodando

```powershell
task run
```

Que é atalho para:

```
opentelemetry-instrument uvicorn fast_param_manager.main:app --host 0.0.0.0 --port 8001
```

!!! warning "Sem o wrapper, a aplicação sobe cega"

    Rodar `uvicorn` direto funciona — mas sem o `opentelemetry-instrument` não
    há trace, não há métrica e não há correlação de log. O sintoma é sutil: a API
    responde normalmente e o painel fica vazio.

## Pilha completa com Docker

Os composes vivem em `docker/`, **não na raiz do projeto** como o `README`
sugere:

| Arquivo | Conteúdo |
|---|---|
| `docker/docker-compose.yaml` | A pilha inteira |
| `docker/api/`, `docker/keycloak/`, `docker/mongodb/` | Recortes por serviço |
| `docker/observability/`, `docker/dockge/` | Observabilidade e painel de contêineres |
| `docker/etc/` | Configuração de prometheus, loki, tempo, promtail, otel-collector e grafana |

O `.env` precisa existir antes de subir.

### Portas

| Serviço | Porta |
|---|---|
| API (docker) | 8000 |
| API (`task run`) | 8001 |
| nginx | 8080 |
| Keycloak | 8081 |
| Mongo Express | 8082 |
| Grafana | 3000 |
| MongoDB | 27017 |
| OTLP | 4317 / 4318 |

## Dependências

`pyproject.toml` declara Poetry, mas **`requirements.txt` é a fonte de verdade
das versões** — tudo fixado com `==`.

!!! danger "PyJWT precisa do extra `crypto`"

    O middleware valida token com `PyJWKClient` e `algorithms=['RS256']`, o que
    exige `cryptography`. Isso chegava transitivamente por `python-jose`; quando
    o `python-jose` saiu, o extra passou a ser obrigatório. A falha por
    esquecê-lo aparece **só em produção**, porque a suíte de testes mocka o
    Keycloak.

Outra armadilha do mesmo arquivo: `uvloop` precisa de marcador de plataforma
(`; sys_platform != "win32"`). O freeze é gerado num contêiner Linux e o mesmo
arquivo é instalado na máquina Windows de desenvolvimento, onde o pacote não
compila.

### Codificação dos requirements

Os arquivos são UTF-8 **sem BOM**. Ao regerar, não use `pip freeze > arquivo`
nem `Out-File -Encoding utf8` (que escreve BOM no PowerShell 5.1). Use
`[System.IO.File]::WriteAllLines` com `UTF8Encoding($false)`, ou gere dentro de
um contêiner e copie.

## Testes

```powershell
task test                      # lint, depois pytest com cobertura
pytest . -m "not integracao"   # só unitário
pytest . -m integracao -v      # só o que fala com recurso real
```

A suíte de integração precisa de um MongoDB alcançável. **Fora do CI ela se
pula sozinha** — ou seja, `task test` sem Mongo não prova nada sobre
integração:

```powershell
docker run -d --name mongo-teste -p 27019:27017 `
  -e MONGO_INITDB_ROOT_USERNAME=admin -e MONGO_INITDB_ROOT_PASSWORD=admin123 mongo:7
```

Depois defina `MONGO_HOST`, `MONGO_PORT`, `MONGO_USER`, `MONGO_PASSWORD` e
`MONGO_AUTH_SOURCE`.

!!! note "Ruído de teardown, não falha"

    O monitor de background do pymongo loga depois que o pytest fecha os streams
    e cospe um `ValueError: I/O operation on closed file` no fim da execução.
    Leia a linha de resumo do pytest, não o traceback final.
