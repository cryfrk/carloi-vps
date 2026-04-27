import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { safeRelativeTime } from '../lib/date';
import { theme } from '../theme';
import type { SnapshotPost } from '../types/app';

interface PostCardProps {
  post: SnapshotPost;
  onLike?: (post: SnapshotPost) => void;
  onComment?: (post: SnapshotPost) => void;
  onSave?: (post: SnapshotPost) => void;
  onShare?: (post: SnapshotPost) => void;
  onMessageListing?: (post: SnapshotPost) => void;
}

function countLabel(value?: number) {
  return `${value || 0}`;
}

export function PostCard({
  post,
  onLike,
  onComment,
  onSave,
  onShare,
  onMessageListing,
}: PostCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          {post.authorAvatarUri ? (
            <Image source={{ uri: post.authorAvatarUri }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarFallback}>{post.authorName.slice(0, 1).toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.headerText}>
          <View style={styles.nameRow}>
            <Text style={styles.author}>{post.authorName}</Text>
            <Text style={styles.handle}>@{post.handle}</Text>
          </View>
          <Text style={styles.time}>{safeRelativeTime(post.createdAt || post.time)}</Text>
        </View>
      </View>

      <Text style={styles.content}>{post.content || 'Aciklama eklenmedi.'}</Text>

      {post.media?.length ? (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.mediaStrip}>
          {post.media.map((media, index) => (
            <Image
              key={`${post.id}-${index}`}
              source={{ uri: media.url }}
              style={styles.media}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
      ) : null}

      {post.type === 'listing' && post.listing ? (
        <View style={styles.listingCard}>
          <Text style={styles.listingTitle}>{post.listing.title || 'Ilan detayi'}</Text>
          <Text style={styles.listingMeta}>
            {post.listing.price ? `${post.listing.price} TL` : 'Fiyat hazirlaniyor'}
            {post.listing.city ? ` • ${post.listing.city}` : ''}
            {post.listing.mileageKm ? ` • ${post.listing.mileageKm} km` : ''}
          </Text>
          <View style={styles.listingActions}>
            <Pressable
              onPress={() => onMessageListing?.(post)}
              style={[styles.inlineButton, styles.inlinePrimary]}
            >
              <Text style={styles.inlinePrimaryText}>Mesaj at</Text>
            </Pressable>
            <Pressable style={styles.inlineButton}>
              <Text style={styles.inlineLabel}>Detayli incele</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={styles.actions}>
        <ActionButton
          icon={post.likedByUser ? 'heart' : 'heart-outline'}
          label={countLabel(post.likes)}
          onPress={() => onLike?.(post)}
          active={Boolean(post.likedByUser)}
        />
        <ActionButton
          icon="chatbubble-ellipses-outline"
          label={countLabel(post.comments)}
          onPress={() => onComment?.(post)}
        />
        <ActionButton
          icon={post.savedByUser ? 'bookmark' : 'bookmark-outline'}
          label="Kaydet"
          onPress={() => onSave?.(post)}
          active={Boolean(post.savedByUser)}
        />
        <ActionButton
          icon="share-social-outline"
          label={countLabel(post.shares)}
          onPress={() => onShare?.(post)}
        />
      </View>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  active = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.actionButton}>
      <Ionicons
        name={icon}
        size={18}
        color={active ? theme.colors.accent : theme.colors.textSoft}
      />
      <Text style={[styles.actionText, active ? styles.actionTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    gap: 14,
    ...theme.shadow.card,
  },
  header: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: 'hidden',
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    color: theme.colors.accent,
    fontSize: 18,
    fontWeight: '800',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  author: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  handle: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  time: {
    color: theme.colors.muted,
    fontSize: 12,
  },
  content: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 23,
  },
  mediaStrip: {
    marginHorizontal: -18,
  },
  media: {
    width: 320,
    height: 260,
    marginHorizontal: 18,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceMuted,
  },
  listingCard: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 22,
    padding: 14,
    gap: 10,
  },
  listingTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
  },
  listingMeta: {
    color: theme.colors.textSoft,
    lineHeight: 20,
  },
  listingActions: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  inlineButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  inlinePrimary: {
    borderColor: theme.colors.text,
    backgroundColor: theme.colors.text,
  },
  inlineLabel: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  inlinePrimaryText: {
    color: theme.colors.surface,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  actionText: {
    color: theme.colors.textSoft,
    fontWeight: '700',
  },
  actionTextActive: {
    color: theme.colors.accent,
  },
});
