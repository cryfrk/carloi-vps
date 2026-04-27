import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { legalDocuments } from '@carloi-v3/legal';

import { LegalDocumentModal } from '../components/LegalDocumentModal';
import { StateCard } from '../components/StateCard';
import { saveOnboarding, updateProfileSettings } from '../lib/api';
import { extractSnapshot } from '../lib/api';
import { useSessionStore } from '../store/session-store';
import { theme } from '../theme';

export function SettingsScreen() {
  const snapshot = useSessionStore((state) => state.snapshot);
  const setSnapshot = useSessionStore((state) => state.setSnapshot);
  const logout = useSessionStore((state) => state.logout);
  const [bio, setBio] = useState(snapshot?.profile.bio || '');
  const [profileVisibility, setProfileVisibility] = useState(snapshot?.settings?.profileVisibility === 'public');
  const [garageVisibility, setGarageVisibility] = useState(snapshot?.settings?.garageVisibility === 'public');
  const [plateVisibility, setPlateVisibility] = useState(snapshot?.settings?.plateVisibility !== 'hidden');
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);

  const legalDocument = useMemo(
    () => legalDocuments.find((item) => item.id === activeDocumentId) || null,
    [activeDocumentId],
  );

  async function saveSettings() {
    const envelope = await updateProfileSettings({
      profileVisibility: profileVisibility ? 'public' : 'followers',
      garageVisibility: garageVisibility ? 'public' : 'private',
      plateVisibility: plateVisibility ? 'masked' : 'hidden',
    });
    const nextSnapshot = extractSnapshot(envelope);
    if (nextSnapshot) {
      setSnapshot(nextSnapshot);
    }

    if (bio !== (snapshot?.profile.bio || '')) {
      const onboardingEnvelope = await saveOnboarding({
        profile: {
          name: snapshot?.profile.name,
          handle: snapshot?.profile.handle,
          bio,
          avatarUri: snapshot?.profile.avatarUri,
          coverUri: snapshot?.profile.coverUri,
        },
      });
      const updatedSnapshot = extractSnapshot(onboardingEnvelope);
      if (updatedSnapshot) {
        setSnapshot(updatedSnapshot);
      }
    }

    Alert.alert('Kaydedildi', 'Ayarlarin guncellendi.');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Ayarlar</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Profil ayarlari</Text>
          <TextInput value={bio} onChangeText={setBio} placeholder="Biyografi" multiline style={styles.input} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Gizlilik</Text>
          <ToggleRow label="Profil gorunurlugu" value={profileVisibility} onChange={setProfileVisibility} />
          <ToggleRow label="Garaj gorunurlugu" value={garageVisibility} onChange={setGarageVisibility} />
          <ToggleRow label="Plaka gosterimi" value={plateVisibility} onChange={setPlateVisibility} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Hesap ve guvenlik</Text>
          <Text style={styles.infoText}>E-posta: {snapshot?.auth.email || 'Eklenmedi'}</Text>
          <Text style={styles.infoText}>Telefon: {snapshot?.auth.phone || 'Eklenmedi'}</Text>
          <StateCard
            title="Guvenlik ayarlari"
            description="Sifre degistirme, iki adimli dogrulama ve e-posta/telefon guncelleme akislari backend tarafinda ayrik endpoint ister. Su an hesap bilgilerini guvenli sekilde sakliyoruz."
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Yasal metinler</Text>
          {legalDocuments.map((document) => (
            <Pressable key={document.id} onPress={() => setActiveDocumentId(document.id)} style={styles.legalRow}>
              <Text style={styles.legalTitle}>{document.shortTitle}</Text>
              <Text style={styles.legalMeta}>Surum {document.version}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={() => void saveSettings()} style={styles.primaryButton}>
          <Text style={styles.primaryText}>Ayarlarini kaydet</Text>
        </Pressable>
        <Pressable onPress={() => void logout()} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Cikis yap</Text>
        </Pressable>
      </ScrollView>

      <LegalDocumentModal
        visible={Boolean(legalDocument)}
        document={legalDocument}
        flow="register-individual"
        onClose={() => setActiveDocumentId(null)}
        onAccept={() => setActiveDocumentId(null)}
      />
    </SafeAreaView>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: theme.colors.accent, false: '#cbd5e1' }} />
    </View>
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
  card: {
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontWeight: '800',
    color: theme.colors.text,
    fontSize: 16,
  },
  input: {
    minHeight: 110,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    textAlignVertical: 'top',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toggleLabel: {
    flex: 1,
    color: theme.colors.text,
    fontWeight: '600',
  },
  infoText: {
    color: theme.colors.textSoft,
  },
  legalRow: {
    paddingVertical: 10,
    gap: 4,
  },
  legalTitle: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  legalMeta: {
    color: theme.colors.muted,
    fontSize: 12,
  },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: theme.colors.text,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryText: {
    color: theme.colors.surface,
    fontWeight: '800',
  },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  secondaryText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
});
