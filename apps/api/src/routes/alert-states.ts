/**
 * Alert states routes
 */

import { FastifyPluginAsync } from "fastify";
import {
  GetAlertStatesQueryInput,
  getAlertStatesQuerySchema,
  GetAlertStatesResponse,
} from "@stripemeter/core";
import { requireScopes } from "../utils/auth";
import { SCOPES } from "../constants/scopes";
import { AlertState } from "@stripemeter/database";

export const alertStatesRoutes: FastifyPluginAsync = async (server) => {
  // lazy import
  let AlertStatesRepositoryCtor: any;
  try {
    const mod: any = await import("@stripemeter/database");
    AlertStatesRepositoryCtor = mod.AlertStatesRepository;
  } catch (_e) {
    AlertStatesRepositoryCtor = class {
      async getAlertStatesByParam() {
        return [];
      }
      async getAlertStatesCountByParam() {
        return 0;
      }
      async get() {
        return null;
      }
      async create() {}
      async update() {}
      async delete() {}
    };
  }
  const alertStatesRepo = new AlertStatesRepositoryCtor();

  /**
   * GET /v1/alerts/states
   * List all alert states for a tenant
   */
  server.get<{
    Querystring: GetAlertStatesQueryInput;
    Reply: GetAlertStatesResponse;
  }>(
    "/",
    {
      schema: {
        description: "List all alert states for a tenant",
        tags: ["alerts"],
        querystring: {
          type: "object",
          required: ["tenantId"],
          properties: {
            tenantId: { type: "string", format: "uuid" },
            customerRef: { type: "string" },
            metric: { type: "string" },
            status: {
              type: "string",
              enum: ["triggered", "acknowledged", "resolved"],
            },
            severity: { type: "string", enum: ["info", "warn", "critical"] },
            title: { type: "string" },
            limit: { type: "number", default: 25 },
            offset: { type: "number", default: 0 },
            sort: {
              type: "string",
              enum: ["customerRef", "metric", "createdAt"],
            },
            sortDir: { type: "string", enum: ["asc", "desc"] },
            startTime: { type: "string", format: "date-time" },
            endTime: { type: "string", format: "date-time" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              total: { type: "number" },
              alertStates: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    tenantId: { type: "string" },
                    metric: { type: "string" },
                    customerRef: { type: "string" },
                    alertConfigId: { type: "string" },
                    status: { type: "string" },
                    severity: { type: "string" },
                    title: { type: "string" },
                    description: { type: "string" },
                    createdAt: { type: "string" },
                    updatedAt: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
      preHandler: requireScopes(SCOPES.PROJECT_READ, SCOPES.ALERTS_READ),
    },
    async (_request, reply) => {
      const validationResult = getAlertStatesQuerySchema.safeParse(
        _request.query
      );
      if (!validationResult.success) {
        return reply.status(400).send({
          total: 0,
          alertStates: [],
          errors: validationResult.error.errors.map(
            (err: any, index: number) => ({
              index,
              error: err.message,
            })
          ),
        });
      }

      const startTime = _request.query.startTime;
      const endTime = _request.query.endTime;
      const param = {
        tenantId: _request.query.tenantId,
        customerRef: _request.query.customerRef,
        metric: _request.query.metric,
        status: _request.query.status,
        severity: _request.query.severity,
        title: _request.query.title,
        limit: _request.query.limit,
        offset: _request.query.offset,
        sort: _request.query.sort,
        sortDir: _request.query.sortDir,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
      };

      const [alertStates, count] = await Promise.all([
        alertStatesRepo.getEventsByParam(param),
        alertStatesRepo.getEventsCountByParam(param),
      ]);

      const res: GetAlertStatesResponse = {
        total: count,
        alertStates: alertStates.map((state: any) => ({
          id: state.id,
          tenantId: state.tenantId,
          metric: state.metric,
          customerRef: state.customerRef,
          alertConfigId: state.alertConfigId,
          status: state.status,
          severity: state.severity,
          title: state.title,
          description: state.description,
          createdAt: state.createdAt.toISOString(),
          updatedAt: state.updatedAt.toISOString(),
        })),
      };
      reply.status(200).send(res);
    }
  );

  /**
   * POST /v1/alerts/states
   * Create a new alert state
   */
  server.post<{
    Body: Omit<AlertState, "id">;
    Reply: AlertState;
  }>(
    "/",
    {
      schema: {
        description: "Create a new alert state",
        tags: ["alerts"],
        body: {
          type: "object",
          required: [
            "tenantId",
            "metric",
            "customerRef",
            "title",
            "alertConfigId",
          ],
          properties: {
            tenantId: { type: "string" },
            customerRef: { type: "string" },
            alertConfigId: { type: "string", format: "uuid" },
            metric: { type: "string" },
            status: {
              type: "string",
              enum: ["triggered", "acknowledged", "resolved"],
              default: "triggered",
            },
            severity: {
              type: "string",
              enum: ["info", "warn", "critical"],
              default: "info",
            },
            title: { type: "string" },
            description: { type: "string" },
          },
        },
        response: {
          201: {
            type: "object",
            properties: {
              id: { type: "string" },
              tenantId: { type: "string" },
              metric: { type: "string" },
              customerRef: { type: "string" },
              alertConfigId: { type: "string" },
              status: { type: "string" },
              severity: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
              createdAt: { type: "string" },
              updatedAt: { type: "string" },
            },
          },
        },
      },
      preHandler: requireScopes(SCOPES.PROJECT_WRITE, SCOPES.ALERTS_WRITE),
    },
    async (request, reply) => {
      const alertState: AlertState = {
        id: crypto.randomUUID(),
        ...request.body,
      };
      await alertStatesRepo.create(alertState);
      reply.status(201).send(alertState);
    }
  );

  /**
   * GET /v1/alerts/states/:id
   * Get an alert state by id
   */
  server.get<{
    Params: { id: string };
    Reply: AlertState | { error: string };
  }>(
    "/:id",
    {
      schema: {
        description: "Get an alert by id",
        tags: ["alerts"],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string" },
          },
        },
      },
      preHandler: requireScopes(SCOPES.PROJECT_WRITE, SCOPES.ALERTS_WRITE),
    },
    async (_request, reply) => {
      const alertState = await alertStatesRepo.get(_request.params.id);
      if (!alertState) {
        return reply.status(404).send({ error: "Not found" });
      }
      reply.status(200).send(alertState);
    }
  );

  /**
   * PUT /v1/alerts/states/:id
   * Update an alert state
   */
  server.put<{
    Params: { id: string };
    Body: Partial<AlertState>;
  }>(
    "/:id",
    {
      schema: {
        description: "Update an alert state",
        tags: ["alerts"],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string" },
          },
        },
        body: {
          type: "object",
          properties: {
            tenantId: { type: "string" },
            customerRef: { type: "string" },
            alertConfigId: { type: "string", format: "uuid" },
            metric: { type: "string" },
            status: {
              type: "string",
              enum: ["triggered", "acknowledged", "resolved"],
            },
            severity: { type: "string", enum: ["info", "warn", "critical"] },
            title: { type: "string" },
            description: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              tenantId: { type: "string" },
              metric: { type: "string" },
              customerRef: { type: "string" },
              alertConfigId: { type: "string" },
              status: { type: "string" },
              severity: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
              createdAt: { type: "string" },
              updatedAt: { type: "string" },
            },
          },
        },
      },
      preHandler: requireScopes(SCOPES.PROJECT_WRITE, SCOPES.ALERTS_WRITE),
    },
    async (_request, reply) => {
      const res = await alertStatesRepo.update(_request.params.id, _request.body);
      reply.status(200).send(res);
    }
  );

  /**
   * DELETE /v1/alerts/:id
   * Delete an alert state
   */
  server.delete<{
    Params: { id: string };
  }>(
    "/:id",
    {
      schema: {
        description: "Delete an alert state",
        tags: ["alerts"],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string" },
          },
        },
      },
      preHandler: requireScopes(SCOPES.PROJECT_WRITE, SCOPES.ALERTS_WRITE),
    },
    async (_request, reply) => {
      await alertStatesRepo.delete(_request.params.id);
      reply.status(200).send({ ok: true });
    }
  );
};
