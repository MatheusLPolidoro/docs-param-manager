# Observabilidade

A API é instrumentada com OpenTelemetry de ponta a ponta: traces, métricas e
logs correlacionados, exportados por OTLP para um coletor.

## O wrapper não é opcional

```
opentelemetry-instrument uvicorn fast_param_manager.main:app --host 0.0.0.0 --port 8001
```

Sem `opentelemetry-instrument` a aplicação sobe e responde normalmente — **e não
emite nada**. O sintoma é um painel vazio com a API saudável, que é
particularmente ruim de diagnosticar porque nada está quebrado.

## O padrão de instrumentação

Todo módulo de controller, service e repository declara, no topo:

```python
tracer = trace.get_tracer(__name__)
logger = logging.getLogger(__name__)
```

E toda operação segue a mesma forma:

```python
with tracer.start_as_current_span('operation_name') as span:
    span.set_attribute('operation', 'operation_name')
    span.set_attribute('app.name', app_name)
    start = time.perf_counter()
    ...
    record_db_query_duration(time.perf_counter() - start, {...})
    span.set_status(Status(StatusCode.OK))
```

Endpoint novo replica isso. Não é enfeite: é o que faz um trace atravessar as
três camadas em vez de mostrar só a borda HTTP.

## Métricas e o painel

As métricas são consumidas por
`docker/etc/grafana/dashboards/fast-param-manager-dashboard.json`.

!!! danger "Label de métrica é contrato"

    O painel casa por label. Renomear ou ressignificar uma métrica quebra o
    painel silenciosamente — ele continua carregando, com o gráfico vazio.
    Confira o JSON do dashboard **antes** de mexer em qualquer nome de métrica,
    e trate isso como parte do contrato descrito em
    [Compatibilidade](../produto/compatibilidade.md).

Duas métricas merecem menção porque existem para tomar decisão, não para
enfeitar painel:

`anonymous_reads_total`
:   Leituras sem token, contadas quando `READ_AUTH_MODE` está em `warn`. É o
    número que autoriza — ou proíbe — a promoção para `enforce`.

falhas de autenticação
:   Contadas separadamente das leituras anônimas. Requisição **com** token que
    não resolve entra aqui, e não no contador de anônimos. Misturar os dois
    corromperia o sinal de promoção.

## Correlação de log

Com `OTEL_PYTHON_LOG_CORRELATION` ligado, os registros de log carregam o
`trace_id` do span corrente. Na prática: dado um trace lento no Tempo, dá para
pular direto para as linhas de log daquela requisição no Loki, sem procurar por
timestamp.

## Pilha local

A pilha de observabilidade sobe junto com o resto em `docker/`:

| Componente | Papel | Porta |
|---|---|---|
| otel-collector | Recebe OTLP e distribui | 4317 / 4318 |
| Tempo | Traces | 3200 |
| Loki | Logs | 3100 |
| Prometheus | Métricas | — |
| Promtail | Coleta de log de contêiner | — |
| Grafana | Visualização | 3000 |

As configurações ficam em `docker/etc/`.

## Nos testes

Spans são verificados com `InMemorySpanExporter`, pela fixture
`otel_memory_exporter`. Uma fixture `autouse` chamada `clear_spans` zera o
exportador entre testes — sem ela, um teste veria os spans do anterior.

Isso significa que **o padrão de instrumentação é testável e é testado**: um
endpoint novo que esquecer o span pode falhar no teste, e não só no painel.
