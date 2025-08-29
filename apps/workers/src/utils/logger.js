/**
 * Logger configuration for workers
 */
import pino from 'pino';
const isDevelopment = process.env.NODE_ENV === 'development';
export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: isDevelopment
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
            },
        }
        : undefined,
    base: {
        service: 'stripemeter-workers',
        env: process.env.NODE_ENV,
    },
});
//# sourceMappingURL=logger.js.map