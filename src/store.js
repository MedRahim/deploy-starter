"use strict";

const crypto = require("node:crypto");

/**
 * In-memory task store.
 * The interface is intentionally small so it can be swapped for Postgres
 * without touching the routes: list, get, create, update, remove.
 */
function createStore() {
  const tasks = new Map();

  return {
    list() {
      return [...tasks.values()].sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt)
      );
    },

    get(id) {
      return tasks.get(id) || null;
    },

    create(title) {
      const now = new Date().toISOString();
      const task = {
        id: crypto.randomUUID(),
        title: String(title).trim(),
        done: false,
        createdAt: now,
        updatedAt: now
      };
      tasks.set(task.id, task);
      return task;
    },

    update(id, patch) {
      const task = tasks.get(id);
      if (!task) return null;
      if (patch.title !== undefined) task.title = patch.title;
      if (patch.done !== undefined) task.done = patch.done;
      task.updatedAt = new Date().toISOString();
      return task;
    },

    remove(id) {
      return tasks.delete(id);
    },

    clear() {
      tasks.clear();
    }
  };
}

module.exports = { createStore };
