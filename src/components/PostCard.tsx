import { Feather } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';
import { ListingDetails, MediaAsset, Post } from '../types';
import { MediaCarousel } from './MediaCarousel';

interface PostCardProps {
  post: Post;
  currentHandle: string;
  onCommentPress?: (post: Post) => void;
  onToggleLike?: (postId: string) => void;
  onToggleRepost?: (postId: string) => void;
  onToggleSave?: (postId: string) => void;
  onOpenListing?: (post: Post) => void;
  onOpenMedia?: (media: MediaAsset, post: Post) => void;
  onOpenProfile?: (handle: string) => void;
  onSharePost?: (post: Post) => void;
  onEditPost?: (post: Post) => void;
  onOpenStats?: (post: Post) => void;
  onCallListing?: (post: Post) => void;
  onMessageAuthor?: (post: Post) => void;
  onDeletePost?: (post: Post) => void;
  onToggleListingSold?: (post: Post, isSold: boolean) => void;
}

function formatPostDateTime(iso?: string) {
  if (!iso) {
    return 'Bilinmiyor';
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return 'Bilinmiyor';
  }

  const now = new Date();
  const isSameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isSameDay) {
    return new Intl.DateTimeFormat('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  if (date.getFullYear() === now.getFullYear()) {
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: 'short',
    }).format(date);
  }

  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatPostMeta(createdAt?: string, lastEditedAt?: string) {
  if (lastEditedAt) {
    return `Düzenlendi · ${formatPostDateTime(lastEditedAt)}`;
  }

  return formatPostDateTime(createdAt);
}

function PostMedia({
  post,
  onOpenMedia,
}: {
  post: Post;
  onOpenMedia?: (media: MediaAsset, post: Post) => void;
}) {
  if (!post.media.length) {
    return null;
  }

  return (
    <View style={styles.mediaHero}>
      <MediaCarousel
        compactReport={Boolean(post.listing)}
        height={post.listing ? 332 : 312}
        onOpenMedia={onOpenMedia}
        post={post}
      />
    </View>
  );
}

function ListingPreview({
  listing,
  post,
  isOwner,
  onOpen,
  onCall,
  onMessage,
  onToggleSold,
}: {
  listing: ListingDetails;
  post: Post;
  isOwner?: boolean;
  onOpen?: (post: Post) => void;
  onCall?: (post: Post) => void;
  onMessage?: (post: Post) => void;
  onToggleSold?: (post: Post, isSold: boolean) => void;
}) {
  const packageSpec =
    listing.specTable.find((item) => item.label.toLowerCase() === 'paket')?.value ??
    'Paket bilgisi yok';
  const engineSpec =
    listing.specTable.find((item) => item.label.toLowerCase() === 'motor')?.value ??
    'Motor bilgisi yok';

  return (
    <View style={styles.listingBox}>
      <View style={styles.listingHeader}>
        <View style={styles.listingHeading}>
          <Text style={styles.listingPrice}>{listing.price}</Text>
          <Text numberOfLines={2} style={styles.listingTitle}>
            {listing.title}
          </Text>
          {listing.isSold ? (
            <View style={styles.soldBadge}>
              <Text style={styles.soldBadgeText}>SATILDI</Text>
            </View>
          ) : null}
          <View style={styles.locationRow}>
            <Feather color={theme.colors.textSoft} name="map-pin" size={13} />
            <Text style={styles.listingLocation}>{listing.location}</Text>
          </View>
        </View>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoPill}>
          <Text style={styles.infoLabel}>Paket</Text>
          <Text numberOfLines={1} style={styles.infoValue}>
            {packageSpec}
          </Text>
        </View>
        <View style={styles.infoPill}>
          <Text style={styles.infoLabel}>Motor</Text>
          <Text numberOfLines={1} style={styles.infoValue}>
            {engineSpec}
          </Text>
        </View>
      </View>

      <View style={styles.listingActions}>
        <Pressable onPress={() => onMessage?.(post)} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Mesaj</Text>
        </Pressable>
        {listing.contactPhone ? (
          <Pressable onPress={() => onCall?.(post)} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Ara</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={() => onOpen?.(post)} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Detay</Text>
        </Pressable>
      </View>

      {isOwner ? (
        <Pressable
          onPress={() => onToggleSold?.(post, !listing.isSold)}
          style={styles.soldToggleButton}
        >
          <Text style={styles.soldToggleButtonText}>
            {listing.isSold ? 'Yeniden yayına al' : 'Satıldı olarak işaretle'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function PostCard({
  post,
  currentHandle,
  onCommentPress,
  onToggleLike,
  onToggleRepost,
  onToggleSave,
  onOpenListing,
  onOpenMedia,
  onOpenProfile,
  onSharePost,
  onEditPost,
  onOpenStats,
  onCallListing,
  onMessageAuthor,
  onDeletePost,
  onToggleListingSold,
}: PostCardProps) {
  const isOwner = post.handle === currentHandle;
  const hideListingBody = post.type === 'listing' && Boolean(post.listing) && !post.repostOf;
  const timeLabel = formatPostMeta(post.createdAt, post.lastEditedAt);
  const showMediaFirst = !post.repostOf && post.media.length > 0;

  const renderAvatar = () =>
    post.authorAvatarUri ? (
      <Image source={{ uri: post.authorAvatarUri }} style={styles.avatarImage} />
    ) : (
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{post.authorName.slice(0, 1)}</Text>
      </View>
    );

  return (
    <View style={styles.card}>
      {post.repostOf ? (
        <View style={styles.repostMeta}>
          <Feather color={theme.colors.textSoft} name="repeat" size={14} />
          <Text style={styles.repostMetaText}>{post.authorName} bunu yeniden paylaştı</Text>
        </View>
      ) : null}

      <View style={styles.header}>
        <Pressable onPress={() => onOpenProfile?.(post.handle)} style={styles.profileTouch}>
          {renderAvatar()}
        </Pressable>

        <View style={styles.headerCopy}>
          <View style={styles.nameRow}>
            <Pressable onPress={() => onOpenProfile?.(post.handle)} style={styles.nameTouch}>
              <Text style={styles.author}>{post.authorName}</Text>
              <Text style={styles.meta}>{post.handle}</Text>
            </Pressable>
            <Text style={styles.meta}>•</Text>
            <Text style={styles.meta}>{timeLabel}</Text>
          </View>

          {showMediaFirst ? <PostMedia onOpenMedia={onOpenMedia} post={post} /> : null}

          {!hideListingBody && post.content ? <Text style={styles.content}>{post.content}</Text> : null}
          {!hideListingBody && post.hashtags.length ? (
            <Text style={styles.tags}>{post.hashtags.join(' ')}</Text>
          ) : null}

          {isOwner ? (
            <View style={styles.ownerActions}>
              <Pressable onPress={() => onEditPost?.(post)} style={styles.ownerPill}>
                <Text style={styles.ownerPillText}>Düzenle</Text>
              </Pressable>
              <Pressable onPress={() => onOpenStats?.(post)} style={styles.ownerPill}>
                <Text style={styles.ownerPillText}>İstatistik</Text>
              </Pressable>
              <Pressable onPress={() => onDeletePost?.(post)} style={styles.ownerPill}>
                <Text style={styles.ownerPillText}>Sil</Text>
              </Pressable>
            </View>
          ) : null}

          {post.repostOf ? (
            <View style={styles.repostCard}>
              <View style={styles.nameRow}>
                <Text style={styles.author}>{post.repostOf.authorName}</Text>
                <Text style={styles.meta}>{post.repostOf.handle}</Text>
              </View>
              <Text style={styles.content}>
                {post.repostOf.content || 'Yeniden paylaşılan gönderi'}
              </Text>
              {post.repostOf.listing ? (
                <ListingPreview
                  isOwner={isOwner}
                  listing={post.repostOf.listing}
                  onCall={onCallListing}
                  onMessage={onMessageAuthor}
                  onOpen={onOpenListing}
                  onToggleSold={onToggleListingSold}
                  post={{
                    ...post,
                    id: post.repostOf.id,
                    authorName: post.repostOf.authorName,
                    handle: post.repostOf.handle,
                    authorAvatarUri: post.repostOf.authorAvatarUri,
                    media: post.repostOf.media,
                    listing: post.repostOf.listing,
                    type: 'listing',
                  }}
                />
              ) : null}
              <PostMedia
                onOpenMedia={onOpenMedia}
                post={{
                  ...post,
                  media: post.repostOf.media,
                  listing: post.repostOf.listing,
                  type: post.repostOf.type,
                }}
              />
            </View>
          ) : null}

          {!post.repostOf && !showMediaFirst ? <PostMedia onOpenMedia={onOpenMedia} post={post} /> : null}

          {post.type === 'listing' && post.listing ? (
            <ListingPreview
              isOwner={isOwner}
              listing={post.listing}
              onCall={onCallListing}
              onMessage={onMessageAuthor}
              onOpen={onOpenListing}
              onToggleSold={onToggleListingSold}
              post={post}
            />
          ) : null}

          <View style={styles.actions}>
            <Pressable onPress={() => onCommentPress?.(post)} style={styles.actionItem}>
              <Feather color={theme.colors.textSoft} name="message-circle" size={16} />
              <Text style={styles.actionText}>{post.comments}</Text>
            </Pressable>
            <Pressable onPress={() => onToggleRepost?.(post.id)} style={styles.actionItem}>
              <Feather
                color={post.repostedByUser ? theme.colors.success : theme.colors.textSoft}
                name="repeat"
                size={16}
              />
              <Text style={styles.actionText}>{post.reposts}</Text>
            </Pressable>
            <Pressable onPress={() => onToggleLike?.(post.id)} style={styles.actionItem}>
              <Feather
                color={post.likedByUser ? theme.colors.danger : theme.colors.textSoft}
                name="heart"
                size={16}
              />
              <Text style={styles.actionText}>{post.likes}</Text>
            </Pressable>
            <Pressable onPress={() => onToggleSave?.(post.id)} style={styles.actionItem}>
              <Feather
                color={post.savedByUser ? theme.colors.primary : theme.colors.textSoft}
                name="bookmark"
                size={16}
              />
            </Pressable>
            <Pressable onPress={() => onSharePost?.(post)} style={styles.actionItem}>
              <Feather color={theme.colors.textSoft} name="share-2" size={16} />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
  },
  repostMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: theme.spacing.xs,
    marginLeft: 52,
  },
  repostMetaText: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  profileTouch: {
    borderRadius: 999,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarText: {
    color: theme.colors.card,
    fontWeight: '800',
  },
  headerCopy: {
    flex: 1,
    gap: theme.spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  nameTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  author: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 15,
  },
  meta: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    color: theme.colors.text,
    lineHeight: 21,
  },
  tags: {
    color: theme.colors.primary,
    lineHeight: 20,
  },
  ownerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  ownerPill: {
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
  },
  ownerPillText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  repostCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  mediaHero: {
    marginTop: 2,
    marginBottom: 2,
  },
  listingBox: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceMuted,
  },
  listingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  listingHeading: {
    flex: 1,
    gap: 6,
  },
  listingPrice: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  listingTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  soldBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.danger,
  },
  soldBadgeText: {
    color: theme.colors.card,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  listingLocation: {
    color: theme.colors.textSoft,
    fontSize: 13,
  },
  infoRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  infoPill: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    gap: 4,
  },
  infoLabel: {
    color: theme.colors.textSoft,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoValue: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  listingActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  primaryButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  primaryButtonText: {
    color: theme.colors.card,
    fontWeight: '800',
  },
  secondaryButton: {
    minWidth: 92,
    minHeight: 42,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  soldToggleButton: {
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
  },
  soldToggleButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingTop: 2,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: '700',
  },
});

