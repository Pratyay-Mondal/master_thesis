/**
 * logger.js
 * Formatted, namespaced logging utility for extension debugging
 * and academic verification audit trails.
 */

const PREFIX = '[AI-Transparency-Validator]';

export const Logger = {
  debug: (...args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(PREFIX, ...args);
    }
  },
  info: (...args) => {
    console.info(PREFIX, ...args);
  },
  warn: (...args) => {
    console.warn(PREFIX, ...args);
  },
  error: (...args) => {
    console.error(PREFIX, ...args);
  },
  trace: (category, payload) => {
    console.log(`${PREFIX} [${category}]`, payload);
  }
};
