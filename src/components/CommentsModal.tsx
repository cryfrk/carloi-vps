import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { theme } from '../theme';
import { Post } from '../types';
import { AdaptiveModal } from './AdaptiveModal';

interface CommentsModalProps {
  visible: boolean;
  post?: Post | null;
  onClose: () => void;
  onSubmit: (postId: string, content: string) => void;
}

export function CommentsModal({ visible, post, onClose, onSubmit }: CommentsModalProps) {
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!visible) {
      setDraft('');
    }
  }, [visible]);

  if (!post) {
    return null;
  }

  const submit = () => {
    if (!draft.trim()) {
      return;
    }

    onSubmit(post.id, draft.trim());
    setDraft('');
  };

  return (
    <AdaptiveModal animationType="slide" visible={visible}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.headerButton}>
            <Feather color={theme.colors.text} name="arrow-left" size={18} />
          </Pressable>
          <Text style={styles.title}>Yorumlar</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.postCard}>
            <Text style={styles.postAuthor}>{post.authorName}</Text>
            <Text style={styles.postContent}>{post.content || 'Yeniden paylaşım'}</Text>
          </View>

          {post.commentList?.length ? (
            post.commentList.map((comment) => (
              <View key={comment.id} style={styles.commentRow}>
                {comment.authorAvatarUri ? (
                  <Image source={{ uri: comment.authorAvatarUri }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{comment.authorName.slice(0, 1)}</Text>
                  </View>
                )}
                <View style={styles.commentBubble}>
                  <Text style={styles.commentAuthor}>
                    {comment.authorName} <Text style={styles.commentHandle}>{comment.handle}</Text>
                  </Text>
                  <Text style={styles.commentText}>{comment.content}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>İlk yorumu sen yap</Text>
              <Text style={styles.emptyText}>
                Gönderi altındaki yorumlar burada birikir ve uygulama içinde kalıcı olarak saklanır.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            multiline
            onChangeText={setDraft}
            placeholder="Yorum yaz"
            placeholderTextColor={theme.colors.textSoft}
            style={styles.input}
            textAlignVertical="top"
            value={draft}
          />
          <Pressable onPress={submit} style={styles.sendButton}>
            <Feather color={theme.colors.card} name="send" size={16} />
          </Pressable>
        </View>
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
  title: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  postCard: {
    borderRadius: 22,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: 6,
  },
  postAuthor: {
    color: theme.colors.text,
    fontWeight: '800',
  },
  postContent: {
    color: theme.colors.textSoft,
    lineHeight: 20,
  },
  commentRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'flex-start',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarText: {
    color: theme.colors.primary,
    fontWeight: '800',
  },
  commentBubble: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: 4,
  },
  commentAuthor: {
    color: theme.colors.text,
    fontWeight: '800',
  },
  commentHandle: {
    color: theme.colors.textSoft,
    fontWeight: '600',
  },
  commentText: {
    color: theme.colors.textSoft,
    lineHeight: 19,
  },
  emptyState: {
    borderRadius: 22,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 17,
  },
  emptyText: {
    color: theme.colors.textSoft,
    textAlign: 'center',
    lineHeight: 20,
  },
  composer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'flex-end',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  input: {
    flex: 1,
    minHeight: 76,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    color: theme.colors.text,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
});

