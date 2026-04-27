import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { buildConsentPayload, getLegalDocuments, type LegalDocument } from '@/lib/consents';
import { getMobileApiClient } from '@/lib/api';
import { getReadableErrorMessage } from '@/lib/errors';
import { LegalDocumentModal } from '@/components/LegalDocumentModal';
import { StatusBadge } from '@/components/StatusBadge';
import { AppInput } from '@/components/ui/AppInput';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { useSessionStore } from '@/store/session-store';
import { tokens } from '@/theme/tokens';

export function RegisterWizardScreen({ route }: { route: any }) {
  const initialType = route?.params?.type === 'commercial' ? 'commercial' : 'individual';
  const [step, setStep] = useState(0);
  const [accountType, setAccountType] = useState<'individual' | 'commercial'>(initialType);
  const [channel, setChannel] = useState<'email' | 'phone'>('email');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    handle: '',
    email: '',
    phone: '',
    password: '',
    passwordRepeat: '',
    companyName: '',
    taxNumber: '',
    taxOffice: '',
  });
  const [acceptedDocumentIds, setAcceptedDocumentIds] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<LegalDocument | null>(null);
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const client = useMemo(() => getMobileApiClient(), []);
  const setSession = useSessionStore((state) => state.setSession);
  const setPendingAuth = useSessionStore((state) => state.setPendingAuth);

  const documents = useMemo(() => getLegalDocuments(accountType), [accountType]);
  const requiredAccepted = documents
    .filter((item) => item.required)
    .every((item) => acceptedDocumentIds.includes(item.id));

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function openDocument(document: LegalDocument) {
    setSelectedDocument(document);
  }

  function acceptDocument() {
    if (!selectedDocument) {
      return;
    }

    setAcceptedDocumentIds((current) =>
      current.includes(selectedDocument.id) ? current : [...current, selectedDocument.id],
    );
  }

  function validateStepTwo() {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.handle.trim()) {
      return 'Isim, soyisim ve kullanici adi zorunludur.';
    }

    if (!form.password || form.password.length < 6) {
      return 'Sifre en az 6 karakter olmali.';
    }

    if (form.password !== form.passwordRepeat) {
      return 'Sifre tekrar alani eslesmiyor.';
    }

    if (channel === 'email' && !form.email.trim()) {
      return 'E-posta ile kayit icin e-posta zorunludur.';
    }

    if (channel === 'phone' && !form.phone.trim()) {
      return 'Telefon ile kayit icin telefon zorunludur.';
    }

    if (accountType === 'commercial') {
      if (!form.companyName.trim() || !form.taxNumber.trim() || !form.taxOffice.trim()) {
        return 'Ticari hesap icin firma, vergi no/TCKN ve vergi dairesi zorunludur.';
      }

      if (!form.email.trim() || !form.phone.trim()) {
        return 'Ticari hesapta e-posta ve telefon birlikte zorunludur.';
      }
    }

    if (!requiredAccepted) {
      return 'Tum zorunlu sozlesmeleri acip kabul etmelisiniz.';
    }

    return null;
  }

  async function continueFlow() {
    setError('');
    setInfo('');

    if (step < 2) {
      setStep((current) => current + 1);
      return;
    }

    const validationError = validateStepTwo();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      if (channel === 'phone') {
        const smsStart = await client.startVerification('phone', form.phone.trim());
        setPendingAuth(smsStart);
        if (smsStart.smsDisabled || smsStart.smsNotConfigured) {
          setInfo('SMS servisi su anda aktif degil. Lutfen e-posta ile kayit ol veya daha sonra tekrar dene.');
        } else {
          setInfo(smsStart.message || 'SMS dogrulama kodu gonderildi.');
        }
      }

      const response = await client.register({
        name: `${form.firstName} ${form.lastName}`.trim(),
        handle: form.handle.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        password: form.password,
        primaryChannel: channel,
        accountType,
        consents: buildConsentPayload(acceptedDocumentIds, accountType),
        commercialProfile:
          accountType === 'commercial'
            ? {
                companyName: form.companyName.trim(),
                taxOrIdentityType: 'VKN',
                taxOrIdentityNumber: form.taxNumber.trim(),
                tradeName: form.companyName.trim(),
                authorizedPersonName: `${form.firstName} ${form.lastName}`.trim(),
                authorizedPersonTitle: form.taxOffice.trim(),
                phone: form.phone.trim(),
              }
            : undefined,
      });

      setPendingAuth(response);

      if (response.token && response.snapshot) {
        await setSession({ token: response.token, snapshot: response.snapshot });
        return;
      }

      if (response.emailDisabled || response.emailNotConfigured) {
        setInfo('E-posta servisi su anda aktif degil. Lutfen daha sonra tekrar deneyin.');
      } else if (response.smsDisabled || response.smsNotConfigured) {
        setInfo('SMS servisi su anda aktif degil. Lutfen daha sonra tekrar deneyin.');
      } else {
        setInfo(response.message || 'Dogrulama adimina gecildi.');
      }

      setStep(3);
    } catch (registerError) {
      setError(getReadableErrorMessage(registerError, 'Kayit tamamlanamadi.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function completeVerification() {
    setSubmitting(true);
    setError('');

    try {
      if (channel === 'phone') {
        const response = await client.register({
          name: `${form.firstName} ${form.lastName}`.trim(),
          handle: form.handle.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          password: form.password,
          primaryChannel: 'phone',
          accountType,
          signupVerification: { code: verificationCode.trim() },
          consents: buildConsentPayload(acceptedDocumentIds, accountType),
          commercialProfile:
            accountType === 'commercial'
              ? {
                  companyName: form.companyName.trim(),
                  taxOrIdentityType: 'VKN',
                  taxOrIdentityNumber: form.taxNumber.trim(),
                  tradeName: form.companyName.trim(),
                  authorizedPersonName: `${form.firstName} ${form.lastName}`.trim(),
                  authorizedPersonTitle: form.taxOffice.trim(),
                  phone: form.phone.trim(),
                }
              : undefined,
        });

        if (!response.token || !response.snapshot) {
          throw new Error('SMS dogrulama tamamlandi ancak oturum acilamadi.');
        }

        await setSession({ token: response.token, snapshot: response.snapshot });
        return;
      }

      const response = await client.verifyEmailCode(form.email.trim(), verificationCode.trim());
      if (!response.token || !response.snapshot) {
        throw new Error('E-posta dogrulamasi tamamlandi ancak oturum acilamadi.');
      }
      await setSession({ token: response.token, snapshot: response.snapshot });
    } catch (verifyError) {
      setError(getReadableErrorMessage(verifyError, 'Dogrulama tamamlanamadi.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function resendVerification() {
    setSubmitting(true);
    setError('');

    try {
      if (channel === 'phone') {
        const response = await client.sendSmsCode(form.phone.trim());
        if (response.smsDisabled || response.smsNotConfigured) {
          setInfo('SMS servisi su anda aktif degil. Lutfen daha sonra tekrar deneyin.');
        } else {
          setInfo(response.message || 'Yeni SMS kodu gonderildi.');
        }
      } else {
        const response = await client.resendVerificationCode(form.email.trim());
        if (response.emailDisabled || response.emailNotConfigured) {
          setInfo('E-posta servisi henuz aktif degil. Lutfen daha sonra tekrar deneyin.');
        } else {
          setInfo(response.message || 'Dogrulama e-postasi yeniden gonderildi.');
        }
      }
    } catch (resendError) {
      setError(getReadableErrorMessage(resendError, 'Dogrulama mesaji gonderilemedi.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Yeni hesap olustur</Text>
        <Text style={styles.subtitle}>Hesap tipini sec, iletisim kanalini belirle ve dogrulama ile oturumu tamamla.</Text>
      </View>

      <View style={styles.steps}>
        {['Hesap', 'Kanal', 'Bilgiler', 'Dogrulama'].map((item, index) => (
          <View key={item} style={[styles.step, step === index && styles.stepActive]}>
            <Text style={[styles.stepLabel, step === index && styles.stepLabelActive]}>{index + 1}</Text>
          </View>
        ))}
      </View>

      {step === 0 ? (
        <View style={styles.choiceGrid}>
          <ChoiceCard active={accountType === 'individual'} title="Bireysel hesap" description="Gonderi, garaj ve ilan akisina bireysel olarak katil." onPress={() => setAccountType('individual')} />
          <ChoiceCard active={accountType === 'commercial'} title="Ticari hesap" description="Belge yukleme ile kurumsal rozet ve ticari ozellikleri ac." onPress={() => setAccountType('commercial')} />
        </View>
      ) : null}

      {step === 1 ? (
        <View style={styles.choiceGrid}>
          <ChoiceCard active={channel === 'email'} title="E-posta ile kayit" description="Dogrulama e-postasi ile hizli hesap acilisi." onPress={() => setChannel('email')} />
          <ChoiceCard active={channel === 'phone'} title="Telefon ile kayit" description="SMS kodu ile hizli ve guvenli dogrulama." onPress={() => setChannel('phone')} />
        </View>
      ) : null}

      {step === 2 ? (
        <>
          <SectionCard>
            <AppInput label="Isim" value={form.firstName} onChangeText={(value) => updateField('firstName', value)} placeholder="Isim" />
            <AppInput label="Soyisim" value={form.lastName} onChangeText={(value) => updateField('lastName', value)} placeholder="Soyisim" />
            <AppInput label="Kullanici adi" value={form.handle} onChangeText={(value) => updateField('handle', value)} placeholder="kullaniciadi" />
            {channel === 'email' || accountType === 'commercial' ? (
              <AppInput label="E-posta" value={form.email} onChangeText={(value) => updateField('email', value)} placeholder="ornek@carloi.com" />
            ) : null}
            {channel === 'phone' || accountType === 'commercial' ? (
              <AppInput label="Telefon" value={form.phone} onChangeText={(value) => updateField('phone', value)} placeholder="+90 5xx xxx xx xx" />
            ) : null}
            {accountType === 'commercial' ? (
              <>
                <AppInput label="Firma / isletme adi" value={form.companyName} onChangeText={(value) => updateField('companyName', value)} placeholder="Firma adi" />
                <AppInput label="VKN / TCKN" value={form.taxNumber} onChangeText={(value) => updateField('taxNumber', value)} placeholder="Vergi no veya TCKN" />
                <AppInput label="Vergi dairesi" value={form.taxOffice} onChangeText={(value) => updateField('taxOffice', value)} placeholder="Vergi dairesi" />
              </>
            ) : null}
            <AppInput label="Sifre" value={form.password} onChangeText={(value) => updateField('password', value)} placeholder="Sifre" secureTextEntry />
            <AppInput label="Sifre tekrar" value={form.passwordRepeat} onChangeText={(value) => updateField('passwordRepeat', value)} placeholder="Sifre tekrar" secureTextEntry />
          </SectionCard>

          <SectionCard>
            <Text style={styles.sectionTitle}>Sozlesmeler ve onaylar</Text>
            <Text style={styles.sectionCopy}>Her metni acip inceleyebilir, kabul ettikten sonra kaydi tamamlayabilirsin.</Text>
            {documents.map((document) => {
              const accepted = acceptedDocumentIds.includes(document.id);
              return (
                <Pressable key={document.id} style={styles.documentRow} onPress={() => openDocument(document)}>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text style={styles.documentTitle}>{document.title}</Text>
                    <Text style={styles.documentMeta}>
                      {document.required ? 'Zorunlu' : 'Opsiyonel'} · Surum {document.version}
                    </Text>
                  </View>
                  {accepted ? <StatusBadge label="Kabul edildi" tone="success" /> : <StatusBadge label="Oku" tone="neutral" />}
                </Pressable>
              );
            })}
          </SectionCard>
        </>
      ) : null}

      {step === 3 ? (
        <SectionCard>
          <Text style={styles.sectionTitle}>{channel === 'email' ? 'E-posta dogrulama' : 'SMS dogrulama'}</Text>
          <Text style={styles.sectionCopy}>
            {channel === 'email'
              ? 'E-postadaki kodu gir veya gelen linki ac. Kodla devam etmek istersen asagidan tamamlayabilirsin.'
              : 'Telefonuna gelen 6 haneli kodu girip hesabini aktiflestir.'}
          </Text>
          <AppInput label="Dogrulama kodu" value={verificationCode} onChangeText={setVerificationCode} placeholder="123456" />
          <PrimaryButton
            label={submitting ? 'Dogrulaniyor...' : 'Dogrulamayi tamamla'}
            onPress={completeVerification}
            disabled={submitting}
          />
          <PrimaryButton
            label={submitting ? 'Bekleniyor...' : 'Kodu yeniden gonder'}
            variant="secondary"
            onPress={resendVerification}
            disabled={submitting}
          />
        </SectionCard>
      ) : null}

      {info ? <StatusBadge label={info} tone="accent" /> : null}
      <ErrorBanner message={error} />

      {step < 3 ? (
        <PrimaryButton label={submitting ? 'Isleniyor...' : 'Devam et'} onPress={continueFlow} disabled={submitting} />
      ) : null}

      <LegalDocumentModal
        visible={Boolean(selectedDocument)}
        document={selectedDocument}
        accepted={selectedDocument ? acceptedDocumentIds.includes(selectedDocument.id) : false}
        onClose={() => setSelectedDocument(null)}
        onAccept={acceptDocument}
      />
    </ScreenContainer>
  );
}

function ChoiceCard({
  active,
  title,
  description,
  onPress,
}: {
  active: boolean;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.choiceCard, active && styles.choiceCardActive]}>
      <Text style={styles.choiceTitle}>{title}</Text>
      <Text style={styles.choiceDescription}>{description}</Text>
      {active ? <StatusBadge label="Secildi" tone="accent" /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  subtitle: {
    color: tokens.colors.muted,
    lineHeight: 22,
  },
  steps: {
    flexDirection: 'row',
    gap: 10,
  },
  step: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  stepActive: {
    backgroundColor: tokens.colors.accent,
    borderColor: tokens.colors.accent,
  },
  stepLabel: {
    fontWeight: '800',
    color: tokens.colors.muted,
  },
  stepLabelActive: {
    color: '#ffffff',
  },
  choiceGrid: {
    gap: 12,
  },
  choiceCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: '#ffffff',
    padding: 18,
    gap: 8,
  },
  choiceCardActive: {
    borderColor: tokens.colors.accent,
    backgroundColor: tokens.colors.accentSoft,
  },
  choiceTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  choiceDescription: {
    color: tokens.colors.muted,
    lineHeight: 21,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  sectionCopy: {
    color: tokens.colors.muted,
    lineHeight: 21,
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  documentTitle: {
    color: tokens.colors.text,
    fontWeight: '700',
  },
  documentMeta: {
    color: tokens.colors.muted,
    fontSize: 12,
  },
});
