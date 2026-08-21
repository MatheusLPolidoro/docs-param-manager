# Endpoints

Onze rotas em três grupos. A coluna **Acesso** usa três valores:

`leitura`
:   Resolvido por `get_read_user` — depende de
    [`READ_AUTH_MODE`](autenticacao.md#read_auth_mode). Anônimo em `off` e
    `warn`, exige token em `enforce`.

`token`
:   Exige token válido de qualquer papel.

`admin`
:   Exige papel de administrador.

## Resumo

| Método | Rota | Acesso | Sucesso |
|---|---|---|---|
| `POST` | `/auth/token` | aberto | `200` |
| `POST` | `/auth/refresh` | aberto | `200` |
| `GET` | `/auth/userinfo` | token | `200` |
| `POST` | `/parameters/apps/` | admin | **`201`** |
| `GET` | `/parameters/apps/` | leitura | `200` |
| `DELETE` | `/parameters/apps/{app_name}` | admin | `200` |
| `PUT` | `/parameters/apps/{app_name}/params/` | token | `200` |
| `GET` | `/parameters/apps/{app_name}/params/` | leitura | `200` |
| `GET` | `/parameters/apps/{app_name}/params/{param_name}` | leitura | `200` |
| `DELETE` | `/parameters/apps/{app_name}/params/{param_name}` | admin | `200` |
| `GET` | `/admin/read-auth-mode` | admin | `200` |
| `PUT` | `/admin/read-auth-mode` | admin | `200` |

!!! warning "`POST /parameters/apps/` devolve 201, e só ele"

    Todo o resto devolve `200`. O cliente compara o status exatamente, então
    essa assimetria é parte do contrato — ver
    [Compatibilidade](../produto/compatibilidade.md).

## Autenticação

### `POST /auth/token`

Corpo em **form**, não JSON:

```bash
curl -X POST http://localhost:8000/auth/token \
  -d "username=meu-usuario" \
  -d "password=minha-senha"
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

## Aplicações

### `POST /parameters/apps/` — cria aplicação

Acesso **admin**. Sucesso **`201`**.

```json
{
  "name": "MY_APP",
  "description": "Meu aplicativo para fazer..."
}
```

Resposta:

```json
{ "message": "...", "app": "MY_APP" }
```

### `GET /parameters/apps/` — lista aplicações

Acesso **leitura**.

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

### `DELETE /parameters/apps/{app_name}` — apaga aplicação

Acesso **admin**. Devolve `{ "message": "..." }`.

## Parâmetros

### `PUT /parameters/apps/{app_name}/params/` — grava parâmetros

Acesso **token** — mas o que o usuário comum pode de fato alterar depende de
`user_editable` e de
[`USER_EDITABLE_ENFORCEMENT`](autenticacao.md#user_editable_enforcement).

O corpo é um **mapa de nome para parâmetro**, o que permite gravar vários numa
requisição só:

```json
{
  "TIMEOUT_HTTP": {
    "value": 30,
    "type": "int",
    "description": "Timeout das chamadas externas, em segundos",
    "max_value": 300
  },
  "SENHA_BANCO": {
    "value": "s3nh4-real",
    "type": "secret"
  }
}
```

A resposta é o estado depois da gravação, com os metadados de auditoria:

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

!!! note "Segredo volta cifrado"

    Parâmetro `secret`, `user` ou `users` volta como **envelope**, nunca em
    claro. Quem decifra é o cliente. Ver
    [Envelope criptográfico](../seguranca/envelope.md).

### `GET /parameters/apps/{app_name}/params/` — lê todos

Acesso **leitura**. Mesmo formato de `ParamsResponse` acima.

### `GET /parameters/apps/{app_name}/params/{param_name}` — lê um

Acesso **leitura**.

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

Note que o envelope é `{"param": {...}}` — um nível a mais do que parece
necessário. É contrato: o cliente desempacota exatamente essa forma.

### `DELETE /parameters/apps/{app_name}/params/{param_name}` — apaga um

Acesso **admin**. Devolve `{ "message": "..." }`.

## Administração

### `GET /admin/read-auth-mode`

Acesso **admin**. Mostra o modo corrente e **de onde ele veio**:

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

`source` só assume `env` ou `database`. Quando é `database`, existe uma
sobrescrita gravada que vence o `.env`.

### `PUT /admin/read-auth-mode`

Acesso **admin**. Corpo:

```json
{ "mode": "enforce" }
```

`mode` é restrito a `off`, `warn` ou `enforce`; qualquer outro valor é rejeitado
pelo schema. A resposta tem o mesmo formato do `GET`, com `previous_mode`
preenchido.
