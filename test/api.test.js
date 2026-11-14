"use strict";

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { buildApp } = require("../src/app");

let server;
let base;

before(async () => {
  server = buildApp().listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

test("health endpoint reports ok and a request id", async () => {
  const res = await fetch(`${base}/health`);

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, "ok");
  assert.equal(typeof body.uptime, "number");
  assert.ok(res.headers.get("x-request-id"));
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
});

test("rejects an invalid task", async () => {
  const res = await fetch(`${base}/api/tasks`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "   " })
  });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, "validation_error");
  assert.ok(body.requestId);
});

test("runs the full task lifecycle", async () => {
  const created = await fetch(`${base}/api/tasks`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "ship the pipeline" })
  });
  assert.equal(created.status, 201);
  const { data: task } = await created.json();
  assert.equal(task.title, "ship the pipeline");
  assert.equal(task.done, false);

  const fetched = await fetch(`${base}/api/tasks/${task.id}`);
  assert.equal(fetched.status, 200);
  assert.equal((await fetched.json()).data.id, task.id);

  const patched = await fetch(`${base}/api/tasks/${task.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ done: true })
  });
  assert.equal(patched.status, 200);
  assert.equal((await patched.json()).data.done, true);

  const listed = await fetch(`${base}/api/tasks`);
  assert.equal(listed.status, 200);
  const list = (await listed.json()).data;
  assert.ok(list.some((item) => item.id === task.id));

  const removed = await fetch(`${base}/api/tasks/${task.id}`, {
    method: "DELETE"
  });
  assert.equal(removed.status, 204);

  const gone = await fetch(`${base}/api/tasks/${task.id}`);
  assert.equal(gone.status, 404);
});

test("rejects a non-boolean done flag", async () => {
  const created = await fetch(`${base}/api/tasks`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "check the flag" })
  });
  const { data: task } = await created.json();

  const res = await fetch(`${base}/api/tasks/${task.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ done: "yes" })
  });
  assert.equal(res.status, 400);
});

test("returns JSON for unknown routes", async () => {
  const res = await fetch(`${base}/nope`);
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error, "not_found");
});

test("rejects malformed JSON", async () => {
  const res = await fetch(`${base}/api/tasks`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{"
  });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, "invalid_json");
});
