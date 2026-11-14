"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createStore } = require("../src/store");

test("creates a task with an id and timestamps", () => {
  const store = createStore();
  const task = store.create("  write the runbook  ");

  assert.match(task.id, /^[0-9a-f-]{36}$/);
  assert.equal(task.title, "write the runbook");
  assert.equal(task.done, false);
  assert.ok(Date.parse(task.createdAt));
  assert.equal(task.createdAt, task.updatedAt);
});

test("lists tasks in creation order", () => {
  const store = createStore();
  const first = store.create("first");
  const second = store.create("second");

  assert.deepEqual(
    store.list().map((task) => task.id),
    [first.id, second.id]
  );
});

test("updates and removes a task", () => {
  const store = createStore();
  const task = store.create("deploy");

  const updated = store.update(task.id, { done: true, title: "deploy safely" });
  assert.equal(updated.done, true);
  assert.equal(updated.title, "deploy safely");
  assert.ok(Date.parse(updated.updatedAt) >= Date.parse(updated.createdAt));

  assert.equal(store.remove(task.id), true);
  assert.equal(store.get(task.id), null);
  assert.equal(store.remove(task.id), false);
});

test("returns null for unknown ids", () => {
  const store = createStore();
  assert.equal(store.get("missing"), null);
  assert.equal(store.update("missing", { done: true }), null);
});
