import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { STATUS_CONFIG } from '@/constants/status';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Stop, StopStatus } from '@/types';

import { ThemedText } from './themed-text';

export function StatusBadge({ status }: { status: StopStatus }) {
  const { label, color, bg } = STATUS_CONFIG[status];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <ThemedText type="small" style={[styles.badgeLabel, { color }]}>
        {label}
      </ThemedText>
    </View>
  );
}

export function StopCard({ stop, hasPendingSync }: { stop: Stop; hasPendingSync?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/order/[id]', params: { id: stop.id } })}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
      ]}
    >
      <View style={styles.cardHeader}>
        <ThemedText type="smallBold" style={styles.customerName} numberOfLines={1}>
          {stop.customer}
        </ThemedText>
        <View style={styles.badges}>
          <StatusBadge status={stop.status} />
          {hasPendingSync && <View style={styles.pendingDot} />}
        </View>
      </View>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {stop.area} · {stop.address}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.finishBy}>
        Finish by {stop.must_finish_by}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    marginBottom: Spacing.two,
    gap: Spacing.one,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  customerName: {
    flex: 1,
    marginRight: Spacing.two,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Spacing.two,
  },
  badgeLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  finishBy: {
    marginTop: Spacing.one,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
  },
});
