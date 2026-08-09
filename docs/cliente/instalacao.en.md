# Installation

```bash
pip install param-manager
```

## Requirements

- **Python 3.10 through 3.14.** The floor is a security decision — see
  [Client overview](index.md#python-versions).
- Network access to the API, at least for the first read of each parameter.
  Without one successful read there is nothing to fall back to: the local file
  starts empty.

## What comes with it

| Dependency | For what |
|---|---|
| `requests` | The HTTP calls |
| `tinydb` | The local survival copy |
| `pycryptodome` | Decryption of sensitive parameters |
| `python-dotenv` | Reading `.env` |

## Verifying

```python
import param_manager

print(param_manager.__version__)   # 0.4.3
```

## Development environment

For anyone working on the library itself:

```powershell
cd param-manager
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
```

Commands:

```
task test              # runs `task fix` first, then pytest with coverage
task test_unit         # unit only
task test_integracao   # only what writes to a real TinyDB
task lint
task format
```

!!! danger "`task test` rewrites your code before testing"

    `param-manager`'s `pre_test` is `task fix`, which runs
    `ruff check . --fix`. That is: the source is modified before the suite runs.
    **Review the diff** before calling the task done — changes you did not write
    may have come along.

!!! note "Install ruff at the pinned version"

    `ruff==0.11.7` in this project. Newer versions bring `preview` rules that
    flag violations the code does not have — a false positive that has already
    cost a wrong diagnosis.

### Why the integration suite exists

Because the mocks lie, in specific and known places. The most expensive one: a
mocked `table.get()` returns **the same object** on every call — an aliasing the
real TinyDB does not have, and which has already hidden a persistence bug with
the whole suite green.

When you do need a mock anyway:

```python
mock_table.get.side_effect = lambda *a, **k: copy.deepcopy(...)
```

Concurrency tests use an injected barrier or a `side_effect` that mutates state
mid-iteration — **never `sleep` and hope**. `faulthandler_timeout = 60` is
configured, so a test that hangs dumps every thread's stack instead of pinning
the runner.
