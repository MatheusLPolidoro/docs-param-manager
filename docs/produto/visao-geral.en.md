# Overview

## The problem

Configuration scattered across a `.env` file per machine has three defects that
only show up once the system grows: nobody knows the current value in
production, changing a value requires a deploy, and plaintext passwords end up
in backups, in logs and in git history.

Centralizing it in a service fixes all three — and creates a fourth: now the
application won't start if the configuration service is down. Param Manager is
designed around that trade. **The client never depends on the API being up at
the moment it reads.**

## The two artifacts

| | `fast-param-manager` | `param-manager` |
|---|---|---|
| What it is | HTTP API | Python library |
| Where it runs | A server, in a container | Inside your application |
| Distribution | Image / your own deploy | PyPI — `pip install param-manager` |
| Stores in | MongoDB | Local TinyDB, as a survival copy |
| Version | `2.0.0` | `0.4.3` |

They are **versioned and released independently**. There is no atomic deploy of
both: there is always a window where an old client talks to a new server. That
is the constraint that shapes the product the most, and it has its own page —
[Compatibility](compatibilidade.md).

There is also a planned third directory, `front-param-manager`, currently
**empty**. Not a line of code exists, and nothing in this documentation depends
on it.

## What the API does

- **Stores parameters grouped by application.** An application is a document in
  Mongo; the parameters are a map inside it.
- **Validates each value against its type.** Fifteen types, from `string` to
  `users`, each with its own validator — including a compilable regex, a date in
  a fixed format, and a reference to another parameter that must exist.
- **Encrypts what is sensitive.** Types `secret`, `user` and `users` are never
  written in the clear.
- **Decides who writes what.** An admin does everything; a plain user only
  changes the `value` field of parameters flagged as editable.
- **Reports on itself.** Every controller, service and repository opens an
  OpenTelemetry span and records metrics.

## What the client does

- **Resolves a parameter cheapest-path-first:** parameter cache, application
  cache, and only then the network.
- **Stops hammering a sick server.** A network or HTTP error arms a circuit
  breaker with a configurable window.
- **Survives the API being down.** Every parameter successfully read is written
  to a local TinyDB, which becomes the source when the network fails.
- **Decrypts secrets** with the application custody key, without the caller
  needing to know encryption was involved.
- **Isolates instances.** `ParamManager` is a *multiton*: one instance per name,
  each with its own configuration, cache and local file.

## What the product deliberately does not do

Worth knowing what **not** to look for here:

- **It does not negotiate client versions.** The server does not know who it is
  talking to and does not change behaviour because of it.
- **It does not push changes in real time.** There is no push, no websocket, no
  remote cache invalidation. A changed value reaches a client when that client's
  cache expires.
- **It does not protect reads by default.** Out of the box, reading a parameter
  is anonymous. That is configurable at runtime, and the
  [authentication page](../api/autenticacao.md) explains why the default is what
  it is and how to move away from it safely.
- **It does not version a parameter's value.** There is a version counter per
  application, used to detect concurrent writes — it is not history, and there
  is no rolling back.
