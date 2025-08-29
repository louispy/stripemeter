/**
 * Alert configuration routes
 */
export const alertsRoutes = async (server) => {
    /**
     * GET /v1/alerts
     * List all alert configurations for a tenant
     */
    server.get('/', {
        schema: {
            description: 'List all alert configurations for a tenant',
            tags: ['alerts'],
            querystring: {
                type: 'object',
                required: ['tenantId'],
                properties: {
                    tenantId: { type: 'string', format: 'uuid' },
                    customerRef: { type: 'string' },
                    enabled: { type: 'boolean' },
                },
            },
            response: {
                200: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            tenantId: { type: 'string' },
                            customerRef: { type: 'string' },
                            metric: { type: 'string' },
                            type: { type: 'string', enum: ['threshold', 'spike', 'budget'] },
                            threshold: { type: 'number' },
                            action: { type: 'string', enum: ['email', 'webhook', 'slack', 'hard_cap', 'soft_cap'] },
                            config: { type: 'object' },
                            enabled: { type: 'boolean' },
                        },
                    },
                },
            },
        },
    }, async (_request, reply) => {
        // TODO: Implement alert retrieval from database
        reply.send([]);
    });
    /**
     * POST /v1/alerts
     * Create a new alert configuration
     */
    server.post('/', {
        schema: {
            description: 'Create a new alert configuration',
            tags: ['alerts'],
            body: {
                type: 'object',
                required: ['tenantId', 'type', 'threshold', 'action'],
                properties: {
                    tenantId: { type: 'string', format: 'uuid' },
                    customerRef: { type: 'string' },
                    metric: { type: 'string' },
                    type: { type: 'string', enum: ['threshold', 'spike', 'budget'] },
                    threshold: { type: 'number' },
                    action: { type: 'string', enum: ['email', 'webhook', 'slack', 'hard_cap', 'soft_cap'] },
                    config: { type: 'object' },
                    enabled: { type: 'boolean' },
                },
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        tenantId: { type: 'string' },
                        customerRef: { type: 'string' },
                        metric: { type: 'string' },
                        type: { type: 'string' },
                        threshold: { type: 'number' },
                        action: { type: 'string' },
                        config: { type: 'object' },
                        enabled: { type: 'boolean' },
                    },
                },
            },
        },
    }, async (request, reply) => {
        // TODO: Implement alert creation
        const alertConfig = {
            id: `alert_${Date.now()}`,
            ...request.body,
        };
        reply.status(201).send(alertConfig);
    });
    /**
     * PUT /v1/alerts/:id
     * Update an alert configuration
     */
    server.put('/:id', {
        schema: {
            description: 'Update an alert configuration',
            tags: ['alerts'],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string' },
                },
            },
            body: {
                type: 'object',
                properties: {
                    threshold: { type: 'number' },
                    action: { type: 'string', enum: ['email', 'webhook', 'slack', 'hard_cap', 'soft_cap'] },
                    config: { type: 'object' },
                    enabled: { type: 'boolean' },
                },
            },
        },
    }, async (_request, reply) => {
        // TODO: Implement alert update
        reply.status(501).send({
            error: 'Not Implemented',
            message: 'Alert update endpoint is under development'
        });
    });
    /**
     * DELETE /v1/alerts/:id
     * Delete an alert configuration
     */
    server.delete('/:id', {
        schema: {
            description: 'Delete an alert configuration',
            tags: ['alerts'],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string' },
                },
            },
            response: {
                204: {
                    type: 'null',
                },
            },
        },
    }, async (_request, reply) => {
        // TODO: Implement alert deletion
        reply.status(204).send();
    });
    /**
     * GET /v1/alerts/history
     * Get alert trigger history
     */
    server.get('/history', {
        schema: {
            description: 'Get alert trigger history',
            tags: ['alerts'],
            querystring: {
                type: 'object',
                required: ['tenantId'],
                properties: {
                    tenantId: { type: 'string', format: 'uuid' },
                    customerRef: { type: 'string' },
                    status: { type: 'string', enum: ['triggered', 'acknowledged', 'resolved'] },
                    from: { type: 'string', format: 'date-time' },
                    to: { type: 'string', format: 'date-time' },
                },
            },
            response: {
                200: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            alertConfigId: { type: 'string' },
                            tenantId: { type: 'string' },
                            customerRef: { type: 'string' },
                            metric: { type: 'string' },
                            value: { type: 'number' },
                            threshold: { type: 'number' },
                            action: { type: 'string' },
                            status: { type: 'string' },
                            triggeredAt: { type: 'string' },
                            acknowledgedAt: { type: 'string' },
                            resolvedAt: { type: 'string' },
                        },
                    },
                },
            },
        },
    }, async (_request, reply) => {
        // TODO: Implement alert history retrieval
        reply.send([]);
    });
};
//# sourceMappingURL=alerts.js.map