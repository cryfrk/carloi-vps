import { Feather } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { theme } from '../theme';
import { ObdDiscoveredDevice } from '../types';
import { AdaptiveModal } from './AdaptiveModal';

interface ObdConnectModalProps {
  visible: boolean;
  devices: ObdDiscoveredDevice[];
  scanning: boolean;
  connecting: boolean;
  error?: string;
  activeDeviceName?: string;
  onClose: () => void;
  onScan: () => void;
  onDisconnect: () => void;
  onConnect: (device: ObdDiscoveredDevice, password?: string) => void;
}

export function ObdConnectModal({
  visible,
  devices,
  scanning,
  connecting,
  error,
  activeDeviceName,
  onClose,
  onScan,
  onDisconnect,
  onConnect,
}: ObdConnectModalProps) {
  const [selectedWifiId, setSelectedWifiId] = useState<string | null>(null);
  const [wifiPassword, setWifiPassword] = useState('');

  const hasSecureWifi = useMemo(
    () => devices.some((device) => device.transport === 'wifi' && device.secure),
    [devices],
  );

  return (
    <AdaptiveModal animationType="slide" transparent visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>OBD cihazını bağla</Text>
              <Text style={styles.subtitle}>
                Yakındaki Bluetooth ve Wi‑Fi cihazları listelenir. Bağlantı yalnızca gerçek cihaz
                yanıt verirse kurulur.
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Feather color={theme.colors.textSoft} name="x" size={18} />
            </Pressable>
          </View>

          {activeDeviceName ? (
            <View style={styles.activeCard}>
              <View style={styles.activeBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.activeBadgeText}>Canlı oturum</Text>
              </View>
              <Text style={styles.activeTitle}>{activeDeviceName}</Text>
              <Pressable onPress={onDisconnect} style={styles.disconnectButton}>
                <Text style={styles.disconnectButtonText}>Bağlantıyı kes</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.actionsRow}>
            <Pressable
              disabled={scanning || connecting}
              onPress={onScan}
              style={[styles.scanButton, (scanning || connecting) && styles.buttonDisabled]}
            >
              {scanning ? (
                <ActivityIndicator color={theme.colors.card} size="small" />
              ) : (
                <>
                  <Feather color={theme.colors.card} name="search" size={16} />
                  <Text style={styles.scanButtonText}>Cihazları tara</Text>
                </>
              )}
            </Pressable>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            {devices.length ? (
              devices.map((device) => {
                const isSelectedWifi = selectedWifiId === device.id;
                return (
                  <View key={`${device.transport}-${device.id}`} style={styles.deviceCard}>
                    <View style={styles.deviceHeader}>
                      <View style={styles.deviceIcon}>
                        <Feather
                          color={theme.colors.primary}
                          name={device.transport === 'bluetooth' ? 'bluetooth' : 'wifi'}
                          size={16}
                        />
                      </View>
                      <View style={styles.deviceCopy}>
                        <View style={styles.deviceTitleRow}>
                          <Text style={styles.deviceTitle}>{device.name}</Text>
                          {device.isLikelyObd ? (
                            <View style={styles.likelyChip}>
                              <Text style={styles.likelyChipText}>OBD adayı</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.deviceHint}>
                          {device.hint || (device.transport === 'bluetooth' ? 'Bluetooth cihazı' : 'Wi‑Fi ağı')}
                        </Text>
                        {device.address ? <Text style={styles.deviceMeta}>{device.address}</Text> : null}
                      </View>
                    </View>

                    {device.transport === 'wifi' && device.secure ? (
                      <View style={styles.passwordWrap}>
                        <Pressable
                          onPress={() => setSelectedWifiId(isSelectedWifi ? null : device.id)}
                          style={styles.secureToggle}
                        >
                          <Feather color={theme.colors.textSoft} name="lock" size={14} />
                          <Text style={styles.secureToggleText}>Bu ağ şifre istiyor</Text>
                        </Pressable>
                        {isSelectedWifi ? (
                          <TextInput
                            onChangeText={setWifiPassword}
                            placeholder="Wi‑Fi şifresi"
                            placeholderTextColor={theme.colors.textSoft}
                            secureTextEntry
                            style={styles.passwordInput}
                            value={wifiPassword}
                          />
                        ) : null}
                      </View>
                    ) : null}

                    <Pressable
                      disabled={connecting}
                      onPress={() => onConnect(device, isSelectedWifi ? wifiPassword : undefined)}
                      style={[styles.connectButton, connecting && styles.buttonDisabled]}
                    >
                      <Text style={styles.connectButtonText}>
                        {connecting ? 'Bağlanıyor...' : 'Bağlan ve tara'}
                      </Text>
                    </Pressable>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Henüz cihaz bulunamadı</Text>
                <Text style={styles.emptyText}>
                  Kontak açıkken ve OBD cihazı enerji alırken tekrar tarayın. Wi‑Fi OBD cihazları ağ
                  olarak listelenebilir.
                </Text>
              </View>
            )}
          </ScrollView>

          {hasSecureWifi ? (
            <Text style={styles.footerNote}>
              Şifreli Wi‑Fi OBD cihazlarında ilk bağlantı için ağ şifresi gerekir.
            </Text>
          ) : null}
        </View>
      </View>
    </AdaptiveModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: theme.colors.overlay,
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: theme.colors.textSoft,
    lineHeight: 20,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCard: {
    borderRadius: 22,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primarySoft,
    gap: theme.spacing.sm,
  },
  activeBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(13,138,134,0.12)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 7,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.success,
  },
  activeBadgeText: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  activeTitle: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 17,
  },
  disconnectButton: {
    alignSelf: 'flex-start',
    minHeight: 38,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disconnectButtonText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
  },
  scanButton: {
    minHeight: 44,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  scanButtonText: {
    color: theme.colors.card,
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  errorText: {
    color: theme.colors.danger,
    lineHeight: 20,
  },
  listContent: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
  deviceCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  deviceHeader: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  deviceIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceCopy: {
    flex: 1,
    gap: 4,
  },
  deviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  deviceTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  likelyChip: {
    borderRadius: theme.radius.pill,
    backgroundColor: '#DFF6F2',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  likelyChipText: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 11,
  },
  deviceHint: {
    color: theme.colors.textSoft,
    lineHeight: 18,
  },
  deviceMeta: {
    color: theme.colors.textSoft,
    fontSize: 12,
  },
  passwordWrap: {
    gap: 8,
  },
  secureToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  secureToggleText: {
    color: theme.colors.textSoft,
    fontSize: 13,
  },
  passwordInput: {
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.md,
    color: theme.colors.text,
  },
  connectButton: {
    minHeight: 44,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
  },
  connectButtonText: {
    color: theme.colors.card,
    fontWeight: '800',
  },
  emptyCard: {
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    color: theme.colors.textSoft,
    lineHeight: 21,
  },
  footerNote: {
    color: theme.colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
  },
});
