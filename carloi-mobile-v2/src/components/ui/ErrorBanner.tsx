import { StyleSheet, Text, View } from 'react-native';
import { tokens } from '@/theme/tokens';

export function ErrorBanner({ message }: { message: string }) {
  if (!message) {
    return null;
  }
  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>Bir işlem tamamlanamadı</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 18,
    backgroundColor: '#fff1f2',
    padding: 14,
    gap: 4,
  },
  title: {
    color: '#be123c',
    fontWeight: '700',
  },
  message: {
    color: '#9f1239',
    lineHeight: 20,
  },
});
