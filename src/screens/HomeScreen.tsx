import { Feather } from '@expo/vector-icons';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PostCard } from '../components/PostCard';
import { theme } from '../theme';
import { MediaAsset, Post, SearchResultUser, SocialProfile, VehicleProfile } from '../types';

interface HomeScreenProps {
  posts: Post[];
  profile: SocialProfile;
  users: SearchResultUser[];
  vehicle?: VehicleProfile;
  onComposePress: () => void;
  onStartListingPress: () => void;
  onVehiclePress: () => void;
  onCommentPress: (post: Post) => void;
  onToggleLike: (postId: string) => void;
  onToggleRepost: (postId: string) => void;
  onToggleSave: (postId: string) => void;
  onOpenListing: (post: Post) => void;
  onOpenMedia: (media: MediaAsset, post: Post) => void;
  onOpenProfile: (handle: string) => void;
  onSharePost: (post: Post) => void;
  onEditPost: (post: Post) => void;
  onOpenStats: (post: Post) => void;
  onCallListing: (post: Post) => void;
  onMessageAuthor: (post: Post) => void;
  onDeletePost: (post: Post) => void;
  onToggleListingSold: (post: Post, isSold: boolean) => void;
}

export function HomeScreen({
  posts,
  profile,
  users,
  vehicle,
  onComposePress,
  onStartListingPress,
  onVehiclePress,
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
}: HomeScreenProps) {
  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={styles.heroEyebrow}>ANA AKIS</Text>
          <Text style={styles.heroTitle}>Otomotiv timeline'ına hoş geldin</Text>
          <Text style={styles.heroText}>
            Paylaşımlar, ilanlar ve topluluk etkileşimleri tek premium akışta birleşir.
          </Text>
        </View>
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{posts.length}</Text>
            <Text style={styles.heroStatLabel}>Yayin</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{users.length}</Text>
            <Text style={styles.heroStatLabel}>Hesap</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{vehicle ? '1' : '0'}</Text>
            <Text style={styles.heroStatLabel}>Arac</Text>
          </View>
        </View>
      </View>

      <View style={styles.composerCard}>
        <View style={styles.composerTop}>
          {profile.avatarUri ? (
            <Image source={{ uri: profile.avatarUri }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{profile.name.slice(0, 1)}</Text>
            </View>
          )}

          <Pressable onPress={onComposePress} style={styles.composerInput}>
            <Text style={styles.composerPlaceholder}>Bir şey paylaş, soru sor ya da yeni bir ilan başlat...</Text>
          </Pressable>

          <Pressable onPress={onComposePress} style={styles.composeFab}>
            <Feather color={theme.colors.card} name="plus" size={18} />
          </Pressable>
        </View>

        <View style={styles.composerActions}>
          <Pressable onPress={onComposePress} style={styles.actionChip}>
            <Feather color={theme.colors.primary} name="image" size={14} />
            <Text style={styles.actionChipText}>Medya</Text>
          </Pressable>
          <Pressable onPress={onStartListingPress} style={styles.actionChip}>
            <Feather color={theme.colors.primary} name="tag" size={14} />
            <Text style={styles.actionChipText}>Listing</Text>
          </Pressable>
          <Pressable onPress={onVehiclePress} style={styles.actionChip}>
            <Feather color={theme.colors.primary} name="truck" size={14} />
            <Text style={styles.actionChipText}>{vehicle ? 'Aracim' : 'Arac ekle'}</Text>
          </Pressable>
        </View>
      </View>

      {users.length ? (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Keşfet</Text>
            <Text style={styles.sectionHint}>Öne çıkan hesaplar</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.userRow}>
              {users.slice(0, 8).map((user) => (
                <Pressable key={user.handle} onPress={() => onOpenProfile(user.handle)} style={styles.userCard}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>{user.name.slice(0, 1)}</Text>
                  </View>
                  <Text numberOfLines={1} style={styles.userName}>
                    {user.name}
                  </Text>
                  <Text numberOfLines={1} style={styles.userHandle}>
                    {user.handle}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.feedWrap}>
        {posts.length ? (
          posts.map((post) => (
            <PostCard
              key={post.id}
              currentHandle={profile.handle}
              onCallListing={onCallListing}
              onCommentPress={onCommentPress}
              onEditPost={onEditPost}
              onDeletePost={onDeletePost}
              onMessageAuthor={onMessageAuthor}
              onOpenListing={onOpenListing}
              onOpenMedia={onOpenMedia}
              onOpenProfile={onOpenProfile}
              onOpenStats={onOpenStats}
              onSharePost={onSharePost}
              onToggleLike={onToggleLike}
              onToggleListingSold={onToggleListingSold}
              onToggleRepost={onToggleRepost}
              onToggleSave={onToggleSave}
              post={post}
            />
          ))
        ) : (
          <View style={styles.emptyFeed}>
            <View style={styles.emptyIcon}>
              <Feather color={theme.colors.primary} name="radio" size={20} />
            </View>
            <Text style={styles.emptyTitle}>Akış henüz boş</Text>
            <Text style={styles.emptyText}>
              İlk paylaşımını yaparak ya da bir ilan oluşturarak topluluk akışına katıl.
            </Text>
            <Pressable onPress={onComposePress} style={styles.emptyButton}>
              <Text style={styles.emptyButtonText}>İlk paylaşımını yap</Text>
            </Pressable>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  hero: {
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: 24,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    ...theme.shadow,
  },
  heroCopy: {
    gap: 6,
  },
  heroEyebrow: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  heroText: {
    color: theme.colors.textSoft,
    lineHeight: 19,
  },
  heroStats: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  heroStat: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 12,
    gap: 2,
  },
  heroStatValue: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  heroStatLabel: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: '700',
  },
  composerCard: {
    marginHorizontal: theme.spacing.md,
    borderRadius: 24,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    ...theme.shadow,
  },
  composerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  avatarText: {
    color: theme.colors.card,
    fontWeight: '800',
  },
  composerInput: {
    flex: 1,
    minHeight: 46,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.md,
    justifyContent: 'center',
  },
  composerPlaceholder: {
    color: theme.colors.textSoft,
  },
  composeFab: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  composerActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 9,
  },
  actionChipText: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  section: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  sectionHint: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: '700',
  },
  userRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  userCard: {
    width: 92,
    borderRadius: 18,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm,
    gap: 4,
    alignItems: 'center',
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: theme.colors.primary,
    fontWeight: '800',
  },
  userName: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  userHandle: {
    color: theme.colors.textSoft,
    fontSize: 11,
  },
  feedWrap: {
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xxl,
  },
  emptyFeed: {
    marginHorizontal: theme.spacing.md,
    borderRadius: 28,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.sm,
    ...theme.shadow,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    color: theme.colors.textSoft,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: theme.spacing.xs,
    minWidth: 180,
    minHeight: 44,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  emptyButtonText: {
    color: theme.colors.card,
    fontWeight: '800',
  },
});
