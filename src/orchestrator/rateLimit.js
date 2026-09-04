// src/orchestrator/rateLimit.js
// Simple rate limiter for RPC calls

const logger = require('./logger');

class RateLimiter {
  constructor(options = {}) {
    this.requestsPerSecond = options.requestsPerSecond || 10;
    this.minIntervalMs = 1000 / this.requestsPerSecond;
    this.lastCallTime = 0;
    this.queue = [];
    this.pending = false;
  }

  async acquire() {
    const now = Date.now();
    const waitTime = Math.max(0, this.lastCallTime + this.minIntervalMs - now);
    if (waitTime > 0) {
      logger.debug(`[RateLimiter] Waiting ${waitTime}ms`);
      await new Promise(r => setTimeout(r, waitTime));
    }
    this.lastCallTime = Date.now();
    return;
  }

  async call(fn) {
    await this.acquire();
    return await fn();
  }
}

module.exports = { RateLimiter };