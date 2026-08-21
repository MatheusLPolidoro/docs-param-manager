# Packaging

The library has explicit PyInstaller support. That matters because two things it
does — reading a `.env` and writing a local file — change location once the
application becomes an executable.

## How it detects being frozen

```python
if getattr(sys, 'frozen', False):
    base_dir = sys._MEIPASS
    dotenv_path = os.path.join(base_dir, '.env')
else:
    base_dir = None
    dotenv_path = find_dotenv()
```

`sys.frozen` is the marker PyInstaller leaves; `sys._MEIPASS` is the temporary
directory it extracts resources into.

## Consequence for `.env`

Once frozen, the library looks for `.env` **inside the bundle**, not next to the
executable. It has to be embedded:

```
pyinstaller --onefile --add-data ".env;." my_app.py
```

On Linux and macOS the separator is `:` instead of `;`.

!!! warning "An embedded `.env` travels with the binary"

    Any secret inside it ships in the executable and can be extracted by whoever
    has it. For real credentials, prefer system environment variables — which
    are still read normally — over embedding.

## Consequence for the local file

When frozen and without an explicit `local_db_path`, the TinyDB base becomes
`sys._MEIPASS`.

!!! danger "`sys._MEIPASS` is deleted when the process exits"

    Under `--onefile`, that directory is temporary. The local file is created,
    used, and **disappears at the end of the run** — and with it the whole
    offline mode: the next run starts with no survival copy at all.

    Pass a persistent path:

    ```python
    import os

    pm = ParamManager.get_instance(
        local_db_path=os.path.join(
            os.environ['LOCALAPPDATA'], 'MyApp'
        )
    )
    ```

    Or set `LOCAL_DB_PATH` in the environment. The resolution order gives the
    argument precedence over the frozen directory.

Under `--onedir` the directory survives between runs, but it still sits inside
the installation folder — which is usually inappropriate in a
write-protected directory. The explicit-path recommendation holds in both modes.

## Checklist

- [ ] `.env` embedded with `--add-data`, or configuration coming from the
      environment
- [ ] `local_db_path` or `LOCAL_DB_PATH` pointing at a persistent, writable
      directory
- [ ] `CHAVE_CUSTODIA_APP` available at runtime, if there is any sensitive
      parameter
- [ ] The environment's certificate chain installed, if `verify_ssl=True` — or
      awareness that authentication **always** verifies TLS, even with
      `verify_ssl=False` (see
      [Configuration](configuracao.md#verify_ssl-has-partial-scope))

## Why the library is a single module

`param_manager/manager.py` holds everything. That is deliberate: every extra
file is another chance for the packager not to find something, and dynamic
imports are exactly what PyInstaller's static analysers cannot see.
