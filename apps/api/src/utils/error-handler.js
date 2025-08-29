/**
 * Global error handler
 */
import { ZodError } from 'zod';
import { logger } from './logger';
export async function errorHandler(error, request, reply) {
    // Log the error
    logger.error({
        err: error,
        request: {
            method: request.method,
            url: request.url,
            params: request.params,
            query: request.query,
        },
    });
    // Handle Zod validation errors
    if (error instanceof ZodError) {
        reply.status(400).send({
            error: 'Validation Error',
            message: 'Invalid request data',
            details: error.errors,
        });
        return;
    }
    // Handle rate limit errors
    if (error.statusCode === 429) {
        reply.status(429).send({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please try again later.',
        });
        return;
    }
    // Handle not found errors
    if (error.statusCode === 404) {
        reply.status(404).send({
            error: 'Not Found',
            message: 'The requested resource was not found.',
        });
        return;
    }
    // Handle unauthorized errors
    if (error.statusCode === 401) {
        reply.status(401).send({
            error: 'Unauthorized',
            message: 'Authentication required.',
        });
        return;
    }
    // Handle forbidden errors
    if (error.statusCode === 403) {
        reply.status(403).send({
            error: 'Forbidden',
            message: 'You do not have permission to access this resource.',
        });
        return;
    }
    // Default error response
    const statusCode = error.statusCode || 500;
    const message = statusCode === 500
        ? 'An internal server error occurred.'
        : error.message;
    reply.status(statusCode).send({
        error: error.name || 'Error',
        message,
        ...(process.env.NODE_ENV === 'development' && {
            stack: error.stack,
        }),
    });
}
//# sourceMappingURL=error-handler.js.map