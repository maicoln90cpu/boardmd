/**
 * Create a contextual logger with function-name prefix.
 */
export function createLogger(functionName: string) {
  const prefix = `[${functionName}]`;

  return {
    info: (...args: unknown[]) => console.log(prefix, ...args),
    warn: (...args: unknown[]) => console.warn(prefix, ...args),
    error: (...args: unknown[]) => console.error(prefix, ...args),
  };
}
