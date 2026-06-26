import { useMemo } from 'react';
import { ActivityIndicator, SectionList, StyleSheet, View } from 'react-native';

import { StopCard } from '@/components/stopCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useNetworkMock } from '@/context/network-mock';
import { useStops } from '@/hooks/useStops';
import type { SlotId, Stop } from '@/types';

const SLOT_META: Record<SlotId, { title: string; window: string }> = {
  afternoon: { title: 'Afternoon', window: '12:00 – 16:00' },
  evening:   { title: 'Evening',   window: '16:00 – 20:00' },
};

type Section = { slotId: SlotId; title: string; window: string; data: Stop[] };

function sortStops(stops: Stop[]): Stop[] {
  return [...stops].sort((a, b) => {
    const byId = a.id.localeCompare(b.id);
    if (byId !== 0) return byId;
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
  const { stops, pendingStopIds, loading, error } = useStops();
  const { isConnected } = useNetworkMock();

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

  if (sections.length === 0 && !isConnected) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="smallBold">No internet connection</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Connect to load today's stops.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        ListHeaderComponent={<ThemedText style={styles.heading}>My Orders</ThemedText>}
        renderItem={({ item }) => (
          <StopCard stop={item} hasPendingSync={pendingStopIds.has(item.id)} />
        )}
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
	heading: {
		fontSize: 24,
		fontWeight: '700',
		marginBottom: Spacing.two,
		marginTop: Spacing.four,
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
