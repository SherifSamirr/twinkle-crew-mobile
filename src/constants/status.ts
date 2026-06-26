import type { StopStatus } from '@/types';

export const STATUS_CONFIG: Record<StopStatus, { label: string; color: string; bg: string }> = {
  loaded:    { label: 'Loaded',    color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
  en_route:  { label: 'En Route',  color: '#3B82F6', bg: 'rgba(59,130,246,0.12)'  },
  arrived:   { label: 'Arrived',   color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
  completed: { label: 'Completed', color: '#10B981', bg: 'rgba(16,185,129,0.12)'  },
  failed:    { label: 'Failed',    color: '#EF4444', bg: 'rgba(239,68,68,0.12)'   },
};

// Ordered status progression — each status can only move forward
export const NEXT_STATUS: Partial<Record<StopStatus, StopStatus>> = {
  loaded:   'en_route',
  en_route: 'arrived',
  arrived:  'completed',
};

export const NEXT_LABEL: Partial<Record<StopStatus, string>> = {
  loaded:   'Mark En Route',
  en_route: 'Mark Arrived',
  arrived:  'Mark Complete',
};

export const NEXT_COLOR: Partial<Record<StopStatus, string>> = {
  loaded:   '#3B82F6',
  en_route: '#F59E0B',
  arrived:  '#10B981',
};
