export interface WebhookContext {
  request: Request;
  rawBody: string;
}

export interface WebhookDescription {
  /** Stable id for this delivery, used to ignore retries. */
  externalId: string | null;
  eventType: string;
}

export interface SalesWebhookAdapter {
  /** Env vars that must be set; the route answers 503 until they are. */
  requiredEnv: readonly string[];
  verify(context: WebhookContext): boolean;
  describe(payload: unknown): WebhookDescription;
  handle(payload: unknown): Promise<void>;
  /** Platform verification handshakes, e.g. Meta's GET challenge. */
  handleGet?(request: Request): Response;
  /** Remove secrets from the payload before it is logged. */
  redact?(payload: unknown): unknown;
  /** Body for a successful POST (Google Ads expects `{}`). */
  successBody?: Record<string, unknown>;
}
