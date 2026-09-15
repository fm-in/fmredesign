/** A request we understood and refuse. The webhook route answers 400, so platforms do not retry. */
export class WebhookRejection extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookRejection';
  }
}

/** A lead that cannot be stored, for example one with neither an email nor a phone. */
export class IntakeError extends WebhookRejection {
  constructor(message: string) {
    super(message);
    this.name = 'IntakeError';
  }
}
