import { Feather } from '@expo/vector-icons';
import { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';

import { resolveMediaAssetSource } from '../data/mediaAssets';
import { theme } from '../theme';
import { MediaAsset, Post, VehicleProfile } from '../types';
import { AdaptiveModal } from './AdaptiveModal';
import { ExpertizReportCard } from './ExpertizReportCard';

export interface MediaPreviewState {
  media: MediaAsset;
  post?: Post | null;
  vehicle?: VehicleProfile;
}

interface MediaViewerModalProps {
  visible: boolean;
  preview?: MediaPreviewState | null;
  onClose: () => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getTouchDistance(touches: ArrayLike<{ pageX: number; pageY: number }>) {
  if (touches.length < 2) {
    return 0;
  }

  const [first, second] = [touches[0], touches[1]];
  const dx = first.pageX - second.pageX;
  const dy = first.pageY - second.pageY;
  return Math.sqrt(dx * dx + dy * dy);
}

function ZoomableStage({ children }: { children: React.ReactNode }) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const liveValues = useRef({ scale: 1, x: 0, y: 0 });
  const gesture = useRef({
    distance: 0,
    startScale: 1,
    startX: 0,
    startY: 0,
    pinching: false,
  });
  const lastTapAt = useRef(0);

  const clampPosition = (nextX: number, nextY: number, nextScale: number) => {
    const maxX = Math.max(0, ((layout.width || 0) * nextScale - (layout.width || 0)) / 2);
    const maxY = Math.max(0, ((layout.height || 0) * nextScale - (layout.height || 0)) / 2);

    return {
      x: clamp(nextX, -maxX, maxX),
      y: clamp(nextY, -maxY, maxY),
    };
  };

  const animateTo = (nextScale: number, nextX: number, nextY: number) => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: nextScale,
        useNativeDriver: true,
        friction: 8,
        tension: 70,
      }),
      Animated.spring(translateX, {
        toValue: nextX,
        useNativeDriver: true,
        friction: 8,
        tension: 70,
      }),
      Animated.spring(translateY, {
        toValue: nextY,
        useNativeDriver: true,
        friction: 8,
        tension: 70,
      }),
    ]).start(() => {
      liveValues.current = { scale: nextScale, x: nextX, y: nextY };
    });
  };

  const commit = (nextScale: number, nextX: number, nextY: number) => {
    scale.setValue(nextScale);
    translateX.setValue(nextX);
    translateY.setValue(nextY);
    liveValues.current = { scale: nextScale, x: nextX, y: nextY };
  };

  const toggleZoom = () => {
    if (liveValues.current.scale > 1.05) {
      animateTo(1, 0, 0);
      return;
    }

    animateTo(2.2, 0, 0);
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, state) =>
          state.numberActiveTouches > 1 ||
          liveValues.current.scale > 1 ||
          Math.abs(state.dx) > 4 ||
          Math.abs(state.dy) > 4,
        onPanResponderGrant: (event) => {
          const touches = event.nativeEvent.touches;
          if (touches.length >= 2) {
            gesture.current.distance = getTouchDistance(touches);
            gesture.current.startScale = liveValues.current.scale;
            gesture.current.pinching = true;
          } else {
            gesture.current.startX = liveValues.current.x;
            gesture.current.startY = liveValues.current.y;
            gesture.current.pinching = false;
          }
        },
        onPanResponderMove: (event, state) => {
          const touches = event.nativeEvent.touches;

          if (touches.length >= 2) {
            const distance = getTouchDistance(touches);
            if (!gesture.current.distance) {
              gesture.current.distance = distance;
            }

            const nextScale = clamp(
              gesture.current.startScale * (distance / Math.max(gesture.current.distance, 1)),
              1,
              4,
            );
            const position = clampPosition(liveValues.current.x, liveValues.current.y, nextScale);
            commit(nextScale, position.x, position.y);
            gesture.current.pinching = true;
            return;
          }

          if (liveValues.current.scale <= 1.01) {
            return;
          }

          const position = clampPosition(
            gesture.current.startX + state.dx,
            gesture.current.startY + state.dy,
            liveValues.current.scale,
          );
          commit(liveValues.current.scale, position.x, position.y);
        },
        onPanResponderRelease: (_event, state) => {
          if (
            !gesture.current.pinching &&
            Math.abs(state.dx) < 6 &&
            Math.abs(state.dy) < 6 &&
            state.numberActiveTouches <= 1
          ) {
            const now = Date.now();
            if (now - lastTapAt.current < 260) {
              toggleZoom();
              lastTapAt.current = 0;
              return;
            }

            lastTapAt.current = now;
          }

          const normalizedScale = clamp(liveValues.current.scale, 1, 4);
          if (normalizedScale <= 1.02) {
            animateTo(1, 0, 0);
          } else {
            const position = clampPosition(
              liveValues.current.x,
              liveValues.current.y,
              normalizedScale,
            );
            animateTo(normalizedScale, position.x, position.y);
          }

          gesture.current.distance = 0;
          gesture.current.pinching = false;
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [layout.height, layout.width],
  );

  return (
    <View
      onLayout={(event) =>
        setLayout({
          width: Math.round(event.nativeEvent.layout.width),
          height: Math.round(event.nativeEvent.layout.height),
        })
      }
      style={styles.zoomStage}
      {...responder.panHandlers}
    >
      <Animated.View
        style={[
          styles.zoomContent,
          {
            transform: [{ translateX }, { translateY }, { scale }],
          },
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

function VideoPlayerSurface({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
  });

  return (
    <VideoView
      allowsFullscreen
      contentFit="contain"
      nativeControls
      player={player}
      style={styles.visual}
    />
  );
}

export function MediaViewerModal({ visible, preview, onClose }: MediaViewerModalProps) {
  if (!preview?.media) {
    return null;
  }

  const { media, post, vehicle } = preview;
  const source = resolveMediaAssetSource(media);

  return (
    <AdaptiveModal animationType="fade" transparent visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Feather color={theme.colors.card} name="x" size={18} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{media.label}</Text>
            <Text style={styles.hint}>
              {media.kind === 'report'
                ? media.hint
                : 'Büyütmek için iki kez dokunabilir veya iki parmakla yakınlaştırabilirsiniz.'}
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          {media.kind === 'report' ? (
            <ScrollView
              contentContainerStyle={styles.reportContent}
              showsVerticalScrollIndicator={false}
              style={styles.reportScroll}
            >
              <ExpertizReportCard listing={post?.listing} vehicle={vehicle} />
            </ScrollView>
          ) : media.kind === 'video' && media.uri ? (
            <ZoomableStage>
              <VideoPlayerSurface uri={media.uri} />
            </ZoomableStage>
          ) : source ? (
            <ZoomableStage>
              <Image resizeMode="contain" source={source} style={styles.visual} />
            </ZoomableStage>
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>{media.kind.toUpperCase()}</Text>
            </View>
          )}
        </View>
      </View>
    </AdaptiveModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 9, 12, 0.94)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xl,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: theme.colors.card,
    fontSize: 16,
    fontWeight: '800',
  },
  hint: {
    color: '#B7C4CF',
    fontSize: 12,
    lineHeight: 17,
  },
  content: {
    flex: 1,
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomStage: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomContent: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportScroll: {
    width: '100%',
  },
  reportContent: {
    paddingVertical: theme.spacing.lg,
  },
  visual: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: 320,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  placeholderText: {
    color: theme.colors.card,
    fontSize: 20,
    fontWeight: '800',
  },
});

