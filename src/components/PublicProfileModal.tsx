import { Feather } from '@expo/vector-icons';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';
import { MediaAsset, Post, SearchResultUser } from '../types';
import { AdaptiveModal } from './AdaptiveModal';
import { PostCard } from './PostCard';

interface PublicProfileModalProps {
  visible: boolean;
  user?: SearchResultUser | null;
  posts: Post[];
  listings: Post[];
  currentHandle: string;
  isFollowing: boolean;
  onClose: () => void;
  onToggleFollow: (handle: string) => void;
  onMessage: (handle: string) => void;
  onCommentPress: (post: Post) => void;
  onToggleLike: (postId: string) => void;
  onToggleRepost: (postId: string) => void;
  onToggleSave: (postId: string) => void;
  onOpenListing: (post: Post) => void;
  onOpenMedia: (media: MediaAsset, post: Post) => void;
  onSharePost: (post: Post) => void;
  onCallListing: (post: Post) => void;
  onMessageAuthor: (post: Post) => void;
}

export function PublicProfileModal({
  visible,
  user,
  posts,
  listings,
  currentHandle,
  isFollowing,
  onClose,
  onToggleFollow,
  onMessage,
  onCommentPress,
  onToggleLike,
  onToggleRepost,
  onToggleSave,
  onOpenListing,
  onOpenMedia,
  onSharePost,
  onCallListing,
  onMessageAuthor,
}: PublicProfileModalProps) {
  if (!user) {
    return null;
  }

  return (
    <AdaptiveModal animationType="slide" visible={visible}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.headerButton}>
            <Feather color={theme.colors.text} name="arrow-left" size={18} />
          </Pressable>
          <Text style={styles.headerTitle}>Profil</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            {user.avatarUri ? (
              <Image source={{ uri: user.avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user.name.slice(0, 1)}</Text>
              </View>
            )}
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.handle}>{user.handle}</Text>
            <Text style={styles.note}>{user.note}</Text>

            <View style={styles.actions}>
              <Pressable onPress={() => onMessage(user.handle)} style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>Mesaj</Text>
              </Pressable>
              <Pressable onPress={() => onToggleFollow(user.handle)} style={styles.primaryButton}>
                <Text style={styles.primaryText}>{isFollowing ? 'Arkadaşsınız' : 'Takip et'}</Text>
              </Pressable>
            </View>
          </View>

          {posts.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Paylaşımlar</Text>
              {posts.map((post) => (
                <PostCard
                  key={`public-post-${post.id}`}
                  currentHandle={currentHandle}
                  onCallListing={onCallListing}
                  onCommentPress={onCommentPress}
                  onMessageAuthor={onMessageAuthor}
                  onOpenListing={onOpenListing}
                  onOpenMedia={onOpenMedia}
                  onOpenProfile={() => undefined}
                  onSharePost={onSharePost}
                  onToggleLike={onToggleLike}
                  onToggleRepost={onToggleRepost}
                  onToggleSave={onToggleSave}
                  post={post}
                />
              ))}
            </View>
          ) : null}

          {listings.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>İlanlar</Text>
              {listings.map((post) => (
                <PostCard
                  key={`public-listing-${post.id}`}
                  currentHandle={currentHandle}
                  onCallListing={onCallListing}
                  onCommentPress={onCommentPress}
                  onMessageAuthor={onMessageAuthor}
                  onOpenListing={onOpenListing}
                  onOpenMedia={onOpenMedia}
                  onOpenProfile={() => undefined}
                  onSharePost={onSharePost}
                  onToggleLike={onToggleLike}
                  onToggleRepost={onToggleRepost}
                  onToggleSave={onToggleSave}
                  post={post}
                />
              ))}
            </View>
          ) : null}
        </ScrollView>
      </View>
    </AdaptiveModal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceMuted,
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    paddingBottom: theme.spacing.xxl,
  },
  hero: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySoft,
  },
  avatarImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },
  avatarText: {
    color: theme.colors.primary,
    fontSize: 30,
    fontWeight: '800',
  },
  name: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  handle: {
    color: theme.colors.textSoft,
  },
  note: {
    color: theme.colors.textSoft,
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  primaryButton: {
    minHeight: 42,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: theme.colors.card,
    fontWeight: '800',
  },
  secondaryButton: {
    minHeight: 42,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  section: {
    paddingTop: theme.spacing.md,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
});

