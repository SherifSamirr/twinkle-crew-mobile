import type { SlotId, Stop, StopStatus } from '@/types';
import { getDb } from './db';

interface StopRow {
  id: string;
  slot: string;
  customer: string;
  area: string;
  address: string;
  lat: number;
  lng: number;
  items_json: string;
  must_finish_by: string;
  status: string;
  notes: string | null;
  proof_photo_uri: string | null;
  failed_reason: string | null;
  fetched_at: number;
}

function rowToStop(row: StopRow): Stop {
  return {
    id: row.id,
    slot: row.slot as SlotId,
    customer: row.customer,
    area: row.area,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    items: JSON.parse(row.items_json) as string[],
    must_finish_by: row.must_finish_by,
    status: row.status as StopStatus,
    notes: row.notes,
    proof_photo_url: row.proof_photo_uri,
    failed_reason: row.failed_reason,
  };
}

const UPSERT_SQL = `
  INSERT OR REPLACE INTO stops
    (id, slot, customer, area, address, lat, lng, items_json,
     must_finish_by, status, notes, proof_photo_uri, failed_reason, fetched_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

function stopToParams(stop: Stop): (string | number | null)[] {
  return [
    stop.id, stop.slot, stop.customer, stop.area, stop.address,
    stop.lat, stop.lng, JSON.stringify(stop.items),
    stop.must_finish_by, stop.status, stop.notes ?? null,
    stop.proof_photo_url ?? null, stop.failed_reason ?? null, Date.now(),
  ];
}

export async function upsertAll(stops: Stop[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const stop of stops) {
      await db.runAsync(UPSERT_SQL, stopToParams(stop));
    }
  });
}

export async function upsertOne(stop: Stop): Promise<void> {
  const db = await getDb();
  await db.runAsync(UPSERT_SQL, stopToParams(stop));
}

export async function getAll(): Promise<Stop[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<StopRow>(
    `SELECT * FROM stops ORDER BY
       CASE slot WHEN 'afternoon' THEN 0 ELSE 1 END,
       must_finish_by ASC`,
  );
  return rows.map(rowToStop);
}

export async function getById(id: string): Promise<Stop | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<StopRow>('SELECT * FROM stops WHERE id = ?', [id]);
  return row ? rowToStop(row) : null;
}

export async function clearAll(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM stops');
}
