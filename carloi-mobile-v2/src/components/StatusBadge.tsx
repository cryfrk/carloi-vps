import { StyleSheet, Text, View } from 'react-native';
import { tokens } from '@/theme/tokens';

export function StatusBadge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent';
}) {
  return (
    <View
      style={[
        styles.base,
        tone === 'success' && styles.success,
        tone === 'warning' && styles.warning,
        tone === 'danger' && styles.danger,
        tone === 'accent' && styles.accent,
      ]}
    >
      <Text
        style={[
          styles.label,
          tone === 'success' && styles.successLabel,
          tone === 'warning' && styles.warningLabel,
          tone === 'danger' && styles.dangerLabel,
          tone === 'accent' && styles.accentLabel,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: tokens.colors.text,
  },
  success: {
    backgroundColor: '#ecfdf5',
  },
  successLabel: {
    color: tokens.colors.success,
  },
  warning: {
    backgroundColor: '#fffbeb',
  },
  warningLabel: {
    color: tokens.colors.warning,
  },
  danger: {
    backgroundColor: '#fef2f2',
  },
  dangerLabel: {
    color: tokens.colors.danger,
  },
  accent: {
    backgroundColor: tokens.colors.accentSoft,
  },
  accentLabel: {
    color: tokens.colors.accent,
  },
});
