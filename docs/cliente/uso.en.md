# Usage

## Getting an instance

```python
from param_manager import ParamManager

pm = ParamManager.get_instance()
```

With explicit configuration:

```python
pm = ParamManager.get_instance(
    instance_name='producao',
    api_url='https://parameters.example.com',
    cache_duration=600,
    timeout=10,
    verify_ssl=True,
    api_error_cooldown=60,
)
```

The full constructor signature:

```python
ParamManager(
    api_url: str | None = None,
    cache_duration: int = 300,
    timeout: int = 5,
    local_db_path: str | None = None,
    username: str | None = None,
    password: str | None = None,
    instance_name: str = 'default',
    verify_ssl: bool | None = None,
    api_error_cooldown: int | None = None,
)
```

`get_instance` takes the same arguments, **but with `cache_duration=3600`** —
see [Configuration](configuracao.md#cache-and-resilience).

## Reading

### One parameter

```python
timeout = pm.get_param('MY_APP', 'TIMEOUT_HTTP')
```

Returns the value ready to use: converted by its type and, if sensitive, already
decrypted. The caller never sees an envelope.

The third argument, `save_cache`, controls whether the result feeds the cache.
Use `save_cache=False` for a one-off read that should not influence the next
ones.

!!! warning "Absence returns `None`, not an exception"

    When the parameter does not exist, when the API is down and there is no
    local copy, or when decryption fails, `get_param` returns **`None`**. All
    three are indistinguishable in the return value — the difference only shows
    up in the log.

    If `None` is a legitimate value in your domain, you cannot tell them apart.
    Use your own sentinel:

    ```python
    MISSING = object()
    value = pm.get_param('MY_APP', 'X')
    if value is None:
        value = MISSING
    ```

### All at once

```python
params = pm.get_all_params('MY_APP')
```

Returns a name-to-value dictionary. Besides being a single request, this fills
the **application cache**, and subsequent individual reads hit it without
touching the network.

## Writing

Every write hits the network, requires a token and ignores the cache.

### Create an application

```python
pm.create_app('MY_APP', 'Reporting service')
```

Expects `201` from the server. Any other status raises.

### Write a parameter

```python
pm.upsert_params(
    'MY_APP',
    'TIMEOUT_HTTP',
    value=30,
    param_type='int',
    description='Timeout for outbound calls',
    max_value=300,
)
```

Signature:

```python
upsert_params(
    app_name: str,
    param_name: str,
    *,
    value: Any,
    param_type: str,
    description: str | None = None,
    user_editable: bool | None = None,
    min_length: int | None = None,
    max_length: int | None = None,
    min_value: int | float | None = None,
    max_value: int | float | None = None,
    referenced_params: list[str] | None = None,
)
```

Everything after `app_name` and `param_name` is **keyword-only**.

!!! note "`user_editable=None` is different from `False`"

    The default is `None`, and in that case the key is **omitted from the
    payload**. That is what lets the server tell "I did not send it" from "I
    sent `False`" — the distinction that editing a `user_editable` parameter as
    a plain user depends on under `USER_EDITABLE_ENFORCEMENT=explicit`.

    Version 0.4.2 sent `False` explicitly. If you assemble the payload by hand,
    do not reintroduce that.

Remember the bounds: `max_length` is 30 on the server by default. To store a
long string, pass `max_length` explicitly — see
[Parameter types](../api/tipos-de-parametro.md#limits).

### Store a secret

```python
pm.upsert_params(
    'MY_APP',
    'DB_PASSWORD',
    value='r3al-p4ssw0rd',
    param_type='secret',
    max_length=200,
)
```

The value travels in the clear over the connection (which is why HTTPS matters)
and is encrypted by the server before it touches the database. Reading it back,
decryption is transparent.

### Delete

```python
pm.delete_param('MY_APP', 'TIMEOUT_HTTP')
pm.delete_app('MY_APP')
```

## Cache

```python
pm.clear_cache('MY_APP', 'TIMEOUT_HTTP')  # one parameter
pm.clear_cache('MY_APP')                  # the whole application
pm.clear_cache()                          # everything
```

!!! tip "`clear_cache` also disarms the circuit breaker"

    Clearing an application's cache drops its error mark unconditionally. It is
    an explicit operator action: it means "try again now" after fixing the API,
    without waiting for the cooldown.

```python
info = pm.get_cache_info()
```

Returns the cached applications, the timestamps, whether each entry is still
valid, and the per-application error marks.

## Multiple instances

```python
production = ParamManager.get_instance(
    instance_name='producao', api_url='https://parameters.example.com'
)
staging = ParamManager.get_instance(
    instance_name='homolog', api_url='https://parameters-staging.example.com'
)
```

Each has its own cache, credentials and local file. Nothing leaks from one to
the other.

## In your tests

The multiton holds instances in a class dictionary that **survives between
tests**. Without resetting it, one test reuses the instance another one created:

```python
def setup_function():
    ParamManager._instances = {}
```

Without this, a test that configures a different `api_url` will silently use the
previous test's URL.
