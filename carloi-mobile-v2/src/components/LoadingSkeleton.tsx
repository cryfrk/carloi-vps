import { StyleSheet, View } from 'react-native';
import { tokens } from '@/theme/tokens';

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <View style={styles.wrapper}>
      {Array.from({ length: rows }).map((_, index) => (
        <View key={index} style={styles.card}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar} />
            <View style={styles.lines}>
              <View style={styles.lineWide} />
              <View style={styles.lineShort} />
            </View>
          </View>
          <View style={styles.lineBlock} />
          <View style={styles.lineBlock} />
          <View style={styles.media} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 14,
  },
  card: {
    borderRadius: 24,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    padding: 18,
    gap: 12,
  },
  avatarRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  avatar: {
    height: 42,
    width: 42,
    borderRadius: 21,
    backgroundColor: '#e2e8f0',
  },
  lines: {
    flex: 1,
    gap: 8,
  },
  lineWide: {
    height: 12,
    width: '60%',
    borderRadius: 6,
    backgroundColor: '#e2e8f0',
  },
  lineShort: {
    height: 10,
    width: '35%',
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  lineBlock: {
    height: 12,
    width: '100%',
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  media: {
    height: 180,
    borderRadius: 18,
    backgroundColor: '#e2e8f0',
  },
});
