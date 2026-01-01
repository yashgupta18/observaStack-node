const { NodeSDK } = require("@opentelemetry/sdk-node");
const {
  getNodeAutoInstrumentations,
} = require("@opentelemetry/auto-instrumentations-node");
const {
  OTLPTraceExporter,
} = require("@opentelemetry/exporter-trace-otlp-http");
const { Resource } = require("@opentelemetry/resources");
const {
  SemanticResourceAttributes,
} = require("@opentelemetry/semantic-conventions");

const serviceName = process.env.OTEL_SERVICE_NAME || "order-service";
const otlpEndpoint =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318/v1/traces";

const traceExporter = new OTLPTraceExporter({
  url: otlpEndpoint,
});

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]:
      process.env.NODE_ENV || "development",
    [SemanticResourceAttributes.SERVICE_VERSION]:
      process.env.npm_package_version || "1.0.0",
  }),
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-http": {
        requireParentforOutgoingSpans: false,
      },
    }),
  ],
});

Promise.resolve(sdk.start())
  .then(() => {
    // eslint-disable-next-line no-console
    console.log(`[otel] tracing initialized for ${serviceName}`);
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[otel] failed to start tracing", err);
  });

const shutdown = () => {
  Promise.resolve(sdk.shutdown())
    .then(() => process.exit(0))
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[otel] error during shutdown", err);
      process.exit(1);
    });
};

process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);

module.exports = sdk;
