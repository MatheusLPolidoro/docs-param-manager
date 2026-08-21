# Authentication and authorization

## How the token is validated

Identity comes from Keycloak. The `middlewares/keycloak_auth.py` middleware
validates the JWT with `PyJWKClient` and `algorithms=['RS256']` — that is, it
fetches the realm's public key and verifies the signature. The server issues no
token of its own; it only checks what Keycloak signed.

Three dependencies come out of that, and the names matter because the test suite
overrides them one by one:

`get_current_user`
:   Requires a valid token. Fails with `401` if there is none.

`get_current_user_optional`
:   Resolves the user if a token is present; returns `None` instead of failing.

`require_admin`
:   Requires a valid token **and** the admin role.

## The roles

There are two, and the difference between them is narrow and precise:

**admin**
:   Can do everything: create and delete applications, create and delete
    parameters, change any field of any parameter, and change runtime
    configuration.

**user**
:   Can change **only the `value` field** of parameters flagged
    `user_editable=True`. Anything else is `403`.

What enforces this is `AppService._validate_permission`, which **diffs the
restricted metadata fields**. The question it answers is not "did the user touch
the value?" but "did the user touch anything beyond the value?".

## `READ_AUTH_MODE`

Out of the box, **reading a parameter is anonymous**. That is not an oversight:
it is the historical behaviour, and the server does not negotiate client
versions — tightening the control overnight would take down every fleet member
that does not yet send a token.

The mode is resolved by `RuntimeConfigService`, which gives precedence to the
value stored in the database (changeable by an admin **without a redeploy**) and
falls back to `.env` when there is no override.

| Mode | What it does |
|---|---|
| `off` | Historical behaviour. Anonymous reads allowed, with no resolution cost |
| `warn` | Still allows them, but **counts and logs** every read without a token |
| `enforce` | Requires a token. Without one, `401` |

### The promotion criterion

`warn` exists to produce a measurement, not to warn a person. It feeds the
anonymous-read metric.

!!! tip "Only promote to `enforce` with the metric at zero"

    While `anonymous_reads_total` is not zero in the environment, there is a
    consumer without a token — and turning `enforce` on will take it down.

### An invalid token does not count as an anonymous read

A subtlety that looks like a detail and is not. Under `warn`, a request arriving
**with** an `Authorization` header that does not resolve — expired token, wrong
audience — is recorded as an **authentication failure**, not as an anonymous
read.

If the two were counted together, a fleet with a momentarily expired token would
keep the anonymous counter above zero forever, and the gate could never be
promoted. The very signal that decides promotion would be corrupted by noise.

## `USER_EDITABLE_ENFORCEMENT`

The same two-stage switch pattern, applied to write authorization.

`legacy` (default)
:   The diff is computed against the whole payload, **with schema defaults
    filled in**. Consequence: a plain user gets `403` even when editing a
    `user_editable` parameter, because the defaults enter the diff as if they
    were deliberate changes.

`explicit`
:   The diff considers only the fields the client actually sent, and preserves
    already stored metadata. This is the behaviour you want.

Promotion depends on adoption of client **0.4.3**, which started omitting
`user_editable` from the payload when the caller does not supply it. Version
0.4.2 sends `user_editable=False` explicitly — under `explicit`, that becomes an
attempt to change metadata and goes back to `403`.

## Authentication routes

| Route | Body | Returns |
|---|---|---|
| `POST /auth/token` | `username` and `password` as **form** fields | The Keycloak token |
| `POST /auth/refresh` | `refresh_token` as a **form** field | A refreshed token |
| `GET /auth/userinfo` | — (token in the header) | Data about the authenticated user |

The first two use `application/x-www-form-urlencoded`, not JSON.

## What is frozen in the OpenAPI document

`tests/test_openapi_contrato.py` freezes `securitySchemes` and the per-route
`security` block. It is what turns "the published schema did not change" from an
argument into a check. **Do not delete that test when touching authentication
dependencies** — it is the only automated barrier that exists in this area.

## A secret that reaches the history

!!! danger "Deleting the file does not delete the commit"

    A Keycloak `client_secret`, a database password or an encrypted envelope
    that lands in a commit stays reachable by anyone holding the repository,
    even after the file disappears from the working tree. `git log` keeps the
    content, not the final state.

    **What ends the exposure is rotating the secret at its source** — in
    Keycloak, in the database, wherever it is issued. Rewriting history does
    not replace that: in an already distributed repository, `filter-repo`
    invalidates every clone and recovers nothing that has already been read.

    That is why the pipeline's secret scan runs over the **whole history**,
    not over the commit diff: what is already in has to be found where it is.
