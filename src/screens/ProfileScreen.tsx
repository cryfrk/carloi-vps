import { Feather } from '@expo/vector-icons';
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { getLocale } from '../i18n';
import { PostCard } from '../components/PostCard';
import { runtimeConfig } from '../config/runtimeConfig';
import { repairTurkishText } from '../services/textRepair';
import { theme } from '../theme';
import {
  AppLanguage,
  CommercialStatusSummary,
  MediaAsset,
  Post,
  PremiumPlanProduct,
  ProfileSegment,
  SocialProfile,
  UserSettings,
  VehicleProfile,
} from '../types';

interface ProfileScreenProps {
  language: AppLanguage;
  profile: SocialProfile;
  commercial: CommercialStatusSummary;
  vehicle?: VehicleProfile;
  posts: Post[];
  listings: Post[];
  savedPosts: Post[];
  segment: ProfileSegment;
  settings: UserSettings;
  onChangeSegment: (segment: ProfileSegment) => void;
  onComposePress: () => void;
  onChangePhoto: () => void;
  onChangeCover: () => void;
  onCommentPress: (post: Post) => void;
  onToggleLike: (postId: string) => void;
  onToggleRepost: (postId: string) => void;
  onToggleSave: (postId: string) => void;
  onOpenListing: (post: Post) => void;
  onUpdateSettings: (payload: Partial<UserSettings>) => void;
  onOpenMedia: (media: MediaAsset, post: Post) => void;
  onSharePost: (post: Post) => void;
  onEditPost: (post: Post) => void;
  onOpenStats: (post: Post) => void;
  onCallListing: (post: Post) => void;
  onMessageAuthor: (post: Post) => void;
  onDeletePost: (post: Post) => void;
  onToggleListingSold: (post: Post, isSold: boolean) => void;
  premiumProducts: PremiumPlanProduct[];
  premiumLoading: boolean;
  premiumSupported: boolean;
  onPurchasePremium: (productId: string) => void;
  onRestorePremium: () => void;
  onLogout: () => void;
}

interface ToggleRowProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

function ToggleRow({ label, value, onChange }: ToggleRowProps) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        onValueChange={onChange}
        thumbColor={value ? theme.colors.primary : '#FFFFFF'}
        trackColor={{ false: '#C8CDD2', true: '#A4E2DA' }}
        value={value}
      />
    </View>
  );
}

function SettingsInput({
  label,
  value,
  placeholder,
  keyboardType,
  onSubmit,
}: {
  label: string;
  value: string;
  placeholder: string;
  keyboardType?: 'default' | 'phone-pad' | 'number-pad';
  onSubmit: (value: string) => void;
}) {
  return (
    <View style={styles.inputStack}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        defaultValue={value}
        keyboardType={keyboardType}
        onEndEditing={(event) => onSubmit(event.nativeEvent.text)}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSoft}
        style={styles.input}
      />
    </View>
  );
}

export function ProfileScreen({
  language,
  profile,
  commercial,
  vehicle,
  posts,
  listings,
  savedPosts,
  segment,
  settings,
  onChangeSegment,
  onComposePress,
  onChangePhoto,
  onChangeCover,
  onCommentPress,
  onToggleLike,
  onToggleRepost,
  onToggleSave,
  onOpenListing,
  onUpdateSettings,
  onOpenMedia,
  onSharePost,
  onEditPost,
  onOpenStats,
  onCallListing,
  onMessageAuthor,
  onDeletePost,
  onToggleListingSold,
  premiumProducts,
  premiumLoading,
  premiumSupported,
  onPurchasePremium,
  onRestorePremium,
  onLogout,
}: ProfileScreenProps) {
  const locale = getLocale(language);
  const activePosts =
    segment === 'paylasimlar' ? posts : segment === 'ilanlar' ? listings : savedPosts;
  const supportContacts = [
    {
      key: 'info',
      title: locale.profile.supportGeneralTitle,
      description: locale.profile.supportGeneralDescription,
      email: 'info@carloi.com',
      subject: locale.profile.supportGeneralSubject,
      accentLabel: 'INFO',
      accentBackground: theme.colors.primarySoft,
      accentColor: theme.colors.primary,
    },
    {
      key: 'support',
      title: locale.profile.supportHelpTitle,
      description: locale.profile.supportHelpDescription,
      email: 'destek@carloi.com',
      subject: locale.profile.supportHelpSubject,
      accentLabel: 'HELP',
      accentBackground: '#FFF4E8',
      accentColor: theme.colors.warning,
    },
    {
      key: 'business',
      title: locale.profile.supportBusinessTitle,
      description: locale.profile.supportBusinessDescription,
      email: 'business@carloi.com',
      subject: locale.profile.supportBusinessSubject,
      accentLabel: 'B2B',
      accentBackground: '#EEF3FF',
      accentColor: '#2F5DA8',
    },
  ] as const;
  // admin@carloi.com is intentionally reserved for internal/system use and should not be shown in the UI.

  const openSupportEmail = async (email: string, subject: string) => {
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
    try {
      await Linking.openURL(url);
    } catch {
      // Mail client unavailable: keep this silent to preserve settings flow.
    }
  };

  const openCommercialOnboarding = async () => {
    const baseUrl = runtimeConfig.shareBaseUrl.replace(/\/$/, '');
    try {
      await Linking.openURL(`${baseUrl}/settings/commercial`);
    } catch {
      // Keep this silent to avoid blocking profile settings when a browser is unavailable.
    }
  };

  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
      <Pressable onPress={onChangeCover} style={styles.cover}>
        {profile.coverUri ? (
          <Image source={{ uri: profile.coverUri }} style={styles.coverImage} />
        ) : (
          <View style={styles.coverFallback} />
        )}
        <View style={styles.coverOverlay} />
        <View style={styles.coverBadge}>
          <Feather color={theme.colors.card} name="image" size={14} />
          <Text style={styles.coverBadgeText}>{locale.profile.changeCover}</Text>
        </View>
      </Pressable>

      <View style={styles.profileWrap}>
        <View style={styles.avatarWrap}>
          {profile.avatarUri ? (
            <Image source={{ uri: profile.avatarUri }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{profile.name.slice(0, 1)}</Text>
            </View>
          )}

          <Pressable onPress={onChangePhoto} style={styles.cameraButton}>
            <Feather color={theme.colors.card} name="camera" size={14} />
          </Pressable>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileTopRow}>
            <View style={styles.nameBlock}>
              <Text style={styles.name}>{profile.name}</Text>
              <Text style={styles.handle}>{profile.handle}</Text>
            </View>

            <Pressable onPress={onComposePress} style={styles.composeButton}>
              <Text style={styles.composeButtonText}>{locale.profile.newPost}</Text>
            </Pressable>
          </View>

          <Text style={styles.bio}>{profile.bio || locale.profile.noBio}</Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaCompact}>
              {locale.profile.followersSummary(profile.posts, profile.followers, profile.following)}
            </Text>
            <Text style={styles.metaCompact}>
              {vehicle ? `${vehicle.brand} ${vehicle.model}` : locale.profile.vehicleMissing}
            </Text>
          </View>
          {settings.showSoldCountOnProfile && (profile.soldListings ?? 0) > 0 ? (
            <Text style={styles.soldMeta}>{`${profile.soldListings} araç satıldı`}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.segmentRow}>
        {([
          'paylasimlar',
          'ilanlar',
          'kaydedilenler',
          'ayarlar',
        ] as ProfileSegment[]).map((item) => (
          <Pressable
            key={item}
            onPress={() => onChangeSegment(item)}
            style={[styles.segment, segment === item && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, segment === item && styles.segmentTextActive]}>
              {locale.profile.segments[item]}
            </Text>
          </Pressable>
        ))}
      </View>

      {segment === 'ayarlar' ? (
        <View style={styles.settingsStack}>
          <View style={styles.settingsCard}>
            <Text style={styles.settingsTitle}>{locale.profile.sections.experience}</Text>
            <Text style={styles.settingsHelper}>{locale.profile.languageHint}</Text>
            <View style={styles.languageRow}>
              {([
                { value: 'tr', label: 'Türkçe' },
                { value: 'en', label: 'English' },
              ] as const).map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => onUpdateSettings({ language: option.value })}
                  style={[
                    styles.languageChip,
                    settings.language === option.value && styles.languageChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.languageChipText,
                      settings.language === option.value && styles.languageChipTextActive,
                    ]}
                  >
                    {repairTurkishText(option.label)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <ToggleRow
              label={locale.profile.quickLoginTitle}
              onChange={(value) => onUpdateSettings({ quickLoginEnabled: value })}
              value={settings.quickLoginEnabled}
            />
            <ToggleRow
              label={locale.profile.quickLoginBiometric}
              onChange={(value) => onUpdateSettings({ biometricLock: value })}
              value={settings.biometricLock}
            />
            <ToggleRow
              label={locale.profile.useLocation}
              onChange={(value) => onUpdateSettings({ useDeviceLocation: value })}
              value={settings.useDeviceLocation}
            />
            <ToggleRow
              label={locale.profile.shareLocationWithAi}
              onChange={(value) => onUpdateSettings({ shareLocationWithAi: value })}
              value={settings.shareLocationWithAi}
            />
            <ToggleRow
              label={locale.profile.autoplayVideo}
              onChange={(value) => onUpdateSettings({ autoplayVideo: value })}
              value={settings.autoplayVideo}
            />
          </View>

          <View style={styles.settingsCard}>
            <Text style={styles.settingsTitle}>{locale.profile.sections.security}</Text>
            <ToggleRow
              label={locale.profile.twoFactorEnabled}
              onChange={(value) => onUpdateSettings({ twoFactorEnabled: value })}
              value={settings.twoFactorEnabled}
            />
          </View>

          <View style={styles.settingsCard}>
            <Text style={styles.settingsTitle}>{locale.profile.sections.privacy}</Text>
            <ToggleRow
              label={locale.profile.privateProfile}
              onChange={(value) => onUpdateSettings({ privateProfile: value })}
              value={settings.privateProfile}
            />
            <ToggleRow
              label={locale.profile.allowMessageRequests}
              onChange={(value) => onUpdateSettings({ allowMessageRequests: value })}
              value={settings.allowMessageRequests}
            />
            <ToggleRow
              label={locale.profile.showLastSeen}
              onChange={(value) => onUpdateSettings({ showLastSeen: value })}
              value={settings.showLastSeen}
            />
            <ToggleRow
              label={locale.profile.savedAds}
              onChange={(value) => onUpdateSettings({ showSavedAdsOnProfile: value })}
              value={settings.showSavedAdsOnProfile}
            />
            <ToggleRow
              label="Satılan araç sayısını profilde göster"
              onChange={(value) => onUpdateSettings({ showSoldCountOnProfile: value })}
              value={settings.showSoldCountOnProfile}
            />
            <ToggleRow
              label={locale.profile.allowCalls}
              onChange={(value) => onUpdateSettings({ allowCalls: value })}
              value={settings.allowCalls}
            />
            <ToggleRow
              label={locale.profile.aiDataSharing}
              onChange={(value) => onUpdateSettings({ aiDataSharing: value })}
              value={settings.aiDataSharing}
            />
          </View>

          <View style={styles.settingsCard}>
            <Text style={styles.settingsTitle}>{locale.profile.sections.notifications}</Text>
            <ToggleRow
              label={locale.profile.pushNotifications}
              onChange={(value) => onUpdateSettings({ pushNotifications: value })}
              value={settings.pushNotifications}
            />
            <ToggleRow
              label={locale.profile.emailNotifications}
              onChange={(value) => onUpdateSettings({ emailNotifications: value })}
              value={settings.emailNotifications}
            />
            <ToggleRow
              label={locale.profile.smsNotifications}
              onChange={(value) => onUpdateSettings({ smsNotifications: value })}
              value={settings.smsNotifications}
            />
          </View>

          <View style={styles.settingsCard}>
            <Text style={styles.settingsTitle}>{locale.profile.sections.account}</Text>
            <Text style={styles.settingsHelper}>{locale.profile.accountHelper}</Text>

            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>{locale.profile.membershipPlan}</Text>
              <Text style={styles.infoValue}>{settings.membershipPlan}</Text>
            </View>
            {settings.membershipExpiresAt ? (
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>{locale.profile.premiumActiveUntil}</Text>
                <Text style={styles.infoValue}>{settings.membershipExpiresAt}</Text>
              </View>
            ) : null}
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Ticari hesap</Text>
              <Text style={styles.settingsHelper}>
                Bireysel hesapla devam edebilir veya belgelerini bir kez yukleyerek
                ticari hesaba gecis surecini baslatabilirsin. Platform gerekli gordugunde
                ek dogrulama isteyebilir.
              </Text>
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Durum</Text>
                <Text style={styles.infoValue}>
                  {commercial.commercialStatus === 'not_applied'
                    ? 'Basvuru baslatilmadi'
                    : commercial.commercialStatus === 'pending'
                      ? 'Platform incelemesinde'
                      : commercial.commercialStatus === 'approved'
                        ? 'Platform incelemesi ile onaylandi'
                        : commercial.commercialStatus === 'rejected'
                          ? 'Reddedildi'
                          : commercial.commercialStatus === 'suspended'
                            ? 'Askida'
                            : 'Iptal edildi'}
                </Text>
              </View>
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Belge seti</Text>
                <Text style={styles.infoValue}>
                  {commercial.minimumDocumentSet.hasMinimumSet
                    ? 'Minimum belge seti hazir'
                    : 'Ek belge yuklenmesi gerekiyor'}
                </Text>
              </View>
              {commercial.profile?.companyName ? (
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Sirket</Text>
                  <Text style={styles.infoValue}>{commercial.profile.companyName}</Text>
                </View>
              ) : null}
              {commercial.nextActions.length ? (
                <View style={styles.supportEmailPill}>
                  <Text style={styles.supportCardEmail}>{commercial.nextActions[0]}</Text>
                </View>
              ) : null}
              <Pressable onPress={openCommercialOnboarding} style={styles.secondaryAction}>
                <Text style={styles.secondaryActionText}>Ticari hesap ekranini ac</Text>
              </Pressable>
            </View>
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>{locale.profile.premiumSection}</Text>
              <Text style={styles.settingsHelper}>{locale.profile.premiumSectionHint}</Text>
              {premiumSupported ? (
                <>
                  {premiumProducts.length ? (
                    premiumProducts.map((product) => (
                      <View key={product.id} style={styles.premiumPlanCard}>
                        <View style={styles.premiumPlanInfo}>
                          <Text style={styles.premiumPlanTitle}>{product.title}</Text>
                          <Text style={styles.premiumPlanDescription}>{product.description}</Text>
                          <Text style={styles.premiumPlanPrice}>{product.displayPrice}</Text>
                        </View>
                        <Pressable
                          disabled={premiumLoading}
                          onPress={() => onPurchasePremium(product.id)}
                          style={[
                            styles.premiumPlanButton,
                            premiumLoading && styles.premiumPlanButtonDisabled,
                          ]}
                        >
                          <Text style={styles.premiumPlanButtonText}>
                            {premiumLoading ? 'Bekleyin...' : locale.profile.premiumBuy}
                          </Text>
                        </Pressable>
                      </View>
                    ))
                  ) : (
                    <View style={styles.infoCard}>
                      <Text style={styles.infoValue}>{locale.profile.premiumUnavailable}</Text>
                    </View>
                  )}
                  <Pressable
                    disabled={premiumLoading}
                    onPress={onRestorePremium}
                    style={[styles.secondaryAction, premiumLoading && styles.secondaryActionDisabled]}
                  >
                    <Text style={styles.secondaryActionText}>{locale.profile.premiumRestore}</Text>
                  </Pressable>
                </>
              ) : (
                <View style={styles.infoCard}>
                  <Text style={styles.infoValue}>{locale.profile.premiumStoreOnly}</Text>
                </View>
              )}
            </View>
            {settings.email ? (
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>E-posta</Text>
                <Text style={styles.infoValue}>{settings.email}</Text>
              </View>
            ) : null}
            {settings.phone ? (
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Telefon</Text>
                <Text style={styles.infoValue}>{settings.phone}</Text>
              </View>
            ) : null}

            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Alım satım ve sigorta bilgileri</Text>
              <SettingsInput
                label="Resmi ad soyad"
                onSubmit={(value) => onUpdateSettings({ legalFullName: value.trim() })}
                placeholder="Ad Soyad"
                value={settings.legalFullName}
              />
              <SettingsInput
                keyboardType="number-pad"
                label="T.C. kimlik numarası"
                onSubmit={(value) => onUpdateSettings({ identityNumber: value.trim() })}
                placeholder="11 haneli kimlik numarası"
                value={settings.identityNumber}
              />
              <SettingsInput
                label="Doğum tarihi"
                onSubmit={(value) => onUpdateSettings({ birthDate: value.trim() })}
                placeholder="GG.AA.YYYY"
                value={settings.birthDate}
              />
              <SettingsInput
                label="Adres"
                onSubmit={(value) => onUpdateSettings({ addressLine: value.trim() })}
                placeholder="Açık adres"
                value={settings.addressLine}
              />
              <View style={styles.twoColumnInputs}>
                <View style={styles.flexColumn}>
                  <SettingsInput
                    label="Şehir"
                    onSubmit={(value) => onUpdateSettings({ city: value.trim() })}
                    placeholder="Şehir"
                    value={settings.city}
                  />
                </View>
                <View style={styles.flexColumn}>
                  <SettingsInput
                    label="İlçe"
                    onSubmit={(value) => onUpdateSettings({ district: value.trim() })}
                    placeholder="İlçe"
                    value={settings.district}
                  />
                </View>
              </View>
              <SettingsInput
                keyboardType="number-pad"
                label="Posta kodu"
                onSubmit={(value) => onUpdateSettings({ postalCode: value.trim() })}
                placeholder="Posta kodu"
                value={settings.postalCode}
              />
            </View>

            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Varsayılan ruhsat bilgileri</Text>
              <SettingsInput
                label="Ruhsat sahibi"
                onSubmit={(value) => onUpdateSettings({ registrationOwnerName: value.trim() })}
                placeholder="Ruhsat sahibi adı"
                value={settings.registrationOwnerName}
              />
              <SettingsInput
                keyboardType="number-pad"
                label="Ruhsat sahibi kimlik numarası"
                onSubmit={(value) =>
                  onUpdateSettings({ registrationOwnerIdentityNumber: value.trim() })
                }
                placeholder="Kimlik numarası"
                value={settings.registrationOwnerIdentityNumber}
              />
              <View style={styles.twoColumnInputs}>
                <View style={styles.flexColumn}>
                  <SettingsInput
                    label="Ruhsat seri no"
                    onSubmit={(value) => onUpdateSettings({ registrationSerialNumber: value.trim() })}
                    placeholder="Seri numarası"
                    value={settings.registrationSerialNumber}
                  />
                </View>
                <View style={styles.flexColumn}>
                  <SettingsInput
                    label="Belge no"
                    onSubmit={(value) => onUpdateSettings({ registrationDocumentNumber: value.trim() })}
                    placeholder="Belge numarası"
                    value={settings.registrationDocumentNumber}
                  />
                </View>
              </View>
              <SettingsInput
                label="Varsayılan plaka"
                onSubmit={(value) => onUpdateSettings({ defaultPlateNumber: value.trim() })}
                placeholder="34 ABC 123"
                value={settings.defaultPlateNumber}
              />
            </View>

            <View style={styles.formCard}>
              <View style={styles.supportHero}>
                <View style={styles.supportBadge}>
                  <Text style={styles.supportBadgeText}>{locale.profile.supportBadge}</Text>
                </View>
                <Text style={styles.formTitle}>{locale.profile.supportTitle}</Text>
                <Text style={styles.settingsHelper}>{locale.profile.supportIntro}</Text>
              </View>
              {supportContacts.map((contact) => (
                <Pressable
                  key={contact.key}
                  onPress={() => {
                    void openSupportEmail(contact.email, contact.subject);
                  }}
                  style={styles.supportCard}
                >
                  <View
                    style={[
                      styles.supportCardAccent,
                      { backgroundColor: contact.accentBackground },
                    ]}
                  >
                    <Text style={[styles.supportCardAccentText, { color: contact.accentColor }]}>
                      {contact.accentLabel}
                    </Text>
                  </View>
                  <View style={styles.supportCopy}>
                    <View style={styles.supportCardTopRow}>
                      <Text style={styles.supportCardTitle}>{contact.title}</Text>
                      <Text style={styles.supportCardAction}>{locale.profile.supportAction}</Text>
                    </View>
                    <Text style={styles.supportCardDescription}>{contact.description}</Text>
                    <View style={styles.supportEmailPill}>
                      <Text style={styles.supportCardEmail}>{contact.email}</Text>
                    </View>
                  </View>
                  <Feather color={theme.colors.textSoft} name="chevron-right" size={18} />
                </Pressable>
              ))}
            </View>

            <Pressable onPress={onLogout} style={styles.logoutButton}>
              <Text style={styles.logoutButtonText}>{locale.profile.logout}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.feed}>
          {activePosts.length ? (
            activePosts.map((post) => (
              <PostCard
                key={`${segment}-${post.id}`}
                currentHandle={profile.handle}
                onCallListing={onCallListing}
                onCommentPress={onCommentPress}
                onEditPost={onEditPost}
                onDeletePost={onDeletePost}
                onMessageAuthor={onMessageAuthor}
                onOpenListing={onOpenListing}
                onOpenMedia={onOpenMedia}
                onOpenProfile={() => undefined}
                onOpenStats={onOpenStats}
                onSharePost={onSharePost}
                onToggleLike={onToggleLike}
                onToggleListingSold={onToggleListingSold}
                onToggleRepost={onToggleRepost}
                onToggleSave={onToggleSave}
                post={post}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Feather
                  color={theme.colors.primary}
                  name={
                    segment === 'paylasimlar'
                      ? 'edit-3'
                      : segment === 'ilanlar'
                        ? 'truck'
                        : 'bookmark'
                  }
                  size={20}
                />
              </View>
              <Text style={styles.emptyTitle}>
                {segment === 'paylasimlar'
                  ? locale.profile.emptyPosts
                  : segment === 'ilanlar'
                    ? locale.profile.emptyListings
                    : locale.profile.emptySaved}
              </Text>
              <Text style={styles.emptyText}>
                {segment === 'paylasimlar'
                  ? locale.profile.emptyPostsText
                  : segment === 'ilanlar'
                    ? locale.profile.emptyListingsText
                    : locale.profile.emptySavedText}
              </Text>
              {segment !== 'kaydedilenler' ? (
                <Pressable onPress={onComposePress} style={styles.emptyButton}>
                  <Text style={styles.emptyButtonText}>{locale.profile.createContent}</Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  cover: {
    height: 158,
    backgroundColor: theme.colors.accent,
    position: 'relative',
  },
  coverImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  coverFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.accent,
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(24,53,66,0.22)',
  },
  coverBadge: {
    position: 'absolute',
    right: theme.spacing.md,
    bottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(16,24,32,0.35)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
  },
  coverBadgeText: {
    color: theme.colors.card,
    fontSize: 12,
    fontWeight: '700',
  },
  profileWrap: {
    marginHorizontal: theme.spacing.md,
    marginTop: -34,
  },
  avatarWrap: {
    width: 88,
    height: 88,
    marginLeft: theme.spacing.md,
    zIndex: 2,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: theme.colors.background,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    borderColor: theme.colors.background,
  },
  cameraButton: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  avatarText: {
    color: theme.colors.card,
    fontSize: 30,
    fontWeight: '800',
  },
  profileCard: {
    marginTop: -20,
    borderRadius: 28,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    gap: theme.spacing.md,
    ...theme.shadow,
  },
  profileTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  nameBlock: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  handle: {
    color: theme.colors.textSoft,
  },
  composeButton: {
    minHeight: 40,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composeButtonText: {
    color: theme.colors.card,
    fontWeight: '800',
  },
  bio: {
    color: theme.colors.text,
    lineHeight: 22,
  },
  metaRow: {
    gap: 6,
  },
  metaCompact: {
    color: theme.colors.textSoft,
    lineHeight: 18,
  },
  soldMeta: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  segmentRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  segment: {
    minHeight: 40,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.sm,
  },
  segmentActive: {
    backgroundColor: theme.colors.text,
  },
  segmentText: {
    color: theme.colors.textSoft,
    fontWeight: '700',
    fontSize: 12,
  },
  segmentTextActive: {
    color: theme.colors.card,
  },
  settingsStack: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  settingsCard: {
    borderRadius: 24,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    ...theme.shadow,
  },
  settingsTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  settingsHelper: {
    color: theme.colors.textSoft,
    lineHeight: 20,
  },
  formCard: {
    marginTop: theme.spacing.sm,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  formTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  premiumPlanCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  premiumPlanInfo: {
    gap: 4,
  },
  premiumPlanTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  premiumPlanDescription: {
    color: theme.colors.textSoft,
    lineHeight: 18,
  },
  premiumPlanPrice: {
    color: theme.colors.primary,
    fontWeight: '800',
  },
  premiumPlanButton: {
    minHeight: 42,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  premiumPlanButtonDisabled: {
    opacity: 0.55,
  },
  premiumPlanButtonText: {
    color: theme.colors.card,
    fontWeight: '800',
  },
  secondaryAction: {
    minHeight: 44,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  secondaryActionDisabled: {
    opacity: 0.55,
  },
  secondaryActionText: {
    color: theme.colors.text,
    fontWeight: '800',
  },
  inputStack: {
    gap: 6,
  },
  inputLabel: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing.sm,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  twoColumnInputs: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  flexColumn: {
    flex: 1,
  },
  languageRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  languageChip: {
    flex: 1,
    minHeight: 42,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageChipActive: {
    backgroundColor: theme.colors.primarySoft,
  },
  languageChipText: {
    color: theme.colors.textSoft,
    fontWeight: '700',
  },
  languageChipTextActive: {
    color: theme.colors.primary,
  },
  toggleRow: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  toggleLabel: {
    flex: 1,
    color: theme.colors.text,
    fontWeight: '600',
  },
  infoCard: {
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: 4,
  },
  infoLabel: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoValue: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  supportCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  supportHero: {
    marginBottom: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  supportBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: '#CDEEEE',
  },
  supportBadgeText: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  supportCardAccent: {
    minWidth: 58,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportCardAccentText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  supportCopy: {
    flex: 1,
    gap: 6,
  },
  supportCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  supportCardTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  supportCardAction: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: '700',
  },
  supportCardDescription: {
    color: theme.colors.textSoft,
    fontSize: 13,
    lineHeight: 18,
  },
  supportEmailPill: {
    alignSelf: 'flex-start',
    marginTop: 2,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 7,
  },
  supportCardEmail: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  logoutButton: {
    minHeight: 48,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: theme.colors.card,
    fontWeight: '800',
  },
  feed: {
    paddingBottom: theme.spacing.xxl,
  },
  emptyState: {
    marginHorizontal: theme.spacing.md,
    borderRadius: 28,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.sm,
    ...theme.shadow,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    color: theme.colors.textSoft,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    minWidth: 180,
    minHeight: 44,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  emptyButtonText: {
    color: theme.colors.card,
    fontWeight: '800',
  },
});

