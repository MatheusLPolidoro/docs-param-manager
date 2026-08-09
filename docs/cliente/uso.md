# Uso

## Obtendo uma instância

```python
from param_manager import ParamManager

pm = ParamManager.get_instance()
```

Com configuração explícita:

```python
pm = ParamManager.get_instance(
    instance_name='producao',
    api_url='https://parametros.exemplo.com',
    cache_duration=600,
    timeout=10,
    verify_ssl=True,
    api_error_cooldown=60,
)
```

Assinatura completa do construtor:

```python
ParamManager(
    api_url: str | None = None,
    cache_duration: int = 300,
    timeout: int = 5,
    local_db_path: str | None = None,
    username: str | None = None,
    password: str | None = None,
    instance_name: str = 'default',
    verify_ssl: bool | None = None,
    api_error_cooldown: int | None = None,
)
```

`get_instance` aceita os mesmos argumentos, **mas com `cache_duration=3600`** —
ver [Configuração](configuracao.md#cache-e-resiliencia).

## Leitura

### Um parâmetro

```python
timeout = pm.get_param('MEU_APP', 'TIMEOUT_HTTP')
```

Devolve o valor já pronto para uso: convertido pelo tipo e, se for sensível, já
decifrado. O chamador não vê envelope.

O terceiro argumento, `save_cache`, controla se o resultado alimenta o cache.
Use `save_cache=False` para uma leitura pontual que não deve influenciar as
próximas.

!!! warning "Ausência devolve `None`, não exceção"

    Quando o parâmetro não existe, quando a API está fora e não há cópia local,
    ou quando a decifragem falha, `get_param` devolve **`None`**. Os três casos
    são indistinguíveis no valor de retorno — a diferença aparece só no log.

    Se `None` for um valor legítimo no seu domínio, você não consegue
    diferenciar. Use um sentinela próprio:

    ```python
    AUSENTE = object()
    valor = pm.get_param('MEU_APP', 'X')
    if valor is None:
        valor = AUSENTE
    ```

### Todos de uma vez

```python
params = pm.get_all_params('MEU_APP')
```

Devolve um dicionário de nome para valor. Além de ser uma requisição só, isso
preenche o **cache global do app**, e as leituras individuais seguintes acertam
nele sem tocar a rede.

## Escrita

Toda escrita vai à rede, exige token e ignora cache.

### Criar aplicação

```python
pm.create_app('MEU_APP', 'Serviço de relatórios')
```

Espera `201` do servidor. Qualquer outro status vira exceção.

### Gravar parâmetro

```python
pm.upsert_params(
    'MEU_APP',
    'TIMEOUT_HTTP',
    value=30,
    param_type='int',
    description='Timeout das chamadas externas',
    max_value=300,
)
```

Assinatura:

```python
upsert_params(
    app_name: str,
    param_name: str,
    *,
    value: Any,
    param_type: str,
    description: str | None = None,
    user_editable: bool | None = None,
    min_length: int | None = None,
    max_length: int | None = None,
    min_value: int | float | None = None,
    max_value: int | float | None = None,
    referenced_params: list[str] | None = None,
)
```

Tudo depois de `app_name` e `param_name` é **keyword-only**.

!!! note "`user_editable=None` é diferente de `False`"

    O default é `None`, e nesse caso a chave é **omitida do payload**. É isso
    que permite ao servidor distinguir "não enviei" de "enviei como `False`" —
    a distinção de que depende a edição de parâmetro `user_editable` por usuário
    comum sob `USER_EDITABLE_ENFORCEMENT=explicit`.

    A versão 0.4.2 enviava `False` explicitamente. Se você monta o payload à
    mão, não reintroduza isso.

Lembre dos limites: `max_length` vale 30 no servidor por padrão. Para gravar uma
string longa, passe `max_length` explicitamente — ver
[Tipos de parâmetro](../api/tipos-de-parametro.md#limites).

### Guardar um segredo

```python
pm.upsert_params(
    'MEU_APP',
    'SENHA_BANCO',
    value='s3nh4-real',
    param_type='secret',
    max_length=200,
)
```

O valor viaja em claro pela conexão (por isso HTTPS importa) e é cifrado pelo
servidor antes de tocar o banco. Ao ler de volta, a decifragem é transparente.

### Apagar

```python
pm.delete_param('MEU_APP', 'TIMEOUT_HTTP')
pm.delete_app('MEU_APP')
```

## Cache

```python
pm.clear_cache('MEU_APP', 'TIMEOUT_HTTP')  # um parâmetro
pm.clear_cache('MEU_APP')                  # a aplicação inteira
pm.clear_cache()                           # tudo
```

!!! tip "`clear_cache` também desarma o circuit breaker"

    Limpar o cache de uma aplicação apaga a marca de erro dela
    incondicionalmente. É uma ação explícita do operador: serve para dizer
    "tente de novo agora" depois de consertar a API, sem esperar o cooldown.

```python
info = pm.get_cache_info()
```

Devolve as aplicações em cache, os timestamps, se cada entrada ainda é válida, e
as marcas de erro por aplicação.

## Múltiplas instâncias

```python
producao = ParamManager.get_instance(
    instance_name='producao', api_url='https://parametros.exemplo.com'
)
homolog = ParamManager.get_instance(
    instance_name='homolog', api_url='https://parametros-homolog.exemplo.com'
)
```

Cada uma tem cache, credenciais e arquivo local próprios. Nada vaza de uma para
a outra.

## Nos seus testes

O multiton guarda instâncias num dicionário de classe que **sobrevive entre
testes**. Sem resetá-lo, um teste reaproveita a instância criada por outro:

```python
def setup_function():
    ParamManager._instances = {}
```

Sem isso, um teste que configura `api_url` diferente vai silenciosamente usar a
URL do teste anterior.
