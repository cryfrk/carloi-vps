import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { tokens } from '@/theme/tokens';

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.badge}>
        <Text style={styles.badgeLabel}>C</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction ? <PrimaryButton label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 24,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    height: 56,
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: tokens.colors.accentSoft,
  },
  badgeLabel: {
    color: tokens.colors.accent,
    fontSize: 22,
    fontWeight: '800',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: tokens.colors.text,
  },
  description: {
    textAlign: 'center',
    color: tokens.colors.muted,
    lineHeight: 22,
  },
});
