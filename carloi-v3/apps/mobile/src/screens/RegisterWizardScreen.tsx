import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import {
  buildConsentSubmissionBundle,
  buildPendingAcceptances,
  getRequiredDocumentsForFlow,
  legalDocuments,
  type LegalFlowKey,
} from '@carloi-v3/legal';

import { LegalDocumentModal } from '../components/LegalDocumentModal';
import { SectionTabs } from '../components/SectionTabs';
import { StateCard } from '../components/StateCard';
import { useSessionStore } from '../store/session-store';
import { theme } from '../theme';
import type { AuthStackParamList } from '../types/navigation';

type Navigation = NativeStackNavigationProp<AuthStackParamList>;
type Route = RouteProp<AuthStackParamList, 'RegisterWizard'>;

export function RegisterWizardScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const register = useSessionStore((state) => state.register);
  const error = useSessionStore((state) => state.error);
  const busyLabel = useSessionStore((state) => state.busyLabel);

  const [accountType, setAccountType] = useState<'individual' | 'commercial'>(route.params?.accountType || 'individual');
  const [channel, setChannel] = useState<'email' | 'phone'>('email');
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [identityNumber, setIdentityNumber] = useState('');
  const [taxOffice, setTaxOffice] = useState('');
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [acceptedVersions, setAcceptedVersions] = useState<Record<string, string>>({});

  const flow: LegalFlowKey = accountType === 'commercial' ? 'register-commercial' : 'register-individual';
  const audience = accountType === 'commercial' ? 'commercial' : 'individual';
  const requiredDocuments = useMemo(
    () => getRequiredDocumentsForFlow(legalDocuments, flow, audience),
    [flow, audience],
  );
  const pending = useMemo(() => buildPendingAcceptances(legalDocuments, flow, audience), [flow, audience]);
  const activeDocument = requiredDocuments.find((document) => document.id === activeDocumentId) || null;

  const requiredAccepted = requiredDocuments.every((document) => acceptedVersions[document.id] === document.version);
  const passwordValid = password.length >= 6 && password === passwordRepeat;
  const basicValid = Boolean(name && surname && handle && passwordValid && (channel === 'email' ? email : phone));
  const commercialValid = accountType === 'individual'
    ? true
    : Boolean(companyName && taxOffice && (identityNumber || taxNumber));

  async function handleRegister() {
    const bundle = buildConsentSubmissionBundle(
      pending.map((item) => ({
        ...item,
        accepted: acceptedVersions[item.documentId] === item.documentVersion,
        acceptedAt: acceptedVersions[item.documentId] === item.documentVersion ? new Date().toISOString() : undefined,
      })),
      flow,
      new Date().toISOString(),
    );

    const success = await register({
      name: `${name} ${surname}`.trim(),
      handle,
      password,
      accountType,
      primaryChannel: channel,
      email: channel === 'email' ? email : undefined,
      phone: channel === 'phone' ? phone : undefined,
      bio: accountType === 'commercial' ? `${companyName} • Ticari hesap` : '',
      consents: bundle.items.map((item) => ({
        type: item.documentId,
        accepted: item.accepted,
        version: item.documentVersion,
        sourceScreen: 'RegisterWizard',
      })),
      commercialProfile: accountType === 'commercial'
        ? {
            companyName,
            taxOrIdentityType: identityNumber ? 'TCKN' : 'VKN',
            taxOrIdentityNumber: identityNumber || taxNumber,
            tradeName: companyName,
            authorizedPersonName: `${name} ${surname}`.trim(),
            phone,
            city: '',
            district: '',
            address: '',
            notes: taxOffice ? `Vergi dairesi: ${taxOffice}` : '',
          }
        : undefined,
    });

    if (success) {
      navigation.navigate('Verify');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Uye ol</Text>
            <Text style={styles.subtitle}>Hesap tipini sec, iletisim kanalini belirle ve dogrulamaya gec.</Text>
          </View>

          <View style={styles.block}>
            <Text style={styles.blockTitle}>Hesap tipi</Text>
            <SectionTabs
              tabs={['Bireysel', 'Ticari'] as const}
              value={accountType === 'commercial' ? 'Ticari' : 'Bireysel'}
              onChange={(value) => setAccountType(value === 'Ticari' ? 'commercial' : 'individual')}
            />
          </View>

          <View style={styles.block}>
            <Text style={styles.blockTitle}>Dogrulama kanali</Text>
            <SectionTabs
              tabs={['E-posta', 'Telefon'] as const}
              value={channel === 'email' ? 'E-posta' : 'Telefon'}
              onChange={(value) => setChannel(value === 'Telefon' ? 'phone' : 'email')}
            />
          </View>

          <View style={styles.form}>
            <TextInput value={name} onChangeText={setName} placeholder="Isim" style={styles.input} />
            <TextInput value={surname} onChangeText={setSurname} placeholder="Soyisim" style={styles.input} />
            <TextInput value={handle} onChangeText={setHandle} placeholder="Kullanici adi" style={styles.input} autoCapitalize="none" />
            {channel === 'email' ? (
              <TextInput value={email} onChangeText={setEmail} placeholder="E-posta" style={styles.input} keyboardType="email-address" autoCapitalize="none" />
            ) : (
              <TextInput value={phone} onChangeText={setPhone} placeholder="Telefon" style={styles.input} keyboardType="phone-pad" />
            )}
            <TextInput value={password} onChangeText={setPassword} placeholder="Sifre" style={styles.input} secureTextEntry />
            <TextInput value={passwordRepeat} onChangeText={setPasswordRepeat} placeholder="Sifre tekrar" style={styles.input} secureTextEntry />

            {accountType === 'commercial' ? (
              <>
                <TextInput value={companyName} onChangeText={setCompanyName} placeholder="Firma / isletme adi" style={styles.input} />
                <TextInput value={identityNumber} onChangeText={setIdentityNumber} placeholder="T.C. kimlik no (varsa)" style={styles.input} keyboardType="number-pad" />
                <TextInput value={taxNumber} onChangeText={setTaxNumber} placeholder="Vergi no" style={styles.input} keyboardType="number-pad" />
                <TextInput value={taxOffice} onChangeText={setTaxOffice} placeholder="Vergi dairesi" style={styles.input} />
                {channel !== 'phone' ? (
                  <TextInput value={phone} onChangeText={setPhone} placeholder="Telefon" style={styles.input} keyboardType="phone-pad" />
                ) : null}
              </>
            ) : null}
          </View>

          <View style={styles.block}>
            <Text style={styles.blockTitle}>Sozlesmeler</Text>
            <View style={styles.documentList}>
              {requiredDocuments.map((document) => {
                const accepted = acceptedVersions[document.id] === document.version;
                return (
                  <View key={document.id} style={styles.documentRow}>
                    <View style={styles.documentContent}>
                      <Text style={styles.documentTitle}>{document.shortTitle}</Text>
                      <Text style={styles.documentMeta}>Surum {document.version}</Text>
                    </View>
                    <Pressable onPress={() => setActiveDocumentId(document.id)} style={accepted ? styles.documentAccepted : styles.documentButton}>
                      <Text style={accepted ? styles.documentAcceptedText : styles.documentButtonText}>
                        {accepted ? 'Kabul edildi' : 'Ac'}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>

          {!passwordValid && passwordRepeat ? (
            <StateCard
              title="Sifre uyumsuz"
              description="Sifreniz en az 6 karakter olmali ve tekrar alani ile ayni olmali."
              tone="warning"
            />
          ) : null}

          <Pressable
            onPress={() => void handleRegister()}
            disabled={!basicValid || !commercialValid || !requiredAccepted}
            style={[
              styles.submitButton,
              (!basicValid || !commercialValid || !requiredAccepted) ? styles.submitDisabled : null,
            ]}
          >
            <Text style={styles.submitText}>{busyLabel || 'Kaydi tamamla'}</Text>
          </Pressable>

          {!requiredAccepted ? (
            <Text style={styles.helperText}>Tum zorunlu sozlesmeleri acip kabul etmeden devam edemezsin.</Text>
          ) : null}

          {error ? <StateCard title={error.title} description={error.description} tone="danger" /> : null}
        </ScrollView>

        <LegalDocumentModal
          visible={Boolean(activeDocument)}
          document={activeDocument}
          flow={flow}
          onClose={() => setActiveDocumentId(null)}
          onAccept={(documentId, version) => {
            setAcceptedVersions((state) => ({ ...state, [documentId]: version }));
            setActiveDocumentId(null);
          }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flex: {
    flex: 1,
  },
  container: {
    padding: 20,
    gap: 20,
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
  block: {
    gap: 12,
  },
  blockTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
  },
  form: {
    gap: 12,
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
  documentList: {
    gap: 10,
  },
  documentRow: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  documentContent: {
    flex: 1,
    gap: 4,
  },
  documentTitle: {
    fontWeight: '700',
    color: theme.colors.text,
  },
  documentMeta: {
    color: theme.colors.muted,
    fontSize: 12,
  },
  documentButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.text,
  },
  documentButtonText: {
    color: theme.colors.surface,
    fontWeight: '700',
  },
  documentAccepted: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.accentSoft,
  },
  documentAcceptedText: {
    color: theme.colors.accent,
    fontWeight: '800',
  },
  submitButton: {
    marginTop: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.text,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitDisabled: {
    opacity: 0.45,
  },
  submitText: {
    color: theme.colors.surface,
    fontWeight: '800',
  },
  helperText: {
    color: theme.colors.muted,
    fontSize: 12,
    textAlign: 'center',
  },
});
