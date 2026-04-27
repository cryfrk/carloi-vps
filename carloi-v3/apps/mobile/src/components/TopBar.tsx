import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';

interface TopBarProps {
  title: string;
  subtitle?: string;
  onCreate?: () => void;
  onSearch?: () => void;
  onNotifications?: () => void;
}

export function TopBar({ title, subtitle, onCreate, onSearch, onNotifications }: TopBarProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.actionsLeft}>
        {onCreate ? (
          <Pressable onPress={onCreate} style={styles.iconButton}>
            <Ionicons name="add" size={22} color={theme.colors.text} />
          </Pressable>
        ) : <View style={styles.iconPlaceholder} />}
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <View style={styles.actionsRight}>
        {onSearch ? (
          <Pressable onPress={onSearch} style={styles.iconButton}>
            <Ionicons name="search-outline" size={21} color={theme.colors.text} />
          </Pressable>
        ) : null}
        {onNotifications ? (
          <Pressable onPress={onNotifications} style={styles.iconButton}>
            <Ionicons name="notifications-outline" size={21} color={theme.colors.text} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  actionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  iconPlaceholder: {
    width: 42,
    height: 42,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.muted,
  },
});
