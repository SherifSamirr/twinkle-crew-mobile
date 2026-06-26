import type { StopStatus, SyncState } from '@/types';
import { getDb } from './db';

export interface OutboxPayload {
  status: StopStatus;
  failedReason?: string;
  photoUri?: string;
  notes?: string | null;
}

interface OutboxDbRow {
  id: string;
  stop_id: string;
  payload_json: string;
  sync_state: string;
  retry_count: number;
  created_at: number;
}

export interface OutboxRow {
  id: string;
  stop_id: string;
  payload: OutboxPayload;
  sync_state: SyncState;
  retry_count: number;
  created_at: number;
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function rowToOutboxRow(row: OutboxDbRow): OutboxRow {
  return {
    id: row.id,
    stop_id: row.stop_id,
    payload: JSON.parse(row.payload_json) as OutboxPayload,
    sync_state: row.sync_state as SyncState,
    retry_count: row.retry_count,
    created_at: row.created_at,
  };
}

export async function enqueue(stopId: string, payload: OutboxPayload): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO outbox (id, stop_id, payload_json, sync_state, retry_count, created_at)
     VALUES (?, ?, ?, 'pending', 0, ?)`,
    [newId(), stopId, JSON.stringify(payload), Date.now()],
  );
}

export async function getPending(): Promise<OutboxRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<OutboxDbRow>(
    `SELECT * FROM outbox WHERE sync_state = 'pending' ORDER BY created_at ASC`,
  );
  return rows.map(rowToOutboxRow);
}

export async function getPendingStopIds(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ stop_id: string }>(
    `SELECT DISTINCT stop_id FROM outbox WHERE sync_state = 'pending'`,
  );
  return rows.map((r) => r.stop_id);
}

export async function remove(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM outbox WHERE id = ?', [id]);
}

export async function markFailed(id: string): Promise<void> {
  const db = await getDb();
  // Increment retry_count; if it reaches 3 flip to 'failed', otherwise stay 'pending'
  await db.runAsync(
    `UPDATE outbox
     SET retry_count = retry_count + 1,
         sync_state  = CASE WHEN retry_count + 1 >= 3 THEN 'failed' ELSE 'pending' END
     WHERE id = ?`,
    [id],
  );
}

export async function clearAll(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM outbox');
}
