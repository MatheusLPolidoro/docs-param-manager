# Endpoints

Eleven routes in three groups. The **Access** column uses three values:

`read`
:   Resolved by `get_read_user` — depends on
    [`READ_AUTH_MODE`](autenticacao.md#read_auth_mode). Anonymous under `off`
    and `warn`, requires a token under `enforce`.

`token`
:   Requires a valid token of any role.

`admin`
:   Requires the admin role.

## Summary

| Method | Route | Access | Success |
|---|---|---|---|
| `POST` | `/auth/token` | open | `200` |
| `POST` | `/auth/refresh` | open | `200` |
| `GET` | `/auth/userinfo` | token | `200` |
| `POST` | `/parameters/apps/` | admin | **`201`** |
| `GET` | `/parameters/apps/` | read | `200` |
| `DELETE` | `/parameters/apps/{app_name}` | admin | `200` |
| `PUT` | `/parameters/apps/{app_name}/params/` | token | `200` |
| `GET` | `/parameters/apps/{app_name}/params/` | read | `200` |
| `GET` | `/parameters/apps/{app_name}/params/{param_name}` | read | `200` |
| `DELETE` | `/parameters/apps/{app_name}/params/{param_name}` | admin | `200` |
| `GET` | `/admin/read-auth-mode` | admin | `200` |
| `PUT` | `/admin/read-auth-mode` | admin | `200` |

!!! warning "`POST /parameters/apps/` returns 201, and it alone"

    Everything else returns `200`. The client compares the status exactly, so
    this asymmetry is part of the contract — see
    [Compatibility](../produto/compatibilidade.md).

## Authentication

### `POST /auth/token`

Form body, not JSON:

```bash
curl -X POST http://localhost:8000/auth/token \
  -d "username=my-user" \
  -d "password=my-password"
```

### `POST /auth/refresh`

```bash
curl -X POST http://localhost:8000/auth/refresh \
  -d "refresh_token=<token>"
```

### `GET /auth/userinfo`

```bash
curl http://localhost:8000/auth/userinfo \
  -H "Authorization: Bearer <token>"
```

## Applications

### `POST /parameters/apps/` — create an application

Access **admin**. Success **`201`**.

```json
{
  "name": "MY_APP",
  "description": "My application for doing..."
}
```

Response:

```json
{ "message": "...", "app": "MY_APP" }
```

### `GET /parameters/apps/` — list applications

Access **read**.

```json
{
  "apps": [
    {
      "name": "MY_APP",
      "description": "...",
      "total": 12,
      "created_at": "2026-01-15T10:30:00",
      "created_by": "matheus",
      "status": true
    }
  ]
}
```

### `DELETE /parameters/apps/{app_name}` — delete an application

Access **admin**. Returns `{ "message": "..." }`.

## Parameters

### `PUT /parameters/apps/{app_name}/params/` — write parameters

Access **token** — but what a plain user can actually change depends on
`user_editable` and on
[`USER_EDITABLE_ENFORCEMENT`](autenticacao.md#user_editable_enforcement).

The body is a **map from name to parameter**, which lets you write several in a
single request:

```json
{
  "TIMEOUT_HTTP": {
    "value": 30,
    "type": "int",
    "description": "Timeout for outbound calls, in seconds",
    "max_value": 300
  },
  "DB_PASSWORD": {
    "value": "r3al-p4ssw0rd",
    "type": "secret"
  }
}
```

The response is the state after the write, with audit metadata:

```json
{
  "app": "MY_APP",
  "params": {
    "TIMEOUT_HTTP": {
      "value": 30,
      "type": "int",
      "description": "...",
      "user_editable": false,
      "min_length": 0,
      "max_length": 30,
      "min_value": 0,
      "max_value": 300,
      "referenced_params": null,
      "created_at": "2026-01-15T10:30:00",
      "created_by": "matheus",
      "updated_at": null,
      "updated_by": null
    }
  }
}
```

!!! note "A secret comes back encrypted"

    A `secret`, `user` or `users` parameter comes back as an **envelope**, never
    in the clear. The client is what decrypts it. See
    [Cryptographic envelope](../seguranca/envelope.md).

### `GET /parameters/apps/{app_name}/params/` — read all

Access **read**. Same `ParamsResponse` shape as above.

### `GET /parameters/apps/{app_name}/params/{param_name}` — read one

Access **read**.

```json
{
  "param": {
    "value": 30,
    "type": "int",
    "created_at": "2026-01-15T10:30:00",
    "created_by": "matheus",
    "updated_at": null,
    "updated_by": null
  }
}
```

Note the wrapper is `{"param": {...}}` — one level more than seems necessary.
That is contract: the client unwraps exactly that shape.

### `DELETE /parameters/apps/{app_name}/params/{param_name}` — delete one

Access **admin**. Returns `{ "message": "..." }`.

## Administration

### `GET /admin/read-auth-mode`

Access **admin**. Shows the current mode and **where it came from**:

```json
{
  "mode": "warn",
  "source": "database",
  "env_default": "off",
  "updated_at": "2026-02-01T09:00:00",
  "updated_by": "matheus",
  "previous_mode": "off"
}
```

`source` is only ever `env` or `database`. When it is `database`, a stored
override is winning over `.env`.

### `PUT /admin/read-auth-mode`

Access **admin**. Body:

```json
{ "mode": "enforce" }
```

`mode` is restricted to `off`, `warn` or `enforce`; any other value is rejected
by the schema. The response has the same shape as the `GET`, with
`previous_mode` filled in.
