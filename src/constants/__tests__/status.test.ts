import { NEXT_LABEL, NEXT_STATUS, STATUS_CONFIG } from '../status';
import type { StopStatus } from '@/types';

const ALL_STATUSES: StopStatus[] = ['loaded', 'en_route', 'arrived', 'completed', 'failed'];
const NON_TERMINAL: StopStatus[] = ['loaded', 'en_route', 'arrived'];
const TERMINAL: StopStatus[] = ['completed', 'failed'];

describe('STATUS_CONFIG', () => {
  it('has an entry for every StopStatus', () => {
    ALL_STATUSES.forEach((status) => {
      expect(STATUS_CONFIG[status]).toBeDefined();
    });
  });

  it.each(ALL_STATUSES)('%s has label, color, and bg', (status) => {
    expect(typeof STATUS_CONFIG[status].label).toBe('string');
    expect(STATUS_CONFIG[status].label.length).toBeGreaterThan(0);
    expect(typeof STATUS_CONFIG[status].color).toBe('string');
    expect(typeof STATUS_CONFIG[status].bg).toBe('string');
  });
});

describe('NEXT_STATUS', () => {
  it.each(NON_TERMINAL)('%s has a defined next status', (status) => {
    expect(NEXT_STATUS[status]).toBeDefined();
  });

  it.each(TERMINAL)('%s (terminal) has no next status', (status) => {
    expect(NEXT_STATUS[status]).toBeUndefined();
  });

  it('follows the correct forward progression', () => {
    expect(NEXT_STATUS.loaded).toBe('en_route');
    expect(NEXT_STATUS.en_route).toBe('arrived');
    expect(NEXT_STATUS.arrived).toBe('completed');
  });

  it('no status points back to an earlier state (no cycles)', () => {
    const seen = new Set<StopStatus>();
    let current: StopStatus | undefined = 'loaded';
    while (current !== undefined) {
      expect(seen.has(current)).toBe(false);
      seen.add(current);
      current = NEXT_STATUS[current];
    }
  });
});

describe('NEXT_LABEL', () => {
  it.each(NON_TERMINAL)('%s has a UI label', (status) => {
    expect(typeof NEXT_LABEL[status]).toBe('string');
    expect((NEXT_LABEL[status] as string).length).toBeGreaterThan(0);
  });

  it.each(TERMINAL)('%s (terminal) has no UI label', (status) => {
    expect(NEXT_LABEL[status]).toBeUndefined();
  });
});
