import { Pressable, StyleSheet, Text } from 'react-native';
import { tokens } from '@/theme/tokens';

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  variant = 'primary',
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[
          styles.label,
          variant === 'primary' && styles.primaryLabel,
          variant !== 'primary' && styles.secondaryLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    paddingHorizontal: 18,
  },
  primary: {
    backgroundColor: tokens.colors.accent,
  },
  secondary: {
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
  },
  primaryLabel: {
    color: '#ffffff',
  },
  secondaryLabel: {
    color: tokens.colors.text,
  },
});
