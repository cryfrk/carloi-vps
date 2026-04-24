import { Feather } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MediaCarousel } from './MediaCarousel';
import { theme } from '../theme';
import { MediaAsset, Post } from '../types';
import { AdaptiveModal } from './AdaptiveModal';

interface ListingDetailModalProps {
  visible: boolean;
  post: Post | null;
  onClose: () => void;
  onToggleSave?: (postId: string) => void;
  onOpenMedia?: (media: MediaAsset, post: Post) => void;
  onCall?: (post: Post) => void;
  onMessage?: (post: Post) => void;
  onShare?: (post: Post) => void;
}

export function ListingDetailModal({
  visible,
  post,
  onClose,
  onToggleSave,
  onOpenMedia,
  onCall,
  onMessage,
  onShare,
}: ListingDetailModalProps) {
  if (!post?.listing) {
    return null;
  }

  const listing = post.listing;

  return (
    <AdaptiveModal animationType="slide" visible={visible}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.headerButton}>
            <Feather color={theme.colors.text} name="arrow-left" size={18} />
          </Pressable>
          <Text numberOfLines={1} style={styles.headerTitle}>
            İlan detayı
          </Text>
          <View style={styles.headerActions}>
            <Pressable onPress={() => onShare?.(post)} style={styles.headerButton}>
              <Feather color={theme.colors.text} name="share-2" size={18} />
            </Pressable>
            <Pressable onPress={() => onToggleSave?.(post.id)} style={styles.headerButton}>
              <Feather
                color={post.savedByUser ? theme.colors.primary : theme.colors.text}
                name="bookmark"
                size={18}
              />
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            {listing.isSold ? (
              <View style={styles.soldBadge}>
                <Text style={styles.soldBadgeText}>SATILDI</Text>
              </View>
            ) : null}
            <Text style={styles.price}>{listing.price}</Text>
            <Text style={styles.title}>{listing.title}</Text>

            <View style={styles.locationRow}>
              <Feather color={theme.colors.textSoft} name="map-pin" size={14} />
              <Text style={styles.locationText}>{listing.location}</Text>
            </View>

            <View style={styles.badgeRow}>
              {listing.badges.map((badge) => (
                <View key={badge} style={styles.badgeChip}>
                  <Text style={styles.badgeText}>{badge}</Text>
                </View>
              ))}
            </View>

            <View style={styles.ctaRow}>
              <Pressable onPress={() => onMessage?.(post)} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Mesaj gönder</Text>
              </Pressable>
              {listing.contactPhone ? (
                <Pressable onPress={() => onCall?.(post)} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Ara</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          {post.media.length ? <MediaCarousel height={320} onOpenMedia={onOpenMedia} post={post} /> : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Açıklama</Text>
            <Text style={styles.sectionText}>{listing.description}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Temel bilgiler</Text>
            <View style={styles.table}>
              {listing.specTable.map((item) => (
                <View key={`${item.label}-${item.value}`} style={styles.tableRow}>
                  <Text style={styles.tableLabel}>{item.label}</Text>
                  <Text style={styles.tableValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Durum ve geçmiş</Text>
            <View style={styles.table}>
              {listing.conditionTable.map((item) => (
                <View key={`${item.label}-${item.value}-condition`} style={styles.tableRow}>
                  <Text style={styles.tableLabel}>{item.label}</Text>
                  <Text style={styles.tableValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Donanım</Text>
            {listing.equipment.length ? (
              <View style={styles.equipmentWrap}>
                {listing.equipment.map((item) => (
                  <View key={item} style={styles.equipmentChip}>
                    <Text style={styles.equipmentText}>{item}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.sectionText}>Fabrika donanımı bu araç için kayıtlı değil.</Text>
            )}
            {listing.extraEquipment ? (
              <Text style={styles.sectionText}>Ek donanım: {listing.extraEquipment}</Text>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fabrika ve OBD özeti</Text>
            {listing.factorySpecs.map((item) => (
              <Text key={item} style={styles.listLine}>
                • {item}
              </Text>
            ))}
            {listing.reportHighlights.map((item) => (
              <Text key={item} style={styles.highlightLine}>
                • {item}
              </Text>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>İlan bağlantısı</Text>
            <Text style={styles.linkText}>{listing.listingLink}</Text>
          </View>
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
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerActions: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
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
    flex: 1,
    color: theme.colors.text,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '800',
  },
  content: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  heroCard: {
    borderRadius: 24,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    ...theme.shadow,
  },
  soldBadge: {
    alignSelf: 'flex-start',
    borderRadius: theme.radius.pill,
    backgroundColor: '#FFE0DE',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 7,
  },
  soldBadgeText: {
    color: '#B43B30',
    fontWeight: '900',
    letterSpacing: 0.5,
    fontSize: 12,
  },
  price: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  title: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    color: theme.colors.textSoft,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  badgeChip: {
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
  },
  badgeText: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  primaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  primaryButtonText: {
    color: theme.colors.card,
    fontWeight: '800',
  },
  secondaryButton: {
    minWidth: 110,
    minHeight: 44,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceMuted,
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  section: {
    borderRadius: 24,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    ...theme.shadow,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  sectionText: {
    color: theme.colors.text,
    lineHeight: 22,
  },
  table: {
    gap: theme.spacing.sm,
  },
  tableRow: {
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    gap: 4,
  },
  tableLabel: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tableValue: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  equipmentWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  equipmentChip: {
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
  },
  equipmentText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  listLine: {
    color: theme.colors.text,
    lineHeight: 20,
  },
  highlightLine: {
    color: theme.colors.primary,
    lineHeight: 20,
    fontWeight: '700',
  },
  linkText: {
    color: theme.colors.primary,
    lineHeight: 20,
  },
});

