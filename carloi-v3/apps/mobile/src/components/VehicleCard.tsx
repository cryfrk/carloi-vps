import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { GarageVehicleRecord } from '@carloi-v3/garage-obd';

import { buildGarageVehicleSubtitle, buildGarageVehicleTitle, maskPlate } from '../lib/vehicle';
import { theme } from '../theme';

interface VehicleCardProps {
  vehicle: GarageVehicleRecord | Record<string, unknown>;
  variant?: 'garage' | 'profile';
  sourceLabel?: string;
  onPress?: () => void;
  onListing?: () => void;
  onObd?: () => void;
}

export function VehicleCard({
  vehicle,
  variant = 'garage',
  sourceLabel,
  onPress,
  onListing,
  onObd,
}: VehicleCardProps) {
  const localVehicle = vehicle as GarageVehicleRecord;
  const title = buildGarageVehicleTitle(vehicle);
  const subtitle = buildGarageVehicleSubtitle(vehicle);
  const plate = 'selection' in vehicle ? maskPlate(localVehicle.plateNumber) : maskPlate(String((vehicle as { plateNumber?: string }).plateNumber || ''));
  const cover = 'photos' in vehicle
    ? localVehicle.photos.find((item) => item.type === 'image')?.url || localVehicle.photos.find((item) => item.type === 'image')?.localUri
    : String((vehicle as { photos?: Array<{ url?: string }> }).photos?.[0]?.url || '');

  return (
    <Pressable onPress={onPress} style={[styles.card, variant === 'profile' ? styles.profileCard : null]}>
      {cover ? (
        <Image source={{ uri: cover }} style={styles.cover} />
      ) : (
        <View style={styles.coverFallback}>
          <Ionicons name="car-sport-outline" size={28} color={theme.colors.accent} />
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>{title || 'Arac bilgisi eksik'}</Text>
            <Text style={styles.subtitle}>{subtitle || plate}</Text>
          </View>
          {sourceLabel ? <Text style={styles.badge}>{sourceLabel}</Text> : null}
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Plaka: {plate}</Text>
          {'healthScore' in vehicle && typeof localVehicle.healthScore === 'number' ? (
            <Text style={styles.metaLabel}>Saglik: {localVehicle.healthScore}/100</Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Pressable onPress={onListing} style={styles.primaryAction}>
            <Text style={styles.primaryText}>Araci ilana cikar</Text>
          </Pressable>
          <Pressable onPress={onObd} style={styles.secondaryAction}>
            <Text style={styles.secondaryText}>OBD</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  profileCard: {
    width: 250,
  },
  cover: {
    width: '100%',
    height: 150,
    backgroundColor: theme.colors.surfaceMuted,
  },
  coverFallback: {
    width: '100%',
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accentSoft,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleWrap: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 13,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.accentSoft,
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaLabel: {
    color: theme.colors.textSoft,
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryAction: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 11,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.text,
    alignItems: 'center',
  },
  secondaryAction: {
    minWidth: 74,
    borderRadius: 999,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  primaryText: {
    color: theme.colors.surface,
    fontWeight: '800',
  },
  secondaryText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
});
