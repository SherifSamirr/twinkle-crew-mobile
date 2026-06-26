import { Alert, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { API_BASE_URL } from '@/constants/api';
import { useNetworkMock } from '@/context/network-mock';
import { useTheme } from '@/hooks/use-theme';

export default function SettingsScreen() {
  const { isConnected, setIsConnected } = useNetworkMock();
  const colors = useTheme();
  const [resetting, setResetting] = useState(false);

  async function handleReset() {
    Alert.alert(
      'Reset Demo Data',
      'This will restore all stops to their original state. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setResetting(true);
            try {
              const res = await fetch(`${API_BASE_URL}/reset`, { method: 'POST' });
              if (!res.ok) throw new Error('Server error');
              Alert.alert('Done', 'Demo data has been reset.');
            } catch {
              Alert.alert('Error', 'Could not reach the mock server. Make sure it is running.');
            } finally {
              setResetting(false);
            }
          },
        },
      ],
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.heading}>Settings</ThemedText>

      <View style={[styles.section, { backgroundColor: colors.backgroundElement }]}>
        <ThemedText style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Developer
        </ThemedText>

        <View style={styles.row}>
          <View style={styles.rowLabel}>
            <ThemedText style={styles.rowTitle}>Mock Internet Connection</ThemedText>
            <ThemedText style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
              {isConnected
                ? 'Online — API calls will proceed normally'
                : 'Offline — API calls will fail'}
            </ThemedText>
          </View>
          <Switch
            value={isConnected}
            onValueChange={setIsConnected}
            trackColor={{ false: '#ff4444', true: '#34C759' }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.backgroundSelected }]} />

        <TouchableOpacity
          style={[styles.resetButton, { opacity: resetting ? 0.5 : 1 }]}
          onPress={handleReset}
          disabled={resetting}
          activeOpacity={0.7}
        >
          <ThemedText style={styles.resetButtonText}>
            {resetting ? 'Resetting…' : 'Reset Demo Data'}
          </ThemedText>
          <ThemedText style={[styles.resetButtonSubtitle, { color: colors.textSecondary }]}>
            Restores all stops to "loaded" status
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.three,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: Spacing.four,
    marginTop: Spacing.four,
  },
  section: {
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  rowLabel: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  rowSubtitle: {
    fontSize: 13,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.one,
  },
  resetButton: {
    paddingVertical: Spacing.two,
    gap: 2,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ff4444',
  },
  resetButtonSubtitle: {
    fontSize: 13,
  },
});
