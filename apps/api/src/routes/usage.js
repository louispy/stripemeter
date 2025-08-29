/**
 * Usage query and projection routes
 */
export const usageRoutes = async (server) => {
    /**
     * GET /v1/usage/current
     * Get current period usage for a customer
     */
    server.get('/current', {
        schema: {
            description: 'Get current period usage for a customer',
            tags: ['usage'],
            querystring: {
                type: 'object',
                required: ['tenantId', 'customerRef'],
                properties: {
                    tenantId: { type: 'string', format: 'uuid' },
                    customerRef: { type: 'string' },
                },
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        customerRef: { type: 'string' },
                        period: {
                            type: 'object',
                            properties: {
                                start: { type: 'string' },
                                end: { type: 'string' },
                            },
                        },
                        metrics: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string' },
                                    current: { type: 'number' },
                                    limit: { type: 'number' },
                                    unit: { type: 'string' },
                                },
                            },
                        },
                        alerts: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    type: { type: 'string' },
                                    message: { type: 'string' },
                                    severity: { type: 'string', enum: ['info', 'warning', 'critical'] },
                                },
                            },
                        },
                    },
                },
            },
        },
    }, async (request, reply) => {
        // TODO: Implement usage query logic
        const { tenantId: _tenantId, customerRef } = request.query;
        reply.send({
            customerRef,
            period: {
                start: new Date().toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0],
            },
            metrics: [],
            alerts: [],
        });
    });
    /**
     * POST /v1/usage/projection
     * Get cost projection for a customer
     */
    server.post('/projection', {
        schema: {
            description: 'Get cost projection for a customer',
            tags: ['usage'],
            body: {
                type: 'object',
                required: ['tenantId', 'customerRef'],
                properties: {
                    tenantId: { type: 'string', format: 'uuid' },
                    customerRef: { type: 'string' },
                    periodStart: { type: 'string', format: 'date' },
                    periodEnd: { type: 'string', format: 'date' },
                },
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        customerRef: { type: 'string' },
                        periodStart: { type: 'string' },
                        periodEnd: { type: 'string' },
                        lineItems: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    metric: { type: 'string' },
                                    quantity: { type: 'number' },
                                    unitPrice: { type: 'number' },
                                    total: { type: 'number' },
                                },
                            },
                        },
                        subtotal: { type: 'number' },
                        credits: { type: 'number' },
                        total: { type: 'number' },
                        currency: { type: 'string' },
                        freshness: {
                            type: 'object',
                            properties: {
                                lastUpdate: { type: 'string' },
                                staleness: { type: 'number' },
                            },
                        },
                    },
                },
            },
        },
    }, async (request, reply) => {
        // TODO: Implement projection logic using pricing library
        const { tenantId: _tenantId, customerRef, periodStart, periodEnd } = request.body;
        reply.send({
            customerRef,
            periodStart: periodStart || new Date().toISOString().split('T')[0],
            periodEnd: periodEnd || new Date().toISOString().split('T')[0],
            lineItems: [],
            subtotal: 0,
            credits: 0,
            total: 0,
            currency: 'USD',
            freshness: {
                lastUpdate: new Date().toISOString(),
                staleness: 0,
            },
        });
    });
};
//# sourceMappingURL=usage.js.map