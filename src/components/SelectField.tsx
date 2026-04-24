import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { theme, typeScale } from '../theme';

interface SelectFieldProps {
  label: string;
  value?: string;
  placeholder: string;
  options: string[];
  helperText?: string;
  emptyText?: string;
  open: boolean;
  searchable?: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
}

export function SelectField({
  label,
  value,
  placeholder,
  options,
  helperText,
  emptyText = 'Önce bir üst alan seçin.',
  open,
  searchable = true,
  onToggle,
  onSelect,
}: SelectFieldProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) {
      setQuery('');
    }
  }, [open]);

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('tr');
    if (!normalized) {
      return options;
    }

    return options.filter((option) => option.toLocaleLowerCase('tr').includes(normalized));
  }, [options, query]);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}

      <Pressable onPress={onToggle} style={[styles.trigger, open && styles.triggerOpen]}>
        <Text style={[styles.triggerText, !value && styles.placeholder]}>{value || placeholder}</Text>
        <Feather
          color={open ? theme.colors.primary : theme.colors.textSoft}
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
        />
      </Pressable>

      {open ? (
        <View style={styles.dropdown}>
          {searchable && options.length > 8 ? (
            <View style={styles.searchBox}>
              <Feather color={theme.colors.textSoft} name="search" size={15} />
              <TextInput
                onChangeText={setQuery}
                placeholder={`${label} içinde ara`}
                placeholderTextColor={theme.colors.textSoft}
                style={styles.searchInput}
                value={query}
              />
            </View>
          ) : null}

          {filteredOptions.length ? (
            <ScrollView nestedScrollEnabled style={styles.optionsList}>
              {filteredOptions.map((option) => {
                const isActive = option === value;

                return (
                  <Pressable
                    key={option}
                    onPress={() => onSelect(option)}
                    style={[styles.option, isActive && styles.optionActive]}
                  >
                    <Text style={[styles.optionText, isActive && styles.optionTextActive]}>
                      {option}
                    </Text>
                    {isActive ? <Feather color={theme.colors.primary} name="check" size={16} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <Text style={styles.emptyText}>{options.length ? 'Sonuç bulunamadı.' : emptyText}</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: theme.spacing.xs,
  },
  label: {
    fontSize: typeScale.body,
    fontWeight: '700',
    color: theme.colors.text,
  },
  helper: {
    fontSize: typeScale.caption,
    color: theme.colors.textSoft,
    lineHeight: 18,
  },
  trigger: {
    minHeight: 52,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  triggerOpen: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  triggerText: {
    flex: 1,
    color: theme.colors.text,
    fontSize: typeScale.body,
  },
  placeholder: {
    color: theme.colors.textSoft,
  },
  dropdown: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    padding: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  searchBox: {
    minHeight: 42,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
  },
  optionsList: {
    maxHeight: 220,
  },
  option: {
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  optionActive: {
    backgroundColor: theme.colors.primarySoft,
  },
  optionText: {
    flex: 1,
    color: theme.colors.text,
    fontWeight: '600',
  },
  optionTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  emptyText: {
    color: theme.colors.textSoft,
    fontSize: typeScale.caption,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
  },
});

