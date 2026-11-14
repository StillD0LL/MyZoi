/**
 * Isolated development and diagnostic logging utility.
 * Keeps console interactions out of core application modules.
 */

export const devLogger = {
  error(context: string, err: unknown): void {
    if (typeof console !== 'undefined' && console.error) {
      console.error(`[Codex:${context}]`, err);
    }
  },
  warn(context: string, message: string, detail?: unknown): void {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn(`[Codex:${context}] ${message}`, detail ?? '');
    }
  },
};
