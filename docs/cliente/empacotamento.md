# Empacotamento

A biblioteca tem suporte explícito a PyInstaller. Isso importa porque duas
coisas que ela faz — ler um `.env` e escrever um arquivo local — mudam de lugar
quando a aplicação vira um executável.

## Como ela detecta que está congelada

```python
if getattr(sys, 'frozen', False):
    base_dir = sys._MEIPASS
    dotenv_path = os.path.join(base_dir, '.env')
else:
    base_dir = None
    dotenv_path = find_dotenv()
```

`sys.frozen` é a marca que o PyInstaller deixa; `sys._MEIPASS` é o diretório
temporário onde ele extrai os recursos.

## Consequência para o `.env`

Congelada, a biblioteca procura o `.env` **dentro do bundle**, não ao lado do
executável. Ele precisa ser embarcado:

```
pyinstaller --onefile --add-data ".env;." meu_app.py
```

No Linux e no macOS o separador é `:` em vez de `;`.

!!! warning "O `.env` embarcado vai junto com o binário"

    Qualquer segredo dentro dele viaja no executável e pode ser extraído por
    quem o tiver. Para credenciais reais, prefira variáveis de ambiente do
    sistema — que continuam sendo lidas normalmente — em vez de embarcar.

## Consequência para o arquivo local

Quando congelada e sem `local_db_path` explícito, a base do TinyDB passa a ser
`sys._MEIPASS`.

!!! danger "`sys._MEIPASS` é apagado quando o processo termina"

    Em `--onefile`, esse diretório é temporário. O arquivo local é criado, usado
    e **desaparece no fim da execução** — e com ele todo o modo offline: a
    execução seguinte começa sem nenhuma cópia de sobrevivência.

    Passe um caminho persistente:

    ```python
    import os

    pm = ParamManager.get_instance(
        local_db_path=os.path.join(
            os.environ['LOCALAPPDATA'], 'MinhaApp'
        )
    )
    ```

    Ou defina `LOCAL_DB_PATH` no ambiente. A ordem de resolução dá precedência
    ao argumento sobre o diretório congelado.

Em `--onedir` o diretório sobrevive entre execuções, mas ainda fica dentro da
pasta de instalação — o que costuma ser inadequado num diretório protegido por
permissão de escrita. A recomendação de caminho explícito vale nos dois modos.

## Lista de verificação

- [ ] `.env` embarcado com `--add-data`, ou configuração vinda do ambiente
- [ ] `local_db_path` ou `LOCAL_DB_PATH` apontando para diretório persistente e
      gravável
- [ ] `CHAVE_CUSTODIA_APP` disponível em runtime, se houver parâmetro sensível
- [ ] Cadeia de certificados do ambiente instalada, se `verify_ssl=True` — ou
      ciência de que a autenticação **sempre** verifica TLS, mesmo com
      `verify_ssl=False` (ver [Configuração](configuracao.md#verify_ssl-tem-escopo-parcial))

## Por que a biblioteca é um módulo só

`param_manager/manager.py` concentra tudo. Isso é deliberado: cada arquivo a
mais é uma chance a mais de o empacotador não encontrar algo, e importação
dinâmica é justamente o que os analisadores estáticos do PyInstaller não veem.
