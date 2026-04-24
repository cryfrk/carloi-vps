import { Feather } from '@expo/vector-icons';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AdaptiveModal } from './AdaptiveModal';
import { theme } from '../theme';
import type { ExternalPaymentSession } from '../types';

const brandLogo = require('../../carloi.png');

interface SecurePaymentTransitionModalProps {
  visible: boolean;
  payment: ExternalPaymentSession | null;
  onContinue: () => void;
  onCancel: () => void;
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value?: string | null;
  strong?: boolean;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, strong && styles.summaryValueStrong]}>
        {value?.trim() ? value : '-'}
      </Text>
    </View>
  );
}

function TrustBullet({ text }: { text: string }) {
  return (
    <View style={styles.trustRow}>
      <View style={styles.trustIconWrap}>
        <Feather color={theme.colors.success} name="check-circle" size={16} />
      </View>
      <Text style={styles.trustText}>{text}</Text>
    </View>
  );
}

export function SecurePaymentTransitionModal({
  visible,
  payment,
  onContinue,
  onCancel,
}: SecurePaymentTransitionModalProps) {
  return (
    <AdaptiveModal animationType="fade" transparent visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.backdrop} />
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
            <View style={styles.headerCard}>
              <View style={styles.brandRow}>
                <View style={styles.logoWrap}>
                  <Image resizeMode="contain" source={brandLogo} style={styles.logo} />
                </View>
                <View style={styles.brandCopy}>
                  <View style={styles.securePill}>
                    <Feather color={theme.colors.success} name="shield" size={14} />
                    <Text style={styles.securePillText}>Guvenli odeme gecisi</Text>
                  </View>
                  <Text style={styles.title}>Sigorta odemenizi guvenli sekilde tamamlayin</Text>
                </View>
              </View>

              <Text style={styles.description}>
                Bir sonraki adimda Carloi&apos;nin guvenli odeme sayfasina yonlendirileceksiniz. Odeme islemi
                banka guvenlik altyapisi uzerinden tamamlanir. Kart bilgileriniz Carloi uygulamasinda
                saklanmaz.
              </Text>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardEyebrow}>Odeme ozeti</Text>
                <Text style={styles.cardTitle}>Arac ve islem bilgisi</Text>
              </View>
              <SummaryRow label="Arac" strong value={payment?.vehicleSummary?.title} />
              <SummaryRow label="Plaka" value={payment?.vehicleSummary?.plateNumber} />
              <SummaryRow label="Sigorta tipi" value={payment?.insuranceType} />
              <SummaryRow
                label="Toplam tutar"
                strong
                value={
                  payment?.amount
                    ? `${payment.amount}${payment.currency ? ` ${payment.currency}` : ''}`
                    : undefined
                }
              />
              <SummaryRow label="Islem numarasi" value={payment?.paymentReference} />
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardEyebrow}>Neden web sayfasi?</Text>
                <Text style={styles.cardTitle}>Guven bilgileri</Text>
              </View>

              <View style={styles.trustList}>
                <TrustBullet text="Banka guvenlik ekraninda odeme yapilir" />
                <TrustBullet text="Kart bilgileriniz Carloi'de tutulmaz" />
                <TrustBullet text="Odeme sonrasi uygulamaya geri donersiniz" />
              </View>
            </View>

            <View style={styles.footerCard}>
              <Text style={styles.footerText}>
                Odeme tamamlandiktan sonra police ve fatura size e-posta ve Carloi mesaji ile iletilecektir.
              </Text>

              <View style={styles.buttonStack}>
                <Pressable onPress={onContinue} style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>Guvenli Odemeye Gec</Text>
                </Pressable>
                <Pressable onPress={onCancel} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Vazgec</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </AdaptiveModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.overlay,
  },
  sheet: {
    maxHeight: '94%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#F8F5F0',
    overflow: 'hidden',
  },
  sheetContent: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  headerCard: {
    borderRadius: 28,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    backgroundColor: '#111827',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  logoWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: 40,
    height: 40,
  },
  brandCopy: {
    flex: 1,
    gap: 8,
  },
  securePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  securePillText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '800',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
  },
  description: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
    lineHeight: 22,
  },
  card: {
    borderRadius: 24,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow,
  },
  cardHeader: {
    gap: 4,
    marginBottom: theme.spacing.xs,
  },
  cardEyebrow: {
    color: '#C0392B',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  summaryRow: {
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: 4,
  },
  summaryLabel: {
    color: theme.colors.textSoft,
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  summaryValue: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  summaryValueStrong: {
    fontWeight: '800',
    fontSize: 15,
  },
  trustList: {
    gap: theme.spacing.sm,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    paddingVertical: 2,
  },
  trustIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF8F1',
    marginTop: 1,
  },
  trustText: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
  footerCard: {
    borderRadius: 24,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#F7D8B4',
  },
  footerText: {
    color: '#7C4A03',
    fontSize: 14,
    lineHeight: 21,
  },
  buttonStack: {
    gap: theme.spacing.sm,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C1121F',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
});
