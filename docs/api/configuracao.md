# Configuração

Toda a configuração do servidor passa por um único objeto: `Settings`, em
`core/config.py`, instanciado uma vez no nível do módulo.

!!! danger "Nunca chame `os.getenv` no código do servidor"

    Se a variável não estiver em `Settings`, ela não existe para a aplicação.
    Ler o ambiente direto contorna a validação e cria configuração invisível.

O carregamento usa `env_file='.env'`, `case_sensitive=True` e `extra='allow'`.
`case_sensitive` significa que `mongo_host` **não** é lido no lugar de
`MONGO_HOST`.

## MongoDB

| Variável | Default |
|---|---|
| `MONGO_HOST` | `localhost` |
| `MONGO_PORT` | `27017` |
| `MONGO_USER` | `admin` |
| `MONGO_PASSWORD` | `admin` |
| `MONGO_DATABASE` | `fast_param_manager` |
| `MONGO_AUTH_SOURCE` | `admin` |

O acesso passa por um singleton de classe em `core/database.py`, aberto e
fechado pelo `lifespan` do FastAPI.

## Keycloak

| Variável | Default |
|---|---|
| `KEYCLOAK_URL` | `http://localhost:8081` |
| `KEYCLOAK_REALM` | `fast-param-manager` |
| `KEYCLOAK_CLIENT_ID` | `fast-param-api` |
| `KEYCLOAK_CLIENT_SECRET` | *(nenhum)* |

## Comportamento

### `READ_AUTH_MODE`

Default `off`. Aceita `off`, `warn` e `enforce`, **em ordem crescente de rigor**
— a ordem é o que permite saber se uma troca afrouxa ou aperta o controle.

Um valor inválido aqui **derruba a aplicação no boot**, de propósito: o `.env` é
controlado no deploy, e um erro de digitação precisa aparecer na hora em vez de
virar leitura anônima silenciosa em produção. O valor que vem do banco segue
outro caminho, chega em runtime e é coagido com log de erro sem derrubar nada.

Detalhes e critério de promoção em
[Autenticação e autorização](autenticacao.md#read_auth_mode).

### `USER_EDITABLE_ENFORCEMENT`

Default `legacy`. Decide como o diff de campos restritos é calculado no upsert.

`legacy`
:   Compara contra o payload inteiro, com os defaults do schema. É o
    comportamento histórico: usuário comum sempre recebe `403`, mesmo em
    parâmetro marcado como editável.

`explicit`
:   Compara apenas os campos que o cliente realmente enviou e preserva os
    metadados já gravados.

!!! warning "Não promova antes da hora"

    `explicit` só é seguro depois que o `param-manager` **0.4.3** estiver
    adotado. A versão 0.4.2 envia `user_editable=False` explicitamente, e sob
    `explicit` isso passa a contar como tentativa de alterar metadado.

## Aplicação e criptografia

| Variável | Default | Observação |
|---|---|---|
| `APP_CUSTODY_KEY` | `dev-chave-custodia-app` | **Troque em produção.** É a raiz da custódia dos segredos |
| `SECRET_KEY` | `your-secret-key-here` | |
| `ALGORITHM` | `HS256` | |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | |

## CORS

`CORS_ALLOW_ORIGINS` é uma lista separada por vírgula; o default é `*`.

!!! note "`*` desliga as credenciais automaticamente"

    `*` com `allow_credentials=True` é combinação inválida por especificação e
    os navegadores rejeitam. Enquanto a lista for `*`, as credenciais ficam
    desligadas. Para que cookie e `Authorization` voltem a funcionar no
    navegador, preencha com os domínios reais:
    `https://front.exemplo.com,https://admin.exemplo.com`.

## Identidade da API

| Variável | Default |
|---|---|
| `API_TITLE` | `Fast Param Manager API` |
| `API_VERSION` | `2.0.0` |
| `API_DESCRIPTION` | `API para gerenciamento de parâmetros com MongoDB e Keycloak` |

## OpenTelemetry

| Variável | Default |
|---|---|
| `OTEL_SERVICE_NAME` | `fast-param-manager` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `otel-collector:4317` |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | `grpc` |
| `OTEL_EXPORTER_OTLP_INSECURE` | `true` |
| `OTEL_TRACES_EXPORTER` / `OTEL_METRICS_EXPORTER` | `otlp` |
| `OTEL_METRIC_EXPORT_INTERVAL` | `10000` |
| `OTEL_RESOURCE_ATTRIBUTES` | `service.version=2.0.0,deployment.environment=dev` |
| `OTEL_PYTHON_LOG_CORRELATION` | `true` |
| `OTEL_PYTHON_LOGGING_AUTO_INSTRUMENTATION_ENABLED` | `true` |
| `OTEL_PYTHON_LOG_LEVEL` | `debug` |
| `OTEL_PROPAGATORS` | `tracecontext,baggage` |
| `COLLECTOR_OTLP_ENABLED` | `true` |

Ver [Observabilidade](observabilidade.md).
