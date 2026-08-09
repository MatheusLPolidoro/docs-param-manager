# Glossary

The terms below have a precise meaning in this product. Where common usage
differs, that is stated.

Application (*app*)
:   The grouping unit for parameters. In MongoDB it is a document; in the API it
    is everything after `/parameters/apps/`. Identified by its name, which is
    unique. Unrelated to "application" in the sense of a running process —
    several processes can read the same application.

Parameter
:   A named entry inside an application. It has a `value`, a `type` and a set of
    metadata: `description`, `user_editable`, length and value bounds, and the
    list of allowed references.

Parameter type (`ParamType`)
:   One of the fifteen enum values that decides which validator runs over the
    `value`. See [Parameter types](../api/tipos-de-parametro.md).

Envelope
:   The structure a sensitive value is stored in: `salt`, `master_key` and
    `crypto_data`. It never contains the plaintext. See
    [Cryptographic envelope](../seguranca/envelope.md).

Custody key
:   The application secret from which the key protecting the `master_key` is
    derived. On the server it comes from `APP_CUSTODY_KEY`; on the client, from
    `CHAVE_CUSTODIA_APP` or `APP_CUSTODY_KEY`.

Multiton
:   The `ParamManager` pattern: not a single global instance, but **one instance
    per `instance_name`**. Two instances with different names have independent
    configuration, cache and local file. The library's older documentation calls
    this a *singleton* — it is wrong.

Instance (`instance_name`)
:   The name identifying one client configuration. It acts as the multiton key,
    as the environment variable prefix, and as the directory and file name of
    the TinyDB.

Parameter cache
:   Fine-grained cache, keyed by `app:param`. The first step of read resolution.

Application cache
:   Cache of an application's entire parameter map, filled by `get_all_params`.
    The second step: a hit here promotes the value into the parameter cache.

Circuit breaker (*cooldown*)
:   The window during which the client stops trying the network after an error.
    Armed by timeout, connection error, a handled 404, or any unexpected
    failure; disarmed by a successful request or by an explicit `clear_cache`.

Local fallback
:   Reading from TinyDB when the API is unavailable. It only returns what has
    been successfully read at least once.

`params_version`
:   A per-application counter used to detect concurrent writes on the server.
    **It is not version history** and does not allow returning to a previous
    state.

`READ_AUTH_MODE`
:   Runtime setting that decides whether reading a parameter requires a token:
    `off`, `warn` or `enforce`. See
    [Authentication](../api/autenticacao.md).

`user_editable`
:   A flag on a parameter authorizing a plain user to change **only** the
    `value` field. Any metadata change still requires an admin.

`integracao` marker
:   A pytest marker for whatever talks to a real resource — a real Mongo on the
    server, a real TinyDB file on the client. It exists because the mocks lie in
    specific, documented places.
