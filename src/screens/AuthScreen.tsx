import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ConsentChecklist } from '../components/ConsentChecklist';
import { buildConsent, getSignupConsentCopy, getSignupConsentDocuments } from '../config/legalConsents';
import {
  AppLanguage,
  AuthActionResult,
  AuthLoginPayload,
  AuthRegisterPayload,
  AuthVerificationStartPayload,
} from '../types';
import { theme, typeScale } from '../theme';

type SignupConsentKey =
  | 'terms_of_service'
  | 'privacy_policy'
  | 'content_responsibility'
  | 'marketing_optional';

type IdentityMethod = 'email' | 'phone';
type RegisterStep = 'method' | 'details' | 'verification';
type AuthView = 'entry' | 'login' | 'register';

interface AuthScreenProps {
  language: AppLanguage;
  registered: boolean;
  savedEmail?: string;
  savedPhone?: string;
  quickLoginAvailable: boolean;
  quickLoginLabel?: string;
  onStartVerification: (payload: AuthVerificationStartPayload) => Promise<AuthActionResult>;
  onLogin: (payload: AuthLoginPayload) => Promise<AuthActionResult>;
  onRegister: (payload: AuthRegisterPayload) => Promise<AuthActionResult>;
  onVerifyEmail: (payload: { email: string; code: string }) => Promise<AuthActionResult>;
  onResendCode: (payload: { email: string }) => Promise<AuthActionResult>;
  onQuickLogin: () => Promise<AuthActionResult>;
}

function EntryCard({
  title,
  description,
  accent,
  icon,
  onPress,
}: {
  title: string;
  description: string;
  accent: 'primary' | 'accent';
  icon: string;
  onPress: () => void;
}) {
  const isPrimary = accent === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.entryCard, isPrimary ? styles.entryCardPrimary : styles.entryCardAccent]}
    >
      <View style={[styles.entryIcon, isPrimary ? styles.entryIconPrimary : styles.entryIconAccent]}>
        <Text style={styles.entryIconText}>{icon}</Text>
      </View>
      <View style={styles.entryCopy}>
        <Text style={styles.entryTitle}>{title}</Text>
        <Text style={styles.entryDescription}>{description}</Text>
      </View>
      <Text style={styles.entryAction}>Devam et</Text>
    </Pressable>
  );
}

export function AuthScreen({
  language,
  registered,
  savedEmail,
  savedPhone,
  quickLoginAvailable,
  quickLoginLabel,
  onStartVerification,
  onLogin,
  onRegister,
  onVerifyEmail,
  onResendCode,
  onQuickLogin,
}: AuthScreenProps) {
  const isTr = language === 'tr';
  const [view, setView] = useState<AuthView>(registered ? 'login' : 'entry');
  const [accountType, setAccountType] = useState<'individual' | 'commercial'>('individual');
  const [registerStep, setRegisterStep] = useState<RegisterStep>('method');
  const [identityMethod, setIdentityMethod] = useState<IdentityMethod>('email');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState(savedEmail ?? '');
  const [phone, setPhone] = useState(savedPhone ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [taxType, setTaxType] = useState<'VKN' | 'TCKN'>('VKN');
  const [taxNumber, setTaxNumber] = useState('');
  const [taxOffice, setTaxOffice] = useState('');
  const [identifier, setIdentifier] = useState(savedEmail || savedPhone || '');
  const [verificationEmail, setVerificationEmail] = useState(savedEmail ?? '');
  const [verificationPhone, setVerificationPhone] = useState(savedPhone ?? '');
  const [smsCode, setSmsCode] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [feedback, setFeedback] = useState('');
  const [pending, setPending] = useState(false);
  const [resendPending, setResendPending] = useState(false);
  const [activeConsent, setActiveConsent] = useState<SignupConsentKey | null>(null);
  const [signupConsents, setSignupConsents] = useState<Record<SignupConsentKey, boolean>>({
    terms_of_service: false,
    privacy_policy: false,
    content_responsibility: false,
    marketing_optional: false,
  });

  const signupConsentCopy = getSignupConsentCopy();
  const signupConsentDocuments = getSignupConsentDocuments();
  const activeConsentDocument = activeConsent ? signupConsentDocuments[activeConsent] : null;

  useEffect(() => {
    setView(registered ? 'login' : 'entry');
    setRegisterStep('method');
    setIdentifier(savedEmail || savedPhone || '');
    setEmail(savedEmail ?? '');
    setPhone(savedPhone ?? '');
    setVerificationEmail(savedEmail ?? '');
    setVerificationPhone(savedPhone ?? '');
    setSmsCode('');
    setEmailCode('');
    setFeedback('');
  }, [registered, savedEmail, savedPhone]);

  const fullName = useMemo(
    () => `${firstName.trim()} ${lastName.trim()}`.trim(),
    [firstName, lastName],
  );

  const stepLabels = useMemo(
    () =>
      isTr
        ? ['Kimlik yöntemi', 'Bilgiler', 'Doğrulama']
        : ['Identity', 'Details', 'Verification'],
    [isTr],
  );

  function resetRegister(type?: 'individual' | 'commercial') {
    setView('register');
    setRegisterStep('method');
    setFeedback('');
    setPassword('');
    setConfirmPassword('');
    setSmsCode('');
    setEmailCode('');
    if (type) {
      setAccountType(type);
    }
  }

  function requiredConsentsAccepted() {
    return (
      signupConsents.terms_of_service &&
      signupConsents.privacy_policy &&
      signupConsents.content_responsibility
    );
  }

  function readDisabledMessage(result: AuthActionResult, fallback: string) {
    if (result.smsDisabled || result.smsNotConfigured) {
      return isTr
        ? 'SMS servisi henüz aktif değil. Lütfen daha sonra tekrar deneyin.'
        : 'SMS service is not active yet. Please try again later.';
    }

    if (result.emailDisabled || result.emailNotConfigured) {
      return isTr
        ? 'E-posta servisi henüz aktif değil. Lütfen daha sonra tekrar deneyin.'
        : 'Email service is not active yet. Please try again later.';
    }

    return result.message || fallback;
  }

  function buildRegisterPayload(code?: string): AuthRegisterPayload {
    return {
      name: fullName,
      handle: handle.trim(),
      bio:
        accountType === 'commercial'
          ? [companyName.trim(), taxOffice.trim()].filter(Boolean).join(' • ')
          : '',
      email: email.trim(),
      phone: phone.trim() || undefined,
      password: password.trim(),
      primaryChannel: identityMethod,
      signupVerification: code ? { code } : undefined,
      accountType,
      commercialProfile:
        accountType === 'commercial'
          ? {
              companyName: companyName.trim(),
              taxOrIdentityType: taxType,
              taxOrIdentityNumber: taxNumber.trim(),
            }
          : undefined,
      consents: [
        buildConsent('terms_of_service', 'signup'),
        buildConsent('privacy_policy', 'signup'),
        buildConsent('content_responsibility', 'signup'),
        ...(signupConsents.marketing_optional ? [buildConsent('marketing_optional', 'signup')] : []),
      ],
    };
  }

  function validateRegisterDetails() {
    if (!firstName.trim() || !lastName.trim() || !handle.trim()) {
      return isTr ? 'İsim, soyisim ve kullanıcı adı zorunludur.' : 'Name, surname and username are required.';
    }

    if (!password.trim()) {
      return isTr ? 'Şifre zorunludur.' : 'Password is required.';
    }

    if (password.trim().length < 8) {
      return isTr ? 'Şifre en az 8 karakter olmalıdır.' : 'Password must be at least 8 characters.';
    }

    if (password !== confirmPassword) {
      return isTr ? 'Şifreler eşleşmiyor.' : 'Passwords do not match.';
    }

    if (accountType === 'commercial') {
      if (!companyName.trim() || !taxNumber.trim() || !email.trim() || !phone.trim()) {
        return isTr
          ? 'Ticari kayıt için firma adı, vergi bilgisi, telefon ve e-posta zorunludur.'
          : 'Commercial signup requires company name, tax info, phone and email.';
      }
    } else if (identityMethod === 'email' && !email.trim()) {
      return isTr ? 'E-posta adresi zorunludur.' : 'Email is required.';
    } else if (identityMethod === 'phone' && !phone.trim()) {
      return isTr ? 'Telefon numarası zorunludur.' : 'Phone number is required.';
    }

    if (!requiredConsentsAccepted()) {
      return isTr
        ? 'Zorunlu sözleşme ve gizlilik onaylarını kabul etmelisiniz.'
        : 'You must accept the required legal confirmations.';
    }

    return '';
  }

  async function submitLogin() {
    if (pending) {
      return;
    }

    setPending(true);
    try {
      const result = await onLogin({
        identifier: identifier.trim(),
        password: password.trim(),
      });
      setFeedback(result.message || '');
      if (!result.success && result.requiresVerification && result.email) {
        setVerificationEmail(result.email);
        setIdentityMethod('email');
        setView('register');
        setRegisterStep('verification');
      }
    } finally {
      setPending(false);
    }
  }

  async function continueFromDetails() {
    const validationError = validateRegisterDetails();
    if (validationError) {
      setFeedback(validationError);
      return;
    }

    if (identityMethod === 'phone') {
      setPending(true);
      try {
        const result = await onStartVerification({
          channel: 'phone',
          destination: phone.trim(),
        });
        setFeedback(
          result.success
            ? result.maskedDestination
              ? `${result.message || (isTr ? 'SMS kodu gönderildi.' : 'SMS code sent.')} ${result.maskedDestination}`
              : result.message || (isTr ? 'SMS kodu gönderildi.' : 'SMS code sent.')
            : readDisabledMessage(result, isTr ? 'SMS kodu gönderilemedi.' : 'Unable to send SMS code.'),
        );
        if (result.success) {
          setVerificationPhone(phone.trim());
          setRegisterStep('verification');
        }
      } finally {
        setPending(false);
      }
      return;
    }

    setPending(true);
    try {
      const result = await onRegister(buildRegisterPayload());
      setFeedback(
        result.success
          ? result.maskedDestination
            ? `${readDisabledMessage(result, isTr ? 'Doğrulama e-postası gönderildi.' : 'Verification email sent.')} ${result.maskedDestination}`
            : readDisabledMessage(result, isTr ? 'Doğrulama e-postası gönderildi.' : 'Verification email sent.')
          : result.message || (isTr ? 'Kayıt tamamlanamadı.' : 'Registration failed.'),
      );

      if (result.success) {
        setVerificationEmail(result.email || email.trim());
        setRegisterStep('verification');
      }
    } finally {
      setPending(false);
    }
  }

  async function completePhoneSignup() {
    if (!smsCode.trim()) {
      setFeedback(isTr ? 'SMS kodunu girin.' : 'Enter the SMS code.');
      return;
    }

    setPending(true);
    try {
      const result = await onRegister(buildRegisterPayload(smsCode.trim()));
      setFeedback(
        result.message ||
          (result.success
            ? isTr
              ? 'Telefon doğrulandı ve üyelik tamamlandı.'
              : 'Phone verified and signup completed.'
            : isTr
              ? 'Kayıt tamamlanamadı.'
              : 'Registration failed.'),
      );
    } finally {
      setPending(false);
    }
  }

  async function resendVerification() {
    if (resendPending) {
      return;
    }

    setResendPending(true);
    try {
      if (identityMethod === 'phone') {
        const result = await onStartVerification({
          channel: 'phone',
          destination: verificationPhone.trim(),
        });
        setFeedback(readDisabledMessage(result, isTr ? 'SMS kodu tekrar gönderildi.' : 'SMS code sent again.'));
      } else {
        const result = await onResendCode({ email: verificationEmail.trim() });
        setFeedback(
          readDisabledMessage(
            result,
            isTr ? 'Doğrulama e-postası yeniden gönderildi.' : 'Verification email sent again.',
          ),
        );
      }
    } finally {
      setResendPending(false);
    }
  }

  async function submitManualEmailVerification() {
    if (!verificationEmail.trim() || !emailCode.trim()) {
      setFeedback(isTr ? 'E-posta ve kod alanlarını doldurun.' : 'Fill in email and code.');
      return;
    }

    setPending(true);
    try {
      const result = await onVerifyEmail({
        email: verificationEmail.trim(),
        code: emailCode.trim(),
      });
      setFeedback(result.message || '');
    } finally {
      setPending(false);
    }
  }

  async function runQuickLogin() {
    if (pending) {
      return;
    }

    setPending(true);
    try {
      const result = await onQuickLogin();
      setFeedback(result.message || '');
    } finally {
      setPending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.safeArea}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>CARLOI</Text>
          <Text style={styles.title}>
            {view === 'entry'
              ? isTr
                ? 'Otomotiv topluluğuna premium giriş'
                : 'A premium way into the automotive community'
              : view === 'login'
                ? isTr
                  ? 'Hesabına giriş yap'
                  : 'Sign in to your account'
                : isTr
                  ? 'Adım adım üyelik oluştur'
                  : 'Create your account step by step'}
          </Text>
          <Text style={styles.description}>
            {view === 'entry'
              ? isTr
                ? 'Carloi; sosyal akış, ilan, mesajlaşma, Garajım ve ticari hesap akışlarını tek deneyimde birleştirir.'
                : 'Carloi brings feed, listings, messaging, garage and commercial flows into one experience.'
              : view === 'login'
                ? isTr
                  ? 'Aynı Carloi hesabınla web ve mobil arasında sorunsuz devam et.'
                  : 'Continue seamlessly between web and mobile with the same Carloi account.'
                : isTr
                  ? 'Önce hesap tipini seç, sonra doğrulama kanalını belirle ve hesabını aktive et.'
                  : 'Choose account type, select a verification channel and activate your account.'}
          </Text>
        </View>

        {view === 'entry' ? (
          <View style={styles.stack}>
            <EntryCard
              accent="primary"
              description="Araçlarını, paylaşımlarını ve ilanlarını kişisel profilin üzerinden yönet."
              icon="👤"
              onPress={() => {
                setAccountType('individual');
                setIdentityMethod('email');
                resetRegister('individual');
              }}
              title="Bireysel hesap oluştur"
            />
            <EntryCard
              accent="accent"
              description="Firma profilini aç, doğrulama sonrası ticari rozet ve kurumsal ilan özelliklerini kullan."
              icon="🏢"
              onPress={() => {
                setAccountType('commercial');
                setIdentityMethod('email');
                resetRegister('commercial');
              }}
              title="Ticari hesap oluştur"
            />

            <View style={styles.inlineCard}>
              <View style={styles.inlineCopy}>
                <Text style={styles.inlineTitle}>Zaten bir hesabın var mı?</Text>
                <Text style={styles.inlineDescription}>
                  Giriş yapıp feed, mesajlar ve Garajım alanına kaldığın yerden dön.
                </Text>
              </View>
              <Pressable onPress={() => setView('login')} style={styles.inlineButton}>
                <Text style={styles.inlineButtonText}>Giriş yap</Text>
              </Pressable>
            </View>

            {quickLoginAvailable ? (
              <Pressable onPress={() => void runQuickLogin()} style={styles.quickLoginCard}>
                <View style={styles.quickLoginCopy}>
                  <Text style={styles.quickLoginTitle}>Hızlı giriş</Text>
                  <Text style={styles.quickLoginText}>
                    {quickLoginLabel || 'Kayıtlı cihaz oturumu ile tek dokunuşta devam et.'}
                  </Text>
                </View>
                <Text style={styles.quickLoginAction}>{pending ? 'Bekleniyor...' : 'Devam et'}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {view === 'login' ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Giriş yap</Text>
              <Pressable onPress={() => setView('entry')}>
                <Text style={styles.linkText}>Geri dön</Text>
              </Pressable>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>E-posta veya telefon</Text>
              <TextInput
                autoCapitalize="none"
                editable={!pending}
                onChangeText={setIdentifier}
                placeholder="eposta@ornek.com veya +90..."
                placeholderTextColor={theme.colors.textSoft}
                style={styles.input}
                value={identifier}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Şifre</Text>
              <TextInput
                editable={!pending}
                onChangeText={setPassword}
                placeholder="Şifren"
                placeholderTextColor={theme.colors.textSoft}
                secureTextEntry
                style={styles.input}
                value={password}
              />
            </View>

            {quickLoginAvailable ? (
              <Pressable onPress={() => void runQuickLogin()} style={styles.subtleCard}>
                <Text style={styles.subtleTitle}>Hızlı giriş</Text>
                <Text style={styles.subtleText}>
                  {quickLoginLabel || 'Bu cihazda kayıtlı oturumla şifresiz devam et.'}
                </Text>
              </Pressable>
            ) : null}

            {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

            <View style={styles.actionRow}>
              <Pressable onPress={() => setView('entry')} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Vazgeç</Text>
              </Pressable>
              <Pressable
                disabled={pending}
                onPress={() => {
                  void submitLogin();
                }}
                style={[styles.primaryButton, pending && styles.disabledButton]}
              >
                <Text style={styles.primaryButtonText}>{pending ? 'Bekleniyor...' : 'Giriş yap'}</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => {
                setAccountType('individual');
                resetRegister('individual');
              }}
              style={styles.footerLink}
            >
              <Text style={styles.footerLinkText}>Hesabın yok mu? Üye ol</Text>
            </Pressable>
          </View>
        ) : null}

        {view === 'register' ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>
                  {accountType === 'commercial' ? 'Ticari üyelik' : 'Bireysel üyelik'}
                </Text>
                <Text style={styles.cardSubtitle}>
                  {accountType === 'commercial'
                    ? 'Doğrulama sonrası ticari başvuru ekranı ile belge yükleyebilirsin.'
                    : 'Doğrulama tamamlandığında hesabın aktif olur.'}
                </Text>
              </View>
              <Pressable onPress={() => setView('entry')}>
                <Text style={styles.linkText}>Değiştir</Text>
              </Pressable>
            </View>

            <View style={styles.stepRow}>
              {stepLabels.map((label, index) => {
                const currentIndex =
                  registerStep === 'method' ? 0 : registerStep === 'details' ? 1 : 2;
                const active = currentIndex === index;
                const done = index < currentIndex;

                return (
                  <View
                    key={label}
                    style={[
                      styles.stepPill,
                      active && styles.stepPillActive,
                      done && styles.stepPillDone,
                    ]}
                  >
                    <Text style={[styles.stepIndex, (active || done) && styles.stepIndexActive]}>
                      {index + 1}
                    </Text>
                    <Text style={[styles.stepLabel, (active || done) && styles.stepLabelActive]}>
                      {label}
                    </Text>
                  </View>
                );
              })}
            </View>

            {registerStep === 'method' ? (
              <View style={styles.stack}>
                <View style={styles.inlineCard}>
                  <View style={styles.inlineCopy}>
                    <Text style={styles.inlineTitle}>Ana doğrulama kanalını seç</Text>
                    <Text style={styles.inlineDescription}>
                      {accountType === 'commercial'
                        ? 'Ticari hesapta hem telefon hem e-posta alacağız; burada sadece ilk doğrulama kanalını seçiyorsun.'
                        : 'Bu kanal üyelik aktivasyonunda kullanılacak, diğerini sonradan ayarlardan ekleyebilirsin.'}
                    </Text>
                  </View>
                </View>

                <View style={styles.segmentRow}>
                  <Pressable
                    onPress={() => setIdentityMethod('email')}
                    style={[styles.segment, identityMethod === 'email' && styles.segmentActive]}
                  >
                    <Text style={[styles.segmentText, identityMethod === 'email' && styles.segmentTextActive]}>
                      E-posta ile kayıt
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setIdentityMethod('phone')}
                    style={[styles.segment, identityMethod === 'phone' && styles.segmentActive]}
                  >
                    <Text style={[styles.segmentText, identityMethod === 'phone' && styles.segmentTextActive]}>
                      Telefon ile kayıt
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.actionRow}>
                  <Pressable onPress={() => setView('entry')} style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>Geri</Text>
                  </Pressable>
                  <Pressable onPress={() => setRegisterStep('details')} style={styles.primaryButton}>
                    <Text style={styles.primaryButtonText}>Devam et</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {registerStep === 'details' ? (
              <View style={styles.stack}>
                <View style={styles.twoColumnRow}>
                  <View style={styles.flexField}>
                    <Text style={styles.fieldLabel}>
                      {accountType === 'commercial' ? 'Yetkili isim' : 'İsim'}
                    </Text>
                    <TextInput
                      editable={!pending}
                      onChangeText={setFirstName}
                      placeholder="Faruk"
                      placeholderTextColor={theme.colors.textSoft}
                      style={styles.input}
                      value={firstName}
                    />
                  </View>
                  <View style={styles.flexField}>
                    <Text style={styles.fieldLabel}>
                      {accountType === 'commercial' ? 'Yetkili soyisim' : 'Soyisim'}
                    </Text>
                    <TextInput
                      editable={!pending}
                      onChangeText={setLastName}
                      placeholder="Yılmaz"
                      placeholderTextColor={theme.colors.textSoft}
                      style={styles.input}
                      value={lastName}
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Kullanıcı adı</Text>
                  <TextInput
                    autoCapitalize="none"
                    editable={!pending}
                    onChangeText={setHandle}
                    placeholder="@kullaniciadi"
                    placeholderTextColor={theme.colors.textSoft}
                    style={styles.input}
                    value={handle}
                  />
                </View>

                {accountType === 'commercial' ? (
                  <>
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Firma / işletme adı</Text>
                      <TextInput
                        editable={!pending}
                        onChangeText={setCompanyName}
                        placeholder="Carloi Motors"
                        placeholderTextColor={theme.colors.textSoft}
                        style={styles.input}
                        value={companyName}
                      />
                    </View>

                    <View style={styles.segmentRow}>
                      <Pressable
                        onPress={() => setTaxType('VKN')}
                        style={[styles.segment, taxType === 'VKN' && styles.segmentActive]}
                      >
                        <Text style={[styles.segmentText, taxType === 'VKN' && styles.segmentTextActive]}>
                          VKN
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setTaxType('TCKN')}
                        style={[styles.segment, taxType === 'TCKN' && styles.segmentActive]}
                      >
                        <Text style={[styles.segmentText, taxType === 'TCKN' && styles.segmentTextActive]}>
                          TCKN
                        </Text>
                      </Pressable>
                    </View>

                    <View style={styles.twoColumnRow}>
                      <View style={styles.flexField}>
                        <Text style={styles.fieldLabel}>{taxType}</Text>
                        <TextInput
                          editable={!pending}
                          keyboardType="number-pad"
                          onChangeText={setTaxNumber}
                          placeholder={taxType}
                          placeholderTextColor={theme.colors.textSoft}
                          style={styles.input}
                          value={taxNumber}
                        />
                      </View>
                      <View style={styles.flexField}>
                        <Text style={styles.fieldLabel}>Vergi dairesi</Text>
                        <TextInput
                          editable={!pending}
                          onChangeText={setTaxOffice}
                          placeholder="Kadıköy"
                          placeholderTextColor={theme.colors.textSoft}
                          style={styles.input}
                          value={taxOffice}
                        />
                      </View>
                    </View>
                  </>
                ) : null}

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>E-posta</Text>
                  <TextInput
                    autoCapitalize="none"
                    editable={!pending}
                    keyboardType="email-address"
                    onChangeText={setEmail}
                    placeholder="eposta@ornek.com"
                    placeholderTextColor={theme.colors.textSoft}
                    style={styles.input}
                    value={email}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Telefon</Text>
                  <TextInput
                    editable={!pending}
                    keyboardType="phone-pad"
                    onChangeText={setPhone}
                    placeholder="+90 5xx xxx xx xx"
                    placeholderTextColor={theme.colors.textSoft}
                    style={styles.input}
                    value={phone}
                  />
                </View>

                <View style={styles.twoColumnRow}>
                  <View style={styles.flexField}>
                    <Text style={styles.fieldLabel}>Şifre</Text>
                    <TextInput
                      editable={!pending}
                      onChangeText={setPassword}
                      placeholder="En az 8 karakter"
                      placeholderTextColor={theme.colors.textSoft}
                      secureTextEntry
                      style={styles.input}
                      value={password}
                    />
                  </View>
                  <View style={styles.flexField}>
                    <Text style={styles.fieldLabel}>Şifre tekrar</Text>
                    <TextInput
                      editable={!pending}
                      onChangeText={setConfirmPassword}
                      placeholder="Şifre tekrar"
                      placeholderTextColor={theme.colors.textSoft}
                      secureTextEntry
                      style={styles.input}
                      value={confirmPassword}
                    />
                  </View>
                </View>

                <ConsentChecklist
                  title="Sözleşme ve onaylar"
                  items={signupConsentCopy.map((item) => ({
                    key: item.type,
                    title: item.title,
                    description: item.description,
                    required: item.type !== 'marketing_optional',
                    value: signupConsents[item.type],
                    openLabel: signupConsentDocuments[item.type].linkLabel,
                    onOpen: () => setActiveConsent(item.type),
                    onToggle: (value) =>
                      setSignupConsents((current) => ({
                        ...current,
                        [item.type]: value,
                      })),
                  }))}
                />

                {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

                <View style={styles.actionRow}>
                  <Pressable onPress={() => setRegisterStep('method')} style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>Geri</Text>
                  </Pressable>
                  <Pressable
                    disabled={pending}
                    onPress={() => {
                      void continueFromDetails();
                    }}
                    style={[styles.primaryButton, pending && styles.disabledButton]}
                  >
                    <Text style={styles.primaryButtonText}>
                      {pending
                        ? 'Bekleniyor...'
                        : identityMethod === 'phone'
                          ? 'SMS kodu gönder'
                          : 'Hesabı oluştur'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {registerStep === 'verification' ? (
              <View style={styles.stack}>
                <View style={styles.verifyCard}>
                  <Text style={styles.verifyLabel}>{identityMethod === 'phone' ? 'Telefon' : 'E-posta'}</Text>
                  <Text style={styles.verifyValue}>
                    {identityMethod === 'phone' ? verificationPhone : verificationEmail}
                  </Text>
                  <Text style={styles.verifyText}>
                    {identityMethod === 'phone'
                      ? '6 haneli SMS kodunu girerek üyeliğini tamamla. Kod 5 dakika geçerlidir.'
                      : 'Doğrulama linkini açabilir veya e-posta kodunu manuel olarak girebilirsin.'}
                  </Text>
                </View>

                {identityMethod === 'phone' ? (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>SMS kodu</Text>
                    <TextInput
                      editable={!pending}
                      keyboardType="number-pad"
                      maxLength={6}
                      onChangeText={(value) => setSmsCode(value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      placeholderTextColor={theme.colors.textSoft}
                      style={styles.input}
                      value={smsCode}
                    />
                  </View>
                ) : (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Kod (opsiyonel)</Text>
                    <TextInput
                      editable={!pending}
                      keyboardType="number-pad"
                      maxLength={6}
                      onChangeText={(value) => setEmailCode(value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      placeholderTextColor={theme.colors.textSoft}
                      style={styles.input}
                      value={emailCode}
                    />
                  </View>
                )}

                {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

                <View style={styles.actionRow}>
                  <Pressable onPress={() => setRegisterStep('details')} style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>Bilgileri düzenle</Text>
                  </Pressable>
                  <Pressable
                    disabled={pending || (identityMethod === 'email' && !emailCode.trim())}
                    onPress={() => {
                      if (identityMethod === 'phone') {
                        void completePhoneSignup();
                      } else {
                        void submitManualEmailVerification();
                      }
                    }}
                    style={[styles.primaryButton, (pending || (identityMethod === 'email' && !emailCode.trim())) && styles.disabledButton]}
                  >
                    <Text style={styles.primaryButtonText}>
                      {pending
                        ? 'Doğrulanıyor...'
                        : identityMethod === 'phone'
                          ? 'Kaydı tamamla'
                          : 'Kodu doğrula'}
                    </Text>
                  </Pressable>
                </View>

                <Pressable
                  disabled={resendPending}
                  onPress={() => {
                    void resendVerification();
                  }}
                  style={styles.subtleCard}
                >
                  <Text style={styles.subtleTitle}>
                    {identityMethod === 'phone'
                      ? resendPending
                        ? 'Bekleniyor...'
                        : 'Kodu tekrar gönder'
                      : resendPending
                        ? 'Bekleniyor...'
                        : 'Doğrulama e-postasını tekrar gönder'}
                  </Text>
                  <Text style={styles.subtleText}>
                    {identityMethod === 'phone'
                      ? 'SMS ulaşmadıysa 60 saniye sonra yeniden isteyebilirsin.'
                      : 'Yeni doğrulama e-postasını güvenli şekilde tekrar iste.'}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={() => setActiveConsent(null)}
        transparent
        visible={Boolean(activeConsentDocument)}
      >
        <View style={styles.modalOverlay}>
          <Pressable onPress={() => setActiveConsent(null)} style={StyleSheet.absoluteFillObject} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{activeConsentDocument?.title}</Text>
              <Pressable onPress={() => setActiveConsent(null)} style={styles.modalCloseButton}>
                <Text style={styles.modalCloseButtonText}>{isTr ? 'Kapat' : 'Close'}</Text>
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
              <Text style={styles.modalMeta}>
                {(isTr ? 'Versiyon' : 'Version') + ' ' + activeConsentDocument?.version}
                {' • '}
                {(isTr ? 'Son güncelleme' : 'Last updated') + ' ' + activeConsentDocument?.lastUpdated}
              </Text>
              <Text style={styles.modalDraftNotice}>{activeConsentDocument?.legalDraftNotice}</Text>
              {activeConsentDocument?.sections.map((section) => (
                <View key={section.heading} style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>{section.heading}</Text>
                  {section.bullets.map((bullet) => (
                    <View key={bullet} style={styles.modalBulletRow}>
                      <Text style={styles.modalBulletMark}>•</Text>
                      <Text style={styles.modalBulletText}>{bullet}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xxl,
    gap: theme.spacing.lg,
  },
  hero: {
    gap: theme.spacing.sm,
  },
  kicker: {
    color: theme.colors.primary,
    fontSize: typeScale.caption,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  title: {
    color: theme.colors.text,
    fontSize: typeScale.hero,
    fontWeight: '800',
    lineHeight: 38,
  },
  description: {
    color: theme.colors.textSoft,
    lineHeight: 22,
  },
  stack: {
    gap: theme.spacing.md,
  },
  entryCard: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderWidth: 1,
  },
  entryCardPrimary: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
  },
  entryCardAccent: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: '#CDEEEE',
  },
  entryIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryIconPrimary: {
    backgroundColor: theme.colors.primarySoft,
  },
  entryIconAccent: {
    backgroundColor: '#FFFFFF',
  },
  entryIconText: {
    fontSize: 24,
  },
  entryCopy: {
    flex: 1,
    gap: 4,
  },
  entryTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  entryDescription: {
    color: theme.colors.textSoft,
    lineHeight: 20,
  },
  entryAction: {
    color: theme.colors.primary,
    fontWeight: '800',
  },
  inlineCard: {
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  inlineCopy: {
    gap: 4,
  },
  inlineTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  inlineDescription: {
    color: theme.colors.textSoft,
    lineHeight: 20,
  },
  inlineButton: {
    minHeight: 46,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineButtonText: {
    color: theme.colors.card,
    fontWeight: '800',
  },
  quickLoginCard: {
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.primarySoft,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  quickLoginCopy: {
    flex: 1,
    gap: 4,
  },
  quickLoginTitle: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  quickLoginText: {
    color: theme.colors.text,
    lineHeight: 20,
  },
  quickLoginAction: {
    color: theme.colors.primary,
    fontWeight: '800',
  },
  card: {
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    ...theme.shadow,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: typeScale.subtitle,
    fontWeight: '800',
  },
  cardSubtitle: {
    color: theme.colors.textSoft,
    lineHeight: 18,
    marginTop: 4,
    maxWidth: 240,
  },
  linkText: {
    color: theme.colors.primary,
    fontWeight: '800',
  },
  stepRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  stepPill: {
    minHeight: 36,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepPillActive: {
    backgroundColor: theme.colors.primarySoft,
  },
  stepPillDone: {
    backgroundColor: theme.colors.primarySoft,
  },
  stepIndex: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: '800',
  },
  stepIndexActive: {
    color: theme.colors.primary,
  },
  stepLabel: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: '700',
  },
  stepLabelActive: {
    color: theme.colors.primary,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  segment: {
    flex: 1,
    minHeight: 42,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceMuted,
  },
  segmentActive: {
    backgroundColor: theme.colors.text,
  },
  segmentText: {
    color: theme.colors.textSoft,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: theme.colors.card,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    minHeight: 50,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    color: theme.colors.text,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  flexField: {
    flex: 1,
    gap: 6,
  },
  subtleCard: {
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.md,
    gap: 4,
  },
  subtleTitle: {
    color: theme.colors.text,
    fontWeight: '800',
  },
  subtleText: {
    color: theme.colors.textSoft,
    lineHeight: 18,
  },
  verifyCard: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    gap: 6,
  },
  verifyLabel: {
    color: theme.colors.textSoft,
    fontSize: typeScale.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  verifyValue: {
    color: theme.colors.text,
    fontSize: typeScale.title,
    fontWeight: '800',
  },
  verifyText: {
    color: theme.colors.textSoft,
    lineHeight: 20,
  },
  feedback: {
    color: theme.colors.danger,
    lineHeight: 20,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  primaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: theme.colors.card,
    fontWeight: '800',
  },
  secondaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceMuted,
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontWeight: '800',
  },
  footerLink: {
    alignSelf: 'center',
    minHeight: 36,
    justifyContent: 'center',
  },
  footerLinkText: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  modalCard: {
    maxHeight: '78%',
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.card,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    ...theme.shadow,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  modalTitle: {
    flex: 1,
    color: theme.colors.text,
    fontSize: typeScale.subtitle,
    fontWeight: '800',
  },
  modalCloseButton: {
    minHeight: 40,
    justifyContent: 'center',
  },
  modalCloseButtonText: {
    color: theme.colors.primary,
    fontWeight: '800',
  },
  modalBody: {
    flexGrow: 0,
  },
  modalMeta: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  modalDraftNotice: {
    color: theme.colors.warning,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  modalSection: {
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  modalSectionTitle: {
    color: theme.colors.text,
    fontWeight: '800',
    lineHeight: 22,
  },
  modalBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
  },
  modalBulletMark: {
    color: theme.colors.primary,
    fontSize: 16,
    lineHeight: 22,
  },
  modalBulletText: {
    flex: 1,
    color: theme.colors.text,
    lineHeight: 22,
  },
});
