import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getMobileApiClient, MOBILE_API_BASE_URL } from '@/lib/api';
import { getReadableErrorMessage } from '@/lib/errors';
import { RootNavigation } from '@/navigation/RootNavigation';
import { useGarageStore } from '@/store/garage-store';
import { useSessionStore } from '@/store/session-store';

export default function App() {
  const hydrateSession = useSessionStore((state) => state.hydrate);
  const setSnapshot = useSessionStore((state) => state.setSnapshot);
  const hydrated = useSessionStore((state) => state.hydrated);
  const token = useSessionStore((state) => state.token);
  const setBootstrapping = useSessionStore((state) => state.setBootstrapping);
  const setApiState = useSessionStore((state) => state.setApiState);
  const hydrateGarage = useGarageStore((state) => state.hydrate);

  useEffect(() => {
    hydrateSession();
    hydrateGarage();
  }, [hydrateGarage, hydrateSession]);

  useEffect(() => {
    const client = getMobileApiClient();
    setApiState({ status: 'checking', message: '' });
    client
      .health()
      .then((response) => {
        console.info('[CarloiV2][API] health_ok', {
          baseUrl: MOBILE_API_BASE_URL,
          storageDriver: response.storageDriver,
          databaseMode: response.databaseMode,
        });
        setApiState({ status: 'online', message: '' });
      })
      .catch((error) => {
        console.error('[CarloiV2][API] health_failed', {
          baseUrl: MOBILE_API_BASE_URL,
          message: error instanceof Error ? error.message : String(error),
        });
        setApiState({
          status: 'offline',
          message: getReadableErrorMessage(error, 'Sunucuya ulasilamiyor.'),
        });
      });
  }, [setApiState]);

  useEffect(() => {
    if (!hydrated || !token) {
      return;
    }

    const client = getMobileApiClient();
    setBootstrapping(true);
    client
      .bootstrap()
      .then((response) => {
        if (response.snapshot) {
          setSnapshot(response.snapshot);
        }
        setApiState({ status: 'online', message: '' });
      })
      .catch((error) => {
        console.error('[CarloiV2][API] bootstrap_failed', {
          baseUrl: MOBILE_API_BASE_URL,
          message: error instanceof Error ? error.message : String(error),
        });
        setApiState({
          status: 'degraded',
          message: getReadableErrorMessage(error, 'Veriler guncellenemedi. Son bilinen bilgiler gosteriliyor.'),
        });
      })
      .finally(() => {
        setBootstrapping(false);
      });
  }, [hydrated, setApiState, setBootstrapping, setSnapshot, token]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <RootNavigation />
    </SafeAreaProvider>
  );
}
