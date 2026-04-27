import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { StateCard } from '../components/StateCard';
import { useSessionStore } from '../store/session-store';
import { theme } from '../theme';
import type { AuthStackParamList } from '../types/navigation';

type Navigation = NativeStackNavigationProp<AuthStackParamList>;

export function LoginScreen() {
  const navigation = useNavigation<Navigation>();
  const login = useSessionStore((state) => state.login);
  const error = useSessionStore((state) => state.error);
  const busyLabel = useSessionStore((state) => state.busyLabel);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={styles.title}>Giris yap</Text>
          <Text style={styles.subtitle}>E-posta, telefon veya kullanici adi ile hesabina don.</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="E-posta, telefon veya kullanici adi"
            style={styles.input}
            autoCapitalize="none"
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Sifre"
            style={styles.input}
            secureTextEntry
          />

          <Pressable
            onPress={() => void login(identifier, password)}
            style={[styles.primaryButton, (!identifier || !password) ? styles.buttonDisabled : null]}
            disabled={!identifier || !password}
          >
            <Text style={styles.primaryText}>{busyLabel || 'Giris yap'}</Text>
          </Pressable>

          <Pressable onPress={() => navigation.navigate('RegisterWizard')} style={styles.linkButton}>
            <Text style={styles.linkText}>Hesabin yok mu? Uye ol</Text>
          </Pressable>
        </View>

        {error ? <StateCard title={error.title} description={error.description} tone="danger" /> : null}
      </KeyboardAvoidingView>
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
    gap: 26,
  },
  header: {
    gap: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: theme.colors.text,
  },
  subtitle: {
    color: theme.colors.textSoft,
    lineHeight: 22,
  },
  form: {
    gap: 14,
  },
  input: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: theme.colors.text,
  },
  primaryButton: {
    marginTop: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.text,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  primaryText: {
    color: theme.colors.surface,
    fontWeight: '800',
  },
  linkButton: {
    alignSelf: 'center',
  },
  linkText: {
    color: theme.colors.accent,
    fontWeight: '700',
  },
});
