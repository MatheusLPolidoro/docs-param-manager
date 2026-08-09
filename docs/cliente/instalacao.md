# Instalação

```bash
pip install param-manager
```

## Requisitos

- **Python 3.10 a 3.14.** O piso é por segurança — ver
  [Visão geral do cliente](index.md#versoes-de-python).
- Acesso de rede à API, ao menos na primeira leitura de cada parâmetro. Sem uma
  leitura bem-sucedida não há o que cair de volta: o arquivo local começa vazio.

## O que vem junto

| Dependência | Para quê |
|---|---|
| `requests` | As chamadas HTTP |
| `tinydb` | A cópia local de sobrevivência |
| `pycryptodome` | Decifragem dos parâmetros sensíveis |
| `python-dotenv` | Leitura do `.env` |

## Verificando

```python
import param_manager

print(param_manager.__version__)   # 0.4.3
```

## Ambiente de desenvolvimento

Quem for mexer na própria biblioteca:

```powershell
cd param-manager
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
```

Comandos:

```
task test              # roda `task fix` antes, depois pytest com cobertura
task test_unit         # só unitário
task test_integracao   # só o que escreve em TinyDB real
task lint
task format
```

!!! danger "`task test` reescreve o seu código antes de testar"

    O `pre_test` do `param-manager` é `task fix`, que roda `ruff check . --fix`.
    Ou seja: o fonte é modificado antes da suíte rodar. **Revise o diff** antes
    de considerar a tarefa pronta — mudanças que você não escreveu podem ter
    entrado junto.

!!! note "Instale o ruff na versão fixada"

    `ruff==0.11.7` neste projeto. Versões mais novas trazem regras de `preview`
    que acusam violações que o código não tem — falso positivo que já custou
    diagnóstico errado.

### Por que a suíte de integração existe

Porque os mocks mentem, em pontos específicos e conhecidos. O mais caro: o
`table.get()` mockado devolve **o mesmo objeto** em toda chamada — um
aliasing que o TinyDB real não tem, e que já escondeu um bug de persistência
com a suíte inteira verde.

Quando precisar de mock mesmo assim:

```python
mock_table.get.side_effect = lambda *a, **k: copy.deepcopy(...)
```

Testes de concorrência usam barreira injetada ou `side_effect` que muda estado
no meio da iteração — **nunca `sleep` e torcida**. `faulthandler_timeout = 60`
está configurado, então um teste que travar dumpa a pilha de todas as threads em
vez de pendurar o runner.
