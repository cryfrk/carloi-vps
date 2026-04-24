import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';
import { Post } from '../types';
import { AdaptiveModal } from './AdaptiveModal';

interface StatsModalProps {
  visible: boolean;
  post?: Post | null;
  onClose: () => void;
}

export function StatsModal({ visible, post, onClose }: StatsModalProps) {
  if (!post) {
    return null;
  }

  const stats = [
    { label: 'Görüntülenme', value: post.views },
    { label: 'Paylaşım', value: post.shares },
    { label: 'Beğeni', value: post.likes },
    { label: 'Yorum', value: post.comments },
    { label: 'Yeniden paylaşım', value: post.reposts },
  ];

  if (post.listing) {
    stats.push(
      { label: 'Kaydetme', value: post.listing.stats.saves },
      { label: 'Mesaj talebi', value: post.listing.stats.messages },
      { label: 'Arama tıklaması', value: post.listing.stats.calls },
    );
  }

  return (
    <AdaptiveModal animationType="slide" transparent visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>İstatistikler</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Feather color={theme.colors.textSoft} name="x" size={18} />
            </Pressable>
          </View>

          <Text numberOfLines={2} style={styles.subtitle}>
            {post.type === 'listing' ? post.listing?.title : post.content || 'Paylaşım'}
          </Text>

          <View style={styles.grid}>
            {stats.map((item) => (
              <View key={item.label} style={styles.card}>
                <Text style={styles.value}>{item.value}</Text>
                <Text style={styles.label}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </AdaptiveModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: theme.colors.overlay,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  subtitle: {
    color: theme.colors.textSoft,
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.lg,
  },
  card: {
    width: '47%',
    borderRadius: 18,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: 4,
  },
  value: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  label: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: '700',
  },
});

