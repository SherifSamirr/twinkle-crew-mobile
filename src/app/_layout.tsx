import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { StopsProvider } from '@/context/StopsContext';
import { NetworkMockProvider } from '@/context/network-mock';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <SafeAreaProvider>
      <NetworkMockProvider>
        <StopsProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack screenOptions={{ headerShown: false }} />
          </ThemeProvider>
        </StopsProvider>
      </NetworkMockProvider>
    </SafeAreaProvider>
  );
}
