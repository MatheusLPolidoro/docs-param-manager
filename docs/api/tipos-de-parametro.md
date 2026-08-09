# Tipos de parâmetro

O tipo decide qual validador roda sobre o `value`. Tudo mora em
`models/parameter.py`: o enum `ParamType` e o dicionário `VALIDATORS` que mapeia
cada membro à sua função.

!!! tip "Como adicionar um tipo"

    Um membro novo no `ParamType` e uma entrada nova no `VALIDATORS`. Nada mais.
    **Não espalhe `if` por tipo dentro dos services** — o dicionário existe
    justamente para que a validação fique num lugar só.

## Os quinze tipos

| Tipo | Aceita | Observação |
|---|---|---|
| `string` | `str` | |
| `int` | `int` | |
| `float` | `float` ou `int` | `int` é aceito e preservado |
| `bool` | `bool` | |
| `list` | `list` | |
| `dict` | `dict` | |
| `json` | `str`, `dict` ou `list` | String é **parseada**; o valor gravado é o objeto |
| `pattern` | `str` que compile como regex | Validado com `re.compile` |
| `reference` | `list[str]` | Cada item precisa existir em `referenced_params` |
| `date` | `str` em `YYYY-MM-DD` | |
| `datetime` | `str` em `YYYY-MM-DD HH:MM:SS` | |
| `time` | `str` em ISO de hora | Validado com `time.fromisoformat` |
| `secret` | `str` ou envelope | **Cifrado na gravação** |
| `user` | `dict` com forma fixa | **Cifrado na gravação** |
| `users` | `list` de `user` | **Cifrado na gravação** |

## Os tipos que exigem atenção

### `json` converte

Se você mandar uma string, o que fica gravado é o **objeto parseado**, não a
string. Ler de volta devolve `dict` ou `list`. String inválida vira erro de
validação.

### `pattern` só valida a compilação

O validador confere que a regex compila — não que ela case com alguma coisa.
Uma regex sintaticamente válida e semanticamente errada passa.

### `reference` exige a lista junto

O validador de `reference` não consulta o banco: ele confere contra o campo
`referenced_params` **do próprio parâmetro**. Enviar `reference` sem
`referenced_params` faz toda referência falhar, porque o conjunto de nomes
permitidos está vazio.

```json
{
  "DEPENDENCIAS": {
    "value": ["TIMEOUT_HTTP", "URL_BASE"],
    "type": "reference",
    "referenced_params": ["TIMEOUT_HTTP", "URL_BASE", "RETRIES"]
  }
}
```

### `user` tem forma obrigatória

Quatro campos, todos exigidos, com tipo verificado:

| Campo | Tipo |
|---|---|
| `user_id` | `str` |
| `user` | `str` |
| `password` | `dict` **ou** `str` |
| `status` | `bool` |

`password` aceitar `dict` não é frouxidão: é o envelope cifrado voltando num
round-trip. O cliente lê o parâmetro, recebe o `password` já como envelope, e ao
regravar devolve o envelope. Rejeitar `dict` quebraria essa ida e volta.

`users` é uma lista de `user`, e cada item passa pelo mesmo validador.

### `secret` aceita os dois lados do round-trip

`str` é o valor em claro entrando. `dict` é o envelope voltando — e nesse caso o
validador confere que `salt`, `master_key` e `crypto_data` estão todos
presentes, listando por nome os que faltarem. Qualquer outro tipo é rejeitado.

## Limites

Todo parâmetro carrega quatro limites, e **eles têm default**:

| Campo | Default | Aplica-se a |
|---|---|---|
| `min_length` | `0` | `str` e `list` |
| `max_length` | **`30`** | `str` e `list` |
| `min_value` | `0` | `int` e `float` |
| `max_value` | `1000000` | `int` e `float` |

!!! danger "Dois defaults que rejeitam valor legítimo sem ninguém pedir"

    **`max_length` vale 30.** Uma connection string, uma URL longa ou um token
    passam disso com folga e são rejeitados com "Tamanho máximo excedido (30)".

    **`min_value` vale 0.** Qualquer número negativo é rejeitado com "Valor
    mínimo não atingido (0)".

    Nos dois casos a mensagem é clara, mas a causa não parece ser um default —
    parece um bug. Ao gravar string longa ou número negativo, **envie os limites
    explicitamente**.

A verificação de tamanho roda sobre `str` e `list` — o que inclui a lista de um
`reference` e o resultado de um `json` que virou lista.

## Ordem da validação

1. O validador do tipo roda primeiro e **pode substituir o valor** (é o caso do
   `json`, que troca a string pelo objeto).
2. Depois vêm os limites de tamanho, sobre o valor **já convertido**.
3. Por último os limites numéricos.

A consequência: um `json` que chega como string e vira uma lista de 40 itens é
barrado pelo `max_length` de 30, mesmo a string original tendo passado.
