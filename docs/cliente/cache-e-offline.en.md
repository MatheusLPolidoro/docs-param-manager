# Cache and offline mode

## The four steps

A call to `get_param` walks these, in order, until one of them answers:

1. **Parameter cache** — keyed by `app:param`. The cheapest.
2. **Application cache** — the whole map, filled by `get_all_params`. A hit here
   **promotes** the value into the parameter cache.
3. **Circuit breaker** — if there is a recent error recorded for that
   application, the network is skipped and the answer comes from TinyDB.
4. **The network** — a `GET` against the API. Success writes cache and TinyDB;
   failure arms the breaker and falls back to local.

`get_all_params` walks the same chain without step 2, which is itself.

## Cache validity

Governed by `cache_duration`, in seconds. The default depends on how the
instance was created — **300 via the constructor, 3600 via `get_instance`**.

There is no remote invalidation. A value changed on the server arrives when the
cache expires, or when someone calls `clear_cache`. If you need fast
propagation, what you tune is `cache_duration` — there is no push.

A negative `CACHE_DURATION` becomes **0**, not the fallback. Zero means the
cache is always invalid: every read goes to the network.

## The circuit breaker

### What arms it

- Timeout
- Connection error
- A `404` handled as a missing parameter
- Any unexpected error, including `5xx`

That last item is worth highlighting: HTTP errors arm the cooldown alongside
network errors. Without it, the library would hammer a server that is returning
`500` on every read.

### How long it lasts

`api_error_cooldown`, in seconds. When unset, it falls back to `cache_duration`
— which was the implicit value before the variable existed.

!!! warning "Why this variable was created"

    With `get_instance`, `cache_duration` is 3600. Before `api_error_cooldown`
    existed, **a single transient `500` pinned the client to local data for an
    hour**. If you use `get_instance` and care about fast recovery, set
    `API_ERROR_COOLDOWN` to something in the tens of seconds.

### What disarms it

- A successful request.
- `clear_cache` for that application — unconditionally.

The two semantics are deliberately different: disarming on success is guarded by
a compare-and-swap, disarming through `clear_cache` is not. Unifying them
reintroduces an early-disarm race that has already been fixed.

## The local file

```
<base>/param_manager/<instance_name>/params_<instance_name>.json
```

One TinyDB per instance. Written on every successful read from the API; read
when the network fails or the breaker is armed.

!!! danger "The local file is not a pre-warmed cache"

    It only contains what has been successfully read **at least once**. On a
    fresh machine, with the API down from the start, it is empty and `get_param`
    returns `None`. Offline mode survives an outage; it does not replace the
    first read.

## When a read fails

Every failure path converges on `_handle_api_error`, which tries TinyDB and
returns whatever is there — or `None`.

| Situation | Result |
|---|---|
| Parameter never read, API down | `None` |
| Parameter read before, API down | The last known value |
| Parameter deleted on the server | `404`, breaker armed, local value still returned |
| Wrong custody key | `None`, with an error in the log |

That third row has a practical consequence: **deleting a parameter on the server
does not immediately remove it from clients** that had already read it. They
keep returning the local value while the breaker is armed.

## Concurrency

The library is used from multiple threads and its state is guarded by three
distinct locks:

| Lock | Guards |
|---|---|
| `_lock_singleton` | The multiton instance dictionary |
| `_token_lock` | Token renewal — separate to avoid re-entrancy |
| `_state_lock` | Caches and error marks |

Reads take a snapshot under the lock and process outside it, so the lock is not
held during work that does not need it.

## A residual accepted on purpose

The client's compare-and-swap resolves a **timestamp tie in favour of writing**.
That is not an oversight: the cost asymmetry between writing again and losing a
write favours writing. It is documented at the point in the code and should not
be "fixed" on sight.
