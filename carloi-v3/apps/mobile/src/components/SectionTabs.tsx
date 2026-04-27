import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { theme } from '../theme';

interface SectionTabsProps<T extends string> {
  tabs: readonly T[];
  value: T;
  onChange: (value: T) => void;
}

export function SectionTabs<T extends string>({ tabs, value, onChange }: SectionTabsProps<T>) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {tabs.map((tab) => {
        const active = tab === value;
        return (
          <Pressable
            key={tab}
            onPress={() => onChange(tab)}
            style={[styles.tab, active ? styles.tabActive : styles.tabIdle]}
          >
            <Text style={[styles.label, active ? styles.labelActive : styles.labelIdle]}>{tab}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 10,
    paddingBottom: 4,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  tabActive: {
    backgroundColor: theme.colors.text,
    borderColor: theme.colors.text,
  },
  tabIdle: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
  labelActive: {
    color: theme.colors.surface,
  },
  labelIdle: {
    color: theme.colors.text,
  },
});
