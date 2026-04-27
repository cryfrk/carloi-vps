import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { StateCard } from '../components/StateCard';
import { VehicleCard } from '../components/VehicleCard';
import { buildPrimaryVehicleFromSnapshot } from '../lib/vehicle';
import { useGarageStore } from '../store/garage-store';
import { useSessionStore } from '../store/session-store';
import { theme } from '../theme';
import type { RootStackParamList } from '../types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function GarageScreen() {
  const navigation = useNavigation<Navigation>();
  const snapshot = useSessionStore((state) => state.snapshot);
  const vehicles = useGarageStore((state) => state.vehicles);

  const primaryVehicle = buildPrimaryVehicleFromSnapshot(snapshot?.vehicle, snapshot?.profile.handle || 'user');

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Garajim</Text>
          <Text style={styles.subtitle}>Araclarini yonet, OBD durumunu izle ve ilana cikmaya hazirla.</Text>
        </View>

        <StateCard
          title="Arac ekle"
          description="Katalog destekli wizard ile yeni aracini Garajim alanina ekleyebilirsin."
          actionLabel="Arac ekle"
          onAction={() => navigation.navigate('AddVehicleWizard')}
        />

        {primaryVehicle ? (
          <VehicleCard
            vehicle={primaryVehicle.vehicle}
            sourceLabel="Hesapla senkron"
            onPress={() => navigation.navigate('VehicleDetail', { vehicleId: primaryVehicle.id, source: 'server' })}
            onListing={() => navigation.navigate('CreateListing', { vehicleId: primaryVehicle.id, source: 'garage' })}
            onObd={() => navigation.navigate('VehicleDetail', { vehicleId: primaryVehicle.id, source: 'server' })}
          />
        ) : (
          <StateCard
            title="Senkron arac yok"
            description="Hesap bazli tekil arac bilgisi henuz sunucuda kayitli degil. Yerel olarak arac ekleyip sonra ilana cikarmadan once ana aracin olarak esitleyebilirsin."
          />
        )}

        {vehicles.length === 0 ? (
          <StateCard
            title="Yerel garaj bos"
            description="Coklu arac yapisi V3 ile cihaz tarafinda hazir. Wizard ile ilk aracini ekleyebilirsin."
          />
        ) : (
          vehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              sourceLabel="Cihazda"
              onPress={() => navigation.navigate('VehicleDetail', { vehicleId: vehicle.id, source: 'local' })}
              onListing={() => navigation.navigate('CreateListing', { vehicleId: vehicle.id, source: 'garage' })}
              onObd={() => navigation.navigate('VehicleDetail', { vehicleId: vehicle.id, source: 'local' })}
            />
          ))
        )}
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
    paddingBottom: 34,
  },
  header: {
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.colors.text,
  },
  subtitle: {
    color: theme.colors.textSoft,
    lineHeight: 22,
  },
});
