import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'mock_internet_connected';

type NetworkMockContextValue = {
  isConnected: boolean;
  networkLoaded: boolean;
  setIsConnected: (value: boolean) => void;
};

const NetworkMockContext = createContext<NetworkMockContextValue>({
  isConnected: true,
  networkLoaded: false,
  setIsConnected: () => {},
});

export function NetworkMockProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnectedState] = useState(true);
  const [networkLoaded, setNetworkLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored !== null) {
        setIsConnectedState(stored === 'true');
      }
      setNetworkLoaded(true);
    });
  }, []);

  const setIsConnected = useCallback((value: boolean) => {
    setIsConnectedState(value);
    AsyncStorage.setItem(STORAGE_KEY, String(value));
  }, []);

  return (
    <NetworkMockContext.Provider value={{ isConnected, networkLoaded, setIsConnected }}>
      {children}
    </NetworkMockContext.Provider>
  );
}

export function useNetworkMock() {
  return useContext(NetworkMockContext);
}
