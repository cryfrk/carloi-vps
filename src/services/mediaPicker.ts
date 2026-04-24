import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { MediaKind } from '../types';

async function ensureMediaPermission() {
  if (Platform.OS === 'web') {
    return true;
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return permission.granted;
}

async function pickImage(options?: { aspect?: [number, number] }) {
  const granted = await ensureMediaPermission();
  if (!granted) {
    throw new Error('MEDIA_PERMISSION_DENIED');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: options?.aspect ?? [1, 1],
    quality: 0.85,
  });

  if (result.canceled || !result.assets?.[0]?.uri) {
    return null;
  }

  return result.assets[0].uri;
}

export async function pickSingleProfilePhoto() {
  return pickImage({ aspect: [1, 1] });
}

export async function pickCoverPhoto() {
  return pickImage({ aspect: [16, 9] });
}

export async function pickComposerMedia(kind: Extract<MediaKind, 'image' | 'video' | 'gif'>) {
  const granted = await ensureMediaPermission();
  if (!granted) {
    throw new Error('MEDIA_PERMISSION_DENIED');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: kind === 'video' ? ['videos'] : ['images'],
    allowsEditing: kind !== 'video',
    quality: 0.85,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];

  return {
    kind,
    uri: asset.uri,
    fileName: asset.fileName ?? undefined,
    mimeType: asset.mimeType ?? undefined,
    label:
      kind === 'image'
        ? 'Secilen fotograf'
        : kind === 'video'
          ? 'Secilen video'
          : 'Secilen GIF',
    hint:
      asset.fileName ??
      (kind === 'image'
        ? 'Galeriden eklendi'
        : kind === 'video'
          ? 'Video dosyasi secildi'
          : 'GIF icerigi secildi'),
  };
}
