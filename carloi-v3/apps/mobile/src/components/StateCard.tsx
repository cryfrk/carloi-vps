import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';

interface StateCardProps {
  title: string;
  description: string;
  tone?: 'default' | 'warning' | 'danger' | 'success';
  loading?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  disabledReason?: string;
}

const toneMap = {
  default: {
    border: theme.colors.border,
    background: theme.colors.surface,
    accent: theme.colors.accent,
  },
  warning: {
    border: '#fde68a',
    background: '#fff7ed',
    accent: theme.colors.warning,
  },
  danger: {
    border: '#fecaca',
    background: '#fff1f2',
    accent: theme.colors.danger,
  },
  success: {
    border: '#bbf7d0',
    background: '#f0fdf4',
    accent: theme.colors.success,
  },
} as const;

export function StateCard({
  title,
  description,
  tone = 'default',
  loading = false,
  actionLabel,
  onAction,
  disabledReason,
}: StateCardProps) {
  const colors = toneMap[tone];

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.background }]}>
      <View style={[styles.dot, { backgroundColor: colors.accent }]} />
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        {loading ? (
          <ActivityIndicator color={theme.colors.accent} style={styles.loader} />
        ) : null}
        {actionLabel && onAction ? (
          <Pressable onPress={onAction} style={styles.actionButton}>
            <Text style={styles.actionLabel}>{actionLabel}</Text>
          </Pressable>
        ) : null}
        {disabledReason ? <Text style={styles.disabledReason}>{disabledReason}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
  },
  dot: {
    width: 10,
    borderRadius: 999,
  },
  content: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.textSoft,
  },
  loader: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  actionButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.text,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionLabel: {
    color: theme.colors.surface,
    fontWeight: '700',
  },
  disabledReason: {
    fontSize: 12,
    color: theme.colors.muted,
  },
});
