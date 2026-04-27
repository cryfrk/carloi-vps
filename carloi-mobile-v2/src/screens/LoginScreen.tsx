import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { getMobileApiClient } from '@/lib/api';
import { getReadableErrorMessage } from '@/lib/errors';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { AppInput } from '@/components/ui/AppInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { useSessionStore } from '@/store/session-store';
import { tokens } from '@/theme/tokens';

const logo = require('../../assets/carloi.png');

export function LoginScreen({ navigation }: { navigation: any }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const setSession = useSessionStore((state) => state.setSession);

  async function handleLogin() {
    setSubmitting(true);
    setError('');

    try {
      const response = await getMobileApiClient().login(identifier.trim(), password);
      if (!response.token || !response.snapshot) {
        throw new Error('Oturum acilamadi. Lutfen bilgilerinizi kontrol edin.');
      }
      await setSession({ token: response.token, snapshot: response.snapshot });
    } catch (loginError) {
      setError(getReadableErrorMessage(loginError, 'Giris yapilamadi.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.hero}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>Giris yap</Text>
        <Text style={styles.subtitle}>E-posta veya telefon ile hesabina guvenli sekilde ulas.</Text>
      </View>

      <SectionCard>
        <AppInput label="E-posta veya telefon" value={identifier} onChangeText={setIdentifier} placeholder="E-posta veya telefon" />
        <AppInput label="Sifre" value={password} onChangeText={setPassword} placeholder="Sifre" secureTextEntry />
        <ErrorBanner message={error} />
        <PrimaryButton label={submitting ? 'Giris yapiliyor...' : 'Giris yap'} onPress={handleLogin} disabled={submitting} />
        <PrimaryButton label="Yeni hesap olustur" variant="ghost" onPress={() => navigation.navigate('Register')} />
      </SectionCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  logo: {
    width: 92,
    height: 92,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  subtitle: {
    textAlign: 'center',
    color: tokens.colors.muted,
    lineHeight: 22,
    maxWidth: 300,
  },
});
