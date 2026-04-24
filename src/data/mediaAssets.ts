import { MediaAsset } from '../types';

export function resolveMediaAssetSource(media: MediaAsset) {
  if (media.asset) {
    return media.asset;
  }

  if (media.uri) {
    return { uri: media.uri };
  }

  return undefined;
}
