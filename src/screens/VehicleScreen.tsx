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
  onPersistVehicleSnapshot: (vehicle: VehicleProfile) => void | Promise<void>;
}

export function VehicleScreen({
  vehicle,
  onEditVehicle,
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
        error instanceof Error ? error.message : 'Bağlantı kapatılamadı.',
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
          <Text style={styles.emptyTitle}>Araç profili henüz oluşturulmadı</Text>
          <Text style={styles.emptyText}>
            Marka, model, yıl, paket, kilometre, motor hacmi ve VIN eklediğinde araç bilgileri bu
            sekmede görünür. OBD bağlantısı kurulmadan canlı veri gösterilmez.
          </Text>
          <Pressable onPress={onEditVehicle} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Araç ekle</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  const hasRealObdData =
    currentVehicle?.obdConnected &&
    (currentVehicle.liveMetrics.length > 0 ||
      currentVehicle.faultCodes.length > 0 ||
      currentVehicle.probableFaultyParts.length > 0 ||
      typeof currentVehicle.healthScore === 'number' ||
      typeof currentVehicle.driveScore === 'number');

  return (
    <>
      <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>Araç profili</Text>
          <Text style={styles.heroTitle}>
            {currentVehicle?.year} {currentVehicle?.brand} {currentVehicle?.model}
          </Text>
          <Text style={styles.heroSub}>
            {currentVehicle?.packageName} • {currentVehicle?.engineVolume}
          </Text>

          <Pressable onPress={openObdModal} style={styles.obdBadge}>
            <View
              style={[
                styles.obdDot,
                {
                  backgroundColor: currentVehicle?.obdConnected
                    ? theme.colors.success
                    : theme.colors.danger,
                },
              ]}
            />
            <Text style={styles.obdText}>
              {currentVehicle?.obdConnected ? 'OBD bağlı' : 'OBD bağlı değil'}
            </Text>
            <Feather color={theme.colors.card} name="chevron-right" size={16} />
          </Pressable>

          {currentVehicle?.obdLastSyncAt ? (
            <Text style={styles.syncMeta}>
              Son gerçek veri alımı:{' '}
              {new Date(currentVehicle.obdLastSyncAt).toLocaleString('tr-TR')}
            </Text>
          ) : null}

          <View style={styles.scoreRow}>
            <View style={styles.scoreCard}>
              <Text style={styles.scoreValue}>
                {typeof currentVehicle?.healthScore === 'number'
                  ? `%${currentVehicle.healthScore}`
                  : 'Veri yok'}
              </Text>
              <Text style={styles.scoreLabel}>Araç sağlığı</Text>
            </View>
            <View style={styles.scoreCard}>
              <Text style={styles.scoreValue}>
                {typeof currentVehicle?.driveScore === 'number'
                  ? `${currentVehicle.driveScore}/100`
                  : 'Veri yok'}
              </Text>
              <Text style={styles.scoreLabel}>Sürüş puanı</Text>
            </View>
          </View>

          <View style={styles.heroActions}>
            <Pressable onPress={onEditVehicle} style={styles.editButton}>
              <Text style={styles.editButtonText}>Araç bilgisini düzenle</Text>
            </Pressable>
            <Pressable onPress={openObdModal} style={styles.secondaryHeroButton}>
              <Text style={styles.secondaryHeroButtonText}>OBD cihazı ara</Text>
            </Pressable>
            {currentVehicle?.obdConnected ? (
              <Pressable onPress={() => void handleRefresh()} style={styles.secondaryHeroButton}>
                <Text style={styles.secondaryHeroButtonText}>
                  {connecting ? 'Veri okunuyor...' : 'Canlı veriyi yenile'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {obdError ? (
          <View style={styles.inlineErrorCard}>
            <Text style={styles.inlineErrorText}>{obdError}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Carloi ekspertiz raporu</Text>
          <View style={styles.reportWrap}>
            <ExpertizReportCard vehicle={currentVehicle} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fabrika donanımı</Text>
          {currentVehicle?.equipment.length ? (
            <View style={styles.equipmentWrap}>
              {currentVehicle.equipment.map((item) => (
                <View key={item} style={styles.equipmentChip}>
                  <Text style={styles.equipmentText}>{item}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.bodyText}>Bu araç için doğrulanmış donanım bilgisi yok.</Text>
          )}
          {currentVehicle?.extraEquipment ? (
            <Text style={styles.bodyText}>Ek donanım: {currentVehicle.extraEquipment}</Text>
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
              OBD bağlantısı kurulmadığı için gerçek canlı veri yok. Sıcaklık, trim, akü gerilimi
              ve benzeri değerler yalnızca bağlantı olduğunda gösterilir.
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aktif arıza kodları</Text>
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
          ) : (
            <Text style={styles.bodyText}>
              Gerçek OBD taraması yapılmadığı için aktif DTC kodu gösterilmiyor.
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Muhtemel arızalı parçalar</Text>
          {currentVehicle?.probableFaultyParts.length ? (
            <View style={styles.listStack}>
              {currentVehicle.probableFaultyParts.map((part) => (
                <View key={part.name} style={styles.listCard}>
                  <View style={styles.listCardHeader}>
                    <Text style={styles.listCardTitle}>{part.name}</Text>
                    <Text style={styles.listCardAccent}>%{part.probability}</Text>
                  </View>
                  <Text style={styles.listCardText}>Parça: {part.marketPrice}</Text>
                  <Text style={styles.listCardText}>Tamir ort.: {part.repairCost}</Text>
                  <Text style={styles.listCardText}>{part.explanation}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.bodyText}>
              OBD verisi olmadan parça arıza tahmini yapılmaz. Aşağıdaki uyarılar yalnızca yaş ve
              kilometreye göre hazırlanır.
            </Text>
          )}
        </View>

        {!hasRealObdData && currentVehicle?.upcomingRisks.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Yaş ve kilometre bazlı uyarılar</Text>
            <View style={styles.listStack}>
              {currentVehicle.upcomingRisks.map((part) => (
                <View key={part.name} style={styles.listCard}>
                  <View style={styles.listCardHeader}>
                    <Text style={styles.listCardTitle}>{part.name}</Text>
                    <Text style={styles.listCardAccent}>%{part.probability}</Text>
                  </View>
                  <Text style={styles.listCardText}>{part.explanation}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={[styles.section, styles.summarySection]}>
          <Text style={styles.sectionTitle}>Genel sağlık özeti</Text>
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
    backgroundColor: theme.colors.accent,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  heroEyebrow: {
    color: '#9DDCD4',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  heroTitle: {
    color: theme.colors.card,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  heroSub: {
    color: '#DDEAF5',
  },
  obdBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  obdDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  obdText: {
    color: theme.colors.card,
    fontWeight: '700',
    fontSize: 12,
  },
  syncMeta: {
    color: '#DDEAF5',
    fontSize: 12,
    lineHeight: 18,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  scoreCard: {
    flex: 1,
    borderRadius: 22,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    gap: 6,
  },
  scoreValue: {
    color: theme.colors.card,
    fontWeight: '800',
    fontSize: 22,
  },
  scoreLabel: {
    color: '#DDEAF5',
    fontSize: 13,
  },
  heroActions: {
    gap: theme.spacing.sm,
  },
  editButton: {
    minHeight: 44,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    color: theme.colors.accent,
    fontWeight: '800',
  },
  secondaryHeroButton: {
    minHeight: 44,
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryHeroButtonText: {
    color: theme.colors.card,
    fontWeight: '800',
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
