import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { StateCard } from '../components/StateCard';
import { useSessionStore } from '../store/session-store';
import { theme } from '../theme';
import type { AuthStackParamList } from '../types/navigation';

type Navigation = NativeStackNavigationProp<AuthStackParamList>;

export function AuthLandingScreen() {
  const navigation = useNavigation<Navigation>();
  const error = useSessionStore((state) => state.error);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.logo}>
            <Text style={styles.logoLetter}>C</Text>
          </View>
          <Text style={styles.title}>Carloi</Text>
          <Text style={styles.subtitle}>
            Sosyal otomotiv akisi, ilan, Garajim, mesaj ve AI deneyimi tek yerde.
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable onPress={() => navigation.navigate('Login')} style={styles.primaryButton}>
            <Text style={styles.primaryText}>Giris yap</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('RegisterWizard', { accountType: 'individual' })}
            style={styles.secondaryCard}
          >
            <Text style={styles.cardTitle}>Bireysel hesap olustur</Text>
            <Text style={styles.cardBody}>Paylasim, arac vitrini ve ilan akisi ile hemen basla.</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('RegisterWizard', { accountType: 'commercial' })}
            style={styles.secondaryCard}
          >
            <Text style={styles.cardTitle}>Ticari hesap olustur</Text>
            <Text style={styles.cardBody}>Firma dogrulama ve ticari ilan akisina hazir bir hesap ac.</Text>
          </Pressable>
        </View>

        {error ? <StateCard title={error.title} description={error.description} tone="warning" /> : null}
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
    padding: 24,
    justifyContent: 'space-between',
  },
  hero: {
    marginTop: 20,
    gap: 14,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    fontSize: 32,
    fontWeight: '900',
    color: theme.colors.accent,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 25,
    color: theme.colors.textSoft,
  },
  actions: {
    gap: 14,
  },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: theme.colors.text,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryText: {
    color: theme.colors.surface,
    fontWeight: '800',
    fontSize: 16,
  },
  secondaryCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
  },
  cardBody: {
    color: theme.colors.textSoft,
    lineHeight: 22,
  },
});
