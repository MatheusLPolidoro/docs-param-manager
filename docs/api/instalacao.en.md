# Install and run

## Requirements

- Python 3.10 or newer to run locally
- Docker and Docker Compose for the full stack
- A reachable MongoDB
- A Keycloak, if you are going to exercise authentication

## Local environment

```powershell
cd fast-param-manager
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

!!! note "PowerShell is not bash"

    The project `README` carries bash commands (`cp`,
    `source venv/bin/activate`) that need translating. And PowerShell 5.1 has
    **no `&&`** — chain with `cmd1; if ($?) { cmd2 }`.

### Running

```powershell
task run
```

Which is shorthand for:

```
opentelemetry-instrument uvicorn fast_param_manager.main:app --host 0.0.0.0 --port 8001
```

!!! warning "Without the wrapper, the application runs blind"

    Running `uvicorn` directly works — but without `opentelemetry-instrument`
    there are no traces, no metrics and no log correlation. The symptom is
    subtle: the API responds normally and the dashboard stays empty.

## Full stack with Docker

The compose files live in `docker/`, **not at the project root** as the `README`
suggests:

| File | Contents |
|---|---|
| `docker/docker-compose.yaml` | The whole stack |
| `docker/api/`, `docker/keycloak/`, `docker/mongodb/` | Per-service splits |
| `docker/observability/`, `docker/dockge/` | Observability and container dashboard |
| `docker/etc/` | Configuration for prometheus, loki, tempo, promtail, otel-collector and grafana |

`.env` must exist before you bring it up.

### Ports

| Service | Port |
|---|---|
| API (docker) | 8000 |
| API (`task run`) | 8001 |
| nginx | 8080 |
| Keycloak | 8081 |
| Mongo Express | 8082 |
| Grafana | 3000 |
| MongoDB | 27017 |
| OTLP | 4317 / 4318 |

## Dependencies

`pyproject.toml` declares Poetry, but **`requirements.txt` is the source of
truth for versions** — everything pinned with `==`.

!!! danger "PyJWT needs the `crypto` extra"

    The middleware validates tokens with `PyJWKClient` and
    `algorithms=['RS256']`, which requires `cryptography`. That used to arrive
    transitively through `python-jose`; once `python-jose` was removed, the
    extra became mandatory. Forgetting it fails **only in production**, because
    the test suite mocks Keycloak.

Another trap in the same file: `uvloop` needs a platform marker
(`; sys_platform != "win32"`). The freeze is produced in a Linux container but
the same file is installed on the Windows development machine, where the package
does not build.

### Requirements file encoding

The files are UTF-8 **without a BOM**. When regenerating, do not use
`pip freeze > file` nor `Out-File -Encoding utf8` (which writes a BOM on
PowerShell 5.1). Use `[System.IO.File]::WriteAllLines` with
`UTF8Encoding($false)`, or generate inside a container and copy.

## Tests

```powershell
task test                      # lint, then pytest with coverage
pytest . -m "not integracao"   # unit only
pytest . -m integracao -v      # only what talks to a real resource
```

The integration suite needs a reachable MongoDB. **Outside CI it skips itself**
— meaning `task test` without Mongo proves nothing about integration:

```powershell
docker run -d --name mongo-teste -p 27019:27017 `
  -e MONGO_INITDB_ROOT_USERNAME=admin -e MONGO_INITDB_ROOT_PASSWORD=admin123 mongo:7
```

Then set `MONGO_HOST`, `MONGO_PORT`, `MONGO_USER`, `MONGO_PASSWORD` and
`MONGO_AUTH_SOURCE`.

!!! note "Teardown noise, not failure"

    Pymongo's background monitor logs after pytest closes its streams and prints
    a `ValueError: I/O operation on closed file` at the end of the run. Read
    pytest's summary line, not the trailing traceback.
