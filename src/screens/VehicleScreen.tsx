import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ExpertizReportCard } from '../components/ExpertizReportCard';
import { ObdConnectModal } from '../components/ObdConnectModal';
import {
  buildPersistedObdVehicleSnapshot,
  connectAndReadObdSnapshot,
  disconnectActiveObd,
  getActiveObdDevice,
  refreshConnectedObdSnapshot,
  scanNearbyObdDevices,
} from '../services/obd';
import { theme } from '../theme';
import { ObdDiscoveredDevice, VehicleProfile } from '../types';

interface VehicleScreenProps {
  vehicle?: VehicleProfile;
  onEditVehicle: () => void;
  onCreateListing: () => void;
  onPersistVehicleSnapshot: (vehicle: VehicleProfile) => void | Promise<void>;
}

function InfoMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoMetric}>
      <Text style={styles.infoMetricValue}>{value}</Text>
      <Text style={styles.infoMetricLabel}>{label}</Text>
    </View>
  );
}

export function VehicleScreen({
  vehicle,
  onEditVehicle,
  onCreateListing,
  onPersistVehicleSnapshot,
}: VehicleScreenProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [devices, setDevices] = useState<ObdDiscoveredDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [obdError, setObdError] = useState('');
  const [sessionVehicle, setSessionVehicle] = useState<VehicleProfile | undefined>();

  useEffect(() => {
    if (!vehicle) {
      setSessionVehicle(undefined);
    }
  }, [vehicle]);

  const currentVehicle = sessionVehicle ?? vehicle;
  const activeDeviceName = useMemo(
    () =>
      sessionVehicle?.obdConnected
        ? getActiveObdDevice()?.name || sessionVehicle.obdDeviceName
        : undefined,
    [sessionVehicle],
  );

  const healthLabel =
    typeof currentVehicle?.healthScore === 'number'
      ? `%${currentVehicle.healthScore}`
      : 'Veri yok';
  const driveLabel =
    typeof currentVehicle?.driveScore === 'number'
      ? `${currentVehicle.driveScore}/100`
      : 'Veri yok';

  const runScan = async () => {
    setScanning(true);
    setObdError('');
    try {
      const nextDevices = await scanNearbyObdDevices();
      setDevices(nextDevices);
    } catch (error) {
      setObdError(error instanceof Error ? error.message : 'OBD taraması başlatılamadı.');
    } finally {
      setScanning(false);
    }
  };

  const handleConnect = async (device: ObdDiscoveredDevice, password?: string) => {
    if (!currentVehicle) {
      return;
    }

    setConnecting(true);
    setObdError('');
    try {
      const nextVehicle = await connectAndReadObdSnapshot(currentVehicle, device, { password });
      setSessionVehicle(nextVehicle);
      await onPersistVehicleSnapshot(buildPersistedObdVehicleSnapshot(nextVehicle));
      setModalVisible(false);
    } catch (error) {
      setObdError(error instanceof Error ? error.message : 'OBD cihazına bağlanılamadı.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectActiveObd();
      setSessionVehicle((current) =>
        current ? buildPersistedObdVehicleSnapshot(current) : undefined,
      );
    } catch (error) {
      Alert.alert(
        'OBD bağlantısı kesilemedi',
        error instanceof Error ? error.message : 'Bağlantı şu anda kapatılamadı.',
      );
    }
  };

  const handleRefresh = async () => {
    if (!currentVehicle) {
      return;
    }

    setConnecting(true);
    setObdError('');
    try {
      const nextVehicle = await refreshConnectedObdSnapshot(currentVehicle);
      setSessionVehicle(nextVehicle);
      await onPersistVehicleSnapshot(buildPersistedObdVehicleSnapshot(nextVehicle));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Canlı OBD verisi yeniden alınamadı.';
      setObdError(message);
      Alert.alert('OBD verisi yenilenemedi', message);
    } finally {
      setConnecting(false);
    }
  };

  const openObdModal = () => {
    setModalVisible(true);
    if (!devices.length) {
      void runScan();
    }
  };

  if (!vehicle) {
    return (
      <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Feather color={theme.colors.primary} name="truck" size={28} />
          </View>
          <Text style={styles.emptyTitle}>Garajın henüz boş</Text>
          <Text style={styles.emptyText}>
            İlk aracını eklediğinde fotoğraflar, ekspertiz özeti, canlı OBD verileri ve ilana çıkarma
            akışı burada toplanır.
          </Text>
          <Pressable onPress={onEditVehicle} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Garaja araç ekle</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroEyebrow}>GARAJIM</Text>
              <Text style={styles.heroTitle}>
                {currentVehicle?.year} {currentVehicle?.brand} {currentVehicle?.model}
              </Text>
              <Text style={styles.heroSubtitle}>
                {currentVehicle?.packageName} • {currentVehicle?.engineVolume || 'Motor bilgisi bekleniyor'}
              </Text>
            </View>
            <View style={styles.connectionPill}>
              <View
                style={[
                  styles.connectionDot,
                  { backgroundColor: currentVehicle?.obdConnected ? theme.colors.success : theme.colors.danger },
                ]}
              />
              <Text style={styles.connectionText}>
                {currentVehicle?.obdConnected ? 'Canlı OBD bağlı' : 'OBD bağlı değil'}
              </Text>
            </View>
          </View>

          <View style={styles.infoMetricRow}>
            <InfoMetric label="Sağlık" value={healthLabel} />
            <InfoMetric label="Sürüş puanı" value={driveLabel} />
            <InfoMetric label="Kilometre" value={currentVehicle?.mileage || '—'} />
          </View>

          <View style={styles.heroActions}>
            <Pressable onPress={onEditVehicle} style={styles.secondaryHeroButton}>
              <Text style={styles.secondaryHeroButtonText}>Bilgileri düzenle</Text>
            </Pressable>
            <Pressable onPress={onCreateListing} style={styles.primaryHeroButton}>
              <Text style={styles.primaryHeroButtonText}>Aracı ilana çıkar</Text>
            </Pressable>
          </View>

          <View style={styles.heroActions}>
            <Pressable onPress={openObdModal} style={styles.ghostHeroButton}>
              <Text style={styles.ghostHeroButtonText}>OBD cihazı bağla</Text>
            </Pressable>
            {currentVehicle?.obdConnected ? (
              <Pressable onPress={() => void handleRefresh()} style={styles.ghostHeroButton}>
                <Text style={styles.ghostHeroButtonText}>
                  {connecting ? 'Veri okunuyor...' : 'Canlı veriyi yenile'}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {currentVehicle?.obdLastSyncAt ? (
            <Text style={styles.syncMeta}>
              Son senkron: {new Date(currentVehicle.obdLastSyncAt).toLocaleString('tr-TR')}
            </Text>
          ) : null}
        </View>

        {obdError ? (
          <View style={styles.inlineErrorCard}>
            <Text style={styles.inlineErrorText}>{obdError}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Araç özeti</Text>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Bu araçla neler yapabilirsin?</Text>
            <View style={styles.summaryList}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryDot} />
                <Text style={styles.summaryText}>Fotoğraf ve video odaklı araç gönderileri paylaş.</Text>
              </View>
              <View style={styles.summaryRow}>
                <View style={styles.summaryDot} />
                <Text style={styles.summaryText}>Araç bilgilerini otomatik doldurarak hızlı ilan aç.</Text>
              </View>
              <View style={styles.summaryRow}>
                <View style={styles.summaryDot} />
                <Text style={styles.summaryText}>OBD bağlıysa canlı sağlık ve arıza metriklerini takip et.</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Carloi ekspertiz kartı</Text>
          <View style={styles.reportWrap}>
            <ExpertizReportCard vehicle={currentVehicle} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Donanım ve notlar</Text>
          {currentVehicle?.equipment.length ? (
            <View style={styles.equipmentWrap}>
              {currentVehicle.equipment.map((item) => (
                <View key={item} style={styles.equipmentChip}>
                  <Text style={styles.equipmentText}>{item}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.bodyText}>Bu araç için doğrulanmış donanım bilgisi henüz eklenmedi.</Text>
          )}
          {currentVehicle?.extraEquipment ? (
            <Text style={styles.bodyText}>Ek not: {currentVehicle.extraEquipment}</Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Canlı OBD verileri</Text>
          {currentVehicle?.liveMetrics.length ? (
            <View style={styles.metricGrid}>
              {currentVehicle.liveMetrics.map((metric) => (
                <View key={metric.id} style={styles.metricCard}>
                  <Text style={styles.metricValue}>{metric.value}</Text>
                  <Text style={styles.metricLabel}>{metric.label}</Text>
                  <Text style={styles.metricHelper}>{metric.helper}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.bodyText}>
              OBD bağlantısı kurulmadığında bu alan boş kalır. Sıcaklık, akü, trim ve benzeri gerçek
              veriler bağlantı sonrasında görünür.
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Arıza ve risk görünümü</Text>
          {currentVehicle?.faultCodes.length ? (
            <View style={styles.listStack}>
              {currentVehicle.faultCodes.map((fault) => (
                <View key={fault.code} style={styles.listCard}>
                  <View style={styles.listCardHeader}>
                    <Text style={styles.listCardTitle}>{fault.code}</Text>
                    <Text style={styles.listCardAccent}>{fault.severity}</Text>
                  </View>
                  <Text style={styles.listCardSubtitle}>{fault.title}</Text>
                  <Text style={styles.listCardText}>{fault.detail}</Text>
                </View>
              ))}
            </View>
          ) : currentVehicle?.upcomingRisks.length ? (
            <View style={styles.listStack}>
              {currentVehicle.upcomingRisks.map((risk) => (
                <View key={risk.name} style={styles.listCard}>
                  <View style={styles.listCardHeader}>
                    <Text style={styles.listCardTitle}>{risk.name}</Text>
                    <Text style={styles.listCardAccent}>%{risk.probability}</Text>
                  </View>
                  <Text style={styles.listCardText}>{risk.explanation}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.bodyText}>
              Henüz aktif arıza kodu veya öne çıkan bakım riski görünmüyor.
            </Text>
          )}
        </View>

        <View style={[styles.section, styles.summarySection]}>
          <Text style={styles.sectionTitle}>Önerilen aksiyonlar</Text>
          <Text style={styles.bodyText}>{currentVehicle?.summary}</Text>
          <View style={styles.actionList}>
            {(currentVehicle?.actions ?? []).map((action) => (
              <View key={action} style={styles.actionRow}>
                <View style={styles.actionDot} />
                <Text style={styles.actionText}>{action}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <ObdConnectModal
        activeDeviceName={activeDeviceName}
        connecting={connecting}
        devices={devices}
        error={obdError}
        onClose={() => setModalVisible(false)}
        onConnect={(device, password) => {
          void handleConnect(device, password);
        }}
        onDisconnect={() => {
          void handleDisconnect();
        }}
        onScan={() => {
          void runScan();
        }}
        scanning={scanning}
        visible={modalVisible}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  emptyWrap: {
    margin: theme.spacing.md,
    marginTop: theme.spacing.xl,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    color: theme.colors.textSoft,
    textAlign: 'center',
    lineHeight: 22,
  },
  primaryButton: {
    width: '100%',
    minHeight: 48,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: theme.colors.card,
    fontWeight: '800',
  },
  hero: {
    margin: theme.spacing.md,
    borderRadius: 30,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    ...theme.shadow,
  },
  heroTop: {
    gap: theme.spacing.sm,
  },
  heroEyebrow: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  heroTitle: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  heroSubtitle: {
    color: theme.colors.textSoft,
    lineHeight: 20,
  },
  connectionPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySoft,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectionText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  infoMetricRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  infoMetric: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.md,
    gap: 4,
  },
  infoMetricValue: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  infoMetricLabel: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: '700',
  },
  heroActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  primaryHeroButton: {
    flex: 1,
    minWidth: 160,
    minHeight: 46,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  primaryHeroButtonText: {
    color: theme.colors.card,
    fontWeight: '800',
  },
  secondaryHeroButton: {
    flex: 1,
    minWidth: 140,
    minHeight: 46,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  secondaryHeroButtonText: {
    color: theme.colors.card,
    fontWeight: '800',
  },
  ghostHeroButton: {
    flex: 1,
    minWidth: 140,
    minHeight: 44,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  ghostHeroButtonText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  syncMeta: {
    color: theme.colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
  },
  inlineErrorCard: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderRadius: 18,
    backgroundColor: '#FFE5E8',
    padding: theme.spacing.md,
  },
  inlineErrorText: {
    color: '#A33B4A',
    lineHeight: 20,
  },
  section: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  summaryCard: {
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  summaryTitle: {
    color: theme.colors.text,
    fontWeight: '800',
  },
  summaryList: {
    gap: theme.spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 7,
    backgroundColor: theme.colors.primary,
  },
  summaryText: {
    flex: 1,
    color: theme.colors.text,
    lineHeight: 20,
  },
  reportWrap: {
    overflow: 'hidden',
  },
  equipmentWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  equipmentChip: {
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
  },
  equipmentText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  bodyText: {
    color: theme.colors.text,
    lineHeight: 22,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  metricCard: {
    width: '47%',
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.md,
    gap: 6,
  },
  metricValue: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  metricLabel: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  metricHelper: {
    color: theme.colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
  },
  listStack: {
    gap: theme.spacing.sm,
  },
  listCard: {
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.md,
    gap: 6,
  },
  listCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  listCardTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  listCardAccent: {
    color: theme.colors.primary,
    fontWeight: '800',
  },
  listCardSubtitle: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  listCardText: {
    color: theme.colors.textSoft,
    lineHeight: 20,
  },
  summarySection: {
    marginBottom: theme.spacing.xxl,
  },
  actionList: {
    gap: theme.spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  actionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 7,
    backgroundColor: theme.colors.primary,
  },
  actionText: {
    flex: 1,
    color: theme.colors.text,
    lineHeight: 21,
  },
});
