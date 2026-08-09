# Cryptographic envelope

Parameters of type `secret`, `user` and `users` are never stored in the clear.
They are kept in a two-layer **envelope**.

!!! danger "This format is a frozen contract"

    The server encrypts in `security/crypto_utils.py`; the client decrypts in
    `ParamManager._descriptografar_param`. These are **two duplicated
    implementations, in repositories released on different dates**.

    Changing one side alone fails silently: the client merely logs an error and
    returns `None`. There is no exception, no alarm, and the value simply
    becomes `None` in the consuming application.

## The format

```json
{
  "salt": "<hex>",
  "master_key":  { "iv": "<hex>", "tag": "<hex>", "data": "<hex>" },
  "crypto_data": { "iv": "<hex>", "tag": "<hex>", "data": "<hex>" }
}
```

Two layers:

1. A **custody key**, derived from the application secret, protects the
   `master_key`.
2. The `master_key` protects the real data, in `crypto_data`.

## The frozen parameters

Changing any of these invalidates **every secret already stored** and **every
client already published to PyPI**:

| Item | Value |
|---|---|
| Derivation | `PBKDF2(custody_key, salt, dkLen=32, count=100_000, hmac_hash_module=SHA256)` |
| Cipher | AES-GCM |
| IV | 12 bytes, random |
| Authentication | The GCM `tag` |
| Serialization | Everything hex |

## The custody key

| Side | Variable | Default |
|---|---|---|
| Server | `APP_CUSTODY_KEY`, through `settings` | `dev-chave-custodia-app` |
| Client | `CHAVE_CUSTODIA_APP` **or** `APP_CUSTODY_KEY` | *(none)* |

!!! warning "The development default is not a secret"

    `dev-chave-custodia-app` is in public source code. An environment brought up
    without changing `APP_CUSTODY_KEY` has its secrets encrypted with a key
    anyone knows — which is equivalent to not encrypting them.

## The legacy tolerance

The client's parser accepts the key `dado` as a synonym for `data`, inherited
from an earlier format.

**Keep that fallback** when touching the parser. Removing it breaks any value
written before the rename, which is still in the database and has no migration.

## The round trip

The envelope comes back to the server whenever a client reads and rewrites a
parameter. That is why the validators accept both forms:

- `secret` accepts a `str` (plaintext going in) **or** a `dict` (the envelope
  coming back). For the `dict` case it checks that `salt`, `master_key` and
  `crypto_data` are all present.
- On the `user` type, the `password` field accepts `str` **or** `dict` for the
  same reason.

Rejecting the `dict` would look stricter and would break the round trip.

## Where TLS comes in

The plaintext **travels over the network** on write: the server is what
encrypts, not the client. Without HTTPS the secret is exposed in transit, and
the envelope only protects what is at rest in the database.

Add to that the client's partial `verify_ssl` scope — which governs reads only —
and the practical conclusion is one: **use HTTPS with a valid chain**. See
[Client configuration](../cliente/configuracao.md#verify_ssl-has-partial-scope).

## Known and deliberate limitation

In the `users` branch of `AppService._encrypt_value`, **a single salt and a
single `master_key` serve every user in the parameter**, and the same
`encrypted_master_key` dictionary is aliased into all the envelopes.

This is known and out of scope by explicit decision: there is an in-progress
design for finer granularity, with **one master key per parameter**. Do not
"fix" it piecemeal — the change has to be designed as a whole, together with the
migration of data already stored.

## Audit already applied

The `security/crypto_utils.py` module went through a dedicated review and the
findings were applied: the module-level salt, the `config.json` that was written
to the working directory, and the dead `store_credentials` / `recover_password`
pair that used them are all gone.

## If decryption fails

The symptom is always the same — `None` instead of the value, and an error in
the log. The likely causes, in order:

1. A different custody key between client and server.
2. An incomplete envelope, from a write made by hand outside the API.
3. Client and server versions with divergent envelope implementations — which
   only happens if the contract was changed on one side alone.

Start with the first: it is by far the most common.
