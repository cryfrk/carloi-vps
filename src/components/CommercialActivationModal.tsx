import { Feather } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AdaptiveModal } from './AdaptiveModal';
import { theme } from '../theme';

interface CommercialActivationModalProps {
  visible: boolean;
  onClose: () => void;
  onStart: () => void;
}

const activityTypes = [
  'Galeri',
  'Yetkili bayi',
  'Oto alım satım',
  'Ekspertiz',
  'Sigorta',
  'Servis',
  'Oto yıkama',
  'Yedek parça',
  'Kiralama',
  'Diğer',
];

export function CommercialActivationModal({
  visible,
  onClose,
  onStart,
}: CommercialActivationModalProps) {
  return (
    <AdaptiveModal animationType="fade" transparent visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.kicker}>TİCARİ HESAP</Text>
              <Text style={styles.title}>Ticari ilan paylaşımı için evrak yükleyin</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Feather color={theme.colors.textSoft} name="x" size={18} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.description}>
              Türkiye araç ilan ve ticari hesap mevzuatına uygun olarak ticari özellikler, belge
              yükleme ve platform incelemesi sonrasında açılır.
            </Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Yüklenecek temel belgeler</Text>
              {[
                'Vergi levhası',
                'İmza sirküleri veya yetki belgesi',
                'Oda kayıt belgesi (opsiyonel)',
                'Ticaret sicil / işletme bilgisi (opsiyonel)',
                'Yetkili kişi kimlik beyanı',
              ].map((item) => (
                <View key={item} style={styles.bulletRow}>
                  <View style={styles.dot} />
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Başvuru formunda istenecek bilgiler</Text>
              {[
                'Firma adresi',
                'İletişim telefonu',
                'E-posta',
                'Vergi numarası veya TCKN',
                'Vergi dairesi',
              ].map((item) => (
                <View key={item} style={styles.bulletRow}>
                  <View style={styles.dot} />
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Faaliyet türü örnekleri</Text>
              <View style={styles.tagWrap}>
                {activityTypes.map((item) => (
                  <View key={item} style={styles.tag}>
                    <Text style={styles.tagText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>Onay öncesi kural</Text>
              <Text style={styles.noticeText}>
                Ticari başvuru tamamlanmadan ticari rozet görünmez, kurumsal ilan yayınlanamaz ve
                ticari hesap avantajları açılmaz. Dilersen şimdi atlayıp uygulamayı bireysel modda
                kullanmaya devam edebilirsin.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable onPress={onClose} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Atla</Text>
            </Pressable>
            <Pressable onPress={onStart} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Evrakları yükle ve başvur</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </AdaptiveModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.overlay,
  },
  sheet: {
    maxHeight: '84%',
    borderRadius: 28,
    backgroundColor: theme.colors.card,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    ...theme.shadow,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  kicker: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  title: {
    color: theme.colors.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    gap: theme.spacing.md,
  },
  description: {
    color: theme.colors.textSoft,
    lineHeight: 20,
  },
  section: {
    gap: theme.spacing.sm,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.md,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontWeight: '800',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 7,
    backgroundColor: theme.colors.primary,
  },
  bulletText: {
    flex: 1,
    color: theme.colors.text,
    lineHeight: 20,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  tag: {
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
  },
  tagText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  noticeCard: {
    borderRadius: 20,
    backgroundColor: '#FFF4E8',
    padding: theme.spacing.md,
    gap: 6,
  },
  noticeTitle: {
    color: theme.colors.warning,
    fontWeight: '800',
  },
  noticeText: {
    color: theme.colors.text,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontWeight: '800',
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
  },
  primaryButtonText: {
    color: theme.colors.card,
    fontWeight: '800',
    textAlign: 'center',
  },
});
