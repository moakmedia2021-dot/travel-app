// Centralized logger. In production, debug logs are silenced and
// errors flow through Sentry. In dev/test, everything prints.
const isProd = process.env.NODE_ENV === "production";

type Meta = Record<string, unknown> | undefined;

function format(scope: string, msg: string, meta?: Meta): string {
  return meta ? `[${scope}] ${msg} ${JSON.stringify(meta)}` : `[${scope}] ${msg}`;
}

export const logger = {
  debug(scope: string, msg: string, meta?: Meta) {
    if (isProd) return;
    console.debug(format(scope, msg, meta));
  },
  info(scope: string, msg: string, meta?: Meta) {
    if (isProd) return;
    console.info(format(scope, msg, meta));
  },
  warn(scope: string, msg: string, meta?: Meta) {
    console.warn(format(scope, msg, meta));
  },
  error(scope: string, msg: string, err?: unknown, meta?: Meta) {
    console.error(format(scope, msg, meta), err);
    // Errors are also captured by Sentry instrumentation
  },
};
