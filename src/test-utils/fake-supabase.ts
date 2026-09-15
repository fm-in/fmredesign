/**
 * A chainable stand-in for the Supabase client, for unit tests.
 *
 * Every terminal call (await, .single(), .maybeSingle()) is recorded in
 * `fake.calls` and answered by the current responder, so a test states what
 * the database returns and then asserts what the code asked for.
 *
 * Use in a test file:
 *   vi.mock('@/lib/supabase', async () => {
 *     const m = await import('@/test-utils/fake-supabase');
 *     return { getSupabaseAdmin: () => m.fake.client };
 *   });
 */

export type FakeOp = 'select' | 'insert' | 'update' | 'upsert' | 'delete';

export interface FakeCall {
  table: string;
  op: FakeOp;
  payload: unknown;
  filters: Array<{ method: string; args: unknown[] }>;
  single: boolean;
}

export interface FakeResult {
  data: unknown;
  error: { code?: string; message: string } | null;
  count?: number | null;
}

type Responder = (call: FakeCall) => FakeResult;

const EMPTY: Responder = () => ({ data: null, error: null });

class FakeQuery implements PromiseLike<FakeResult> {
  private readonly call: FakeCall;

  constructor(table: string, private readonly owner: FakeSupabase) {
    this.call = { table, op: 'select', payload: undefined, filters: [], single: false };
  }

  select(..._args: unknown[]): this {
    return this;
  }
  insert(payload: unknown, ..._args: unknown[]): this {
    this.call.op = 'insert';
    this.call.payload = payload;
    return this;
  }
  update(payload: unknown, ..._args: unknown[]): this {
    this.call.op = 'update';
    this.call.payload = payload;
    return this;
  }
  upsert(payload: unknown, ..._args: unknown[]): this {
    this.call.op = 'upsert';
    this.call.payload = payload;
    return this;
  }
  delete(..._args: unknown[]): this {
    this.call.op = 'delete';
    return this;
  }

  eq(...args: unknown[]): this { return this.filter('eq', args); }
  neq(...args: unknown[]): this { return this.filter('neq', args); }
  in(...args: unknown[]): this { return this.filter('in', args); }
  is(...args: unknown[]): this { return this.filter('is', args); }
  ilike(...args: unknown[]): this { return this.filter('ilike', args); }
  gt(...args: unknown[]): this { return this.filter('gt', args); }
  gte(...args: unknown[]): this { return this.filter('gte', args); }
  lt(...args: unknown[]): this { return this.filter('lt', args); }
  lte(...args: unknown[]): this { return this.filter('lte', args); }
  or(...args: unknown[]): this { return this.filter('or', args); }
  order(...args: unknown[]): this { return this.filter('order', args); }
  limit(...args: unknown[]): this { return this.filter('limit', args); }
  range(...args: unknown[]): this { return this.filter('range', args); }

  single(): Promise<FakeResult> {
    this.call.single = true;
    return this.execute();
  }
  maybeSingle(): Promise<FakeResult> {
    this.call.single = true;
    return this.execute();
  }

  then<TResult1 = FakeResult, TResult2 = never>(
    onfulfilled?: ((value: FakeResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private filter(method: string, args: unknown[]): this {
    this.call.filters.push({ method, args });
    return this;
  }

  private execute(): Promise<FakeResult> {
    return Promise.resolve(this.owner.record({ ...this.call, filters: [...this.call.filters] }));
  }
}

export class FakeSupabase {
  readonly calls: FakeCall[] = [];
  private responder: Responder = EMPTY;
  readonly client = { from: (table: string) => new FakeQuery(table, this) };

  respond(responder: Responder): void {
    this.responder = responder;
  }

  reset(): void {
    this.calls.length = 0;
    this.responder = EMPTY;
  }

  record(call: FakeCall): FakeResult {
    this.calls.push(call);
    return this.responder(call);
  }

  callsTo(table: string, op?: FakeOp): FakeCall[] {
    return this.calls.filter((call) => call.table === table && (op === undefined || call.op === op));
  }
}

export const fake = new FakeSupabase();

/** Value passed to the first `.eq(column, value)` on a call. */
export function eqValue(call: FakeCall, column: string): unknown {
  return call.filters.find((f) => f.method === 'eq' && f.args[0] === column)?.args[1];
}

/** The insert/update payload of a call as a plain record ({} when absent). */
export function payloadOf(call: FakeCall): Record<string, unknown> {
  const payload = call.payload;
  return typeof payload === 'object' && payload !== null && !Array.isArray(payload)
    ? Object.fromEntries(Object.entries(payload))
    : {};
}
