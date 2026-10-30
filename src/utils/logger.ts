/**
 * Logger estructurado y seguro para la aplicación.
 * Previene la fuga de tokens, credenciales y datos sensibles en consola.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

const SENSITIVE_PATTERNS = [
  /api[_-]?key[:=]\s*["']?([^"'\s]+)["']?/gi,
  /secret[:=]\s*["']?([^"'\s]+)["']?/gi,
  /token[:=]\s*["']?([^"'\s]+)["']?/gi,
  /password[:=]\s*["']?([^"'\s]+)["']?/gi,
  /bearer\s+([a-zA-Z0-9_\-\.]+)/gi,
];

function sanitizeMessage(message: string): string {
  let sanitized = message;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, (match) => {
      const parts = match.split(/[:=\s]+/);
      return parts.length > 1 ? `${parts[0]}=[REDACTED]` : '[REDACTED]';
    });
  }
  return sanitized;
}

function formatLog(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const safeMessage = sanitizeMessage(message);

  if (process.env.NODE_ENV === 'production') {
    return JSON.stringify({
      timestamp,
      level,
      message: safeMessage,
      ...(meta ? { meta } : {}),
    });
  }

  const icons: Record<LogLevel, string> = {
    debug: '🔍',
    info: 'ℹ️ ',
    warn: '⚠️ ',
    error: '❌',
  };

  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] ${icons[level]} [${level.toUpperCase()}] ${safeMessage}${metaStr}`;
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>): void {
    if (LOG_LEVELS.debug >= LOG_LEVELS[currentLevel]) {
      console.debug(formatLog('debug', message, meta));
    }
  },
  info(message: string, meta?: Record<string, unknown>): void {
    if (LOG_LEVELS.info >= LOG_LEVELS[currentLevel]) {
      console.log(formatLog('info', message, meta));
    }
  },
  warn(message: string, meta?: Record<string, unknown>): void {
    if (LOG_LEVELS.warn >= LOG_LEVELS[currentLevel]) {
      console.warn(formatLog('warn', message, meta));
    }
  },
  error(message: string, meta?: Record<string, unknown>): void {
    if (LOG_LEVELS.error >= LOG_LEVELS[currentLevel]) {
      console.error(formatLog('error', message, meta));
    }
  },
};
