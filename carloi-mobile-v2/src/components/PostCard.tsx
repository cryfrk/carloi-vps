import { useMemo, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { Image, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import type { MediaAsset, Post } from '@carloi/v2-shared';
import { getMobileApiClient } from '@/lib/api';
import { safeRelativeTime } from '@/lib/date';
import { getReadableErrorMessage } from '@/lib/errors';
import { StatusBadge } from '@/components/StatusBadge';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SectionCard } from '@/components/ui/SectionCard';
import { useSessionStore } from '@/store/session-store';
import { tokens } from '@/theme/tokens';

function MediaStrip({ media }: { media: MediaAsset[] }) {
  if (!media.length) {
    return null;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaStrip}>
      {media.map((item) => (
        <View key={item.id} style={styles.mediaCard}>
          {item.uri ? (
            <Image source={{ uri: item.uri }} style={styles.mediaImage} resizeMode="cover" />
          ) : (
            <View style={styles.mediaPlaceholder}>
              <Feather name={item.kind === 'video' ? 'video' : 'image'} size={22} color={tokens.colors.muted} />
            </View>
          )}
          <View style={styles.mediaBadge}>
            <Text style={styles.mediaBadgeText}>{item.kind === 'video' ? 'Video' : 'Medya'}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

export function PostCard({
  post,
  onOpenListingConversation,
}: {
  post: Post;
  onOpenListingConversation?: (postId: string) => void;
}) {
  const setSnapshot = useSessionStore((state) => state.setSnapshot);
  const snapshot = useSessionStore((state) => state.snapshot);
  const [commentOpen, setCommentOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const client = useMemo(() => getMobileApiClient(), []);

  const isCommercial = post.role?.toLowerCase().includes('ticari') || post.role?.toLowerCase().includes('commercial');

  async function runAction(action: 'like' | 'save' | 'repost') {
    try {
      setBusyAction(action);
      setError('');
      const response = await client.toggleReaction(post.id, action);
      if (response.snapshot) {
        setSnapshot(response.snapshot);
      }
    } catch (actionError) {
      setError(getReadableErrorMessage(actionError));
    } finally {
      setBusyAction(null);
    }
  }

  async function submitComment() {
    if (!comment.trim()) {
      setError('Yorum alani bos birakilamaz.');
      return;
    }

    try {
      setBusyAction('comment');
      setError('');
      const response = await client.commentOnPost(post.id, comment.trim());
      if (response.snapshot) {
        setSnapshot(response.snapshot);
      }
      setComment('');
      setCommentOpen(false);
    } catch (commentError) {
      setError(getReadableErrorMessage(commentError));
    } finally {
      setBusyAction(null);
    }
  }

  async function sharePost() {
    try {
      await Share.share({
        message: post.shareLink || `${snapshot?.profile.name || 'Carloi'} paylasimi`,
      });
    } catch {
      // ignore native share cancellation
    }
  }

  return (
    <SectionCard>
      <View style={styles.headerRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{post.authorName?.slice(0, 1)?.toUpperCase() || 'C'}</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={styles.nameRow}>
            <Text style={styles.authorName}>{post.authorName || 'Carloi kullanicisi'}</Text>
            {isCommercial ? <StatusBadge label="Ticari" tone="accent" /> : null}
          </View>
          <Text style={styles.metaText}>
            @{post.handle || 'carloi'} · {safeRelativeTime(post.createdAt || post.time)}
          </Text>
        </View>
      </View>

      {post.content ? <Text style={styles.content}>{post.content}</Text> : null}

      <MediaStrip media={post.media || []} />

      {post.listing ? (
        <View style={styles.listingCard}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.listingTitle}>{post.listing.title}</Text>
            <Text style={styles.listingPrice}>{post.listing.price}</Text>
            <Text style={styles.listingMeta}>{post.listing.summaryLine || post.listing.location}</Text>
            <Text style={styles.listingMeta}>{post.listing.location}</Text>
          </View>
          <PrimaryButton
            label="Mesaj at"
            onPress={() => onOpenListingConversation?.(post.id)}
          />
        </View>
      ) : null}

      <View style={styles.statsRow}>
        <ActionButton
          icon="heart"
          label={`${post.likes || 0}`}
          active={Boolean(post.likedByUser)}
          disabled={busyAction !== null}
          onPress={() => runAction('like')}
        />
        <ActionButton
          icon="message-circle"
          label={`${post.comments || 0}`}
          disabled={busyAction !== null}
          onPress={() => setCommentOpen((current) => !current)}
        />
        <ActionButton
          icon="repeat"
          label={`${post.reposts || 0}`}
          active={Boolean(post.repostedByUser)}
          disabled={busyAction !== null}
          onPress={() => runAction('repost')}
        />
        <ActionButton
          icon="bookmark"
          label={`${post.views || 0}`}
          active={Boolean(post.savedByUser)}
          disabled={busyAction !== null}
          onPress={() => runAction('save')}
        />
        <ActionButton icon="share-2" label="Paylas" onPress={sharePost} />
      </View>

      {commentOpen ? (
        <View style={styles.commentBox}>
          {post.commentList?.length ? (
            <View style={styles.commentList}>
              {post.commentList.slice(-3).map((item) => (
                <View key={item.id} style={styles.commentItem}>
                  <Text style={styles.commentAuthor}>@{item.handle}</Text>
                  <Text style={styles.commentContent}>{item.content}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Yorum yaz"
            placeholderTextColor={tokens.colors.muted}
            style={styles.commentInput}
          />
          <PrimaryButton
            label={busyAction === 'comment' ? 'Gonderiliyor...' : 'Yorumu gonder'}
            onPress={submitComment}
            disabled={busyAction !== null}
          />
        </View>
      ) : null}

      <ErrorBanner message={error} />
    </SectionCard>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  active = false,
  disabled = false,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.actionButton, active && styles.actionButtonActive, disabled && { opacity: 0.5 }]}
    >
      <Feather name={icon} size={16} color={active ? tokens.colors.accent : tokens.colors.muted} />
      <Text style={[styles.actionLabel, active && styles.actionLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    height: 44,
    width: 44,
    borderRadius: 22,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  authorName: {
    fontSize: 16,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  metaText: {
    color: tokens.colors.muted,
    fontSize: 12,
  },
  content: {
    color: tokens.colors.text,
    lineHeight: 22,
    fontSize: 15,
  },
  mediaStrip: {
    gap: 10,
  },
  mediaCard: {
    width: 240,
    height: 240,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  mediaPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e2e8f0',
  },
  mediaBadge: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
  },
  mediaBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  listingCard: {
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    padding: 14,
    gap: 12,
  },
  listingTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  listingPrice: {
    color: tokens.colors.accent,
    fontWeight: '800',
    fontSize: 18,
  },
  listingMeta: {
    color: tokens.colors.muted,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    minWidth: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  actionButtonActive: {
    opacity: 1,
  },
  actionLabel: {
    color: tokens.colors.muted,
    fontWeight: '700',
    fontSize: 12,
  },
  actionLabelActive: {
    color: tokens.colors.accent,
  },
  commentBox: {
    gap: 10,
  },
  commentList: {
    gap: 8,
  },
  commentItem: {
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    padding: 10,
    gap: 4,
  },
  commentAuthor: {
    color: tokens.colors.text,
    fontWeight: '700',
    fontSize: 12,
  },
  commentContent: {
    color: tokens.colors.text,
    lineHeight: 18,
  },
  commentInput: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    paddingHorizontal: 14,
    color: tokens.colors.text,
  },
});
