require("./instrumentation");

const express = require("express");
const pino = require("pino");
const pinoHttp = require("pino-http");
const { context, trace } = require("@opentelemetry/api");
const OrderStore = require("./store");
const {
  register,
  requestCounter,
  requestDuration,
  errorCounter,
} = require("./metrics");

const PORT = Number(process.env.PORT || 8080);
const LOG_LEVEL = process.env.LOG_LEVEL || "info";

const logger = pino({
  level: LOG_LEVEL,
  base: { service: process.env.OTEL_SERVICE_NAME || "order-service" },
  formatters: {
    level(label) {
      return { level: label };
    },
  },
});

const app = express();
const store = new OrderStore();

["widget-pro", "widget-lite", "sensor-kit"].forEach((item, index) => {
  store.create({ id: `demo-${index + 1}`, item, quantity: index + 1 });
});

app.use(express.json());

app.use(
  pinoHttp({
    logger,
    customLogLevel: (res, err) => {
      if (err || res.statusCode >= 500) {
        return "error";
      }
      if (res.statusCode >= 400) {
        return "warn";
      }
      return "info";
    },
    customProps: () => {
      const span = trace.getSpan(context.active());
      if (!span) {
        return {};
      }
      const spanContext = span.spanContext();
      return {
        traceId: spanContext.traceId,
        spanId: spanContext.spanId,
      };
    },
  })
);

app.use((req, res, next) => {
  const endTimer = requestDuration.startTimer();
  res.on("finish", () => {
    const route = req.route?.path || req.originalUrl.split("?")[0] || "unknown";
    const status = res.statusCode || 0;
    const labels = {
      method: req.method,
      route,
      status: String(status),
    };
    requestCounter.inc(labels);
    endTimer(labels);
    if (status >= 500) {
      errorCounter.inc(labels);
    }
  });
  next();
});

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const jitter = () => 50 + Math.random() * 900;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const simulateWork = async ({ chaos = false } = {}) => {
  const base = chaos ? 600 : 120;
  await sleep(base + jitter());
  if (chaos && Math.random() < 0.3) {
    const err = new Error("Injected chaos failure");
    err.status = 503;
    throw err;
  }
  if (!chaos && Math.random() < 0.1) {
    const err = new Error("Random order processing error");
    err.status = 500;
    throw err;
  }
};

app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.get(
  "/metrics",
  asyncHandler(async (req, res) => {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  })
);

app.get("/orders", (req, res) => {
  res.json({ data: store.list() });
});

app.get("/orders/:id", (req, res, next) => {
  const order = store.get(req.params.id);
  if (!order) {
    const err = new Error("Order not found");
    err.status = 404;
    return next(err);
  }
  return res.json({ data: order });
});

app.post(
  "/orders",
  asyncHandler(async (req, res) => {
    const { item, quantity } = req.body || {};
    if (!item || !quantity) {
      const err = new Error("item and quantity are required");
      err.status = 400;
      throw err;
    }
    await simulateWork();
    const order = store.create({ item, quantity });
    res.status(201).json({ data: order });
  })
);

app.get(
  "/chaos",
  asyncHandler(async (req, res) => {
    await simulateWork({ chaos: true });
    res.json({ chaos: true, timestamp: new Date().toISOString() });
  })
);

app.post("/alert-debug", (req, res) => {
  req.log.warn({ alert: req.body }, "received alert from Alertmanager");
  res.status(202).json({ received: true });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  req.log.error({ err, status }, "request failed");
  res.status(status).json({
    error: err.message,
    status,
  });
});

app.listen(PORT, () => {
  logger.info({ port: PORT }, "order-service listening");
});
