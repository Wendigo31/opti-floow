/**
 * Production logger: silences verbose console.log/warn in production builds.
 * Keeps console.error always active for critical issues.
 * 
 * Call `installProductionLogger()` once at app startup.
 */

const IS_PRODUCTION = import.meta.env.PROD;

export function installProductionLogger() {
  if (!IS_PRODUCTION) return;

  const originalLog = console.log;
  const originalWarn = console.warn;

  // In production, suppress console.log entirely
  console.log = () => {};

  // In production, only keep genuine warnings (suppress noisy bracket-prefixed ones)
  console.warn = (...args: unknown[]) => {
    const first = args[0];
    if (typeof first === 'string' && first.startsWith('[')) {
      // Suppress internal tagged warnings like [SchemaSync], [DataSync], etc.
      return;
    }
    originalWarn.apply(console, args);
  };
}
