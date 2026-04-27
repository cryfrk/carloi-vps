import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { getMobileApiClient } from '@/lib/api';
import { getLegalDocuments, type LegalDocument } from '@/lib/consents';
import { getReadableErrorMessage } from '@/lib/errors';
import { LegalDocumentModal } from '@/components/LegalDocumentModal';
import { NetworkBanner } from '@/components/NetworkBanner';
import { StatusBadge } from '@/components/StatusBadge';
import { TopHeader } from '@/components/TopHeader';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { useSessionStore } from '@/store/session-store';
import { tokens } from '@/theme/tokens';

export function SettingsScreen({ navigation }: { navigation: any }) {
  const snapshot = useSessionStore((state) => state.snapshot);
  const apiStatus = useSessionStore((state) => state.apiStatus);
  const apiMessage = useSessionStore((state) => state.apiMessage);
  const setSnapshot = useSessionStore((state) => state.setSnapshot);
  const clearSession = useSessionStore((state) => state.clearSession);
  const client = useMemo(() => getMobileApiClient(), []);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [document, setDocument] = useState<LegalDocument | null>(null);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [draft, setDraft] = useState({
    pushNotifications: snapshot?.settings.pushNotifications ?? true,
    emailNotifications: snapshot?.settings.emailNotifications ?? true,
    smsNotifications: snapshot?.settings.smsNotifications ?? true,
    privateProfile: snapshot?.settings.privateProfile ?? false,
    allowMessageRequests: snapshot?.settings.allowMessageRequests ?? true,
    showLastSeen: snapshot?.settings.showLastSeen ?? true,
    showSavedAdsOnProfile: snapshot?.settings.showSavedAdsOnProfile ?? false,
    useDeviceLocation: snapshot?.settings.useDeviceLocation ?? true,
    shareLocationWithAi: snapshot?.settings.shareLocationWithAi ?? false,
    autoplayVideo: snapshot?.settings.autoplayVideo ?? true,
    showSoldCountOnProfile: snapshot?.settings.showSoldCountOnProfile ?? true,
    quickLoginEnabled: snapshot?.settings.quickLoginEnabled ?? true,
  });

  useEffect(() => {
    if (!snapshot?.settings) {
      return;
    }

    setDraft({
      pushNotifications: snapshot.settings.pushNotifications,
      emailNotifications: snapshot.settings.emailNotifications,
      smsNotifications: snapshot.settings.smsNotifications,
      privateProfile: snapshot.settings.privateProfile,
      allowMessageRequests: snapshot.settings.allowMessageRequests,
      showLastSeen: snapshot.settings.showLastSeen,
      showSavedAdsOnProfile: snapshot.settings.showSavedAdsOnProfile,
      useDeviceLocation: snapshot.settings.useDeviceLocation,
      shareLocationWithAi: snapshot.settings.shareLocationWithAi,
      autoplayVideo: snapshot.settings.autoplayVideo,
      showSoldCountOnProfile: snapshot.settings.showSoldCountOnProfile,
      quickLoginEnabled: snapshot.settings.quickLoginEnabled,
    });
  }, [snapshot?.settings]);

  const accountType = snapshot?.commercial?.accountType || 'individual';
  const legalDocuments = getLegalDocuments(accountType);

  function updateSwitch(key: keyof typeof draft, value: boolean) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function saveSettings() {
    try {
      setSaving(true);
      setError('');
      setMessage('');
      const response = await client.updateProfileSettings(draft);
      if (response.snapshot) {
        setSnapshot(response.snapshot);
      }
      setMessage(response.message || 'Ayarlar kaydedildi.');
    } catch (saveError) {
      setError(getReadableErrorMessage(saveError, 'Ayarlar kaydedilemedi.'));
    } finally {
      setSaving(false);
    }
  }

  async function resendEmail() {
    if (!snapshot?.settings.email) {
      setError('Hesabinda kayitli bir e-posta bulunmuyor.');
      return;
    }

    try {
      setError('');
      setMessage('');
      const response = await client.resendVerificationCode(snapshot.settings.email);
      if (response.emailDisabled || response.emailNotConfigured) {
        setMessage('E-posta servisi aktif olmadigi icin dogrulama e-postasi gonderilemiyor.');
        return;
      }
      setMessage(response.message || 'Dogrulama e-postasi yeniden gonderildi.');
    } catch (resendError) {
      setError(getReadableErrorMessage(resendError, 'Dogrulama e-postasi gonderilemedi.'));
    }
  }

  async function sendSms() {
    if (!snapshot?.settings.phone) {
      setError('Hesabinda kayitli bir telefon numarasi bulunmuyor.');
      return;
    }

    try {
      setError('');
      setMessage('');
      const response = await client.sendSmsCode(snapshot.settings.phone);
      if (response.smsDisabled || response.smsNotConfigured) {
        setMessage('SMS servisi su anda aktif degil.');
        return;
      }
      setMessage(response.message || 'SMS dogrulama kodu gonderildi.');
    } catch (smsError) {
      setError(getReadableErrorMessage(smsError, 'SMS kodu gonderilemedi.'));
    }
  }

  async function logout() {
    await clearSession();
  }

  return (
    <ScreenContainer>
      <TopHeader
        title="Ayarlar"
        subtitle="Guvenlik, bildirim ve gizlilik tercihlerini yonet"
        onPressCreate={() => navigation.getParent()?.navigate('Create')}
        onPressSearch={() => navigation.getParent()?.navigate('Search')}
      />

      <NetworkBanner status={apiStatus} message={apiMessage} />

      <SectionCard>
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.sectionTitle}>Profil ayarlari</Text>
            <Text style={styles.sectionText}>
              {snapshot?.profile.name || 'Carloi kullanicisi'} | @{snapshot?.profile.handle || 'carloi'}
            </Text>
          </View>
          <StatusBadge label={snapshot?.commercial?.enabled ? 'Ticari rozet aktif' : 'Bireysel hesap'} tone={snapshot?.commercial?.enabled ? 'accent' : 'neutral'} />
        </View>
        <Text style={styles.sectionText}>{snapshot?.profile.bio || 'Profil biyografin henuz eklenmedi.'}</Text>
        <PrimaryButton label="Ticari hesap merkezi" variant="secondary" onPress={() => navigation.getParent()?.navigate('Commercial')} />
        <DisabledAction
          title="Profil fotografi ve biyografi"
          description="Mobil V2 baseline bu bilgileri gosterir. Gorsel medya duzenleme backend kontrati netlestiginde bu alandan acilacak."
        />
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>Hesap ve guvenlik</Text>
        <SettingLine label="E-posta" value={snapshot?.settings.email || 'Eklenmemis'} />
        <SettingLine label="Telefon" value={snapshot?.settings.phone || 'Eklenmemis'} />
        <SettingLine label="Uyelik paketi" value={snapshot?.settings.membershipPlan || 'Temel'} />
        <SettingLine label="Hizli giris" value={draft.quickLoginEnabled ? 'Acik' : 'Kapali'} />
        <ToggleRow label="Hizli giris" value={draft.quickLoginEnabled} onValueChange={(value) => updateSwitch('quickLoginEnabled', value)} />
        <PrimaryButton label="Dogrulama islemlerini yonet" variant="secondary" onPress={() => setVerificationOpen(true)} />
        <DisabledAction
          title="Sifre degistirme"
          description="Mobil V2 baseline, sifre yenileme akisina saygili kalir. Sifre degisimi reset-password akisi ile yapilir."
        />
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>Bildirimler</Text>
        <ToggleRow label="Push bildirimleri" value={draft.pushNotifications} onValueChange={(value) => updateSwitch('pushNotifications', value)} />
        <ToggleRow label="E-posta bildirimleri" value={draft.emailNotifications} onValueChange={(value) => updateSwitch('emailNotifications', value)} />
        <ToggleRow label="SMS bildirimleri" value={draft.smsNotifications} onValueChange={(value) => updateSwitch('smsNotifications', value)} />
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>Gizlilik ve Garajim</Text>
        <ToggleRow label="Profili gizli tut" value={draft.privateProfile} onValueChange={(value) => updateSwitch('privateProfile', value)} />
        <ToggleRow label="Mesaj isteklerine izin ver" value={draft.allowMessageRequests} onValueChange={(value) => updateSwitch('allowMessageRequests', value)} />
        <ToggleRow label="Son gorulme bilgisi" value={draft.showLastSeen} onValueChange={(value) => updateSwitch('showLastSeen', value)} />
        <ToggleRow label="Kaydedilen ilanlari profilde goster" value={draft.showSavedAdsOnProfile} onValueChange={(value) => updateSwitch('showSavedAdsOnProfile', value)} />
        <ToggleRow label="Satilan ilan sayisini goster" value={draft.showSoldCountOnProfile} onValueChange={(value) => updateSwitch('showSoldCountOnProfile', value)} />
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>Uygulama ve veri kullanimi</Text>
        <ToggleRow label="Konum izinlerini kullan" value={draft.useDeviceLocation} onValueChange={(value) => updateSwitch('useDeviceLocation', value)} />
        <ToggleRow label="AI ile konum paylas" value={draft.shareLocationWithAi} onValueChange={(value) => updateSwitch('shareLocationWithAi', value)} />
        <ToggleRow label="Videolari otomatik oynat" value={draft.autoplayVideo} onValueChange={(value) => updateSwitch('autoplayVideo', value)} />
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>Yasal metinler ve destek</Text>
        {legalDocuments.map((item) => (
          <Pressable key={item.id} style={styles.legalRow} onPress={() => setDocument(item)}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.legalTitle}>{item.title}</Text>
              <Text style={styles.legalMeta}>Surum {item.version} | Son guncelleme {item.updatedAt}</Text>
            </View>
            <StatusBadge label={item.required ? 'Zorunlu' : 'Opsiyonel'} tone={item.required ? 'warning' : 'neutral'} />
          </Pressable>
        ))}
        <PrimaryButton label="Destek ekibine ulas" variant="secondary" disabled />
        <Text style={styles.disabledNote}>
          Destek entegrasyonu sonraki sunucu kontratiyla canlanacak. Bu buton kasitli olarak pasif tutuluyor.
        </Text>
      </SectionCard>

      {message ? (
        <SectionCard>
          <Text style={styles.successText}>{message}</Text>
        </SectionCard>
      ) : null}

      <ErrorBanner message={error} />

      <PrimaryButton label={saving ? 'Kaydediliyor...' : 'Ayarlarimi kaydet'} onPress={saveSettings} disabled={saving} />
      <PrimaryButton label="Cikis yap" variant="ghost" onPress={logout} />

      <VerificationModal
        visible={verificationOpen}
        email={snapshot?.settings.email || ''}
        phone={snapshot?.settings.phone || ''}
        onClose={() => setVerificationOpen(false)}
        onResendEmail={resendEmail}
        onSendSms={sendSms}
      />

      <LegalDocumentModal
        visible={Boolean(document)}
        document={document}
        accepted
        onClose={() => setDocument(null)}
        onAccept={() => setDocument(null)}
      />
    </ScreenContainer>
  );
}

function ToggleRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#cbd5e1', true: '#99f6e4' }}
        thumbColor={value ? tokens.colors.accent : '#ffffff'}
      />
    </View>
  );
}

function SettingLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.settingLine}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Text style={styles.settingValue}>{value}</Text>
    </View>
  );
}

function DisabledAction({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.disabledCard}>
      <Text style={styles.disabledTitle}>{title}</Text>
      <Text style={styles.disabledNote}>{description}</Text>
      <PrimaryButton label="Bu alan su an pasif" variant="secondary" disabled />
    </View>
  );
}

function VerificationModal({
  visible,
  email,
  phone,
  onClose,
  onResendEmail,
  onSendSms,
}: {
  visible: boolean;
  email: string;
  phone: string;
  onClose: () => void;
  onResendEmail: () => Promise<void>;
  onSendSms: () => Promise<void>;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Dogrulama merkezi</Text>
            <PrimaryButton label="Kapat" variant="ghost" onPress={onClose} />
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <SectionCard>
              <Text style={styles.sectionTitle}>E-posta dogrulama</Text>
              <Text style={styles.sectionText}>{email || 'E-posta eklenmemis'}</Text>
              <PrimaryButton label="Dogrulama e-postasi gonder" onPress={() => void onResendEmail()} disabled={!email} />
            </SectionCard>

            <SectionCard>
              <Text style={styles.sectionTitle}>Telefon dogrulama</Text>
              <Text style={styles.sectionText}>{phone || 'Telefon eklenmemis'}</Text>
              <PrimaryButton label="SMS kodu gonder" onPress={() => void onSendSms()} disabled={!phone} />
            </SectionCard>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  sectionText: {
    color: tokens.colors.text,
    lineHeight: 22,
  },
  settingLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  settingLabel: {
    flex: 1,
    color: tokens.colors.muted,
  },
  settingValue: {
    flex: 1,
    textAlign: 'right',
    color: tokens.colors.text,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toggleLabel: {
    flex: 1,
    color: tokens.colors.text,
    fontWeight: '600',
    lineHeight: 20,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 4,
  },
  legalTitle: {
    color: tokens.colors.text,
    fontWeight: '700',
  },
  legalMeta: {
    color: tokens.colors.muted,
    fontSize: 12,
  },
  successText: {
    color: tokens.colors.success,
    fontWeight: '700',
  },
  disabledCard: {
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    padding: 14,
    gap: 8,
  },
  disabledTitle: {
    fontWeight: '800',
    color: tokens.colors.text,
  },
  disabledNote: {
    color: tokens.colors.muted,
    lineHeight: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '80%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#ffffff',
    padding: 20,
    gap: 16,
  },
  modalContent: {
    gap: 12,
    paddingBottom: 10,
  },
});
