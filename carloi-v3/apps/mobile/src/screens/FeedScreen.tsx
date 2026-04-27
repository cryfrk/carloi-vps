import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { commentOnPost, likePost, savePost, startListingConversation } from '../lib/api';
import { extractSnapshot } from '../lib/api';
import { PostCard } from '../components/PostCard';
import { StateCard } from '../components/StateCard';
import { TopBar } from '../components/TopBar';
import { useSessionStore } from '../store/session-store';
import { theme } from '../theme';
import type { RootStackParamList } from '../types/navigation';
import type { SnapshotPost } from '../types/app';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function FeedScreen() {
  const navigation = useNavigation<Navigation>();
  const snapshot = useSessionStore((state) => state.snapshot);
  const refreshSnapshot = useSessionStore((state) => state.refreshSnapshot);
  const setSnapshot = useSessionStore((state) => state.setSnapshot);
  const error = useSessionStore((state) => state.error);
  const [selectedPost, setSelectedPost] = useState<SnapshotPost | null>(null);
  const [commentText, setCommentText] = useState('');

  const posts = useMemo(() => {
    if (!snapshot) {
      return [];
    }

    const following = new Set(snapshot.profile.followingHandles || []);
    return [...snapshot.posts].sort((left, right) => {
      const leftScore = (following.has(left.handle) ? 1000000 : 0) + new Date(left.createdAt || left.time || 0).getTime();
      const rightScore = (following.has(right.handle) ? 1000000 : 0) + new Date(right.createdAt || right.time || 0).getTime();
      return rightScore - leftScore;
    });
  }, [snapshot]);

  async function handleLike(post: SnapshotPost) {
    const envelope = await likePost(post.id);
    const nextSnapshot = extractSnapshot(envelope);
    if (nextSnapshot) {
      setSnapshot(nextSnapshot);
    } else {
      await refreshSnapshot();
    }
  }

  async function handleSave(post: SnapshotPost) {
    const envelope = await savePost(post.id);
    const nextSnapshot = extractSnapshot(envelope);
    if (nextSnapshot) {
      setSnapshot(nextSnapshot);
    } else {
      await refreshSnapshot();
    }
  }

  async function handleShare(post: SnapshotPost) {
    await Share.share({
      message: post.shareLink || `${post.authorName} paylasimi: ${post.content}`,
    });
  }

  async function handleListingMessage(post: SnapshotPost) {
    const envelope = await startListingConversation(post.id);
    const nextSnapshot = extractSnapshot(envelope);
    if (nextSnapshot) {
      setSnapshot(nextSnapshot);
      const conversation = nextSnapshot.conversations.find((item) => item.listingContext?.id === post.id);
      if (conversation) {
        navigation.navigate('Chat', { conversationId: conversation.id });
      }
    }
  }

  async function submitComment() {
    if (!selectedPost || !commentText.trim()) {
      return;
    }

    const envelope = await commentOnPost(selectedPost.id, commentText.trim());
    const nextSnapshot = extractSnapshot(envelope);
    if (nextSnapshot) {
      setSnapshot(nextSnapshot);
    } else {
      await refreshSnapshot();
    }
    setCommentText('');
    setSelectedPost(null);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <TopBar
        title="Ana Sayfa"
        subtitle="Takip ettiklerin ve yakinindaki arac akisi"
        onCreate={() => navigation.navigate('CreatePost')}
        onSearch={() => navigation.navigate('Search')}
        onNotifications={() => navigation.navigate('Notifications')}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => navigation.navigate('CreatePost')} style={styles.composer}>
          <Text style={styles.composerTitle}>Bugun ne paylasmak istiyorsun?</Text>
          <Text style={styles.composerHint}>Gonderi, arac deneyimi veya ilanini hizlica yayinla.</Text>
        </Pressable>

        {error ? <StateCard title={error.title} description={error.description} tone="warning" /> : null}

        {!snapshot ? (
          <StateCard title="Akis yukleniyor" description="Canli akisa baglaniyor..." loading />
        ) : posts.length === 0 ? (
          <StateCard
            title="Akis bos"
            description="Takip ettigin hesaplarin paylasimlari burada gorunecek. Ilk gonderini hemen simdi olusturabilirsin."
            actionLabel="Gonderi olustur"
            onAction={() => navigation.navigate('CreatePost')}
          />
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLike={(item) => void handleLike(item)}
              onSave={(item) => void handleSave(item)}
              onShare={(item) => void handleShare(item)}
              onComment={(item) => setSelectedPost(item)}
              onMessageListing={(item) => void handleListingMessage(item)}
            />
          ))
        )}
      </ScrollView>

      <Modal
        visible={Boolean(selectedPost)}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedPost(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Yorum yaz</Text>
            <TextInput
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Bu gonderi hakkinda ne dusunuyorsun?"
              multiline
              style={styles.modalInput}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setSelectedPost(null)} style={styles.modalSecondary}>
                <Text style={styles.modalSecondaryText}>Vazgec</Text>
              </Pressable>
              <Pressable onPress={() => void submitComment()} style={styles.modalPrimary}>
                <Text style={styles.modalPrimaryText}>Gonder</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 16,
  },
  composer: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: 18,
    gap: 6,
  },
  composerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
  },
  composerHint: {
    color: theme.colors.textSoft,
    lineHeight: 21,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
    padding: 16,
  },
  modalCard: {
    borderRadius: 26,
    backgroundColor: theme.colors.surface,
    padding: 18,
    gap: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  modalInput: {
    minHeight: 120,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  modalSecondaryText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  modalPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: theme.colors.text,
    alignItems: 'center',
  },
  modalPrimaryText: {
    color: theme.colors.surface,
    fontWeight: '800',
  },
});
