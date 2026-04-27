import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { StateCard } from '../components/StateCard';
import { useSessionStore } from '../store/session-store';
import { theme } from '../theme';
import type { AppTabParamList } from '../types/navigation';

type Navigation = BottomTabNavigationProp<AppTabParamList>;

export function VerifyScreen() {
  const navigation = useNavigation<Navigation>();
  const pendingVerification = useSessionStore((state) => state.pendingVerification);
  const verifyEmailWithCode = useSessionStore((state) => state.verifyEmailWithCode);
  const resendEmailCode = useSessionStore((state) => state.resendEmailCode);
  const sendPhoneCode = useSessionStore((state) => state.sendPhoneCode);
  const verifyPhoneCode = useSessionStore((state) => state.verifyPhoneCode);
  const status = useSessionStore((state) => state.status);
  const busyLabel = useSessionStore((state) => state.busyLabel);
  const error = useSessionStore((state) => state.error);

  const [code, setCode] = useState('');

  useEffect(() => {
    if (status === 'authenticated' && !pendingVerification) {
      navigation.navigate('FeedTab');
    }
  }, [navigation, pendingVerification, status]);

  if (!pendingVerification) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <StateCard
            title="Dogrulama tamamlandi"
            description="Hesabin aktif. Ana akis ekranina gecebilirsin."
            tone="success"
            actionLabel="Ana sayfaya git"
            onAction={() => navigation.navigate('FeedTab')}
          />
        </View>
      </SafeAreaView>
    );
  }

  const isEmail = pendingVerification.channel === 'email';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>{isEmail ? 'E-posta dogrulama' : 'SMS dogrulama'}</Text>
        <Text style={styles.subtitle}>
          {pendingVerification.maskedDestination || (isEmail ? pendingVerification.email : pendingVerification.phone)}
          {' '}icin gelen 6 haneli kodu gir.
        </Text>

        <TextInput
          value={code}
          onChangeText={setCode}
          placeholder="123456"
          style={styles.input}
          keyboardType="number-pad"
        />

        <Pressable
          onPress={() => void (isEmail
            ? verifyEmailWithCode(pendingVerification.email || '', code)
            : verifyPhoneCode(code, pendingVerification.phone))}
          style={[styles.primaryButton, code.length < 4 ? styles.disabled : null]}
          disabled={code.length < 4}
        >
          <Text style={styles.primaryText}>{busyLabel || 'Dogrulamayi tamamla'}</Text>
        </Pressable>

        <View style={styles.row}>
          {isEmail ? (
            <Pressable onPress={() => void resendEmailCode(pendingVerification.email || '')} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>Kodu tekrar gonder</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => void sendPhoneCode(pendingVerification.phone)} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>SMS kodu gonder</Text>
            </Pressable>
          )}
        </View>

        {error ? <StateCard title={error.title} description={error.description} tone="danger" /> : null}
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
    justifyContent: 'center',
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.colors.text,
  },
  subtitle: {
    color: theme.colors.textSoft,
    lineHeight: 22,
  },
  input: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    letterSpacing: 4,
    color: theme.colors.text,
  },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: theme.colors.text,
    paddingVertical: 16,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.45,
  },
  primaryText: {
    color: theme.colors.surface,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
  },
  secondaryButton: {
    paddingVertical: 12,
  },
  secondaryText: {
    color: theme.colors.accent,
    fontWeight: '700',
  },
});
