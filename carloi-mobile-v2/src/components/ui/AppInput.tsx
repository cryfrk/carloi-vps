import { StyleSheet, Text, TextInput, View } from 'react-native';
import { tokens } from '@/theme/tokens';

export function AppInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  multiline,
}: {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
}) {
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={tokens.colors.muted}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        style={[styles.input, multiline && styles.textarea]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: tokens.colors.text,
  },
  input: {
    minHeight: 50,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
    paddingHorizontal: 16,
    color: tokens.colors.text,
    fontSize: 15,
  },
  textarea: {
    minHeight: 120,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
});
