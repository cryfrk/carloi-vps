import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getLocale } from '../i18n';
import { AppLanguage, TabKey } from '../types';
import { theme, typeScale } from '../theme';

interface TopBarProps {
  language: AppLanguage;
  activeTab: TabKey;
  onSearchPress: () => void;
  onComposePress: () => void;
}

export function TopBar({ language, activeTab, onSearchPress, onComposePress }: TopBarProps) {
  const locale = getLocale(language);

  return (
    <View style={styles.wrapper}>
      <View style={styles.titleWrap}>
        <Text style={styles.brand}>CARLOI</Text>
        <Text style={styles.section}>{locale.tabs[activeTab]}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable onPress={onSearchPress} style={styles.iconButton}>
          <Feather color={theme.colors.text} name="search" size={18} />
        </Pressable>
        <Pressable onPress={onComposePress} style={[styles.iconButton, styles.composeButton]}>
          <Feather color={theme.colors.card} name="plus" size={18} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    minHeight: 56,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleWrap: {
    gap: 1,
  },
  brand: {
    color: theme.colors.primary,
    fontWeight: '800',
    letterSpacing: 1.4,
    fontSize: 11,
  },
  section: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: typeScale.subtitle,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceMuted,
  },
  composeButton: {
    backgroundColor: theme.colors.primary,
  },
});
