import { Feather } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { tokens } from '@/theme/tokens';

const logo = require('../../assets/carloi.png');

export function TopHeader({
  title,
  subtitle,
  onPressCreate,
  onPressSearch,
}: {
  title: string;
  subtitle?: string;
  onPressCreate?: () => void;
  onPressSearch?: () => void;
}) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.leftBlock}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {(onPressCreate || onPressSearch) ? (
        <View style={styles.actions}>
          {onPressCreate ? <HeaderIconButton icon="plus-square" label="Olustur" onPress={onPressCreate} /> : null}
          {onPressSearch ? <HeaderIconButton icon="search" label="Ara" onPress={onPressSearch} /> : null}
        </View>
      ) : null}
    </View>
  );
}

function HeaderIconButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.iconButton}>
      <Feather name={icon} size={18} color={tokens.colors.text} />
      <Text style={styles.iconLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  leftBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  subtitle: {
    marginTop: 2,
    color: tokens.colors.muted,
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    minWidth: 54,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: tokens.colors.text,
  },
});
