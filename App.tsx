import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  LayoutChangeEvent,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BottomNav } from './src/components/BottomNav';
import { CommentsModal } from './src/components/CommentsModal';
import { CreatePostModal } from './src/components/CreatePostModal';
import { ListingDetailModal } from './src/components/ListingDetailModal';
import { MediaViewerModal } from './src/components/MediaViewerModal';
import { OnboardingModal } from './src/components/OnboardingModal';
import { PublicProfileModal } from './src/components/PublicProfileModal';
import { SearchModal } from './src/components/SearchModal';
import { SecurePaymentTransitionModal } from './src/components/SecurePaymentTransitionModal';
import { StatsModal } from './src/components/StatsModal';
import { TopBar } from './src/components/TopBar';
import { AIScreen } from './src/screens/AIScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { MessagesScreen } from './src/screens/MessagesScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { VehicleScreen } from './src/screens/VehicleScreen';
import { premiumPlanDefinitions } from './src/config/premiumProducts';
import { getCurrentResolvedLocation } from './src/services/location';
import { pickCoverPhoto, pickSingleProfilePhoto } from './src/services/mediaPicker';
import { platformApi } from './src/services/platformApi';
import {
  connectDigitalBilling,
  disconnectDigitalBilling,
  finalizePremiumPurchase,
  loadPremiumStoreProducts,
  purchasePremiumPlan,
  registerPremiumPurchaseListeners,
  restorePremiumPurchasesFromStore,
  toPremiumActivationPayload,
  type PremiumStoreProduct,
} from './src/services/digitalBilling';
import { appConfig } from './src/config/appConfig';
import { repairTurkishText } from './src/services/textRepair';
import { AppStoreProvider, useAppStore } from './src/store/appStore';
import { theme } from './src/theme';
import type { MediaPreviewState } from './src/components/MediaViewerModal';
import {
  AIMessage,
  ExternalPaymentSession,
  Post,
  SearchResultUser,
  SocialProfile,
  TabKey,
  VehicleProfile,
} from './src/types';

const tabOrder: TabKey[] = ['home', 'messages', 'ai', 'vehicle', 'profile'];
const brandLogo = require('./carloi.png');

function BrandBootScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.brandBootWrap}>
        <View style={styles.brandLogoWrap}>
          <Image resizeMode="contain" source={brandLogo} style={styles.brandLogo} />
        </View>
        <Text style={styles.brandTitle}>{appConfig.appName}</Text>
        <Text style={styles.brandSlogan}>{appConfig.slogan}</Text>
        <ActivityIndicator color={theme.colors.primary} size="small" />
      </View>
    </SafeAreaView>
  );
}

function AppShell() {
  const isWeb = Platform.OS === 'web';
  const pagerRef = useRef<ScrollView>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [shellWidth, setShellWidth] = useState(0);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isAIResponding, setIsAIResponding] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [composerVisible, setComposerVisible] = useState(false);
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const [onboardingMode, setOnboardingMode] = useState<'register' | 'edit'>('edit');
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [listingPostId, setListingPostId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [mediaPreview, setMediaPreview] = useState<MediaPreviewState | null>(null);
  const [statsPostId, setStatsPostId] = useState<string | null>(null);
  const [viewedProfileHandle, setViewedProfileHandle] = useState<string | null>(null);
  const [pendingSecurePayment, setPendingSecurePayment] = useState<ExternalPaymentSession | null>(null);
  const [minimumBrandDelayDone, setMinimumBrandDelayDone] = useState(false);
  const [premiumProducts, setPremiumProducts] = useState<PremiumStoreProduct[]>([]);
  const [premiumLoading, setPremiumLoading] = useState(false);

  const {
    addComment,
    appendAIMessage,
    createGroupConversation,
    createInsurancePayment,
    createOrUpdatePost,
    deletePost,
    completeSaleProcess,
    ensureConversation,
    ensureListingConversation,
    isHydrated,
    loginAccount,
    logoutAccount,
    markConversationRead,
    quickLoginAccount,
    quickLoginAvailable,
    quickLoginLabel,
    registerAccount,
    resendEmailCode,
    replaceSnapshot,
    saveOnboarding,
    sendConversationMessage,
    setProfileSegment,
    shareListingRegistration,
    snapshot,
    startSaleProcess,
    toggleFollow,
    toggleLike,
    toggleListingAgreement,
    toggleListingSold,
    toggleRepost,
    toggleSave,
    trackListing,
    updateCoverPhoto,
    updateProfilePhoto,
    updateSettings,
    users,
    verifyEmailCode,
    acknowledgeSafePayment,
    markSaleReadyForNotary,
  } = useAppStore();

  const { aiMessages, auth, conversations, posts, profile, profileSegment, settings, vehicle } =
    snapshot;
  const savedPosts = useMemo(() => posts.filter((post) => post.savedByUser), [posts]);
  const ownPosts = useMemo(
    () => posts.filter((post) => post.handle === profile.handle && post.type !== 'listing'),
    [posts, profile.handle],
  );
  const ownListings = useMemo(
    () => posts.filter((post) => post.handle === profile.handle && post.type === 'listing'),
    [posts, profile.handle],
  );
  const featuredUsers = useMemo(
    () => users.filter((user) => user.handle !== profile.handle).slice(0, 8),
    [profile.handle, users],
  );

  const selectedCommentPost = commentPostId
    ? posts.find((post) => post.id === commentPostId) ?? null
    : null;
  const selectedListingPost = listingPostId
    ? posts.find((post) => post.id === listingPostId) ?? null
    : null;
  const editingPost = editingPostId ? posts.find((post) => post.id === editingPostId) ?? null : null;
  const statsPost = statsPostId ? posts.find((post) => post.id === statsPostId) ?? null : null;

  const activePublicUser = useMemo(() => {
    if (!viewedProfileHandle) {
      return null;
    }

    const listedUser = users.find((user) => user.handle === viewedProfileHandle);
    if (listedUser) {
      return listedUser;
    }

    const postAuthor = posts.find((post) => post.handle === viewedProfileHandle);
    if (!postAuthor) {
      return null;
    }

    return {
      id: `public-${postAuthor.handle}`,
      name: postAuthor.authorName,
      handle: postAuthor.handle,
      note: postAuthor.role,
      avatarUri: postAuthor.authorAvatarUri,
    } satisfies SearchResultUser;
  }, [posts, users, viewedProfileHandle]);

  const publicPosts = useMemo(
    () =>
      activePublicUser
        ? posts.filter((post) => post.handle === activePublicUser.handle && post.type !== 'listing')
        : [],
    [activePublicUser, posts],
  );
  const publicListings = useMemo(
    () =>
      activePublicUser
        ? posts.filter((post) => post.handle === activePublicUser.handle && post.type === 'listing')
        : [],
    [activePublicUser, posts],
  );
  const isFollowingViewedProfile = Boolean(
    activePublicUser && profile.followingHandles.includes(activePublicUser.handle),
  );

  useEffect(() => {
    const timer = setTimeout(() => setMinimumBrandDelayDone(true), 900);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handlePaymentReturnUrl = async (url: string | null) => {
      if (!url) {
        return;
      }

      let parsed;
      try {
        parsed = new URL(url);
      } catch {
        return;
      }

      if (parsed.protocol !== 'carloi:' || parsed.hostname !== 'payment-result') {
        return;
      }

      const status = parsed.searchParams.get('status');
      const conversationId = parsed.searchParams.get('conversationId');
      const paymentReference = parsed.searchParams.get('paymentReference');

      if (auth.sessionToken) {
        try {
          const response = await platformApi.bootstrap(auth.sessionToken);
          if (response.snapshot) {
            replaceSnapshot(response.snapshot);
          }
        } catch {
          // Keep current local snapshot if refresh fails.
        }
      }

      if (conversationId) {
        setActiveTab('messages');
        setSelectedConversationId(conversationId);
      }

      setPendingSecurePayment(null);

      const normalizedStatus = String(status || '').trim().toLowerCase();

      Alert.alert(
        normalizedStatus === 'success' ? 'Odeme durumu' : 'Odeme sonucu',
        normalizedStatus === 'success'
          ? `Odeme onayi alindi. Referans: ${paymentReference || 'bilinmiyor'}. Sigorta islemi admin incelemesine alindi.`
          : normalizedStatus === 'cancelled'
            ? 'Odeme adimi iptal edildi. Dilerseniz Carloi icinden yeniden baslatabilirsiniz.'
            : 'Odeme tamamlanamadi veya banka tarafinda iptal edildi.',
      );
    };

    void Linking.getInitialURL().then((url) => handlePaymentReturnUrl(url));
    const subscription = Linking.addEventListener('url', (event) => {
      void handlePaymentReturnUrl(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [auth.sessionToken, replaceSnapshot]);

  useEffect(() => {
    if (!auth.isAuthenticated || !auth.sessionToken) {
      setPremiumProducts([]);
      return;
    }

    let cancelled = false;

    const bootBilling = async () => {
      try {
        await connectDigitalBilling();
        const products = await loadPremiumStoreProducts();
        if (!cancelled) {
          setPremiumProducts(products);
        }
      } catch {
        if (!cancelled) {
          setPremiumProducts([]);
        }
      }
    };

    const removeListeners = registerPremiumPurchaseListeners({
      onPurchase: async (purchase) => {
        if (!auth.sessionToken) {
          return;
        }

        setPremiumLoading(true);
        try {
          const activationPayload = toPremiumActivationPayload(purchase);
          const response = await platformApi.activatePremiumMembership(
            auth.sessionToken,
            activationPayload,
          );
          if (response.snapshot) {
            replaceSnapshot(response.snapshot);
          }
          await finalizePremiumPurchase(purchase);
          Alert.alert(
            'Premium aktif',
            response.message || 'Premium üyelik hesabınıza tanımlandı.',
          );
        } catch (error) {
          Alert.alert(
            'Premium doğrulanamadı',
            error instanceof Error
              ? repairTurkishText(error.message)
              : 'Premium satın alma kaydı doğrulanamadı.',
          );
        } finally {
          setPremiumLoading(false);
        }
      },
      onError: (message) => {
        setPremiumLoading(false);
        Alert.alert('Mağaza satın alma hatası', repairTurkishText(message));
      },
    });

    void bootBilling();

    return () => {
      cancelled = true;
      removeListeners();
      void disconnectDigitalBilling();
    };
  }, [auth.isAuthenticated, auth.sessionToken, replaceSnapshot]);

  useEffect(() => {
    if (!shellWidth || !isHydrated || isWeb) {
      return;
    }

    const nextIndex = tabOrder.indexOf(activeTab);
    if (nextIndex < 0) {
      return;
    }

    pagerRef.current?.scrollTo({
      x: nextIndex * shellWidth,
      y: 0,
      animated: true,
    });
  }, [activeTab, isHydrated, isWeb, shellWidth]);

  useEffect(() => {
    if (activeTab !== 'messages' && selectedConversationId !== null) {
      setSelectedConversationId(null);
    }
  }, [activeTab, selectedConversationId]);

  const handleShellLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    if (nextWidth && nextWidth !== shellWidth) {
      setShellWidth(nextWidth);
    }
  };

  const handlePagerEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const width = shellWidth || event.nativeEvent.layoutMeasurement.width;
    if (!width) {
      return;
    }

    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    const nextTab = tabOrder[nextIndex];

    if (nextTab && nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  };

  const handleOpenConversation = (conversationId: string) => {
    markConversationRead(conversationId);
    setSelectedConversationId(conversationId);
  };

  const handleStartConversation = async (user: SearchResultUser) => {
    try {
      const conversationId = await ensureConversation(user);
      setSelectedConversationId(conversationId);
    } catch (error) {
      Alert.alert(
        'Mesajlaşma açılamadı',
        error instanceof Error ? repairTurkishText(error.message) : 'Sohbet şu anda başlatılamadı.',
      );
    }
  };

  const handleMessageHandle = async (handle: string) => {
    const fromUsers = users.find((user) => user.handle === handle);
    const fromPosts = posts.find((post) => post.handle === handle);

    try {
      const conversationId = await ensureConversation(
        fromUsers ?? {
          id: `generated-${handle}`,
          name: fromPosts?.authorName ?? handle.replace('@', ''),
          handle,
          note: fromPosts?.role ?? 'Profil bilgisi paylaşılmadı.',
          avatarUri: fromPosts?.authorAvatarUri,
        },
      );
      setActiveTab('messages');
      setSelectedConversationId(conversationId);
      setViewedProfileHandle(null);
    } catch (error) {
      Alert.alert(
        'Mesajlaşma açılamadı',
        error instanceof Error
          ? repairTurkishText(error.message)
          : 'Kullanıcı ile sohbet başlatılamadı.',
      );
    }
  };

  const handleSendAIMessage = async (message: string) => {
    const userMessage: AIMessage = {
      id: `user-ai-${Date.now()}`,
      role: 'user',
      content: message,
    };

    appendAIMessage(userMessage);
    setIsAIResponding(true);

    try {
      if (!auth.sessionToken) {
        throw new Error(`${appConfig.aiName} özelliği için aktif oturum gerekiyor.`);
      }

      const location =
        settings.useDeviceLocation && settings.shareLocationWithAi
          ? await getCurrentResolvedLocation().catch(() => undefined)
          : undefined;

      const response = await platformApi.aiChat(auth.sessionToken, message, location);
      if (response.snapshot) {
        const nextSnapshot = {
          ...response.snapshot,
          aiMessages: response.snapshot.aiMessages.map((item, index, list) =>
            index === list.length - 1 && item.role === 'assistant'
              ? {
                  ...item,
                  provider: response.provider,
                  relatedPostIds: response.relatedPostIds ?? item.relatedPostIds,
                }
              : item,
          ),
        };
        replaceSnapshot(nextSnapshot);
      }
    } catch (error) {
      appendAIMessage({
        id: `assistant-ai-${Date.now() + 1}`,
        role: 'assistant',
        content:
          error instanceof Error
            ? repairTurkishText(error.message)
            : 'AI yanıtı şu anda alınamadı. Bağlantıyı kontrol edip tekrar deneyin.',
      });
    } finally {
      setIsAIResponding(false);
    }
  };

  const handleEditAIMessage = async (messageId: string, content: string) => {
    try {
      if (!auth.sessionToken) {
        throw new Error(`${appConfig.aiName} özelliği için aktif oturum gerekiyor.`);
      }

      setIsAIResponding(true);
      const location =
        settings.useDeviceLocation && settings.shareLocationWithAi
          ? await getCurrentResolvedLocation().catch(() => undefined)
          : undefined;

      const response = await platformApi.editAiMessage(auth.sessionToken, messageId, content, location);
      if (response.snapshot) {
        const nextSnapshot = {
          ...response.snapshot,
          aiMessages: response.snapshot.aiMessages.map((item, index, list) =>
            index === list.length - 1 && item.role === 'assistant'
              ? {
                  ...item,
                  provider: response.provider,
                  relatedPostIds: response.relatedPostIds ?? item.relatedPostIds,
                }
              : item,
          ),
        };
        replaceSnapshot(nextSnapshot);
      }
    } catch (error) {
      Alert.alert(
        'AI mesajı güncellenemedi',
        error instanceof Error
          ? repairTurkishText(error.message)
          : 'AI mesajı şu anda güncellenemedi.',
      );
    } finally {
      setIsAIResponding(false);
    }
  };

  const handleDeleteAIMessage = async (messageId: string) => {
    try {
      if (!auth.sessionToken) {
        throw new Error('Oturum bulunamadı.');
      }

      const response = await platformApi.deleteAiMessage(auth.sessionToken, messageId);
      if (response.snapshot) {
        replaceSnapshot(response.snapshot);
      }
    } catch (error) {
      Alert.alert(
        'AI mesajı silinemedi',
        error instanceof Error ? repairTurkishText(error.message) : 'AI mesajı silinemedi.',
      );
    }
  };

  const handleClearAIChat = async () => {
    try {
      if (!auth.sessionToken) {
        throw new Error('Oturum bulunamadı.');
      }

      const response = await platformApi.clearAiMessages(auth.sessionToken);
      if (response.snapshot) {
        replaceSnapshot(response.snapshot);
      }
    } catch (error) {
      Alert.alert(
        'AI sohbeti temizlenemedi',
        error instanceof Error ? repairTurkishText(error.message) : 'AI sohbeti temizlenemedi.',
      );
    }
  };

  const handleEditConversationMessage = async (
    conversationId: string,
    messageId: string,
    text: string,
  ) => {
    try {
      if (!auth.sessionToken) {
        throw new Error('Oturum bulunamadı.');
      }

      const response = await platformApi.editConversationMessage(
        auth.sessionToken,
        conversationId,
        messageId,
        text,
      );
      if (response.snapshot) {
        replaceSnapshot(response.snapshot);
      }
    } catch (error) {
      Alert.alert(
        'Mesaj güncellenemedi',
        error instanceof Error ? repairTurkishText(error.message) : 'Mesaj güncellenemedi.',
      );
    }
  };

  const handleDeleteConversationMessage = async (
    conversationId: string,
    messageId: string,
    scope: 'self' | 'everyone',
  ) => {
    try {
      if (!auth.sessionToken) {
        throw new Error('Oturum bulunamadı.');
      }

      const response = await platformApi.deleteConversationMessage(
        auth.sessionToken,
        conversationId,
        messageId,
        scope,
      );
      if (response.snapshot) {
        replaceSnapshot(response.snapshot);
      }
    } catch (error) {
      Alert.alert(
        'Mesaj silinemedi',
        error instanceof Error ? repairTurkishText(error.message) : 'Mesaj silinemedi.',
      );
    }
  };

  const handleOnboardingComplete = ({
    profile: nextProfile,
    vehicle: nextVehicle,
    settings: nextSettings,
  }: {
    profile: SocialProfile;
    vehicle?: VehicleProfile;
    settings?: Partial<typeof settings>;
  }) => {
    saveOnboarding({
      profile: nextProfile,
      vehicle: nextVehicle,
      settings: nextSettings,
    });
    setOnboardingVisible(false);
    setOnboardingMode('edit');
  };

  const openVehicleEditor = () => {
    setOnboardingMode('edit');
    setOnboardingVisible(true);
  };

  const handlePersistVehicleSnapshot = (nextVehicle: VehicleProfile) => {
    saveOnboarding({
      profile,
      vehicle: nextVehicle,
    });
  };

  const handleChangeProfilePhoto = async () => {
    try {
      const avatarUri = await pickSingleProfilePhoto();
      if (!avatarUri) {
        return;
      }

      updateProfilePhoto(avatarUri);
    } catch {
      Alert.alert(
        'Profil fotoğrafı seçilemedi',
        'Galeri izni vermeniz veya tekrar denemeniz gerekiyor.',
      );
    }
  };

  const handleChangeCoverPhoto = async () => {
    try {
      const coverUri = await pickCoverPhoto();
      if (!coverUri) {
        return;
      }

      updateCoverPhoto(coverUri);
    } catch {
      Alert.alert(
        'Kapak fotoğrafı seçilemedi',
        'Galeri izni vermeniz veya tekrar denemeniz gerekiyor.',
      );
    }
  };

  const handleOpenListing = (post: Post) => {
    trackListing(post.id, 'view');
    setListingPostId(post.id);
  };

  const handleSharePost = async (post: Post) => {
    try {
      await Share.share({
        message:
          post.type === 'listing' ? post.listing?.listingLink ?? post.shareLink : post.shareLink,
      });
      trackListing(post.id, 'share');
    } catch {
      Alert.alert('Paylaşım açılamadı', 'Cihaz paylaşım menüsü şu anda açılamadı.');
    }
  };

  const handleCallListing = async (post: Post) => {
    const phone = post.listing?.contactPhone?.replace(/[^\d+]/g, '');
    if (!phone) {
      return;
    }

    trackListing(post.id, 'call');
    try {
      await Linking.openURL(`tel:${phone}`);
    } catch {
      Alert.alert('Arama başlatılamadı', 'Telefon uygulaması şu anda açılamadı.');
    }
  };

  const handleMessageAuthor = (post: Post) => {
    if (post.listing) {
      trackListing(post.id, 'message');
      void (async () => {
        try {
          const conversationId = await ensureListingConversation(post.id);
          setActiveTab('messages');
          setSelectedConversationId(conversationId);
          setViewedProfileHandle(null);
          setListingPostId(null);
        } catch (error) {
          Alert.alert(
            'İlan sohbeti açılamadı',
            error instanceof Error
              ? repairTurkishText(error.message)
              : 'İlan için mesajlaşma alanı şu anda açılamadı.',
          );
        }
      })();
      return;
    }

    void handleMessageHandle(post.handle);
    setListingPostId(null);
  };

  const handleDeletePost = (post: Post) => {
    Alert.alert(
      'İçerik silinsin mi?',
      post.type === 'listing'
        ? 'Bu ilan kalıcı olarak kaldırılacak.'
        : 'Bu paylaşım kalıcı olarak kaldırılacak.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => deletePost(post.id),
        },
      ],
    );
  };

  const handleToggleListingSold = (post: Post, isSold: boolean) => {
    toggleListingSold(post.id, isSold);
  };

  const handleShareListingRegistration = async (conversationId: string) => {
    try {
      await shareListingRegistration(conversationId);
    } catch (error) {
      Alert.alert(
        'Ruhsat gönderilemedi',
        error instanceof Error
          ? repairTurkishText(error.message)
          : 'Ruhsat bilgileri şu anda gönderilemedi.',
      );
    }
  };

  const handleCreateInsurancePayment = async (conversationId: string) => {
    try {
      const payment = await createInsurancePayment(conversationId);
      if (!payment?.paymentUrl) {
        throw new Error('Guvenli odeme baglantisi olusturulamadi.');
      }

      setPendingSecurePayment(payment);
    } catch (error) {
      Alert.alert(
        'Sigorta odeme adimi acilamadi',
        error instanceof Error
          ? repairTurkishText(error.message)
          : 'Sigorta odeme adimi su anda baslatilamadi.',
      );
    }
  };

  const handleStartSaleProcess = async (listingId: string) => {
    try {
      await startSaleProcess(listingId);
    } catch (error) {
      Alert.alert(
        'Satis sureci baslatilamadi',
        error instanceof Error ? repairTurkishText(error.message) : 'Satis sureci baslatilamadi.',
      );
    }
  };

  const handleAcknowledgeSafePayment = async (listingId: string) => {
    try {
      await acknowledgeSafePayment(listingId);
    } catch (error) {
      Alert.alert(
        'Bilgilendirme kaydedilemedi',
        error instanceof Error
          ? repairTurkishText(error.message)
          : 'Guvenli odeme bilgilendirmesi kaydedilemedi.',
      );
    }
  };

  const handleMarkSaleReadyForNotary = async (listingId: string) => {
    try {
      await markSaleReadyForNotary(listingId);
    } catch (error) {
      Alert.alert(
        'Noter adimina gecilemedi',
        error instanceof Error ? repairTurkishText(error.message) : 'Noter adimina gecilemedi.',
      );
    }
  };

  const handleCompleteSaleProcess = async (listingId: string) => {
    try {
      await completeSaleProcess(listingId);
    } catch (error) {
      Alert.alert(
        'Satis tamamlanamadi',
        error instanceof Error ? repairTurkishText(error.message) : 'Satis tamamlanamadi.',
      );
    }
  };

  const handlePurchasePremium = async (productId: string) => {
    const product = premiumProducts.find((item) => item.id === productId);
    if (!product) {
      Alert.alert('Premium ürün bulunamadı', 'Mağaza ürünü henüz yüklenemedi.');
      return;
    }

    setPremiumLoading(true);
    try {
      await purchasePremiumPlan(product, profile.handle.replace('@', ''));
    } catch (error) {
      setPremiumLoading(false);
      Alert.alert(
        'Premium satın alma açılamadı',
        error instanceof Error ? repairTurkishText(error.message) : 'Mağaza akışı açılamadı.',
      );
    }
  };

  const handleRestorePremium = async () => {
    if (!auth.sessionToken) {
      Alert.alert('Oturum bulunamadı', 'Önce hesabınızla giriş yapmanız gerekiyor.');
      return;
    }

    setPremiumLoading(true);
    try {
      const purchases = await restorePremiumPurchasesFromStore();
      if (!purchases.length) {
        Alert.alert('Satın alma bulunamadı', 'Bu hesap için geri yüklenecek premium abonelik bulunamadı.');
        return;
      }

      const latestPurchase = purchases.sort((a, b) => b.transactionDate - a.transactionDate)[0];
      const response = await platformApi.activatePremiumMembership(
        auth.sessionToken,
        toPremiumActivationPayload(latestPurchase),
      );
      if (response.snapshot) {
        replaceSnapshot(response.snapshot);
      }
      await finalizePremiumPurchase(latestPurchase);
      Alert.alert('Premium geri yüklendi', response.message || 'Premium üyelik tekrar etkinleştirildi.');
    } catch (error) {
      Alert.alert(
        'Premium geri yüklenemedi',
        error instanceof Error ? repairTurkishText(error.message) : 'Satın alma geri yüklenemedi.',
      );
    } finally {
        setPremiumLoading(false);
    }
  };

  const handleOpenProfile = (handle: string) => {
    if (handle === profile.handle) {
      setActiveTab('profile');
      return;
    }

    setViewedProfileHandle(handle);
  };

  const renderTabScreen = (tab: TabKey) => {
    switch (tab) {
      case 'home':
        return (
          <HomeScreen
            onCallListing={handleCallListing}
            onCommentPress={(post) => setCommentPostId(post.id)}
            onComposePress={() => {
              setEditingPostId(null);
              setComposerVisible(true);
            }}
            onDeletePost={handleDeletePost}
            onEditPost={(post) => {
              setEditingPostId(post.id);
              setComposerVisible(true);
            }}
            onMessageAuthor={handleMessageAuthor}
            onOpenListing={handleOpenListing}
            onOpenMedia={(media, post) => setMediaPreview({ media, post })}
            onOpenProfile={handleOpenProfile}
            onOpenStats={(post) => setStatsPostId(post.id)}
            onSharePost={handleSharePost}
            onToggleLike={toggleLike}
            onToggleListingSold={handleToggleListingSold}
            onToggleRepost={toggleRepost}
            onToggleSave={toggleSave}
            onVehiclePress={openVehicleEditor}
            posts={posts}
            profile={profile}
            users={featuredUsers}
            vehicle={vehicle}
          />
        );
      case 'messages':
        return (
          <MessagesScreen
            conversations={conversations}
            onDeleteMessage={handleDeleteConversationMessage}
            onEditMessage={handleEditConversationMessage}
            language={settings.language}
            onBackToList={() => setSelectedConversationId(null)}
            onAcknowledgeSafePayment={handleAcknowledgeSafePayment}
            onCompleteSaleProcess={handleCompleteSaleProcess}
            onCreateInsurancePayment={handleCreateInsurancePayment}
            onCreateGroup={async (selectedUsers, name) => {
              try {
                const conversationId = await createGroupConversation(selectedUsers, name);
                setSelectedConversationId(conversationId);
              } catch (error) {
                Alert.alert(
                  'Grup oluşturulamadı',
                  error instanceof Error
                    ? repairTurkishText(error.message)
                    : 'Grup sohbeti başlatılamadı.',
                );
              }
            }}
            onSelectConversation={handleOpenConversation}
            onSendMessage={sendConversationMessage}
            onShareListingRegistration={handleShareListingRegistration}
            onStartSaleProcess={handleStartSaleProcess}
            onStartConversation={handleStartConversation}
            onMarkSaleReadyForNotary={handleMarkSaleReadyForNotary}
            onToggleListingAgreement={toggleListingAgreement}
            selectedConversationId={selectedConversationId}
            users={users}
          />
        );
      case 'ai':
        return (
          <AIScreen
            onClearChat={handleClearAIChat}
            onDeleteMessage={handleDeleteAIMessage}
            onEditMessage={handleEditAIMessage}
            isResponding={isAIResponding}
            language={settings.language}
            messages={aiMessages}
            onOpenListing={handleOpenListing}
            onSendMessage={handleSendAIMessage}
            posts={posts}
            vehicle={vehicle}
          />
        );
      case 'vehicle':
        return (
          <VehicleScreen
            onEditVehicle={openVehicleEditor}
            onPersistVehicleSnapshot={handlePersistVehicleSnapshot}
            vehicle={vehicle}
          />
        );
      case 'profile':
        return (
          <ProfileScreen
            commercial={snapshot.commercial}
            language={settings.language}
            listings={ownListings}
            onCallListing={handleCallListing}
            onChangeCover={handleChangeCoverPhoto}
            onChangePhoto={handleChangeProfilePhoto}
            onChangeSegment={setProfileSegment}
            onCommentPress={(post) => setCommentPostId(post.id)}
            onComposePress={() => {
              setEditingPostId(null);
              setComposerVisible(true);
            }}
            onDeletePost={handleDeletePost}
            onEditPost={(post) => {
              setEditingPostId(post.id);
              setComposerVisible(true);
            }}
            onMessageAuthor={handleMessageAuthor}
            onOpenListing={handleOpenListing}
            onOpenMedia={(media, post) => setMediaPreview({ media, post })}
            onOpenStats={(post) => setStatsPostId(post.id)}
            onSharePost={handleSharePost}
            onToggleLike={toggleLike}
            onToggleListingSold={handleToggleListingSold}
            onToggleRepost={toggleRepost}
            onToggleSave={toggleSave}
            onUpdateSettings={updateSettings}
            onPurchasePremium={handlePurchasePremium}
            onRestorePremium={handleRestorePremium}
            onLogout={logoutAccount}
            posts={ownPosts}
            premiumLoading={premiumLoading}
            premiumProducts={premiumProducts}
            premiumSupported={Platform.OS === 'android' || Platform.OS === 'ios'}
            profile={profile}
            savedPosts={savedPosts}
            segment={profileSegment}
            settings={settings}
            vehicle={vehicle}
          />
        );
      default:
        return null;
    }
  };

  if (!isHydrated || !minimumBrandDelayDone) {
    return <BrandBootScreen />;
  }

  if (!auth.isAuthenticated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <AuthScreen
          language={settings.language}
          onLogin={loginAccount}
          onQuickLogin={quickLoginAccount}
          onRegister={registerAccount}
          onResendCode={resendEmailCode}
          onVerifyEmail={verifyEmailCode}
          quickLoginAvailable={quickLoginAvailable}
          quickLoginLabel={quickLoginLabel}
          registered={auth.isRegistered}
          savedEmail={auth.email}
          savedPhone={auth.phone}
        />
      </SafeAreaView>
    );
  }

  const pageWidth = Math.max(shellWidth, 1);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <View onLayout={handleShellLayout} style={styles.shell}>
          <TopBar
            activeTab={activeTab}
            language={settings.language}
            onComposePress={() => {
              setEditingPostId(null);
              setComposerVisible(true);
            }}
            onSearchPress={() => setSearchVisible(true)}
          />

          {isWeb ? (
            <View style={styles.screen}>{renderTabScreen(activeTab)}</View>
          ) : (
            <ScrollView
              ref={pagerRef}
              horizontal
              onMomentumScrollEnd={handlePagerEnd}
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.screen}
            >
              {tabOrder.map((tab) => (
                <View key={tab} style={[styles.page, { width: pageWidth }]}>
                  {renderTabScreen(tab)}
                </View>
              ))}
            </ScrollView>
          )}

          <BottomNav activeTab={activeTab} language={settings.language} onChange={setActiveTab} />
        </View>
      </View>

      <SearchModal
        onClose={() => setSearchVisible(false)}
        onOpenListing={(post) => {
          setSearchVisible(false);
          handleOpenListing(post);
        }}
        onOpenProfile={(handle) => {
          setSearchVisible(false);
          handleOpenProfile(handle);
        }}
        posts={posts}
        users={users}
        visible={searchVisible}
      />

      <CreatePostModal
        autoLocationEnabled={settings.useDeviceLocation}
        editingPost={editingPost}
        hasVehicle={Boolean(vehicle)}
        onClose={() => {
          setComposerVisible(false);
          setEditingPostId(null);
        }}
          onSubmit={async (payload) => {
            const result = await createOrUpdatePost(payload);
            setComposerVisible(false);
            setEditingPostId(null);
            setActiveTab(payload.postType === 'listing' ? 'home' : 'profile');
            if (result?.url) {
              await Linking.openURL(result.url);
            }
            if (result?.message) {
              Alert.alert(payload.postType === 'listing' ? 'Ilan durumu' : 'Paylasim durumu', result.message);
            }
          }}
        settings={settings}
        vehicle={vehicle}
        visible={composerVisible}
      />

      <OnboardingModal
        initialProfile={profile}
        initialSettings={settings}
        initialVehicle={vehicle}
        mode={onboardingMode}
        onDismiss={() => setOnboardingVisible(false)}
        onComplete={handleOnboardingComplete}
        visible={onboardingVisible}
      />

      <CommentsModal
        onClose={() => setCommentPostId(null)}
        onSubmit={addComment}
        post={selectedCommentPost}
        visible={Boolean(selectedCommentPost)}
      />

      <ListingDetailModal
        onCall={handleCallListing}
        onClose={() => setListingPostId(null)}
        onMessage={handleMessageAuthor}
        onOpenMedia={(media, post) => setMediaPreview({ media, post })}
        onShare={handleSharePost}
        onToggleSave={toggleSave}
        post={selectedListingPost}
        visible={Boolean(selectedListingPost)}
      />

      <MediaViewerModal
        onClose={() => setMediaPreview(null)}
        preview={mediaPreview}
        visible={Boolean(mediaPreview)}
      />

      <StatsModal
        onClose={() => setStatsPostId(null)}
        post={statsPost}
        visible={Boolean(statsPost)}
      />

      <PublicProfileModal
        currentHandle={profile.handle}
        isFollowing={isFollowingViewedProfile}
        listings={publicListings}
        onCallListing={handleCallListing}
        onClose={() => setViewedProfileHandle(null)}
        onCommentPress={(post) => setCommentPostId(post.id)}
        onMessage={(handle) => {
          void handleMessageHandle(handle);
        }}
        onMessageAuthor={handleMessageAuthor}
        onOpenListing={(post) => {
          setViewedProfileHandle(null);
          handleOpenListing(post);
        }}
        onOpenMedia={(media, post) => setMediaPreview({ media, post })}
        onSharePost={handleSharePost}
        onToggleFollow={toggleFollow}
        onToggleLike={toggleLike}
        onToggleRepost={toggleRepost}
        onToggleSave={toggleSave}
        posts={publicPosts}
        user={activePublicUser}
        visible={Boolean(activePublicUser)}
      />

      <SecurePaymentTransitionModal
        onCancel={() => setPendingSecurePayment(null)}
        onContinue={() => {
          if (!pendingSecurePayment?.paymentUrl) {
            return;
          }

          void Linking.openURL(pendingSecurePayment.paymentUrl).catch(() => {
            Alert.alert(
              'Guvenli odeme sayfasi acilamadi',
              'Odeme sayfasina yonlendirme su anda tamamlanamadi. Lutfen tekrar deneyin.',
            );
          });
        }}
        payment={pendingSecurePayment}
        visible={Boolean(pendingSecurePayment)}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AppStoreProvider>
      <AppShell />
    </AppStoreProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
  },
  shell: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    backgroundColor: theme.colors.background,
  },
  screen: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
  loadingTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  loadingText: {
    color: theme.colors.textSoft,
    textAlign: 'center',
    lineHeight: 20,
  },
  brandBootWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
    backgroundColor: '#FFFFFF',
  },
  brandLogoWrap: {
    width: 120,
    height: 120,
    borderRadius: 32,
    backgroundColor: '#F4F8FB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0E2430',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  brandLogo: {
    width: 84,
    height: 84,
  },
  brandTitle: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  brandSlogan: {
    color: theme.colors.textSoft,
    fontSize: 15,
    textAlign: 'center',
  },
});
