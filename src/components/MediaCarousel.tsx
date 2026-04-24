import { Feather } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  Image,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';

import { resolveMediaAssetSource } from '../data/mediaAssets';
import { mediaToneMap, theme } from '../theme';
import { MediaAsset, Post } from '../types';
import { ExpertizReportCard } from './ExpertizReportCard';

interface MediaCarouselProps {
  post: Post;
  onOpenMedia?: (media: MediaAsset, post: Post) => void;
  height?: number;
  compactReport?: boolean;
}

function VideoPreview({ height, uri }: { height: number; uri: string }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.muted = true;
    instance.loop = false;
    instance.pause();
  });

  return (
    <View style={[styles.visual, { height }]}>
      <VideoView contentFit="cover" nativeControls={false} player={player} style={styles.video} />
      <View style={styles.videoOverlay}>
        <View style={styles.playBadge}>
          <Feather color={theme.colors.card} name="play" size={16} />
        </View>
      </View>
    </View>
  );
}

function MediaSlide({
  compactReport,
  height,
  media,
  onOpen,
  post,
}: {
  media: MediaAsset;
  post: Post;
  onOpen?: (media: MediaAsset, post: Post) => void;
  height: number;
  compactReport: boolean;
}) {
  const source = resolveMediaAssetSource(media);

  if (media.kind === 'report') {
    return (
      <Pressable onPress={() => onOpen?.(media, post)} style={styles.reportWrap}>
        <ExpertizReportCard compact={compactReport} listing={post.listing} />
      </Pressable>
    );
  }

  if (media.kind === 'video' && media.uri) {
    return (
      <Pressable onPress={() => onOpen?.(media, post)} style={styles.slidePress}>
        <VideoPreview height={height} uri={media.uri} />
        <View style={styles.captionOverlay}>
          <Text numberOfLines={1} style={styles.captionTitle}>
            {media.label}
          </Text>
          <Text numberOfLines={1} style={styles.captionHint}>
            Videoyu tam ekranda açmak için dokun.
          </Text>
        </View>
      </Pressable>
    );
  }

  if (source) {
    return (
      <Pressable onPress={() => onOpen?.(media, post)} style={styles.slidePress}>
        <Image resizeMode="cover" source={source} style={[styles.visual, { height }]} />
        <View style={styles.captionOverlay}>
          <Text numberOfLines={1} style={styles.captionTitle}>
            {media.label}
          </Text>
          <Text numberOfLines={1} style={styles.captionHint}>
            {media.hint}
          </Text>
        </View>
      </Pressable>
    );
  }

  const tone = mediaToneMap[media.tone];

  return (
    <Pressable
      onPress={() => onOpen?.(media, post)}
      style={[styles.placeholder, { backgroundColor: tone.background, height }]}
    >
      <Text style={[styles.placeholderKind, { color: tone.foreground }]}>{media.kind.toUpperCase()}</Text>
      <Text style={styles.placeholderTitle}>{media.label}</Text>
      <Text style={styles.placeholderHint}>{media.hint}</Text>
    </Pressable>
  );
}

export function MediaCarousel({
  post,
  onOpenMedia,
  height = 280,
  compactReport = false,
}: MediaCarouselProps) {
  const media = post.media;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [layoutWidth, setLayoutWidth] = useState(0);
  const window = useWindowDimensions();

  const slideWidth = useMemo(() => {
    if (layoutWidth > 0) {
      return layoutWidth;
    }

    return Math.max(260, window.width - 96);
  }, [layoutWidth, window.width]);

  if (!media.length) {
    return null;
  }

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    if (nextWidth && nextWidth !== layoutWidth) {
      setLayoutWidth(nextWidth);
    }
  };

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!slideWidth) {
      return;
    }

    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
    if (!Number.isNaN(nextIndex)) {
      setCurrentIndex(Math.max(0, Math.min(media.length - 1, nextIndex)));
    }
  };

  return (
    <View onLayout={handleLayout} style={styles.wrap}>
      <ScrollView
        decelerationRate="fast"
        horizontal
        nestedScrollEnabled
        onMomentumScrollEnd={handleMomentumEnd}
        pagingEnabled
        showsHorizontalScrollIndicator={false}
      >
        {media.map((item) => (
          <View key={item.id} style={[styles.slide, { width: slideWidth }]}>
            <MediaSlide
              compactReport={compactReport}
              height={height}
              media={item}
              onOpen={onOpenMedia}
              post={post}
            />
          </View>
        ))}
      </ScrollView>

      {media.length > 1 ? (
        <>
          <View style={styles.counterBadge}>
            <Text style={styles.counterText}>
              {currentIndex + 1}/{media.length}
            </Text>
          </View>
          <View style={styles.dotRow}>
            {media.map((item, index) => (
              <View
                key={`${item.id}-dot`}
                style={[styles.dot, index === currentIndex && styles.dotActive]}
              />
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  slide: {
    overflow: 'hidden',
  },
  slidePress: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  reportWrap: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  visual: {
    width: '100%',
    backgroundColor: '#0F1720',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(5, 9, 12, 0.58)',
  },
  captionOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: 2,
    backgroundColor: 'rgba(5, 9, 12, 0.56)',
  },
  captionTitle: {
    color: theme.colors.card,
    fontSize: 13,
    fontWeight: '800',
  },
  captionHint: {
    color: '#D6E3EA',
    fontSize: 12,
  },
  placeholder: {
    borderRadius: 22,
    padding: theme.spacing.md,
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  placeholderKind: {
    fontSize: 12,
    fontWeight: '800',
  },
  placeholderTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  placeholderHint: {
    color: theme.colors.textSoft,
    fontSize: 13,
    lineHeight: 18,
  },
  counterBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(5, 9, 12, 0.62)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  counterText: {
    color: theme.colors.card,
    fontSize: 12,
    fontWeight: '800',
  },
  dotRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.44)',
  },
  dotActive: {
    width: 18,
    backgroundColor: theme.colors.card,
  },
});

