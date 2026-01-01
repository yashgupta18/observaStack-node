# End-to-End Observability Stack

Mini production-like observability lab featuring a Node.js order service with metrics, logs, traces, dashboards, and alerts powered by the Grafana stack.

## Stack Overview

- **Service:** Node.js Express order API with Prometheus metrics, structured logs (Pino), and OpenTelemetry traces.
- **Metrics:** Prometheus scraping `/metrics` (request count, latency, error rate).
- **Logs:** Loki + Promtail tailing container logs.
- **Traces:** OpenTelemetry SDK exporting to Grafana Tempo.
- **Dashboards:** Grafana with pre-provisioned golden signals & error analysis boards.
- **Alerts:** Prometheus Alertmanager for high latency and error spikes.

## Architecture

```
[Order Service] --/metrics--> [Prometheus] --alerts--> [Alertmanager]
      |                 \
      | logs (stdout)    \--> [Grafana]
      v
 [Promtail] --> [Loki] --------/
      |
      \-- traces (OTLP) --> [Tempo] --/
```

## Quick Start

1. Install Docker + Docker Compose.
2. Clone this repo and `cd grafana monitoring`.
3. Start everything: `docker compose up --build`
4. Open Grafana at http://localhost:3000 (user/pass: `admin` / `admin`).
5. Hit the API (e.g., `curl -XPOST http://localhost:8080/orders`) or run the load script below.
6. Explore dashboards, logs, and traces.

> Tip: The stack seeds Prometheus with alert rules, Grafana with datasources/dashboards, and Loki with labels so you get insights immediately.

## Order Service API

- `GET /health` – readiness probe.
- `GET /orders` – list in-memory orders.
- `GET /orders/:id` – fetch one order.
- `POST /orders` – create order (random latency + injected failures for demos).
- `GET /chaos` – optional endpoint that spikes latency/errors to trigger alerts.

All endpoints emit metrics via middleware and traces via OpenTelemetry auto-instrumentation.

## Observability Features

| Signal     | Details                                                                                                  |
| ---------- | -------------------------------------------------------------------------------------------------------- |
| Metrics    | `http_request_total`, `http_request_duration_seconds`, `http_request_errors_total`, default Node metrics |
| Logs       | Structured Pino JSON (trace/span IDs injected) collected by Promtail                                     |
| Traces     | OTLP HTTP exporter → Tempo (`order-service` resource)                                                    |
| Dashboards | `Golden Signals` + `Error Analysis` automatically provisioned in Grafana                                 |
| Alerts     | `HighRequestLatency` & `ErrorRateSpike` defined in Prometheus `alert_rules.yml`                          |

## Dashboards

Dashboards live under **Dashboards → General** once Grafana boots:

1. **Golden Signals** – traffic, latency, errors, saturation (CPU/memory via cAdvisor-style metrics if added).
2. **Error Analysis** – error budget burn-down, failing endpoints, correlated logs panel (Loki).

Feel free to clone + tweak them directly inside Grafana; JSON sources are in `grafana/provisioning/dashboards/`.

## Alerts

Prometheus watches P95 latency & 5-minute error rates:

- `HighRequestLatency`: P95 > 750ms for 5m.
- `ErrorRateSpike`: Error rate > 10% for 3m.

Alertmanager currently routes to a log receiver; wire in Slack, PagerDuty, etc., by editing `alertmanager/config.yml`.

## Load Generator (Optional)

`scripts/load.sh` hammers the service with a mix of success + failure traffic to exercise the dashboards. Run it in another terminal:

```
chmod +x scripts/load.sh
./scripts/load.sh
```

Stop with `Ctrl+C`.

## Local Development

```
cd order-service
npm install
npm run dev
```

Service listens on `http://localhost:8080`; Prometheus still scrapes it when Docker Compose is up.

## Troubleshooting

- **Grafana unavailable:** ensure port 3000 unused, or edit `docker-compose.yml`.
- **No traces:** confirm `tempo` container healthy and `order-service` env vars `OTEL_EXPORTER_OTLP_ENDPOINT`/`OTEL_SERVICE_NAME`.
- **Alerts not firing:** load script may take a few minutes; check Prometheus rules page.

## Resume Snippet

> Built an end-to-end observability platform with Grafana, Prometheus, Loki, Tempo, and OpenTelemetry to monitor a production-style order microservice, delivering dashboards, alerts, logs, and traces.
