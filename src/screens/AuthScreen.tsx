import { useEffect, useState } from 'react';
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
import { getLocale } from '../i18n';
import { repairTurkishText } from '../services/textRepair';
import { AppLanguage, AuthActionResult, AuthLoginPayload, AuthRegisterPayload } from '../types';
import { theme, typeScale } from '../theme';

interface AuthScreenProps {
  language: AppLanguage;
  registered: boolean;
  savedEmail?: string;
  savedPhone?: string;
  quickLoginAvailable: boolean;
  quickLoginLabel?: string;
  onLogin: (payload: AuthLoginPayload) => Promise<AuthActionResult>;
  onRegister: (payload: AuthRegisterPayload) => Promise<AuthActionResult>;
  onVerifyEmail: (payload: { email: string; code: string }) => Promise<AuthActionResult>;
  onResendCode: (payload: { email: string }) => Promise<AuthActionResult>;
  onQuickLogin: () => Promise<AuthActionResult>;
}

export function AuthScreen({
  language,
  registered,
  savedEmail,
  savedPhone,
  quickLoginAvailable,
  quickLoginLabel,
  onLogin,
  onRegister,
  onVerifyEmail,
  onResendCode,
  onQuickLogin,
}: AuthScreenProps) {
  const locale = getLocale(language);
  const [mode, setMode] = useState<'login' | 'register'>(registered ? 'login' : 'register');
  const [registerStep, setRegisterStep] = useState<'form' | 'verify'>('form');
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState(savedEmail ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountType, setAccountType] = useState<'individual' | 'commercial'>('individual');
  const [commercialCompanyName, setCommercialCompanyName] = useState('');
  const [commercialTaxType, setCommercialTaxType] = useState<'VKN' | 'TCKN'>('VKN');
  const [commercialTaxNumber, setCommercialTaxNumber] = useState('');
  const [signupConsents, setSignupConsents] = useState({
    terms_of_service: false,
    privacy_policy: false,
    content_responsibility: false,
    marketing_optional: false,
  });
  const [verificationEmail, setVerificationEmail] = useState(savedEmail ?? '');
  const [verificationCode, setVerificationCode] = useState('');
  const [identifier, setIdentifier] = useState(savedEmail || savedPhone || '');
  const [feedback, setFeedback] = useState('');
  const [pending, setPending] = useState(false);
  const [verifyPending, setVerifyPending] = useState(false);
  const [resendPending, setResendPending] = useState(false);
  const signupConsentCopy = getSignupConsentCopy();
  const signupConsentDocuments = getSignupConsentDocuments();
  const [activeSignupConsent, setActiveSignupConsent] = useState<
    'terms_of_service' | 'privacy_policy' | 'content_responsibility' | 'marketing_optional' | null
  >(null);
  const activeSignupConsentDocument = activeSignupConsent
    ? signupConsentDocuments[activeSignupConsent]
    : null;

  useEffect(() => {
    setMode(registered ? 'login' : 'register');
    setEmail(savedEmail ?? '');
    setIdentifier(savedEmail || savedPhone || '');
    if (registered) {
      setRegisterStep('form');
      setVerificationCode('');
    }
    setSignupConsents({
      terms_of_service: false,
      privacy_policy: false,
      content_responsibility: false,
      marketing_optional: false,
    });
    setAccountType('individual');
    setCommercialCompanyName('');
    setCommercialTaxType('VKN');
    setCommercialTaxNumber('');
  }, [registered, savedEmail, savedPhone]);

  const submitRegister = async () => {
    if (pending) {
      return;
    }

    if (password !== confirmPassword) {
      setFeedback(locale.auth.passwordMismatch);
      return;
    }

    if (
      !signupConsents.terms_of_service ||
      !signupConsents.privacy_policy ||
      !signupConsents.content_responsibility
    ) {
      setFeedback(
        repairTurkishText(
          language === 'en'
            ? 'You must accept the required legal confirmations to create an account.'
            : 'Hesap olusturmak icin zorunlu yasal onaylari kabul etmelisiniz.',
        ),
      );
      return;
    }

    if (accountType === 'commercial' && (!commercialCompanyName.trim() || !commercialTaxNumber.trim())) {
      setFeedback(
        repairTurkishText(
          language === 'en'
            ? 'Commercial signup requires company name and tax or identity number.'
            : 'Ticari kayit icin sirket adi ile VKN/TCKN zorunludur.',
        ),
      );
      return;
    }

    setPending(true);
    try {
      const result = await onRegister({
        name,
        handle,
        bio,
        email: email.trim(),
        password,
        accountType,
        commercialProfile:
          accountType === 'commercial'
            ? {
                companyName: commercialCompanyName.trim(),
                taxOrIdentityType: commercialTaxType,
                taxOrIdentityNumber: commercialTaxNumber.trim(),
              }
            : undefined,
        consents: [
          buildConsent('terms_of_service', 'signup'),
          buildConsent('privacy_policy', 'signup'),
          buildConsent('content_responsibility', 'signup'),
          ...(signupConsents.marketing_optional
            ? [buildConsent('marketing_optional', 'signup')]
            : []),
        ],
      });

      if (result.success) {
        setVerificationEmail(email.trim());
        setVerificationCode('');
        setRegisterStep('verify');
      }

      const nextFeedback =
        result.maskedDestination && result.success
          ? `${result.message ?? locale.auth.verificationSent} ${result.maskedDestination}`
          : result.message ?? '';
      setFeedback(repairTurkishText(nextFeedback));
    } finally {
      setPending(false);
    }
  };

  const submitLogin = async () => {
    if (pending) {
      return;
    }

    setPending(true);
    try {
      const result = await onLogin({
        identifier,
        password,
      });
      if (!result.success && result.requiresVerification && result.email) {
        setVerificationEmail(result.email);
        setRegisterStep('verify');
        setMode('register');
      }
      setFeedback(repairTurkishText(result.message ?? ''));
    } finally {
      setPending(false);
    }
  };

  const resendCode = async () => {
    if (resendPending) {
      return;
    }

    setResendPending(true);
    try {
      const result = await onResendCode({
        email: verificationEmail.trim(),
      });
      const nextFeedback =
        result.maskedDestination && result.success
          ? `${result.message ?? locale.auth.resendCode} ${result.maskedDestination}`
          : result.message ?? '';
      setFeedback(repairTurkishText(nextFeedback));
    } finally {
      setResendPending(false);
    }
  };

  const runQuickLogin = async () => {
    if (pending) {
      return;
    }

    setPending(true);
    try {
      const result = await onQuickLogin();
      setFeedback(repairTurkishText(result.message ?? ''));
    } finally {
      setPending(false);
    }
  };

  const showRegisterVerification = mode === 'register' && registerStep === 'verify';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.safeArea}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>{locale.auth.brand}</Text>
          <Text style={styles.title}>
            {mode === 'login'
              ? locale.auth.loginTitle
              : showRegisterVerification
                ? locale.auth.verificationCode
                : locale.auth.registerTitle}
          </Text>
          <Text style={styles.description}>
            {mode === 'login'
              ? locale.auth.loginDescription
              : showRegisterVerification
                ? locale.auth.verificationChannelEmail
                : locale.auth.registerDescription}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.segmentRow}>
            <Pressable
              disabled={pending || verifyPending}
              onPress={() => setMode('register')}
              style={[styles.segment, mode === 'register' && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, mode === 'register' && styles.segmentTextActive]}>
                {locale.auth.signupTab}
              </Text>
            </Pressable>
            <Pressable
              disabled={pending || verifyPending}
              onPress={() => setMode('login')}
              style={[styles.segment, mode === 'login' && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, mode === 'login' && styles.segmentTextActive]}>
                {locale.auth.loginTab}
              </Text>
            </Pressable>
          </View>

          {mode === 'login' ? (
            <>
              <Text style={styles.helper}>
                {locale.auth.accountInfo}:{' '}
                {[savedEmail, savedPhone].filter(Boolean).join(' | ') || 'Carloi'}
              </Text>

              {quickLoginAvailable ? (
                <Pressable onPress={() => void runQuickLogin()} style={styles.quickLoginButton}>
                  <Text style={styles.quickLoginTitle}>{locale.auth.quickLogin}</Text>
                  <Text style={styles.quickLoginText}>
                    {quickLoginLabel || locale.auth.quickLoginHint}
                  </Text>
                </Pressable>
              ) : null}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{locale.auth.identifier}</Text>
                <TextInput
                  autoCapitalize="none"
                  editable={!pending}
                  onChangeText={setIdentifier}
                  placeholder="eposta@ornek.com"
                  placeholderTextColor={theme.colors.textSoft}
                  style={styles.input}
                  value={identifier}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{locale.auth.password}</Text>
                <TextInput
                  editable={!pending}
                  onChangeText={setPassword}
                  placeholder={locale.auth.password}
                  placeholderTextColor={theme.colors.textSoft}
                  secureTextEntry
                  style={styles.input}
                  value={password}
                />
              </View>

              {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

              <Pressable
                disabled={pending}
                onPress={() => {
                  void submitLogin();
                }}
                style={[styles.primaryButton, pending && styles.disabledButton]}
              >
                <Text style={styles.primaryButtonText}>
                  {pending ? locale.auth.waiting : locale.auth.loginButton}
                </Text>
              </Pressable>
            </>
          ) : showRegisterVerification ? (
            <>
              <View style={styles.verifyHeroCard}>
                <Text style={styles.verifyLabel}>{locale.auth.email}</Text>
                <Text style={styles.verifyValue}>{verificationEmail}</Text>
                <Text style={styles.helper}>
                  {language === 'tr'
                    ? 'Mail adresinize bir dogrulama baglantisi gonderdik. Baglantiyi acip hesabinizi etkinlestirdikten sonra uygulamaya geri donerek giris yapabilirsiniz.'
                    : 'We sent a verification link to your email. Open the link, activate your account, then return to the app and sign in.'}
                </Text>
              </View>

              {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

              <View style={styles.secondaryActions}>
                <Pressable
                  disabled={resendPending}
                  onPress={() => {
                    void resendCode();
                  }}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>
                    {resendPending
                      ? locale.auth.waiting
                      : language === 'tr'
                        ? 'Baglantiyi tekrar gonder'
                        : 'Resend link'}
                  </Text>
                </Pressable>
                <Pressable
                  disabled={resendPending}
                  onPress={() => {
                    setMode('login');
                    setFeedback('');
                  }}
                  style={styles.ghostButton}
                >
                  <Text style={styles.ghostButtonText}>
                    {language === 'tr' ? 'Giris ekranina don' : 'Back to login'}
                  </Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.helper}>
                {language === 'tr'
                  ? 'Hesap olusturduktan sonra e-posta adresinize bir dogrulama baglantisi gonderilir.'
                  : 'After you create your account, a verification link will be sent to your email.'}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{language === 'tr' ? 'Hesap tipi' : 'Account type'}</Text>
                <View style={styles.segmentRow}>
                  <Pressable
                    disabled={pending}
                    onPress={() => setAccountType('individual')}
                    style={[styles.segment, accountType === 'individual' && styles.segmentActive]}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        accountType === 'individual' && styles.segmentTextActive,
                      ]}
                    >
                      {language === 'tr' ? 'Bireysel' : 'Individual'}
                    </Text>
                  </Pressable>
                  <Pressable
                    disabled={pending}
                    onPress={() => setAccountType('commercial')}
                    style={[styles.segment, accountType === 'commercial' && styles.segmentActive]}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        accountType === 'commercial' && styles.segmentTextActive,
                      ]}
                    >
                      {language === 'tr' ? 'Ticari' : 'Commercial'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{locale.auth.fullName}</Text>
                <TextInput
                  editable={!pending}
                  onChangeText={setName}
                  placeholder="Faruk Yilmaz"
                  placeholderTextColor={theme.colors.textSoft}
                  style={styles.input}
                  value={name}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{locale.auth.handle}</Text>
                <TextInput
                  autoCapitalize="none"
                  editable={!pending}
                  onChangeText={setHandle}
                  placeholder="@farukcarloi"
                  placeholderTextColor={theme.colors.textSoft}
                  style={styles.input}
                  value={handle}
                />
              </View>

              {accountType === 'commercial' ? (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      {language === 'tr' ? 'Sirket / isletme adi' : 'Company / business name'}
                    </Text>
                    <TextInput
                      editable={!pending}
                      onChangeText={setCommercialCompanyName}
                      placeholder={language === 'tr' ? 'Carloi Otomotiv' : 'Carloi Motors'}
                      placeholderTextColor={theme.colors.textSoft}
                      style={styles.input}
                      value={commercialCompanyName}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>{language === 'tr' ? 'Vergi / kimlik tipi' : 'Tax / identity type'}</Text>
                    <View style={styles.segmentRow}>
                      <Pressable
                        disabled={pending}
                        onPress={() => setCommercialTaxType('VKN')}
                        style={[styles.segment, commercialTaxType === 'VKN' && styles.segmentActive]}
                      >
                        <Text
                          style={[
                            styles.segmentText,
                            commercialTaxType === 'VKN' && styles.segmentTextActive,
                          ]}
                        >
                          VKN
                        </Text>
                      </Pressable>
                      <Pressable
                        disabled={pending}
                        onPress={() => setCommercialTaxType('TCKN')}
                        style={[styles.segment, commercialTaxType === 'TCKN' && styles.segmentActive]}
                      >
                        <Text
                          style={[
                            styles.segmentText,
                            commercialTaxType === 'TCKN' && styles.segmentTextActive,
                          ]}
                        >
                          TCKN
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>{commercialTaxType}</Text>
                    <TextInput
                      autoCapitalize="none"
                      editable={!pending}
                      onChangeText={setCommercialTaxNumber}
                      placeholder={commercialTaxType}
                      placeholderTextColor={theme.colors.textSoft}
                      style={styles.input}
                      value={commercialTaxNumber}
                    />
                  </View>

                  <Text style={styles.helper}>
                    {language === 'tr'
                      ? 'E-posta dogrulamasindan sonra belge yukleme ve inceleme adimina gecersiniz. Onay tamamlanmadan ilan yayinlayamazsiniz.'
                      : 'After email verification you will continue with document upload and review. Listings stay blocked until approval.'}
                  </Text>
                </>
              ) : null}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{locale.auth.email}</Text>
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

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{locale.auth.bio}</Text>
                <TextInput
                  editable={!pending}
                  multiline
                  onChangeText={setBio}
                  placeholder="Arac ilginizi ve kullanim tarzinizı kisaca yazin"
                  placeholderTextColor={theme.colors.textSoft}
                  style={styles.textArea}
                  textAlignVertical="top"
                  value={bio}
                />
              </View>

              <View style={styles.twoColumn}>
                <View style={styles.flexItem}>
                  <Text style={styles.label}>{locale.auth.password}</Text>
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
                <View style={styles.flexItem}>
                  <Text style={styles.label}>{locale.auth.passwordAgain}</Text>
                  <TextInput
                    editable={!pending}
                    onChangeText={setConfirmPassword}
                    placeholder={locale.auth.passwordAgain}
                    placeholderTextColor={theme.colors.textSoft}
                    secureTextEntry
                    style={styles.input}
                    value={confirmPassword}
                  />
                </View>
              </View>

              <ConsentChecklist
                title={language === 'tr' ? 'Yasal onaylar' : 'Legal acknowledgements'}
                items={signupConsentCopy.map((item) => ({
                  key: item.type,
                  title: item.title,
                  description: item.description,
                  required: item.type !== 'marketing_optional',
                  value: signupConsents[item.type],
                  openLabel: signupConsentDocuments[item.type].linkLabel,
                  onOpen: () => setActiveSignupConsent(item.type),
                  onToggle: (value) =>
                    setSignupConsents((current) => ({
                      ...current,
                      [item.type]: value,
                    })),
                }))}
              />

              {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

              <Pressable
                disabled={pending}
                onPress={() => {
                  void submitRegister();
                }}
                style={[styles.primaryButton, pending && styles.disabledButton]}
              >
                <Text style={styles.primaryButtonText}>
                  {pending ? locale.auth.waiting : locale.auth.createAccount}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={() => setActiveSignupConsent(null)}
        transparent
        visible={Boolean(activeSignupConsentDocument)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setActiveSignupConsent(null)}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{activeSignupConsentDocument?.title}</Text>
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setActiveSignupConsent(null)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseButtonText}>
                  {language === 'tr' ? 'Kapat' : 'Close'}
                </Text>
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
              <Text style={styles.modalMeta}>
                {language === 'tr' ? 'Versiyon' : 'Version'} {activeSignupConsentDocument?.version}
                {'  •  '}
                {language === 'tr' ? 'Son guncelleme' : 'Last updated'}{' '}
                {activeSignupConsentDocument?.lastUpdated}
              </Text>
              <Text style={styles.modalDraftNotice}>
                {activeSignupConsentDocument?.legalDraftNotice}
              </Text>
              {activeSignupConsentDocument?.sections.map((section) => (
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
  },
  description: {
    color: theme.colors.textSoft,
    lineHeight: 22,
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
  helper: {
    color: theme.colors.textSoft,
    lineHeight: 20,
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
  inputGroup: {
    gap: 6,
  },
  label: {
    color: theme.colors.text,
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
  textArea: {
    minHeight: 88,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    color: theme.colors.text,
  },
  twoColumn: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  flexItem: {
    flex: 1,
    gap: 6,
  },
  feedback: {
    color: theme.colors.danger,
    lineHeight: 20,
    fontWeight: '600',
  },
  primaryButton: {
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
  quickLoginButton: {
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primarySoft,
    padding: theme.spacing.md,
    gap: 4,
  },
  quickLoginTitle: {
    color: theme.colors.primary,
    fontWeight: '800',
  },
  quickLoginText: {
    color: theme.colors.text,
    lineHeight: 20,
  },
  verifyHeroCard: {
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
  secondaryActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  ghostButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  ghostButtonText: {
    color: theme.colors.textSoft,
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
