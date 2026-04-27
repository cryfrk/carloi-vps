import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { getVehicleListingReadiness } from '@carloi-v3/garage-obd';

import { StateCard } from '../components/StateCard';
import { VehicleCard } from '../components/VehicleCard';
import { buildPrimaryVehicleFromSnapshot } from '../lib/vehicle';
import { useGarageStore } from '../store/garage-store';
import { useSessionStore } from '../store/session-store';
import { theme } from '../theme';
import type { RootStackParamList } from '../types/navigation';

type Route = RouteProp<RootStackParamList, 'VehicleDetail'>;
type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function VehicleDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Navigation>();
  const vehicles = useGarageStore((state) => state.vehicles);
  const snapshot = useSessionStore((state) => state.snapshot);

  const vehicle = route.params.source === 'server'
    ? buildPrimaryVehicleFromSnapshot(snapshot?.vehicle, snapshot?.profile.handle || 'user')
    : vehicles.find((item) => item.id === route.params.vehicleId);

  if (!vehicle) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <StateCard title="Arac bulunamadi" description="Secilen arac detayina erisilemiyor." tone="danger" />
        </View>
      </SafeAreaView>
    );
  }

  const readiness = 'selection' in vehicle ? getVehicleListingReadiness(vehicle) : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Arac detayi</Text>

        <VehicleCard
          vehicle={'vehicle' in vehicle ? vehicle.vehicle : vehicle}
          sourceLabel={route.params.source === 'server' ? 'Hesapla senkron' : 'Yerel'}
          onListing={() => navigation.navigate('CreateListing', { vehicleId: route.params.vehicleId, source: 'garage' })}
          onObd={() => Alert.alert('OBD baglantisi', 'OBD cihaz eslestirme akisina bu arac kartindan gececeksin.')}
        />

        {readiness ? (
          <StateCard
            title={readiness.ready ? 'Ilan icin hazir' : 'Ilan oncesi eksikler var'}
            description={
              readiness.ready
                ? 'Bu arac yerel garajda ilana cikmaya hazir gorunuyor.'
                : `Eksik alanlar: ${readiness.missingFields.join(', ')}`
            }
            tone={readiness.ready ? 'success' : 'warning'}
          />
        ) : null}

        <StateCard
          title="OBD ve ekspertiz"
          description="Canli sensorler, DTC kodlari ve 10 dakikalik surus testi akisi bu arac ekranindan yonetilecek. Sunucu tarafinda kalici OBD oturum endpointleri gelene kadar bu alan uygulama ici durum kartlariyla ilerler."
        />

        <StateCard
          title="Arac gonderileri"
          description="Bu araca baglanan gonderiler ve ilanlar arac profili akisi olarak ayri goruntulenir."
          actionLabel="Arac paylasimlarini ac"
          onAction={() => navigation.navigate('VehiclePosts', { vehicleId: route.params.vehicleId, title: 'Arac gonderileri' })}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    padding: 20,
    gap: 16,
    paddingBottom: 36,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.colors.text,
  },
});
