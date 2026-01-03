/**
 * Centralized logger utility with DEV flag
 * Only logs in development mode unless forced
 */

const isDev = import.meta.env.DEV;

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

interface LoggerOptions {
  prefix?: string;
  force?: boolean;
}

const formatMessage = (prefix: string | undefined, ...args: unknown[]): unknown[] => {
  if (prefix) {
    return [`[${prefix}]`, ...args];
  }
  return args;
};

/**
 * Logger that only outputs in development mode
 */
export const logger = {
  log: (message: unknown, ...args: unknown[]) => {
    if (isDev) console.log(message, ...args);
  },
  
  info: (message: unknown, ...args: unknown[]) => {
    if (isDev) console.info(message, ...args);
  },
  
  warn: (message: unknown, ...args: unknown[]) => {
    if (isDev) console.warn(message, ...args);
  },
  
  error: (message: unknown, ...args: unknown[]) => {
    if (isDev) console.error(message, ...args);
  },
  
  debug: (message: unknown, ...args: unknown[]) => {
    if (isDev) console.debug(message, ...args);
  },
};

/**
 * Production logger - always logs regardless of environment
 * Use for critical errors that need monitoring
 */
export const prodLogger = {
  error: (message: unknown, ...args: unknown[]) => {
    console.error(message, ...args);
  },
  
  warn: (message: unknown, ...args: unknown[]) => {
    console.warn(message, ...args);
  },
};

/**
 * Create a prefixed logger instance
 */
export const createLogger = (prefix: string) => ({
  log: (...args: unknown[]) => {
    if (isDev) console.log(...formatMessage(prefix, ...args));
  },
  
  info: (...args: unknown[]) => {
    if (isDev) console.info(...formatMessage(prefix, ...args));
  },
  
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...formatMessage(prefix, ...args));
  },
  
  error: (...args: unknown[]) => {
    if (isDev) console.error(...formatMessage(prefix, ...args));
  },
  
  debug: (...args: unknown[]) => {
    if (isDev) console.debug(...formatMessage(prefix, ...args));
  },
});

export default logger;
