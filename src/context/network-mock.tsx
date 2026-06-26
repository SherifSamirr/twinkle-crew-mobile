import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'mock_internet_connected';

type NetworkMockContextValue = {
  isConnected: boolean;
  setIsConnected: (value: boolean) => void;
};

const NetworkMockContext = createContext<NetworkMockContextValue>({
  isConnected: true,
  setIsConnected: () => {},
});

export function NetworkMockProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnectedState] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored !== null) {
        setIsConnectedState(stored === 'true');
      }
    });
  }, []);

  const setIsConnected = useCallback((value: boolean) => {
    setIsConnectedState(value);
    AsyncStorage.setItem(STORAGE_KEY, String(value));
  }, []);

  return (
    <NetworkMockContext.Provider value={{ isConnected, setIsConnected }}>
      {children}
    </NetworkMockContext.Provider>
  );
}

export function useNetworkMock() {
  return useContext(NetworkMockContext);
}
