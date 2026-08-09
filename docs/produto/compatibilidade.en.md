# Compatibility

This is the most important page on the site for anyone about to **change**
something.

The client and the API are published separately. The client lives on PyPI, is
installed by third parties and updated whenever they feel like it — possibly
never. The server never asks who it is talking to. From that follows one rule
with **three faces**, and satisfying one is not satisfying the rule.

## 1. The HTTP contract

Nothing may:

- reject a payload that is accepted today;
- change the shape of a success response;
- introduce a new status code on an existing route;
- drop a metric label that some dashboard consumes;
- change the security scheme published in the OpenAPI document.

## 2. Clients already in production

The client compares the status **exactly**:

```python
if res.status_code != HTTPStatus.OK:
    raise Exception(...)
```

That has a consequence which usually catches people by surprise: **returning
`201` where `200` used to come back breaks the fleet**, even though `201` is
"more correct". A success change is still a break.

!!! danger "The practical corollary"

    No response change is safe merely because the semantics improved. The right
    question is not "is this response more correct?" but "can a client of any
    already-published version tell the difference?".

## 3. Data already stored

A parameter already saved must keep decrypting and keep being writable.

- The cryptographic envelope is a frozen contract between two artifacts released
  on different dates — see
  [Cryptographic envelope](../seguranca/envelope.md).
- A document written before a new field existed **must not start erroring**. In
  Mongo a filter on `null` matches a missing field, and that is what makes lazy
  migration possible, with no migration script.

## What is not contract

A path that today ends in an unhandled exception or a silent failure **is not
contract**. Nobody can depend on a process that dies. Fixing a crash does not
break compatibility, even if it changes what the client observes.

## None of this is enforced by CI

Worth saying plainly: **no automated test guarantees anything on this page.**

What exists is `tests/test_openapi_contrato.py`, which freezes only
`securitySchemes` and the per-route `security` block. It does not freeze the
routes themselves, nor the methods, nor the success statuses, nor the response
shapes. And no job crosses the two repositories.

The rule is held up by review, not by a test. It matters most right before a
coordinated release of both sides.

## Release order

When a change has to happen on both sides, the order is always the same:

1. **Server first, inert.** Every observable behaviour change goes behind a
   setting whose default **reproduces the current state**. The new server
   behaves exactly like the old one.
2. **Client next.** Published to PyPI, adopted at the pace of whoever consumes
   it.
3. **The switch last**, once telemetry shows there are no old clients left — and
   only then.

Two real examples of this pattern are documented:
[`READ_AUTH_MODE`](../api/autenticacao.md#read_auth_mode) and
[`USER_EDITABLE_ENFORCEMENT`](../api/autenticacao.md#user_editable_enforcement).
In both cases the default is the historical behaviour, and promotion depends on
a measurement, not on a date.
