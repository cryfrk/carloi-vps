import { StyleSheet, Text, View } from 'react-native';
import { tokens } from '@/theme/tokens';

export function NetworkBanner({
  status,
  message,
}: {
  status: 'idle' | 'checking' | 'online' | 'offline' | 'degraded';
  message?: string;
}) {
  if (status === 'idle' || status === 'online') {
    return null;
  }

  const isOffline = status === 'offline';

  return (
    <View style={[styles.wrapper, isOffline ? styles.offline : styles.degraded]}>
      <Text style={styles.title}>{isOffline ? 'Baglanti sorunu' : 'Veriler guncellenemedi'}</Text>
      <Text style={styles.message}>
        {message || (isOffline ? 'Sunucuya ulasilamiyor.' : 'Son bilinen veriler gosteriliyor.')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 18,
    padding: 14,
    gap: 4,
  },
  offline: {
    backgroundColor: '#fff7ed',
  },
  degraded: {
    backgroundColor: '#eff6ff',
  },
  title: {
    color: tokens.colors.text,
    fontWeight: '700',
  },
  message: {
    color: tokens.colors.muted,
    lineHeight: 20,
  },
});
