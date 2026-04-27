import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StateCard } from '../components/StateCard';
import { theme } from '../theme';

export function NotificationsScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <StateCard
          title="Bildirim merkezi hazirlaniyor"
          description="Bildirim servisi backend tarafinda ayrik bir liste endpointi vermedigi icin burada su an anlik bildirim ozeti gosterilmiyor. Onemli hareketleri Mesajlar, Ticari Hesap ve Profil ekranlarindan takip edebilirsin."
          tone="default"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    padding: 20,
  },
});
