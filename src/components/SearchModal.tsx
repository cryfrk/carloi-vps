import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { theme } from '../theme';
import { Post, SearchResultUser } from '../types';
import { AdaptiveModal } from './AdaptiveModal';

interface SearchModalProps {
  visible: boolean;
  posts: Post[];
  users: SearchResultUser[];
  onClose: () => void;
  onOpenProfile?: (handle: string) => void;
  onOpenListing?: (post: Post) => void;
}

export function SearchModal({
  visible,
  posts,
  users,
  onClose,
  onOpenProfile,
  onOpenListing,
}: SearchModalProps) {
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLocaleLowerCase('tr');

  useEffect(() => {
    if (!visible) {
      setQuery('');
    }
  }, [visible]);

  const userResults = useMemo(
    () =>
      users.filter((user) => {
        if (!normalized) {
          return true;
        }

        return (
          user.name.toLocaleLowerCase('tr').includes(normalized) ||
          user.handle.toLocaleLowerCase('tr').includes(normalized) ||
          user.note.toLocaleLowerCase('tr').includes(normalized)
        );
      }),
    [normalized, users],
  );

  const postResults = useMemo(
    () =>
      posts.filter((post) => {
        if (!normalized) {
          return true;
        }

        return (
          post.authorName.toLocaleLowerCase('tr').includes(normalized) ||
          post.handle.toLocaleLowerCase('tr').includes(normalized) ||
          post.content.toLocaleLowerCase('tr').includes(normalized) ||
          post.hashtags.some((tag) => tag.toLocaleLowerCase('tr').includes(normalized)) ||
          post.listing?.title.toLocaleLowerCase('tr').includes(normalized)
        );
      }),
    [normalized, posts],
  );

  const showEmptyState = normalized.length > 0 && !userResults.length && !postResults.length;

  return (
    <AdaptiveModal animationType="slide" visible={visible}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.headerButton}>
            <Feather color={theme.colors.text} name="arrow-left" size={18} />
          </Pressable>

          <View style={styles.searchField}>
            <Feather color={theme.colors.textSoft} name="search" size={16} />
            <TextInput
              autoFocus
              autoCapitalize="none"
              onChangeText={setQuery}
              placeholder="Kullanıcı, etiket veya ilan ara"
              placeholderTextColor={theme.colors.textSoft}
              style={styles.input}
              value={query}
            />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {!normalized ? (
            <View style={styles.discoveryCard}>
              <Text style={styles.discoveryTitle}>Arama</Text>
              <Text style={styles.discoveryText}>
                Kullanıcı, etiket, gönderi ve ilan başlıkları arasında hızlıca gez.
              </Text>
            </View>
          ) : null}

          {showEmptyState ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Feather color={theme.colors.primary} name="search" size={20} />
              </View>
              <Text style={styles.emptyTitle}>Sonuç bulunamadı</Text>
              <Text style={styles.emptyText}>
                Farklı bir kullanıcı adı, etiket ya da daha kısa bir arama deneyebilirsin.
              </Text>
            </View>
          ) : null}

          {userResults.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Kullanıcılar</Text>
              {userResults.map((user) => (
                <Pressable
                  key={user.id}
                  onPress={() => onOpenProfile?.(user.handle)}
                  style={styles.resultCard}
                >
                  <View style={styles.resultAvatar}>
                    <Text style={styles.resultAvatarText}>{user.name.slice(0, 1)}</Text>
                  </View>
                  <View style={styles.resultCopy}>
                    <Text style={styles.resultTitle}>{user.name}</Text>
                    <Text style={styles.resultHandle}>{user.handle}</Text>
                    <Text style={styles.resultText}>{user.note}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}

          {postResults.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Gönderiler ve ilanlar</Text>
              {postResults.map((post) => (
                <Pressable
                  key={post.id}
                  onPress={() => (post.type === 'listing' ? onOpenListing?.(post) : onOpenProfile?.(post.handle))}
                  style={styles.postCard}
                >
                  <Text style={styles.resultTitle}>
                    {post.authorName} <Text style={styles.inlineHandle}>{post.handle}</Text>
                  </Text>
                  <Text numberOfLines={3} style={styles.resultText}>
                    {post.type === 'listing' ? post.listing?.title || post.content : post.content}
                  </Text>
                  {post.hashtags.length ? (
                    <Text style={styles.resultHandle}>{post.hashtags.join(' ')}</Text>
                  ) : null}
                </Pressable>
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
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceMuted,
  },
  searchField: {
    flex: 1,
    minHeight: 48,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  input: {
    flex: 1,
    color: theme.colors.text,
  },
  content: {
    padding: theme.spacing.md,
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  discoveryCard: {
    borderRadius: 24,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: 6,
    ...theme.shadow,
  },
  discoveryTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  discoveryText: {
    color: theme.colors.textSoft,
    lineHeight: 20,
  },
  section: {
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  resultCard: {
    borderRadius: 22,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    flexDirection: 'row',
    ...theme.shadow,
  },
  resultAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultAvatarText: {
    color: theme.colors.primary,
    fontWeight: '800',
    fontSize: 16,
  },
  resultCopy: {
    flex: 1,
    gap: 2,
  },
  resultTitle: {
    color: theme.colors.text,
    fontWeight: '800',
  },
  inlineHandle: {
    color: theme.colors.textSoft,
    fontWeight: '600',
  },
  resultHandle: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  resultText: {
    color: theme.colors.textSoft,
    lineHeight: 18,
  },
  postCard: {
    borderRadius: 22,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: 6,
    ...theme.shadow,
  },
  emptyState: {
    borderRadius: 24,
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
});

