import { StyleSheet, View } from 'react-native';
import { tokens } from '@/theme/tokens';

export function SectionCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    padding: 18,
    gap: 14,
  },
});
