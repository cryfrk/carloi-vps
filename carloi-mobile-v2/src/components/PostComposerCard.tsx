import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import type { MediaKind } from '@carloi/v2-shared';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { getMobileApiClient } from '@/lib/api';
import { useSessionStore } from '@/store/session-store';
import { AppInput } from '@/components/ui/AppInput';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SectionCard } from '@/components/ui/SectionCard';
import { tokens } from '@/theme/tokens';

export function PostComposerCard() {
  const setSnapshot = useSessionStore((state) => state.setSnapshot);
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function pickMedia() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.9,
      allowsMultipleSelection: true,
      selectionLimit: 4,
    });

    if (!result.canceled) {
      setMedia(result.assets);
    }
  }

  async function submitPost() {
    setSubmitting(true);
    setError('');
    try {
      const client = getMobileApiClient();
      const uploaded: Array<{
        kind: MediaKind;
        uri?: string;
        label: string;
        hint: string;
        fileName?: string;
        mimeType?: string;
      }> = [];

      for (const asset of media) {
        const formData = new FormData();
        formData.append('file', {
          uri: asset.uri,
          name: asset.fileName || `media-${Date.now()}.${asset.mimeType?.includes('video') ? 'mp4' : 'jpg'}`,
          type: asset.mimeType || 'image/jpeg',
        } as never);
        const uploadResponse = await client.uploadMedia(formData);
        const kind: MediaKind = asset.mimeType?.includes('video') ? 'video' : 'image';
        uploaded.push({
          kind,
          uri: uploadResponse.url,
          label: asset.fileName || 'Medya',
          hint: 'Mobil V2 upload',
          fileName: asset.fileName || undefined,
          mimeType: asset.mimeType || undefined,
        });
      }

      const response = await client.createPost({
        content,
        postType: 'standard',
        selectedMediaKinds: uploaded.map((item) => item.kind),
        selectedMedia: uploaded,
      });

      if (response.snapshot) {
        setSnapshot(response.snapshot);
      }

      setContent('');
      setMedia([]);
      Alert.alert('Paylaşıldı', 'Gönderi akışa eklendi.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Gönderi paylaşılırken hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SectionCard>
      <Text style={styles.title}>Hızlı paylaşım</Text>
      <AppInput
        value={content}
        onChangeText={setContent}
        placeholder="Araç deneyimini, yeni ilanı veya medya paylaşımını yaz."
        multiline
      />
      <View style={styles.row}>
        <PrimaryButton label="Medya ekle" variant="secondary" onPress={pickMedia} />
        <PrimaryButton label={submitting ? 'Paylaşılıyor...' : 'Paylaş'} onPress={submitPost} disabled={submitting} />
      </View>
      {media.length ? <Text style={styles.helper}>{media.length} medya seçildi.</Text> : null}
      <ErrorBanner message={error} />
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: tokens.colors.text,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  helper: {
    color: tokens.colors.muted,
    fontSize: 13,
  },
});
