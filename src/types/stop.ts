import type { SlotId } from './config';

export type StopStatus = 'loaded' | 'en_route' | 'arrived' | 'completed' | 'failed';

export interface Stop {
  id: string;
  slot: SlotId;
  customer: string;
  area: string;
  address: string;
  lat: number;
  lng: number;
  items: string[];
  must_finish_by: string;
  status: StopStatus;
  notes: string | null;
  proof_photo_url: string | null;
  failed_reason: string | null;
}
