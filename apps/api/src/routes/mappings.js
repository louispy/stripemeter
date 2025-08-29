/**
 * Price mapping configuration routes
 */
export const mappingsRoutes = async (server) => {
    /**
     * GET /v1/mappings
     * List all price mappings for a tenant
     */
    server.get('/', {
        schema: {
            description: 'List all price mappings for a tenant',
            tags: ['mappings'],
            querystring: {
                type: 'object',
                required: ['tenantId'],
                properties: {
                    tenantId: { type: 'string', format: 'uuid' },
                    active: { type: 'boolean' },
                },
            },
            response: {
                200: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            tenantId: { type: 'string' },
                            metric: { type: 'string' },
                            aggregation: { type: 'string', enum: ['sum', 'max', 'last'] },
                            stripeAccount: { type: 'string' },
                            priceId: { type: 'string' },
                            subscriptionItemId: { type: 'string' },
                            currency: { type: 'string' },
                            active: { type: 'boolean' },
                        },
                    },
                },
            },
        },
    }, async (_request, reply) => {
        // TODO: Implement mapping retrieval from database
        reply.send([]);
    });
    /**
     * POST /v1/mappings
     * Create a new price mapping
     */
    server.post('/', {
        schema: {
            description: 'Create a new price mapping',
            tags: ['mappings'],
            body: {
                type: 'object',
                required: ['tenantId', 'metric', 'aggregation', 'stripeAccount', 'priceId'],
                properties: {
                    tenantId: { type: 'string', format: 'uuid' },
                    metric: { type: 'string' },
                    aggregation: { type: 'string', enum: ['sum', 'max', 'last'] },
                    stripeAccount: { type: 'string' },
                    priceId: { type: 'string' },
                    subscriptionItemId: { type: 'string' },
                    currency: { type: 'string' },
                    active: { type: 'boolean' },
                },
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        tenantId: { type: 'string' },
                        metric: { type: 'string' },
                        aggregation: { type: 'string' },
                        stripeAccount: { type: 'string' },
                        priceId: { type: 'string' },
                        subscriptionItemId: { type: 'string' },
                        currency: { type: 'string' },
                        active: { type: 'boolean' },
                    },
                },
            },
        },
    }, async (request, reply) => {
        // TODO: Implement mapping creation
        reply.status(201).send(request.body);
    });
    /**
     * PUT /v1/mappings/:id
     * Update a price mapping
     */
    server.put('/:id', {
        schema: {
            description: 'Update a price mapping',
            tags: ['mappings'],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string', format: 'uuid' },
                },
            },
            body: {
                type: 'object',
                properties: {
                    aggregation: { type: 'string', enum: ['sum', 'max', 'last'] },
                    stripeAccount: { type: 'string' },
                    priceId: { type: 'string' },
                    subscriptionItemId: { type: 'string' },
                    currency: { type: 'string' },
                    active: { type: 'boolean' },
                },
            },
        },
    }, async (_request, reply) => {
        // TODO: Implement mapping update
        reply.status(501).send({
            error: 'Not Implemented',
            message: 'Mapping update endpoint is under development'
        });
    });
    /**
     * DELETE /v1/mappings/:id
     * Delete a price mapping
     */
    server.delete('/:id', {
        schema: {
            description: 'Delete a price mapping',
            tags: ['mappings'],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string', format: 'uuid' },
                },
            },
            response: {
                204: {
                    type: 'null',
                },
            },
        },
    }, async (_request, reply) => {
        // TODO: Implement mapping deletion
        reply.status(204).send();
    });
};
//# sourceMappingURL=mappings.js.map