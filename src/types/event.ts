import type { StopStatus } from './stop';

export type EventType = 'status_change' | 'proof_upload';

export type SyncState = 'pending' | 'failed';

export interface StatusChangePayload {
  status: StopStatus;
  reason?: string;
  timestamp: string;
}

export interface ProofUploadPayload {
  photo_uri: string;
  note?: string;
  timestamp: string;
}

export type EventPayload = StatusChangePayload | ProofUploadPayload;

export interface Event {
  id: string;
  stop_id: string;
  type: EventType;
  payload: EventPayload;
  sync_state: SyncState;
  retry_count: number;
  created_at: string;
}
