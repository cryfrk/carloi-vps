import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { theme, typeScale } from '../theme';

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  rightSlot?: ReactNode;
  children: ReactNode;
}

export function SectionCard({
  title,
  subtitle,
  rightSlot,
  children,
}: SectionCardProps) {
  return (
    <View style={styles.card}>
      {(title || subtitle || rightSlot) && (
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {rightSlot}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  title: {
    fontSize: typeScale.subtitle,
    fontWeight: '700',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: typeScale.caption,
    color: theme.colors.textSoft,
    lineHeight: 18,
  },
});
