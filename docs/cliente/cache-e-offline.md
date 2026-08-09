# Cache e modo offline

## Os quatro degraus

Uma chamada a `get_param` percorre, nesta ordem, até algum degrau responder:

1. **Cache do parâmetro** — chaveado por `app:param`. O mais barato.
2. **Cache global do app** — o mapa inteiro, preenchido por `get_all_params`.
   Um acerto aqui **promove** o valor ao cache do parâmetro.
3. **Circuit breaker** — se há erro recente registrado para essa aplicação, a
   rede é pulada e a resposta vem do TinyDB.
4. **A rede** — `GET` na API. Sucesso grava cache e TinyDB; falha arma o breaker
   e cai no local.

`get_all_params` percorre a mesma cadeia sem o degrau 2, que é ele próprio.

## Validade do cache

Governada por `cache_duration`, em segundos. O default depende de como a
instância foi criada — **300 pelo construtor, 3600 por `get_instance`**.

Não há invalidação remota. Um valor alterado no servidor chega quando o cache
expira, ou quando alguém chama `clear_cache`. Se você precisa de propagação
rápida, o que se ajusta é `cache_duration` — não existe *push*.

Um valor negativo em `CACHE_DURATION` vira **0**, e não o fallback. Zero
significa cache sempre inválido: toda leitura vai à rede.

## O circuit breaker

### O que o arma

- Timeout
- Erro de conexão
- `404` tratado como parâmetro inexistente
- Qualquer erro inesperado, incluindo `5xx`

O último item merece destaque: erro HTTP arma o cooldown junto com erro de rede.
Sem isso, a biblioteca martelaria um servidor que está devolvendo `500` a cada
leitura.

### Quanto dura

`api_error_cooldown`, em segundos. Quando não configurado, cai para
`cache_duration` — que era o valor implícito antes de a variável existir.

!!! warning "Por que essa variável foi criada"

    Com `get_instance`, `cache_duration` é 3600. Antes de `api_error_cooldown`
    existir, **um único `500` transitório prendia o cliente em dado local por
    uma hora**. Se você usa `get_instance` e se importa com recuperação rápida,
    configure `API_ERROR_COOLDOWN` para algo na casa de dezenas de segundos.

### O que o desarma

- Uma requisição bem-sucedida.
- `clear_cache` para aquela aplicação — incondicionalmente.

As duas semânticas são deliberadamente diferentes: o desarme por sucesso é
guardado por compare-and-swap, o desarme por `clear_cache` não. Uniformizar as
duas reintroduz uma corrida de desarme precoce que já foi corrigida.

## O arquivo local

```
<base>/param_manager/<instance_name>/params_<instance_name>.json
```

Um TinyDB por instância. Escrito a cada leitura bem-sucedida da API; lido quando
a rede falha ou o breaker está armado.

!!! danger "O arquivo local não é um cache pré-aquecido"

    Ele só contém o que já foi lido com sucesso **alguma vez**. Numa máquina
    nova, com a API fora do ar desde o começo, ele está vazio e `get_param`
    devolve `None`. O modo offline sobrevive a uma queda; não substitui a
    primeira leitura.

## Quando a leitura falha

Todos os caminhos de falha convergem para `_handle_api_error`, que tenta o
TinyDB e devolve o que houver — ou `None`.

| Situação | Resultado |
|---|---|
| Parâmetro nunca lido, API fora | `None` |
| Parâmetro já lido, API fora | O último valor conhecido |
| Parâmetro apagado no servidor | `404`, breaker armado, valor local ainda devolvido |
| Chave de custódia errada | `None`, com erro no log |

A terceira linha tem uma consequência prática: **apagar um parâmetro no servidor
não o remove imediatamente dos clientes** que já o tinham lido. Eles continuam
devolvendo o valor local enquanto o breaker estiver armado.

## Concorrência

A biblioteca é usada por várias threads e o estado é protegido por três locks
distintos:

| Lock | Protege |
|---|---|
| `_lock_singleton` | O dicionário de instâncias do multiton |
| `_token_lock` | Renovação do token — separado para evitar reentrância |
| `_state_lock` | Caches e marcas de erro |

Leituras tiram um *snapshot* sob lock e processam fora dele, para não segurar o
lock durante trabalho que não precisa dele.

## Resíduo aceito de propósito

O compare-and-swap do cliente resolve **empate de timestamp em favor de
escrever**. Não é descuido: a assimetria de custo entre escrever de novo e
perder uma escrita favorece escrever. Está documentado no ponto do código e não
deve ser "corrigido" à primeira vista.
