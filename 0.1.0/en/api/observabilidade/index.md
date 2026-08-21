# Observability

The API is instrumented with OpenTelemetry end to end: traces, metrics and
correlated logs, exported over OTLP to a collector.

## The wrapper is not optional

```
opentelemetry-instrument uvicorn fast_param_manager.main:app --host 0.0.0.0 --port 8001
```

Without `opentelemetry-instrument` the application starts and responds normally
— **and emits nothing**. The symptom is an empty dashboard next to a healthy
API, which is a particularly nasty thing to diagnose because nothing is broken.

## The instrumentation pattern

Every controller, service and repository module declares, at the top:

```python
tracer = trace.get_tracer(__name__)
logger = logging.getLogger(__name__)
```

And every operation follows the same shape:

```python
with tracer.start_as_current_span('operation_name') as span:
    span.set_attribute('operation', 'operation_name')
    span.set_attribute('app.name', app_name)
    start = time.perf_counter()
    ...
    record_db_query_duration(time.perf_counter() - start, {...})
    span.set_status(Status(StatusCode.OK))
```

A new endpoint replicates that. It is not decoration: it is what makes a trace
cross all three layers instead of showing only the HTTP edge.

## Metrics and the dashboard

Metrics are consumed by
`docker/etc/grafana/dashboards/fast-param-manager-dashboard.json`.

!!! danger "A metric label is contract"

    The dashboard matches on labels. Renaming or repurposing a metric breaks the
    dashboard silently — it still loads, with an empty chart. Check the
    dashboard JSON **before** touching any metric name, and treat this as part
    of the contract described in
    [Compatibility](../produto/compatibilidade.md).

Two metrics deserve a mention because they exist to support a decision, not to
fill a panel:

`anonymous_reads_total`
:   Reads without a token, counted while `READ_AUTH_MODE` is `warn`. It is the
    number that authorizes — or forbids — promotion to `enforce`.

authentication failures
:   Counted separately from anonymous reads. A request **with** a token that
    does not resolve lands here, not in the anonymous counter. Mixing the two
    would corrupt the promotion signal.

## Log correlation

With `OTEL_PYTHON_LOG_CORRELATION` on, log records carry the current span's
`trace_id`. In practice: given a slow trace in Tempo, you can jump straight to
that request's log lines in Loki, without hunting by timestamp.

## Local stack

The observability stack comes up alongside everything else in `docker/`:

| Component | Role | Port |
|---|---|---|
| otel-collector | Receives OTLP and fans out | 4317 / 4318 |
| Tempo | Traces | 3200 |
| Loki | Logs | 3100 |
| Prometheus | Metrics | — |
| Promtail | Container log collection | — |
| Grafana | Visualization | 3000 |

Configuration lives in `docker/etc/`.

## In the tests

Spans are asserted with `InMemorySpanExporter`, through the
`otel_memory_exporter` fixture. An `autouse` fixture called `clear_spans` resets
the exporter between tests — without it, one test would see the previous test's
spans.

Which means **the instrumentation pattern is testable and is tested**: a new
endpoint that forgets its span can fail a test, not just a dashboard.
