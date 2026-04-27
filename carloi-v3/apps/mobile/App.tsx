import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { RootNavigation } from './src/navigation/RootNavigation';
import { StateCard } from './src/components/StateCard';
import { useSessionStore } from './src/store/session-store';
import { theme } from './src/theme';

export default function App() {
  const status = useSessionStore((state) => state.status);
  const error = useSessionStore((state) => state.error);
  const busyLabel = useSessionStore((state) => state.busyLabel);
  const hydrate = useSessionStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {status === 'booting' ? (
        <View style={styles.bootScreen}>
          <View style={styles.logoMark}>
            <Text style={styles.logoText}>C</Text>
          </View>
          <Text style={styles.bootTitle}>Carloi V3</Text>
          <Text style={styles.bootSubtitle}>{busyLabel || 'Hazirlaniyor...'}</Text>
          <ActivityIndicator color={theme.colors.accent} size="large" />
          {error ? (
            <StateCard
              title={error.title}
              description={error.description}
              tone="warning"
            />
          ) : null}
        </View>
      ) : (
        <RootNavigation />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  bootScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 18,
  },
  logoMark: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '900',
    color: theme.colors.accent,
  },
  bootTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.colors.text,
  },
  bootSubtitle: {
    fontSize: 14,
    color: theme.colors.muted,
  },
});
