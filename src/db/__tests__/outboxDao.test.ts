/**
 * outboxDao tests use a stateful in-memory mock for getDb() that mirrors the
 * SQL semantics for the outbox table. The mock lets us verify end-to-end
 * behavior (enqueue → markFailed × N → verify state) without a native SQLite
 * module. A dedicated SQL-string test guards the critical retry threshold so
 * a change from ">= 3" to ">= 4" fails immediately.
 */

import * as outboxDao from '../outboxDao';

// ─── in-memory SQLite mock ────────────────────────────────────────────────────

interface OutboxDbRow {
  id: string;
  stop_id: string;
  payload_json: string;
  sync_state: string;
  retry_count: number;
  created_at: number;
}

function createMockDb() {
  const store = new Map<string, OutboxDbRow>();
  let lastRunSql = '';

  const db = {
    store,
    getLastRunSql: () => lastRunSql,

    runAsync: jest.fn(async (sql: string, params: any[] = []) => {
      lastRunSql = sql;
      const norm = sql.replace(/\s+/g, ' ').trim().toUpperCase();

      if (norm.startsWith('INSERT INTO OUTBOX')) {
        store.set(params[0] as string, {
          id: params[0] as string,
          stop_id: params[1] as string,
          payload_json: params[2] as string,
          sync_state: 'pending',
          retry_count: 0,
          created_at: params[3] as number,
        });
      } else if (norm.startsWith('UPDATE OUTBOX')) {
        const id = params[0] as string;
        const row = store.get(id);
        if (row) {
          row.retry_count += 1;
          row.sync_state = row.retry_count >= 3 ? 'failed' : 'pending';
        }
      } else if (norm.includes('DELETE FROM OUTBOX WHERE')) {
        store.delete(params[0] as string);
      } else if (norm.startsWith('DELETE FROM OUTBOX')) {
        store.clear();
      }
    }),

    getAllAsync: jest.fn(async <T>(sql: string): Promise<T[]> => {
      const norm = sql.replace(/\s+/g, ' ').trim().toUpperCase();

      if (norm.includes('DISTINCT STOP_ID')) {
        const pending = [...store.values()].filter((r) => r.sync_state === 'pending');
        const seen = new Set<string>();
        const result: string[] = [];
        for (const r of pending) {
          if (!seen.has(r.stop_id)) {
            seen.add(r.stop_id);
            result.push(r.stop_id);
          }
        }
        return result.map((stop_id) => ({ stop_id })) as T[];
      }

      return [...store.values()]
        .filter((r) => r.sync_state === 'pending')
        .sort((a, b) => a.created_at - b.created_at) as T[];
    }),

    getFirstAsync: jest.fn(async () => null),
    withTransactionAsync: jest.fn(async (fn: () => Promise<void>) => fn()),
  };

  return db;
}

// ─── setup ───────────────────────────────────────────────────────────────────

jest.mock('../db');
const { getDb } = jest.requireMock('../db') as { getDb: jest.Mock };

let mockDb: ReturnType<typeof createMockDb>;

beforeEach(() => {
  mockDb = createMockDb();
  getDb.mockResolvedValue(mockDb);
});

// ─── enqueue ─────────────────────────────────────────────────────────────────

describe('enqueue', () => {
  it('inserts with sync_state=pending and retry_count=0', async () => {
    await outboxDao.enqueue('stop-1', { status: 'en_route' });

    const rows = [...mockDb.store.values()];
    expect(rows).toHaveLength(1);
    expect(rows[0].stop_id).toBe('stop-1');
    expect(rows[0].sync_state).toBe('pending');
    expect(rows[0].retry_count).toBe(0);
    expect(JSON.parse(rows[0].payload_json)).toEqual({ status: 'en_route' });
  });

  it('serialises optional payload fields', async () => {
    await outboxDao.enqueue('stop-1', {
      status: 'failed',
      failedReason: 'No access',
      photoUri: 'file://proof.jpg',
      notes: 'gate locked',
    });

    const row = [...mockDb.store.values()][0];
    expect(JSON.parse(row.payload_json)).toEqual({
      status: 'failed',
      failedReason: 'No access',
      photoUri: 'file://proof.jpg',
      notes: 'gate locked',
    });
  });
});

// ─── getPending ──────────────────────────────────────────────────────────────

describe('getPending', () => {
  it('returns only pending rows', async () => {
    await outboxDao.enqueue('stop-1', { status: 'en_route' });
    // Manually mark the first entry failed in the store for isolation
    const [row] = [...mockDb.store.values()];
    row.sync_state = 'failed';

    await outboxDao.enqueue('stop-2', { status: 'arrived' });

    const pending = await outboxDao.getPending();
    expect(pending).toHaveLength(1);
    expect(pending[0].stop_id).toBe('stop-2');
  });

  it('returns rows in ascending created_at (FIFO) order', async () => {
    // Seed directly into the mock store with explicit timestamps
    mockDb.store.set('ob-a', {
      id: 'ob-a', stop_id: 'stop-a', payload_json: '{"status":"en_route"}',
      sync_state: 'pending', retry_count: 0, created_at: 300,
    });
    mockDb.store.set('ob-b', {
      id: 'ob-b', stop_id: 'stop-b', payload_json: '{"status":"arrived"}',
      sync_state: 'pending', retry_count: 0, created_at: 100,
    });
    mockDb.store.set('ob-c', {
      id: 'ob-c', stop_id: 'stop-c', payload_json: '{"status":"loaded"}',
      sync_state: 'pending', retry_count: 0, created_at: 200,
    });

    const pending = await outboxDao.getPending();
    expect(pending.map((r) => r.id)).toEqual(['ob-b', 'ob-c', 'ob-a']);
  });

  it('deserialises payload_json into a payload object', async () => {
    await outboxDao.enqueue('stop-1', { status: 'completed', photoUri: 'file://p.jpg' });

    const [row] = await outboxDao.getPending();
    expect(row.payload).toEqual({ status: 'completed', photoUri: 'file://p.jpg' });
  });
});

// ─── getPendingStopIds ───────────────────────────────────────────────────────

describe('getPendingStopIds', () => {
  it('returns distinct stop_ids with pending entries', async () => {
    await outboxDao.enqueue('stop-1', { status: 'en_route' });
    await outboxDao.enqueue('stop-1', { status: 'arrived' }); // same stop, two entries
    await outboxDao.enqueue('stop-2', { status: 'en_route' });

    const ids = await outboxDao.getPendingStopIds();
    expect(ids.sort()).toEqual(['stop-1', 'stop-2']);
  });

  it('excludes stop_ids whose entries are all failed', async () => {
    await outboxDao.enqueue('stop-failed', { status: 'en_route' });
    const [row] = [...mockDb.store.values()];
    row.sync_state = 'failed';

    await outboxDao.enqueue('stop-ok', { status: 'arrived' });

    const ids = await outboxDao.getPendingStopIds();
    expect(ids).toEqual(['stop-ok']);
  });
});

// ─── markFailed — retry state machine ────────────────────────────────────────

describe('markFailed', () => {
  it('stays pending with retry_count=1 after first failure', async () => {
    await outboxDao.enqueue('stop-1', { status: 'en_route' });
    const [{ id }] = [...mockDb.store.values()];

    await outboxDao.markFailed(id);

    const row = mockDb.store.get(id)!;
    expect(row.sync_state).toBe('pending');
    expect(row.retry_count).toBe(1);
  });

  it('stays pending with retry_count=2 after second failure', async () => {
    await outboxDao.enqueue('stop-1', { status: 'en_route' });
    const [{ id }] = [...mockDb.store.values()];

    await outboxDao.markFailed(id);
    await outboxDao.markFailed(id);

    const row = mockDb.store.get(id)!;
    expect(row.sync_state).toBe('pending');
    expect(row.retry_count).toBe(2);
  });

  it('flips to failed with retry_count=3 after third failure (the boundary)', async () => {
    await outboxDao.enqueue('stop-1', { status: 'en_route' });
    const [{ id }] = [...mockDb.store.values()];

    await outboxDao.markFailed(id);
    await outboxDao.markFailed(id);
    await outboxDao.markFailed(id);

    const row = mockDb.store.get(id)!;
    expect(row.sync_state).toBe('failed');
    expect(row.retry_count).toBe(3);
  });

  it('SQL uses ">= 3" as the failure threshold', async () => {
    await outboxDao.enqueue('stop-1', { status: 'en_route' });
    const [{ id }] = [...mockDb.store.values()];
    mockDb.runAsync.mockClear(); // clear the INSERT call

    await outboxDao.markFailed(id);

    const sql = mockDb.runAsync.mock.calls[0][0] as string;
    // Verify the SQL encodes the correct threshold so an off-by-one change is caught
    expect(sql.replace(/\s+/g, ' ')).toMatch(/retry_count \+ 1 >= 3/i);
  });

  it('does not flip entries that belong to a different id', async () => {
    await outboxDao.enqueue('stop-a', { status: 'en_route' });
    await outboxDao.enqueue('stop-b', { status: 'arrived' });
    const [rowA] = [...mockDb.store.values()];

    await outboxDao.markFailed(rowA.id);
    await outboxDao.markFailed(rowA.id);
    await outboxDao.markFailed(rowA.id);

    const rows = [...mockDb.store.values()];
    const rowB = rows.find((r) => r.stop_id === 'stop-b')!;
    expect(rowB.sync_state).toBe('pending');
    expect(rowB.retry_count).toBe(0);
  });
});

// ─── remove ──────────────────────────────────────────────────────────────────

describe('remove', () => {
  it('deletes the entry by id', async () => {
    await outboxDao.enqueue('stop-1', { status: 'en_route' });
    const [{ id }] = [...mockDb.store.values()];

    await outboxDao.remove(id);

    expect(mockDb.store.size).toBe(0);
    const pending = await outboxDao.getPending();
    expect(pending).toHaveLength(0);
  });

  it('does not delete other entries', async () => {
    await outboxDao.enqueue('stop-a', { status: 'en_route' });
    await outboxDao.enqueue('stop-b', { status: 'arrived' });
    const [rowA] = [...mockDb.store.values()];

    await outboxDao.remove(rowA.id);

    expect(mockDb.store.size).toBe(1);
    const [remaining] = [...mockDb.store.values()];
    expect(remaining.stop_id).toBe('stop-b');
  });
});

// ─── clearAll ────────────────────────────────────────────────────────────────

describe('clearAll', () => {
  it('wipes all outbox entries', async () => {
    await outboxDao.enqueue('stop-1', { status: 'en_route' });
    await outboxDao.enqueue('stop-2', { status: 'arrived' });

    await outboxDao.clearAll();

    expect(mockDb.store.size).toBe(0);
    const pending = await outboxDao.getPending();
    expect(pending).toHaveLength(0);
  });
});
