import { useEffect, useMemo, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { CommercialDocumentSummary } from '@carloi/v2-shared';
import { getMobileApiClient } from '@/lib/api';
import { getReadableErrorMessage } from '@/lib/errors';
import { safeDateLabel } from '@/lib/date';
import { NetworkBanner } from '@/components/NetworkBanner';
import { StatusBadge } from '@/components/StatusBadge';
import { TopHeader } from '@/components/TopHeader';
import { AppInput } from '@/components/ui/AppInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { useSessionStore } from '@/store/session-store';
import { tokens } from '@/theme/tokens';

const activityTypes = [
  'Galeri',
  'Yetkili bayi',
  'Oto alim satim',
  'Ekspertiz',
  'Sigorta',
  'Servis',
  'Oto yikama',
  'Yedek parca',
  'Kiralama',
  'Diger',
];

const documentTypes: Array<{ key: CommercialDocumentSummary['type']; label: string; required: boolean }> = [
  { key: 'tax_document', label: 'Vergi levhasi', required: true },
  { key: 'authorization_certificate', label: 'Yetki belgesi', required: true },
  { key: 'trade_registry', label: 'Oda kaydi / ticaret sicil', required: false },
  { key: 'identity_document', label: 'Yetkili kisi kimlik / beyan', required: false },
  { key: 'other', label: 'Diger belge', required: false },
];

export function CommercialScreen({ navigation }: { navigation: any }) {
  const snapshot = useSessionStore((state) => state.snapshot);
  const setSnapshot = useSessionStore((state) => state.setSnapshot);
  const apiStatus = useSessionStore((state) => state.apiStatus);
  const apiMessage = useSessionStore((state) => state.apiMessage);
  const client = useMemo(() => getMobileApiClient(), []);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingType, setUploadingType] = useState<CommercialDocumentSummary['type'] | null>(null);
  const [form, setForm] = useState({
    companyName: snapshot?.commercial?.profile?.companyName || '',
    tradeName: snapshot?.commercial?.profile?.tradeName || '',
    taxOrIdentityType: snapshot?.commercial?.profile?.taxOrIdentityType || 'VKN',
    taxOrIdentityNumber: snapshot?.commercial?.profile?.taxOrIdentityNumber || '',
    mersisNumber: snapshot?.commercial?.profile?.mersisNumber || '',
    authorizedPersonName: snapshot?.commercial?.profile?.authorizedPersonName || snapshot?.profile.name || '',
    authorizedPersonTitle: snapshot?.commercial?.profile?.authorizedPersonTitle || '',
    phone: snapshot?.commercial?.profile?.phone || snapshot?.settings.phone || '',
    email: snapshot?.settings.email || '',
    city: snapshot?.commercial?.profile?.city || snapshot?.settings.city || '',
    district: snapshot?.commercial?.profile?.district || snapshot?.settings.district || '',
    address: snapshot?.commercial?.profile?.address || snapshot?.settings.addressLine || '',
    activityType: snapshot?.commercial?.profile?.notes || activityTypes[0],
    notes: snapshot?.commercial?.profile?.notes || '',
  });

  useEffect(() => {
    if (!snapshot?.commercial?.profile) {
      return;
    }

    setForm((current) => ({
      ...current,
      companyName: snapshot.commercial?.profile?.companyName || '',
      tradeName: snapshot.commercial?.profile?.tradeName || '',
      taxOrIdentityType: snapshot.commercial?.profile?.taxOrIdentityType || 'VKN',
      taxOrIdentityNumber: snapshot.commercial?.profile?.taxOrIdentityNumber || '',
      mersisNumber: snapshot.commercial?.profile?.mersisNumber || '',
      authorizedPersonName: snapshot.commercial?.profile?.authorizedPersonName || snapshot.profile.name || '',
      authorizedPersonTitle: snapshot.commercial?.profile?.authorizedPersonTitle || '',
      phone: snapshot.commercial?.profile?.phone || snapshot.settings.phone || '',
      email: snapshot.settings.email || '',
      city: snapshot.commercial?.profile?.city || snapshot.settings.city || '',
      district: snapshot.commercial?.profile?.district || snapshot.settings.district || '',
      address: snapshot.commercial?.profile?.address || snapshot.settings.addressLine || '',
      notes: snapshot.commercial?.profile?.notes || '',
    }));
  }, [snapshot?.commercial?.profile, snapshot?.profile.name, snapshot?.settings.addressLine, snapshot?.settings.city, snapshot?.settings.district, snapshot?.settings.email, snapshot?.settings.phone]);

  async function refreshCommercial() {
    const response = await client.getCommercialStatus();
    if (response.commercial) {
      const currentSnapshot = useSessionStore.getState().snapshot;
      if (currentSnapshot) {
        setSnapshot({
          ...currentSnapshot,
          commercial: response.commercial,
        });
      }
    } else if (response.snapshot) {
      setSnapshot(response.snapshot);
    }
  }

  async function saveDraft(method: 'POST' | 'PATCH') {
    try {
      setSaving(true);
      setError('');
      setMessage('');
      const payload = {
        companyName: form.companyName,
        tradeName: form.tradeName,
        taxOrIdentityType: form.taxOrIdentityType,
        taxOrIdentityNumber: form.taxOrIdentityNumber,
        mersisNumber: form.mersisNumber,
        authorizedPersonName: form.authorizedPersonName,
        authorizedPersonTitle: form.authorizedPersonTitle,
        phone: form.phone,
        city: form.city,
        district: form.district,
        address: form.address,
        notes: [form.activityType, form.notes].filter(Boolean).join(' | '),
      };
      const response = await client.saveCommercialProfile(payload, method);
      if (response.snapshot) {
        setSnapshot(response.snapshot);
      } else {
        await refreshCommercial();
      }
      setMessage(response.message || 'Ticari profil taslagi kaydedildi.');
    } catch (saveError) {
      setError(getReadableErrorMessage(saveError, 'Ticari profil kaydedilemedi.'));
    } finally {
      setSaving(false);
    }
  }

  async function uploadDocument(type: CommercialDocumentSummary['type']) {
    try {
      setError('');
      setMessage('');
      setUploadingType(type);

      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const document = result.assets[0];
      const formData = new FormData();
      formData.append('file', {
        uri: document.uri,
        name: document.name,
        type: document.mimeType || 'application/octet-stream',
      } as never);

      const uploadResponse = await client.uploadMedia(formData);
      await client.uploadCommercialDocument({
        type,
        fileUrl: uploadResponse.url,
        originalFileName: document.name,
        mimeType: document.mimeType || 'application/octet-stream',
        fileSize: document.size || 1,
      });

      await refreshCommercial();
      setMessage('Belge yuklendi ve inceleme kuyuguna alindi.');
    } catch (uploadError) {
      setError(getReadableErrorMessage(uploadError, 'Belge yuklenemedi.'));
    } finally {
      setUploadingType(null);
    }
  }

  async function submitApplication() {
    try {
      setSaving(true);
      setError('');
      setMessage('');
      const response =
        snapshot?.commercial?.canResubmit
          ? await client.resubmitCommercial()
          : await client.submitCommercial();

      if (response.snapshot) {
        setSnapshot(response.snapshot);
      } else {
        await refreshCommercial();
      }
      setMessage(
        response.message ||
          'Ticari basvuru platform incelemesine gonderildi. Sonuc bildirimi hesabina dusulecek.',
      );
    } catch (submitError) {
      setError(getReadableErrorMessage(submitError, 'Ticari basvuru gonderilemedi.'));
    } finally {
      setSaving(false);
    }
  }

  const currentDocuments = snapshot?.commercial?.currentDocuments || snapshot?.commercial?.documents || [];

  return (
    <ScreenContainer>
      <TopHeader
        title="Ticari hesap"
        subtitle="Belge yukle, durumunu izle ve rozet acilisini yonet"
        onPressCreate={() => navigation.getParent()?.navigate('Create', { mode: 'listing' })}
        onPressSearch={() => navigation.getParent()?.navigate('Search')}
      />

      <NetworkBanner status={apiStatus} message={apiMessage} />

      <SectionCard>
        <View style={styles.headerRow}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.sectionTitle}>Basvuru durumu</Text>
            <Text style={styles.sectionText}>
              {snapshot?.commercial?.commercialStatus || 'not_applied'} | {snapshot?.commercial?.profile?.status || 'draft'}
            </Text>
          </View>
          <StatusBadge
            label={snapshot?.commercial?.enabled ? 'Ticari aktif' : 'Onay bekliyor'}
            tone={snapshot?.commercial?.enabled ? 'success' : 'warning'}
          />
        </View>

        <Text style={styles.sectionText}>
          Onay olmadan ticari rozet, ticari ilan ve kurumsal avantajlar acilmaz. Basvuru tamamlandiginda bu ekrandan durumunu takip edebilirsin.
        </Text>
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>Kurumsal bilgiler</Text>
        <AppInput label="Firma / isletme adi" value={form.companyName} onChangeText={(value) => setForm((current) => ({ ...current, companyName: value }))} placeholder="Firma adi" />
        <AppInput label="Ticari unvan" value={form.tradeName} onChangeText={(value) => setForm((current) => ({ ...current, tradeName: value }))} placeholder="Ticari unvan" />
        <View style={styles.optionRow}>
          {(['VKN', 'TCKN'] as const).map((item) => (
            <PrimaryButton
              key={item}
              label={item}
              variant={form.taxOrIdentityType === item ? 'primary' : 'secondary'}
              onPress={() => setForm((current) => ({ ...current, taxOrIdentityType: item }))}
            />
          ))}
        </View>
        <AppInput label="VKN / TCKN" value={form.taxOrIdentityNumber} onChangeText={(value) => setForm((current) => ({ ...current, taxOrIdentityNumber: value }))} placeholder="Vergi veya kimlik numarasi" />
        <AppInput label="MERSIS / sicil no" value={form.mersisNumber} onChangeText={(value) => setForm((current) => ({ ...current, mersisNumber: value }))} placeholder="Opsiyonel" />
        <AppInput label="Yetkili kisi" value={form.authorizedPersonName} onChangeText={(value) => setForm((current) => ({ ...current, authorizedPersonName: value }))} placeholder="Yetkili isim soyisim" />
        <AppInput label="Yetkili unvani" value={form.authorizedPersonTitle} onChangeText={(value) => setForm((current) => ({ ...current, authorizedPersonTitle: value }))} placeholder="Kurucu, mudur, uzman..." />
        <AppInput label="Telefon" value={form.phone} onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))} placeholder="0555..." />
        <AppInput label="E-posta" value={form.email} onChangeText={(value) => setForm((current) => ({ ...current, email: value }))} placeholder="info@firma.com" />
        <AppInput label="Sehir" value={form.city} onChangeText={(value) => setForm((current) => ({ ...current, city: value }))} placeholder="Sehir" />
        <AppInput label="Ilce" value={form.district} onChangeText={(value) => setForm((current) => ({ ...current, district: value }))} placeholder="Ilce" />
        <AppInput label="Adres" value={form.address} onChangeText={(value) => setForm((current) => ({ ...current, address: value }))} placeholder="Adres" multiline />
        <Text style={styles.subTitle}>Faaliyet turu</Text>
        <View style={styles.optionWrap}>
          {activityTypes.map((item) => (
            <PrimaryButton
              key={item}
              label={item}
              variant={form.activityType === item ? 'primary' : 'secondary'}
              onPress={() => setForm((current) => ({ ...current, activityType: item }))}
            />
          ))}
        </View>
        <AppInput label="Notlar" value={form.notes} onChangeText={(value) => setForm((current) => ({ ...current, notes: value }))} placeholder="Belge aciklamasi, operasyon bilgisi, ek notlar" multiline />
        <PrimaryButton
          label={saving ? 'Kaydediliyor...' : snapshot?.commercial?.profile ? 'Taslagi guncelle' : 'Taslagi kaydet'}
          onPress={() => void saveDraft(snapshot?.commercial?.profile ? 'PATCH' : 'POST')}
          disabled={saving}
        />
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>Belge yukleme merkezi</Text>
        <Text style={styles.sectionText}>
          Vergi levhasi ve yetki belgesi zorunludur. Opsiyonel belgeler inceleme hizini artirabilir.
        </Text>

        <View style={styles.documentList}>
          {documentTypes.map((item) => {
            const uploaded = currentDocuments.find((document) => document.type === item.key);
            return (
              <View key={item.key} style={styles.documentCard}>
                <View style={styles.headerRow}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.documentTitle}>{item.label}</Text>
                    <Text style={styles.documentMeta}>
                      {uploaded
                        ? `${uploaded.originalFileName} | ${safeDateLabel(uploaded.uploadedAt)}`
                        : item.required
                          ? 'Zorunlu belge'
                          : 'Opsiyonel belge'}
                    </Text>
                  </View>
                  <StatusBadge
                    label={uploaded ? uploaded.status : item.required ? 'Bekleniyor' : 'Opsiyonel'}
                    tone={uploaded ? (uploaded.status === 'approved' ? 'success' : uploaded.status === 'rejected' ? 'danger' : 'warning') : item.required ? 'warning' : 'neutral'}
                  />
                </View>
                {uploaded?.rejectReason ? <Text style={styles.rejectReason}>{uploaded.rejectReason}</Text> : null}
                <PrimaryButton
                  label={uploadingType === item.key ? 'Yukleniyor...' : uploaded ? 'Belgeyi yenile' : 'Belge sec ve yukle'}
                  variant={uploaded ? 'secondary' : 'primary'}
                  onPress={() => void uploadDocument(item.key)}
                  disabled={uploadingType !== null}
                />
              </View>
            );
          })}
        </View>
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>Inceleme sonucu ve sonraki adimlar</Text>
        {snapshot?.commercial?.nextActions?.length ? (
          snapshot.commercial.nextActions.map((item) => (
            <View key={item} style={styles.actionHint}>
              <Text style={styles.actionHintText}>{item}</Text>
            </View>
          ))
        ) : (
          <EmptyState title="Yol haritasi hazir" description="Belgeleri yukledikten sonra basvuruyu gondererek inceleme surecini baslatabilirsin." />
        )}

        <PrimaryButton
          label={saving ? 'Gonderiliyor...' : snapshot?.commercial?.canResubmit ? 'Basvuruyu yeniden gonder' : 'Basvuruyu incelemeye gonder'}
          onPress={() => void submitApplication()}
          disabled={saving}
        />
      </SectionCard>

      {message ? (
        <SectionCard>
          <Text style={styles.successText}>{message}</Text>
        </SectionCard>
      ) : null}

      <ErrorBanner message={error} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  subTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: tokens.colors.text,
  },
  sectionText: {
    color: tokens.colors.text,
    lineHeight: 22,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  documentList: {
    gap: 12,
  },
  documentCard: {
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    padding: 14,
    gap: 10,
  },
  documentTitle: {
    fontWeight: '800',
    color: tokens.colors.text,
  },
  documentMeta: {
    color: tokens.colors.muted,
    fontSize: 12,
  },
  rejectReason: {
    color: tokens.colors.danger,
    lineHeight: 20,
  },
  actionHint: {
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    padding: 12,
  },
  actionHintText: {
    color: tokens.colors.text,
    lineHeight: 20,
  },
  successText: {
    color: tokens.colors.success,
    fontWeight: '700',
  },
});
