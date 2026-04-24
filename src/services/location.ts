import { Platform } from 'react-native';
import * as Location from 'expo-location';

export interface DeviceLocationResult {
  latitude: number;
  longitude: number;
  city?: string;
  district?: string;
  locationLine?: string;
}

export async function getCurrentResolvedLocation() {
  if (Platform.OS === 'web' && !navigator.geolocation) {
    throw new Error('Bu cihazda konum desteği bulunamadı.');
  }

  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Konum izni verilmedi.');
  }

  const current = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const geocoded = await Location.reverseGeocodeAsync({
    latitude: current.coords.latitude,
    longitude: current.coords.longitude,
  });
  const first = geocoded[0];

  return {
    latitude: current.coords.latitude,
    longitude: current.coords.longitude,
    city: first?.city ?? first?.subregion ?? '',
    district: first?.district ?? first?.street ?? '',
    locationLine: [first?.district, first?.city].filter(Boolean).join(' / '),
  } satisfies DeviceLocationResult;
}

