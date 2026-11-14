"use strict";

const { buildApp } = require("./app");

const port = Number(process.env.PORT) || 3000;
const app = buildApp();

const server = app.listen(port, "0.0.0.0", () => {
  console.log(
    JSON.stringify({
      level: "info",
      msg: "listening",
      port,
      env: process.env.NODE_ENV || "development"
    })
  );
});

// Give in-flight requests a chance to finish, then force the exit.
function shutdown(signal) {
  console.log(JSON.stringify({ level: "info", msg: "shutting_down", signal }));
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

["SIGTERM", "SIGINT"].forEach((signal) => {
  process.on(signal, () => shutdown(signal));
});
