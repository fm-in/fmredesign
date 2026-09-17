/**
 * OpenAPI 3.1 spec generator.
 * Builds the full OpenAPI JSON from the route registry.
 */

import { getRoutes } from './registry';
import { SITE_URL } from '@/lib/site-url';

export function generateOpenAPISpec(): Record<string, unknown> {
  const routes = getRoutes();
  const paths: Record<string, Record<string, unknown>> = {};

  for (const route of routes) {
    if (!paths[route.path]) {
      paths[route.path] = {};
    }

    const operation: Record<string, unknown> = {
      summary: route.summary,
      tags: route.tags,
      responses: {},
    };

    if (route.description) operation.description = route.description;
    if (route.parameters) operation.parameters = route.parameters;
    if (route.requestBody) operation.requestBody = route.requestBody;
    if (route.security) operation.security = route.security;

    // Build responses
    for (const [code, resp] of Object.entries(route.responses)) {
      operation.responses = {
        ...(operation.responses as Record<string, unknown>),
        [code]: resp,
      };
    }

    paths[route.path][route.method] = operation;
  }

  const serverUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  return {
    openapi: '3.1.0',
    info: {
      title: 'FreakingMinds API',
      description: 'API for the FreakingMinds digital agency platform. Manage clients, projects, content, invoices, proposals, contracts, team members, leads, and more.',
      version: '1.0.0',
      contact: {
        name: 'FreakingMinds',
        url: SITE_URL,
      },
    },
    servers: [
      {
        url: serverUrl,
        description: 'Primary server',
      },
    ],
    security: [{ BearerAuth: [] }],
    paths,
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'API key authentication. Use an API key with prefix "fmk_" as the bearer token.',
        },
      },
    },
    tags: [
      { name: 'Clients', description: 'Client management' },
      { name: 'Projects', description: 'Project management' },
      { name: 'Content', description: 'Content calendar management' },
      { name: 'Invoices', description: 'Invoice management' },
      { name: 'Proposals', description: 'Proposal management' },
      { name: 'Contracts', description: 'Contract management' },
      { name: 'Team', description: 'Team member management' },
      { name: 'Leads', description: 'Lead pipeline' },
      { name: 'Support', description: 'Support ticket management' },
      { name: 'Notifications', description: 'Notification system' },
      { name: 'API Keys', description: 'API key management' },
      { name: 'Webhooks', description: 'Incoming webhook receivers' },
      { name: 'Outgoing Webhooks', description: 'Outgoing webhook configuration' },
      { name: 'MCP', description: 'Model Context Protocol (JSON-RPC 2.0)' },
    ],
  };
}
