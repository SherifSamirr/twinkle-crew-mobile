import { Platform } from 'react-native';

// Android emulator routes localhost through 10.0.2.2; iOS simulator uses localhost directly.
// For a physical device, replace with your machine's LAN IP (e.g. http://192.168.1.x:3001).
export const API_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:3001',
  default: 'http://localhost:3001',
});
