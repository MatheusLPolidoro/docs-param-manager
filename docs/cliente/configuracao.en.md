# Configuration

## The precedence order

For almost everything, the order is:

```
constructor argument  >  {INSTANCE_NAME}_VARIABLE  >  VARIABLE
```

The prefix is the `instance_name` **in upper case**. With
`instance_name='producao'`, the specific variable is `PRODUCAO_CACHE_DURATION`
and the generic one is `CACHE_DURATION`.

!!! danger "Two variables invert that order"

    `TIMEOUT` and `CACHE_DURATION` do **not** follow the rule: today the
    environment variable beats the constructor argument. Passing `timeout=30` in
    code has no effect if `TIMEOUT` exists in the environment.

    This is known debt and it is recorded. Fixing it means changing the
    `get_instance` defaults to `None`, which alters a public signature — which
    is why it is held for a larger version.

## The variables

### Connection

| Variable | Alternatives | Default |
|---|---|---|
| `API_{INSTANCE}_URL` | `API_PARAMS_URL`, `API_URL` | `''` |
| `TIMEOUT` | — | `5` |
| `VERIFY_SSL` | `{INSTANCE}_VERIFY_SSL` | `False` |

The URL is resolved in this order: the `api_url` argument, then
`API_{INSTANCE}_URL`, then `API_PARAMS_URL`, then `API_URL`. **There is no
instance prefix on the last two.**

### Credentials

| Variable | Default |
|---|---|
| `{INSTANCE}_PARAMS_USERNAME` or `PARAMS_USERNAME` | *(none)* |
| `{INSTANCE}_PARAMS_PASSWORD` or `PARAMS_PASSWORD` | *(none)* |

!!! warning "The old tutorial gets the names wrong"

    The older documentation mentions `PARAM_MANAGER_USERNAME` and
    `PARAM_MANAGER_PASSWORD`. The correct names are `PARAMS_USERNAME` and
    `PARAMS_PASSWORD`.

### Cache and resilience

| Variable | Alternative | Default |
|---|---|---|
| `CACHE_DURATION` | `{INSTANCE}_CACHE_DURATION` | `300` via the constructor, **`3600`** via `get_instance` |
| `API_ERROR_COOLDOWN` | `{INSTANCE}_API_ERROR_COOLDOWN` | Falls back to `cache_duration` |

!!! note "The cache default depends on how you construct"

    `ParamManager(...)` uses **300 s**. `ParamManager.get_instance(...)` uses
    **3600 s**. Both forms are public and both values are in the code. If cache
    validity matters to you, **pass the value explicitly**.

### Local storage

| Variable | Default |
|---|---|
| `LOCAL_DB_PATH` | The `.env` directory, or the current directory |

The final file lands at:

```
<base>/param_manager/<instance_name>/params_<instance_name>.json
```

The base is resolved in this order: the `local_db_path` argument, then the
PyInstaller directory when frozen, then `LOCAL_DB_PATH`, then the `.env`
directory, and finally the working directory.

!!! warning "The path changed in 0.4.0"

    The old documentation mentions `param_manager/params_db.json`, without the
    instance level. Since 0.4.0 there is one directory per instance.

### Cryptography

| Variable | Alternative |
|---|---|
| `CHAVE_CUSTODIA_APP` | `APP_CUSTODY_KEY` |

It must match the server's `APP_CUSTODY_KEY`. If it does not, decryption fails —
and it fails **silently**: the client logs an error and returns `None`. See
[Cryptographic envelope](../seguranca/envelope.md).

### Legacy cache

| Variable | Effect |
|---|---|
| `PARAM_MANAGER_PURGE_PLAINTEXT_CACHE` | Purges, at startup, old local cache written in the clear |

It is opt-in. Turn it on once when migrating from a version that stored
sensitive values unencrypted.

## `verify_ssl` has partial scope

This is the easiest thing in the whole library to misdiagnose.

The flag governs **only the two read GETs**. Authentication and writes always
verify the TLS chain, and that is deliberate: `POST /auth/token` carries a
username and password, and weakening its TLS would be worse than the asymmetry.

!!! danger "The symptom in an environment with an internal certificate"

    **Reads work and authentication fails with an SSL error.** It looks like
    half-finished configuration; it is the designed behaviour. The right fix is
    to install the internal chain on the system, not to hunt for a flag that
    disables verification on login.

`verify_ssl` defaults to `False`, because the environments consuming this
library use internal certificates. Anyone with a trusted chain can — and should
— pass `verify_ssl=True`.

The values accepted in the environment variable are `1`, `true`, `yes` and `on`,
case-insensitively. Anything else is false.

## Sample `.env`

```bash
API_PARAMS_URL=https://parameters.example.com
PARAMS_USERNAME=reporting-service
PARAMS_PASSWORD=...
CACHE_DURATION=600
API_ERROR_COOLDOWN=60
VERIFY_SSL=true
CHAVE_CUSTODIA_APP=...

# A second instance, with its own overrides
API_HOMOLOG_URL=https://parameters-staging.example.com
HOMOLOG_CACHE_DURATION=30
```
