'use strict';

const crypto = require('crypto');

class RunRegistry {
  constructor(options = {}) {
    this.ttlMs = Number.isFinite(options.ttlMs) ? options.ttlMs : 6 * 60 * 60 * 1000; // 6 hours
    this.maxEntries = Number.isFinite(options.maxEntries) ? options.maxEntries : 32;
    this.store = new Map();
  }

  generateRunId() {
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return crypto.randomBytes(16).toString('hex');
  }

  save(data, { runId, ttlMs } = {}) {
    const id = runId || this.generateRunId();
    const now = Date.now();
    const record = {
      runId: id,
      createdAt: now,
      expiresAt: now + (Number.isFinite(ttlMs) ? ttlMs : this.ttlMs),
      data
    };
    this.store.set(id, record);
    this.trim();
    return record;
  }

  get(runId) {
    if (!runId) return null;
    this.purgeExpired();
    return this.store.get(runId) || null;
  }

  has(runId) {
    return Boolean(this.get(runId));
  }

  purgeExpired() {
    if (!this.store.size) return;
    const now = Date.now();
    for (const [id, record] of this.store.entries()) {
      if (record.expiresAt <= now) {
        this.store.delete(id);
      }
    }
  }

  trim() {
    this.purgeExpired();
    if (this.store.size <= this.maxEntries) return;
    const entries = [...this.store.values()].sort((a, b) => a.createdAt - b.createdAt);
    while (entries.length > this.maxEntries) {
      const victim = entries.shift();
      if (victim) {
        this.store.delete(victim.runId);
      }
    }
  }
}

module.exports = RunRegistry;
