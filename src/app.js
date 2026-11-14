"use strict";

const crypto = require("node:crypto");
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { createStore } = require("./store");

const MAX_TITLE = 120;

function parseTitle(value) {
  if (typeof value !== "string") return null;
  const title = value.trim();
  if (title.length < 1 || title.length > MAX_TITLE) return null;
  return title;
}

/**
 * Build the Express app without listening.
 * Keeping the app and the server separate is what makes the tests fast:
 * they bind to an ephemeral port and never touch the real one.
 */
function buildApp(options = {}) {
  const store = options.store || createStore();
  const app = express();

  app.disable("x-powered-by");
  // 0 = exposed directly. Set TRUST_PROXY=1 behind one proxy (Caddy, Nginx,
  // Azure front door). Never use `true`: clients could spoof their IP and
  // bypass the rate limit.
  app.set("trust proxy", Number(process.env.TRUST_PROXY || 0));

  app.use(helmet());
  app.use(express.json({ limit: "10kb" }));

  // Correlate logs and client reports with a single id.
  app.use((req, res, next) => {
    req.id = req.get("x-request-id") || crypto.randomUUID();
    res.setHeader("x-request-id", req.id);
    next();
  });

  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 100,
      standardHeaders: "draft-7",
      legacyHeaders: false
    })
  );

  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      uptime: Math.round(process.uptime()),
      version: process.env.APP_VERSION || "1.0.0"
    });
  });

  const tasks = express.Router();

  tasks.get("/", (req, res) => {
    res.json({ data: store.list() });
  });

  tasks.post("/", (req, res) => {
    const title = parseTitle(req.body && req.body.title);
    if (!title) {
      return res.status(400).json({
        error: "validation_error",
        message: `title must be a string of 1-${MAX_TITLE} characters`,
        requestId: req.id
      });
    }
    res.status(201).json({ data: store.create(title) });
  });

  tasks.get("/:id", (req, res) => {
    const task = store.get(req.params.id);
    if (!task) {
      return res.status(404).json({ error: "not_found", requestId: req.id });
    }
    res.json({ data: task });
  });

  tasks.patch("/:id", (req, res) => {
    const body = req.body || {};
    const hasTitle = body.title !== undefined;
    const hasDone = body.done !== undefined;

    if (!hasTitle && !hasDone) {
      return res.status(400).json({
        error: "validation_error",
        message: "provide title and/or done",
        requestId: req.id
      });
    }

    const patch = {};
    if (hasTitle) {
      const title = parseTitle(body.title);
      if (!title) {
        return res.status(400).json({
          error: "validation_error",
          message: `title must be a string of 1-${MAX_TITLE} characters`,
          requestId: req.id
        });
      }
      patch.title = title;
    }

    if (hasDone) {
      if (typeof body.done !== "boolean") {
        return res.status(400).json({
          error: "validation_error",
          message: "done must be a boolean",
          requestId: req.id
        });
      }
      patch.done = body.done;
    }

    const task = store.update(req.params.id, patch);
    if (!task) {
      return res.status(404).json({ error: "not_found", requestId: req.id });
    }
    res.json({ data: task });
  });

  tasks.delete("/:id", (req, res) => {
    if (!store.remove(req.params.id)) {
      return res.status(404).json({ error: "not_found", requestId: req.id });
    }
    res.status(204).end();
  });

  app.use("/api/tasks", tasks);

  app.use((req, res) => {
    res.status(404).json({ error: "not_found", requestId: req.id });
  });

  // JSON errors: no stack traces, no HTML, one shape for the client.
  app.use((err, req, res, next) => {
    if (err.type === "entity.too.large") {
      return res.status(413).json({
        error: "payload_too_large",
        message: "body must be under 10kb",
        requestId: req.id
      });
    }
    if (err instanceof SyntaxError && "body" in err) {
      return res.status(400).json({
        error: "invalid_json",
        requestId: req.id
      });
    }
    console.error(
      JSON.stringify({
        level: "error",
        msg: err.message,
        requestId: req.id
      })
    );
    res.status(500).json({ error: "internal_error", requestId: req.id });
  });

  return app;
}

module.exports = { buildApp };
