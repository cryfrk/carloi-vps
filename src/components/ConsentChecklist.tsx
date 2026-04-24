import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';

interface ConsentChecklistItem {
  key: string;
  title: string;
  description: string;
  value: boolean;
  required?: boolean;
  onToggle: (value: boolean) => void;
  onOpen?: () => void;
  openLabel?: string;
}

interface ConsentChecklistProps {
  title?: string;
  items: ConsentChecklistItem[];
}

export function ConsentChecklist({ title, items }: ConsentChecklistProps) {
  return (
    <View style={styles.card}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {items.map((item) => (
        <View key={item.key} style={styles.row}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: item.value }}
            accessibilityLabel={item.title}
            hitSlop={8}
            onPress={() => item.onToggle(!item.value)}
            style={[styles.checkbox, item.value && styles.checkboxActive]}
          >
            {item.value ? <View style={styles.checkboxDot} /> : null}
          </Pressable>
          <View style={styles.copy}>
            {item.onOpen ? (
              <Pressable
                accessibilityRole="button"
                accessibilityHint={item.openLabel || 'Onay metnini goruntule'}
                hitSlop={8}
                onPress={item.onOpen}
                style={styles.titleButton}
              >
                <Text style={styles.itemTitle}>
                  {item.title}
                  {item.required ? ' *' : ''}
                </Text>
              </Pressable>
            ) : (
              <Text style={styles.itemTitle}>
                {item.title}
                {item.required ? ' *' : ''}
              </Text>
            )}
            <Text style={styles.itemDescription}>{item.description}</Text>
            {item.onOpen ? (
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={item.onOpen}
                style={styles.openButton}
              >
                <Text style={styles.openButtonText}>{item.openLabel || 'Goruntule'}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: theme.spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
  },
  title: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  checkboxDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  itemTitle: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  itemDescription: {
    color: theme.colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
  },
  titleButton: {
    alignSelf: 'flex-start',
  },
  openButton: {
    alignSelf: 'flex-start',
    minHeight: 34,
    justifyContent: 'center',
  },
  openButtonText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
