const client = require("prom-client");

const serviceName = process.env.OTEL_SERVICE_NAME || "order-service";

const register = new client.Registry();
register.setDefaultLabels({
  service: serviceName,
});

client.collectDefaultMetrics({ register });

const requestCounter = new client.Counter({
  name: "http_request_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status"],
});

const requestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Request latency histogram",
  labelNames: ["method", "route", "status"],
  buckets: [0.05, 0.1, 0.25, 0.5, 0.75, 1, 2, 5],
});

const errorCounter = new client.Counter({
  name: "http_request_errors_total",
  help: "Total number of error responses",
  labelNames: ["method", "route", "status"],
});

register.registerMetric(requestCounter);
register.registerMetric(requestDuration);
register.registerMetric(errorCounter);

module.exports = {
  register,
  requestCounter,
  requestDuration,
  errorCounter,
};
