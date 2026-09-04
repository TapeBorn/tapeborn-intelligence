// src/orchestrator/logger.js
// Structured logging with levels

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
};

const DEFAULT_LEVEL = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';

let currentLevel = LOG_LEVELS[DEFAULT_LEVEL] ?? LOG_LEVELS.INFO;

function setLevel(level) {
  const upper = level.toUpperCase();
  if (upper in LOG_LEVELS) {
    currentLevel = LOG_LEVELS[upper];
  }
}

function formatMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
  return `[${timestamp}] [${level}] ${message}${metaStr}`;
}

function debug(message, meta) {
  if (currentLevel <= LOG_LEVELS.DEBUG) {
    console.debug(formatMessage('DEBUG', message, meta));
  }
}

function info(message, meta) {
  if (currentLevel <= LOG_LEVELS.INFO) {
    console.info(formatMessage('INFO', message, meta));
  }
}

function warn(message, meta) {
  if (currentLevel <= LOG_LEVELS.WARN) {
    console.warn(formatMessage('WARN', message, meta));
  }
}

function error(message, meta) {
  if (currentLevel <= LOG_LEVELS.ERROR) {
    console.error(formatMessage('ERROR', message, meta));
  }
}

module.exports = {
  setLevel,
  debug,
  info,
  warn,
  error,
  LOG_LEVELS,
};