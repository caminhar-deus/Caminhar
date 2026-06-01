export const logger = {
  info(module, message, ...args) {
    console.log(`[${module}] ℹ️  ${message}`, ...args);
  },
  success(module, message, ...args) {
    console.log(`[${module}] ✅ ${message}`, ...args);
  },
  warn(module, message, ...args) {
    console.warn(`[${module}] ⚠️ ${message}`, ...args);
  },
  error(module, message, ...args) {
    console.error(`[${module}] ❌ ${message}`, ...args);
  },
  debug(module, message, ...args) {
    if (process.env.LOG_LEVEL === 'debug') {
      console.log(`[${module}] 🔍 ${message}`, ...args);
    }
  },
};