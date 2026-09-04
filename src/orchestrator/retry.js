// src/orchestrator/retry.js
// Retry logic with exponential backoff

const logger = require('./logger');

/**
 * Retry an async function with exponential backoff
 * @param {Function} fn - async function to retry
 * @param {Object} options
 * @param {number} options.maxRetries - max retries (default: 3)
 * @param {number} options.baseDelayMs - base delay in ms (default: 1000)
 * @param {number} options.maxDelayMs - max delay in ms (default: 10000)
 * @param {Function} options.shouldRetry - function that takes error and returns boolean (default: always true)
 * @param {string} options.context - context label for logging
 */
async function retry(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 10000,
    shouldRetry = () => true,
    context = 'retry',
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
        logger.debug(`[${context}] Retry attempt ${attempt} after ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
      }
      return await fn();
    } catch (err) {
      lastError = err;
      const shouldRetryResult = shouldRetry(err);
      logger.debug(`[${context}] Attempt ${attempt} failed: ${err.message}, shouldRetry=${shouldRetryResult}`);
      if (attempt >= maxRetries || !shouldRetryResult) {
        throw err;
      }
    }
  }
  throw lastError;
}

module.exports = { retry };