import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getLocale } from '../i18n';
import { AppLanguage, TabKey } from '../types';
import { theme, typeScale } from '../theme';

interface BottomNavProps {
  language: AppLanguage;
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
}

const tabs: Array<{ key: TabKey; icon: keyof typeof Feather.glyphMap }> = [
  { key: 'home', icon: 'home' },
  { key: 'messages', icon: 'message-circle' },
  { key: 'ai', icon: 'cpu' },
  { key: 'vehicle', icon: 'truck' },
  { key: 'profile', icon: 'user' },
];

export function BottomNav({ language, activeTab, onChange }: BottomNavProps) {
  const locale = getLocale(language);

  return (
    <View style={styles.safeEdge}>
      <View style={styles.wrapper}>
        {tabs.map((tab) => {
          const active = tab.key === activeTab;

          return (
            <Pressable key={tab.key} onPress={() => onChange(tab.key)} style={styles.tab}>
              <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
                <Feather
                  color={active ? theme.colors.primary : theme.colors.textSoft}
                  name={tab.icon}
                  size={19}
                />
              </View>
              <Text numberOfLines={1} style={[styles.label, active && styles.activeLabel]}>
                {locale.tabs[tab.key]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeEdge: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  wrapper: {
    flexDirection: 'row',
    borderRadius: 26,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 6,
    ...theme.shadow,
  },
  tab: {
    flex: 1,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  iconWrap: {
    width: 42,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: theme.colors.primarySoft,
  },
  label: {
    fontSize: typeScale.caption,
    color: theme.colors.textSoft,
    fontWeight: '700',
  },
  activeLabel: {
    color: theme.colors.text,
  },
});
