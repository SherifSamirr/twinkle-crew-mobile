import { API_BASE_URL } from '@/constants/api';
import type { Stop, StopStatus } from '@/types';

export async function fetchStops(): Promise<Stop[]> {
  const response = await fetch(`${API_BASE_URL}/stops`);

  if (!response.ok) {
    throw new Error(`Failed to fetch stops: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<Stop[]>;
}

export async function fetchStopById(id: string): Promise<Stop> {
  const response = await fetch(`${API_BASE_URL}/stops/${encodeURIComponent(id)}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch stop: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<Stop>;
}

export async function updateStopStatus(
  id: string,
  status: StopStatus,
  failedReason?: string,
  proofPhotoUri?: string,
  notes?: string | null,
): Promise<Stop> {
  const body: Record<string, unknown> = { status };
  if (failedReason) body.failed_reason = failedReason;
  if (proofPhotoUri) body.proof_photo_url = proofPhotoUri;
  if (notes !== undefined) body.notes = notes;
  const response = await fetch(`${API_BASE_URL}/stops/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Failed to update stop: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<Stop>;
}
