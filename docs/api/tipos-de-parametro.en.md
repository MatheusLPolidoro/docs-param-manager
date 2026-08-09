# Parameter types

The type decides which validator runs over the `value`. It all lives in
`models/parameter.py`: the `ParamType` enum and the `VALIDATORS` dictionary that
maps each member to its function.

!!! tip "How to add a type"

    A new member in `ParamType` and a new entry in `VALIDATORS`. Nothing else.
    **Do not scatter per-type `if` branches through the services** — the
    dictionary exists precisely so validation stays in one place.

## The fifteen types

| Type | Accepts | Note |
|---|---|---|
| `string` | `str` | |
| `int` | `int` | |
| `float` | `float` or `int` | `int` is accepted and preserved |
| `bool` | `bool` | |
| `list` | `list` | |
| `dict` | `dict` | |
| `json` | `str`, `dict` or `list` | A string is **parsed**; what gets stored is the object |
| `pattern` | `str` that compiles as a regex | Validated with `re.compile` |
| `reference` | `list[str]` | Each item must exist in `referenced_params` |
| `date` | `str` as `YYYY-MM-DD` | |
| `datetime` | `str` as `YYYY-MM-DD HH:MM:SS` | |
| `time` | `str` in ISO time format | Validated with `time.fromisoformat` |
| `secret` | `str` or envelope | **Encrypted on write** |
| `user` | `dict` with a fixed shape | **Encrypted on write** |
| `users` | `list` of `user` | **Encrypted on write** |

## The types that need attention

### `json` converts

If you send a string, what gets stored is the **parsed object**, not the string.
Reading it back returns a `dict` or a `list`. An invalid string is a validation
error.

### `pattern` only validates that it compiles

The validator checks that the regex compiles — not that it matches anything. A
syntactically valid, semantically wrong regex passes.

### `reference` needs the list alongside

The `reference` validator does not query the database: it checks against the
`referenced_params` field **of the parameter itself**. Sending `reference`
without `referenced_params` makes every reference fail, because the set of
allowed names is empty.

```json
{
  "DEPENDENCIES": {
    "value": ["TIMEOUT_HTTP", "BASE_URL"],
    "type": "reference",
    "referenced_params": ["TIMEOUT_HTTP", "BASE_URL", "RETRIES"]
  }
}
```

### `user` has a mandatory shape

Four fields, all required, with checked types:

| Field | Type |
|---|---|
| `user_id` | `str` |
| `user` | `str` |
| `password` | `dict` **or** `str` |
| `status` | `bool` |

`password` accepting a `dict` is not sloppiness: it is the encrypted envelope
coming back on a round trip. The client reads the parameter, receives `password`
already as an envelope, and hands the envelope back on rewrite. Rejecting
`dict` would break that round trip.

`users` is a list of `user`, and every item goes through the same validator.

### `secret` accepts both sides of the round trip

`str` is the plaintext going in. `dict` is the envelope coming back — and in
that case the validator checks that `salt`, `master_key` and `crypto_data` are
all present, naming whichever are missing. Anything else is rejected.

## Limits

Every parameter carries four bounds, and **they have defaults**:

| Field | Default | Applies to |
|---|---|---|
| `min_length` | `0` | `str` and `list` |
| `max_length` | **`30`** | `str` and `list` |
| `min_value` | `0` | `int` and `float` |
| `max_value` | `1000000` | `int` and `float` |

!!! danger "Two defaults that reject legitimate values nobody asked them to"

    **`max_length` is 30.** A connection string, a long URL or a token clears
    that easily and gets rejected with "Tamanho máximo excedido (30)".

    **`min_value` is 0.** Any negative number is rejected with "Valor mínimo não
    atingido (0)".

    In both cases the message is clear, but the cause does not look like a
    default — it looks like a bug. When storing a long string or a negative
    number, **send the bounds explicitly**.

Length checks run over `str` and `list` — which includes a `reference`'s list
and the result of a `json` that turned into a list.

## Validation order

1. The type validator runs first and **may replace the value** (that is the case
   for `json`, which swaps the string for the object).
2. Then the length bounds, over the **already converted** value.
3. Finally the numeric bounds.

The consequence: a `json` arriving as a string that becomes a 40-item list is
blocked by the `max_length` of 30, even though the original string passed.
