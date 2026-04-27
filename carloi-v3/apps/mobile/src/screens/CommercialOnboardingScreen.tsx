import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { buildPendingAcceptances, getRequiredDocumentsForFlow, legalDocuments } from '@carloi-v3/legal';

import { LegalDocumentModal } from '../components/LegalDocumentModal';
import { StateCard } from '../components/StateCard';
import {
  pickDocuments,
  saveCommercialProfile,
  submitCommercialOnboarding,
  uploadCommercialDocument,
  uploadPickedAssets,
} from '../lib/api';
import { extractSnapshot } from '../lib/api';
import { useSessionStore } from '../store/session-store';
import { theme } from '../theme';

export function CommercialOnboardingScreen() {
  const snapshot = useSessionStore((state) => state.snapshot);
  const setSnapshot = useSessionStore((state) => state.setSnapshot);

  const [companyName, setCompanyName] = useState(snapshot?.commercial?.companyName || '');
  const [taxNumber, setTaxNumber] = useState('');
  const [phone, setPhone] = useState(snapshot?.auth.phone || '');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [acceptedVersions, setAcceptedVersions] = useState<Record<string, string>>({});
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);

  const requiredDocuments = useMemo(
    () => getRequiredDocumentsForFlow(legalDocuments, 'commercial-onboarding', 'commercial'),
    [],
  );
  const pending = useMemo(
    () => buildPendingAcceptances(legalDocuments, 'commercial-onboarding', 'commercial'),
    [],
  );
  const legalDocument = legalDocuments.find((item) => item.id === activeDocumentId) || null;
  const acceptedAll = requiredDocuments.every((document) => acceptedVersions[document.id] === document.version);

  async function handleSaveDraft() {
    const envelope = await saveCommercialProfile({
      companyName,
      taxOrIdentityType: 'VKN',
      taxOrIdentityNumber: taxNumber,
      tradeName: companyName,
      authorizedPersonName: snapshot?.profile.name || '',
      phone,
      city,
      district,
      address,
      notes,
    });
    const nextSnapshot = extractSnapshot(envelope);
    if (nextSnapshot) {
      setSnapshot(nextSnapshot);
    }
    Alert.alert('Kaydedildi', 'Ticari hesap taslagi guncellendi.');
  }

  async function handleUploadDocument(type: string) {
    const assets = await pickDocuments();
    if (!assets.length) {
      return;
    }

    const uploaded = await uploadPickedAssets(assets);
    for (const item of uploaded) {
      const envelope = await uploadCommercialDocument({
        type,
        fileUrl: item.url,
        originalFileName: item.name,
        mimeType: item.type === 'document' ? 'application/pdf' : 'image/jpeg',
        fileSize: 1024 * 32,
      });
      const nextSnapshot = extractSnapshot(envelope);
      if (nextSnapshot) {
        setSnapshot(nextSnapshot);
      }
    }
    Alert.alert('Belge yuklendi', 'Belge inceleme sirasina eklendi.');
  }

  async function handleSubmit() {
    const envelope = await submitCommercialOnboarding({
      consents: pending.map((item) => ({
        type: item.documentId,
        accepted: acceptedVersions[item.documentId] === item.documentVersion,
        version: item.documentVersion,
        sourceScreen: 'CommercialOnboarding',
      })),
      declarations: {
        documentTruthfulnessAccepted: true,
        additionalVerificationAcknowledged: true,
      },
    });
    const nextSnapshot = extractSnapshot(envelope);
    if (nextSnapshot) {
      setSnapshot(nextSnapshot);
    }
    Alert.alert('Basvuru gonderildi', 'Ticari uyelik incelemeye alindi.');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Ticari hesap</Text>
        <StateCard
          title={`Durum: ${snapshot?.commercial?.status || 'not_applied'}`}
          description={snapshot?.commercial?.publishingBlockedReason || 'Belge ve beyanlarini tamamlayarak ticari rozet surecine girebilirsin.'}
        />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Firma bilgileri</Text>
          <TextInput value={companyName} onChangeText={setCompanyName} placeholder="Firma / isletme adi" style={styles.input} />
          <TextInput value={taxNumber} onChangeText={setTaxNumber} placeholder="Vergi no / TCKN" style={styles.input} />
          <TextInput value={phone} onChangeText={setPhone} placeholder="Telefon" style={styles.input} />
          <TextInput value={city} onChangeText={setCity} placeholder="Sehir" style={styles.input} />
          <TextInput value={district} onChangeText={setDistrict} placeholder="Ilce" style={styles.input} />
          <TextInput value={address} onChangeText={setAddress} placeholder="Adres" multiline style={styles.input} />
          <TextInput value={notes} onChangeText={setNotes} placeholder="Ek notlar" multiline style={styles.input} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Belge yukleme</Text>
          <Pressable onPress={() => void handleUploadDocument('tax_document')} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Vergi belgesi yukle</Text>
          </Pressable>
          <Pressable onPress={() => void handleUploadDocument('identity_document')} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Kimlik veya yetki belgesi yukle</Text>
          </Pressable>
          <Pressable onPress={() => void handleUploadDocument('authorization_certificate')} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Imza sirkuleri / yetki belgesi</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Ticari taahhutler</Text>
          {requiredDocuments.map((document) => {
            const accepted = acceptedVersions[document.id] === document.version;
            return (
              <Pressable key={document.id} onPress={() => setActiveDocumentId(document.id)} style={styles.legalRow}>
                <Text style={styles.legalTitle}>{document.shortTitle}</Text>
                <Text style={styles.legalMeta}>{accepted ? 'Kabul edildi' : 'Ac ve kabul et'}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable onPress={() => void handleSaveDraft()} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Taslagi kaydet</Text>
        </Pressable>
        <Pressable
          onPress={() => void handleSubmit()}
          style={[styles.primaryButton, !acceptedAll ? styles.disabled : null]}
          disabled={!acceptedAll}
        >
          <Text style={styles.primaryText}>Basvuruyu gonder</Text>
        </Pressable>

        {!acceptedAll ? (
          <Text style={styles.helperText}>Taahhut metinleri kabul edilmeden basvuru gonderilemez.</Text>
        ) : null}
      </ScrollView>

      <LegalDocumentModal
        visible={Boolean(legalDocument)}
        document={legalDocument}
        flow="commercial-onboarding"
        onClose={() => setActiveDocumentId(null)}
        onAccept={(documentId, version) => {
          setAcceptedVersions((state) => ({ ...state, [documentId]: version }));
          setActiveDocumentId(null);
        }}
      />
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    textAlignVertical: 'top',
  },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: theme.colors.surface,
  },
  secondaryText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  primaryButton: {
    borderRadius: 999,
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: theme.colors.text,
  },
  primaryText: {
    color: theme.colors.surface,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.45,
  },
  helperText: {
    color: theme.colors.muted,
    fontSize: 12,
    textAlign: 'center',
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
});
