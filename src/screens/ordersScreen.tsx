import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SectionList, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { StopCard } from '@/components/stopCard';
import { Spacing } from '@/constants/theme';
import { fetchStops } from '@/services/stopsService';
import type { SlotId, Stop } from '@/types';

const SLOT_META: Record<SlotId, { title: string; window: string }> = {
  afternoon: { title: 'Afternoon', window: '12:00 – 16:00' },
  evening:   { title: 'Evening',   window: '16:00 – 20:00' },
};

type Section = { slotId: SlotId; title: string; window: string; data: Stop[] };

const TERMINAL = new Set(['completed', 'failed']);

function sortStops(stops: Stop[]): Stop[] {
  return [...stops].sort((a, b) => {
    const aTerminal = TERMINAL.has(a.status);
    const bTerminal = TERMINAL.has(b.status);
    if (aTerminal !== bTerminal) return aTerminal ? 1 : -1;
    return a.must_finish_by.localeCompare(b.must_finish_by);
  });
}

function SlotHeader({ title, window: timeWindow }: { title: string; window: string }) {
  return (
    <View style={styles.slotHeader}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {timeWindow}
      </ThemedText>
    </View>
  );
}

export default function OrdersScreen() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStops()
      .then(setStops)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load stops'),
      )
      .finally(() => setLoading(false));
  }, []);

  const sections = useMemo<Section[]>(
    () =>
      (['afternoon', 'evening'] as SlotId[])
        .map(slotId => ({
          slotId,
          ...SLOT_META[slotId],
          data: sortStops(stops.filter(s => s.slot === slotId)),
        }))
        .filter(s => s.data.length > 0),
    [stops],
  );

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="small" themeColor="textSecondary">
          {error}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <StopCard stop={item} />}
        renderSectionHeader={({ section }) => (
          <SlotHeader title={section.title} window={section.window} />
        )}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: Spacing.three,
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
});
