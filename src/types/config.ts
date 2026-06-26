export type SlotId = 'afternoon' | 'evening';

export interface Crew {
  id: string;
  truck: string;
}

export interface FulfillmentCenter {
  name: string;
  lat: number;
  lng: number;
}

export interface Slot {
  id: SlotId;
  label: string;
  window: string;
  must_finish_by: string;
}

export interface SyncConfig {
  mock_api: string;
  notes: string;
}

export interface Config {
  day: string;
  timezone: string;
  crew: Crew;
  fulfillment_center: FulfillmentCenter;
  slots: Slot[];
  sync: SyncConfig;
}
