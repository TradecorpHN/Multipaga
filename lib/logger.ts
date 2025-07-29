import pino from 'pino';

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  redact: {
    paths: [
      'password',
      '*.password',
      '*.token',
      '*.api_key',
      '*.secret',
    ],
    censor: '**REDACTED**',
  },
});