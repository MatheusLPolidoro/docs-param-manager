# Configuration

All server configuration goes through a single object: `Settings`, in
`core/config.py`, instantiated once at module level.

!!! danger "Never call `os.getenv` in server code"

    If the variable is not in `Settings`, it does not exist for the application.
    Reading the environment directly bypasses validation and creates invisible
    configuration.

Loading uses `env_file='.env'`, `case_sensitive=True` and `extra='allow'`.
`case_sensitive` means `mongo_host` is **not** read in place of `MONGO_HOST`.

## MongoDB

| Variable | Default |
|---|---|
| `MONGO_HOST` | `localhost` |
| `MONGO_PORT` | `27017` |
| `MONGO_USER` | `admin` |
| `MONGO_PASSWORD` | `admin` |
| `MONGO_DATABASE` | `fast_param_manager` |
| `MONGO_AUTH_SOURCE` | `admin` |

Access goes through a classmethod singleton in `core/database.py`, opened and
closed by the FastAPI `lifespan`.

## Keycloak

| Variable | Default |
|---|---|
| `KEYCLOAK_URL` | `http://localhost:8081` |
| `KEYCLOAK_REALM` | `fast-param-manager` |
| `KEYCLOAK_CLIENT_ID` | `fast-param-api` |
| `KEYCLOAK_CLIENT_SECRET` | *(none)* |

## Behaviour

### `READ_AUTH_MODE`

Defaults to `off`. Accepts `off`, `warn` and `enforce`, **in increasing order of
strictness** — the order is what lets you tell whether a change loosens or
tightens the control.

An invalid value here **kills the application at boot**, on purpose: the `.env`
is controlled at deploy time, and a typo must surface immediately instead of
silently becoming anonymous reads in production. The value coming from the
database takes another path — it arrives at runtime and is coerced with an error
log, without bringing anything down.

Details and the promotion criterion are in
[Authentication and authorization](autenticacao.md#read_auth_mode).

### `USER_EDITABLE_ENFORCEMENT`

Defaults to `legacy`. Decides how the restricted-field diff is computed on
upsert.

`legacy`
:   Compares against the whole payload, with schema defaults filled in. This is
    the historical behaviour: a plain user always gets `403`, even on a
    parameter flagged as editable.

`explicit`
:   Compares only the fields the client actually sent, and preserves already
    stored metadata.

!!! warning "Do not promote early"

    `explicit` is only safe once `param-manager` **0.5.0** or later has been adopted.
    Version 0.4.2 sends `user_editable=False` explicitly, and under `explicit`
    that starts counting as an attempt to change metadata.

## Application and cryptography

| Variable | Default | Note |
|---|---|---|
| `APP_CUSTODY_KEY` | `dev-chave-custodia-app` | **Change it in production.** It is the root of secret custody |
| `SECRET_KEY` | `your-secret-key-here` | |
| `ALGORITHM` | `HS256` | |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | |

## CORS

`CORS_ALLOW_ORIGINS` is a comma-separated list; the default is `*`.

!!! note "`*` turns credentials off automatically"

    `*` with `allow_credentials=True` is an invalid combination per spec and
    browsers reject it. While the list is `*`, credentials are disabled. For
    cookies and `Authorization` to work in the browser again, fill it with the
    real domains: `https://front.example.com,https://admin.example.com`.

## API identity

| Variable | Default |
|---|---|
| `API_TITLE` | `Fast Param Manager API` |
| `API_VERSION` | `2.0.0` |
| `API_DESCRIPTION` | `API para gerenciamento de parâmetros com MongoDB e Keycloak` |

## OpenTelemetry

| Variable | Default |
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

See [Observability](observabilidade.md).
