import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react';

import { appConfig } from '../config/appConfig';
import { seedAppSnapshot } from '../data/seedData';
import { platformApi } from '../services/platformApi';
import {
  clearQuickLoginPayload,
  getQuickLoginPayload,
  runQuickLoginSecurityCheck,
  saveQuickLoginPayload,
} from '../services/quickLogin';
import { repairTurkishText } from '../services/textRepair';
import {
  AIMessage,
  AppSnapshot,
  AuthActionResult,
  AuthLoginPayload,
  AuthRegisterPayload,
  AuthResendCodePayload,
  AuthVerifyEmailPayload,
  AuthVerificationStartPayload,
  AuthVerificationStartResult,
  ComposerPayload,
  Conversation,
  ConversationMessage,
  ExternalPaymentSession,
  ListingFlowResult,
  MessageAttachment,
  OnboardingPayload,
  PostComment,
  ProfileSegment,
  SearchResultUser,
  SocialAuthPayload,
  UserSettings,
} from '../types';

type TrackingKind = 'view' | 'share' | 'call' | 'message';

type AppAction =
  | { type: 'hydrate'; payload: AppSnapshot }
  | { type: 'logout_account' }
  | { type: 'start_conversation'; payload: Conversation }
  | { type: 'mark_conversation_read'; payload: { conversationId: string } }
  | {
      type: 'send_message';
      payload: { conversationId: string; text: string; attachments?: MessageAttachment[] };
    }
  | { type: 'append_ai_message'; payload: AIMessage }
  | { type: 'set_profile_segment'; payload: ProfileSegment }
  | { type: 'toggle_like'; payload: { postId: string } }
  | { type: 'toggle_save'; payload: { postId: string } }
  | { type: 'toggle_repost'; payload: { postId: string } }
  | { type: 'add_comment'; payload: { postId: string; comment: PostComment } }
  | { type: 'update_profile_photo'; payload: { avatarUri: string } }
  | { type: 'update_cover_photo'; payload: { coverUri: string } }
  | { type: 'update_settings'; payload: Partial<UserSettings> }
  | { type: 'toggle_follow'; payload: { handle: string } }
  | { type: 'track_listing'; payload: { postId: string; kind: TrackingKind } };

interface AppStoreValue {
  isHydrated: boolean;
  snapshot: AppSnapshot;
  users: SearchResultUser[];
  quickLoginAvailable: boolean;
  quickLoginLabel: string;
  startVerification: (payload: AuthVerificationStartPayload) => Promise<AuthVerificationStartResult>;
  registerAccount: (payload: AuthRegisterPayload) => Promise<AuthActionResult>;
  verifyEmailCode: (payload: AuthVerifyEmailPayload) => Promise<AuthActionResult>;
  resendEmailCode: (payload: AuthResendCodePayload) => Promise<AuthActionResult>;
  loginAccount: (payload: AuthLoginPayload) => Promise<AuthActionResult>;
  socialAuthAccount: (payload: SocialAuthPayload) => Promise<AuthActionResult>;
  quickLoginAccount: () => Promise<AuthActionResult>;
  logoutAccount: () => void;
  replaceSnapshot: (payload: AppSnapshot) => void;
  createOrUpdatePost: (
    payload: ComposerPayload,
  ) => Promise<{ message?: string; url?: string; listingFlow?: ListingFlowResult }>;
  saveOnboarding: (payload: OnboardingPayload) => void;
  ensureConversation: (user: SearchResultUser) => Promise<string>;
  ensureListingConversation: (postId: string) => Promise<string>;
  createGroupConversation: (users: SearchResultUser[], name: string) => Promise<string>;
  deletePost: (postId: string) => void;
  toggleListingSold: (postId: string, isSold: boolean) => void;
  shareListingRegistration: (conversationId: string) => Promise<void>;
  createInsurancePayment: (conversationId: string) => Promise<ExternalPaymentSession | null>;
  startSaleProcess: (listingId: string) => Promise<void>;
  acknowledgeSafePayment: (listingId: string) => Promise<void>;
  markSaleReadyForNotary: (listingId: string) => Promise<void>;
  completeSaleProcess: (listingId: string) => Promise<void>;
  markConversationRead: (conversationId: string) => void;
  sendConversationMessage: (
    conversationId: string,
    payload: { text: string; attachments?: MessageAttachment[] },
  ) => void;
  appendAIMessage: (message: AIMessage) => void;
  setProfileSegment: (segment: ProfileSegment) => void;
  toggleLike: (postId: string) => void;
  toggleSave: (postId: string) => void;
  toggleRepost: (postId: string) => void;
  addComment: (postId: string, content: string) => void;
  updateProfilePhoto: (avatarUri: string) => void;
  updateCoverPhoto: (coverUri: string) => void;
  updateSettings: (payload: Partial<UserSettings>) => void;
  toggleFollow: (handle: string) => void;
  toggleListingAgreement: (conversationId: string) => void;
  trackListing: (postId: string, kind: TrackingKind) => void;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

function nowLabel() {
  return 'Şimdi';
}

function stripTransientMedia(snapshot: AppSnapshot): AppSnapshot {
  return {
    ...snapshot,
    posts: snapshot.posts.map((post) => ({
      ...post,
      media: post.media.map(({ asset, ...media }) => ({ ...media })),
      repostOf: post.repostOf
        ? {
            ...post.repostOf,
            media: post.repostOf.media.map(({ asset, ...media }) => ({ ...media })),
          }
        : undefined,
    })),
  };
}

function normalizeSnapshot(snapshot: Partial<AppSnapshot> | null | undefined): AppSnapshot {
  const source = snapshot ?? seedAppSnapshot;

  return repairTurkishText(
    stripTransientMedia({
      auth: {
        ...seedAppSnapshot.auth,
        ...source.auth,
      },
      profile: {
        ...seedAppSnapshot.profile,
        ...source.profile,
        followingHandles: Array.isArray(source.profile?.followingHandles)
          ? source.profile.followingHandles
          : seedAppSnapshot.profile.followingHandles,
      },
      commercial: {
        ...seedAppSnapshot.commercial,
        ...source.commercial,
        documents: Array.isArray(source.commercial?.documents)
          ? source.commercial.documents
          : seedAppSnapshot.commercial.documents,
        nextActions: Array.isArray(source.commercial?.nextActions)
          ? source.commercial.nextActions
          : seedAppSnapshot.commercial.nextActions,
        requiredDocumentTypes: Array.isArray(source.commercial?.requiredDocumentTypes)
          ? source.commercial.requiredDocumentTypes
          : seedAppSnapshot.commercial.requiredDocumentTypes,
        minimumDocumentSet: {
          ...seedAppSnapshot.commercial.minimumDocumentSet,
          ...source.commercial?.minimumDocumentSet,
          requiredDocumentTypes: Array.isArray(
            source.commercial?.minimumDocumentSet?.requiredDocumentTypes,
          )
            ? source.commercial.minimumDocumentSet.requiredDocumentTypes
            : seedAppSnapshot.commercial.minimumDocumentSet.requiredDocumentTypes,
        },
      },
      vehicle: source.vehicle
        ? {
            ...source.vehicle,
            fuelType: source.vehicle.fuelType ?? 'Bekleniyor',
            equipment: Array.isArray(source.vehicle.equipment) ? source.vehicle.equipment : [],
            extraEquipment: source.vehicle.extraEquipment ?? '',
          }
        : undefined,
      settings: {
        ...seedAppSnapshot.settings,
        ...source.settings,
      },
      posts: Array.isArray(source.posts) ? source.posts : [],
      conversations: Array.isArray(source.conversations)
        ? source.conversations.map((conversation) => ({
            ...conversation,
            messages: Array.isArray(conversation.messages)
              ? conversation.messages.map((message) => ({
                  ...message,
                  attachments: Array.isArray(message.attachments) ? message.attachments : [],
                }))
              : [],
          }))
        : [],
      aiMessages: Array.isArray(source.aiMessages) ? source.aiMessages : seedAppSnapshot.aiMessages,
      profileSegment: source.profileSegment ?? seedAppSnapshot.profileSegment,
      directoryUsers: Array.isArray(source.directoryUsers) ? source.directoryUsers : [],
    }),
  );
}

function buildUserDirectory(snapshot: AppSnapshot) {
  const merged = [
    ...snapshot.directoryUsers,
    ...snapshot.posts
      .filter((post) => post.handle !== snapshot.profile.handle)
      .map<SearchResultUser>((post) => ({
        id: `post-author-${post.id}`,
        name: post.authorName,
        handle: post.handle,
        note: post.type === 'listing' ? 'İlan sahibi' : 'Paylaşım sahibi',
        avatarUri: post.authorAvatarUri,
      })),
    ...snapshot.conversations
      .filter((conversation) => conversation.type === 'direct')
      .map<SearchResultUser>((conversation) => ({
        id: `conversation-${conversation.id}`,
        name: conversation.name,
        handle: conversation.handle,
        note: conversation.lastMessage || 'Mesaj geçmişi var.',
        avatarUri: conversation.avatarUri,
      })),
  ];

  return repairTurkishText(
    merged
      .filter((user) => user.handle !== snapshot.profile.handle)
      .filter((user, index) => merged.findIndex((item) => item.handle === user.handle) === index),
  );
}

async function uploadRemoteMedia(token: string, media: ComposerPayload['selectedMedia']) {
  if (!media?.length) {
    return media;
  }

  const nextMedia = [];

  for (const item of media) {
    if (!item.uri || item.uri.startsWith('http://') || item.uri.startsWith('https://')) {
      nextMedia.push(item);
      continue;
    }

    const remoteUri = await platformApi.uploadMedia(token, item);
    nextMedia.push({
      ...item,
      uri: remoteUri,
    });
  }

  return nextMedia;
}

async function uploadProfileAsset(token: string, uri: string, label: string) {
  if (!uri || uri.startsWith('http://') || uri.startsWith('https://')) {
    return uri;
  }

  return platformApi.uploadMedia(token, {
    kind: 'image',
    uri,
    label,
    hint: label,
  });
}

async function uploadMessageAttachments(token: string, attachments?: MessageAttachment[]) {
  if (!attachments?.length) {
    return [];
  }

  const nextAttachments: MessageAttachment[] = [];
  for (const attachment of attachments) {
    if (
      (attachment.kind === 'image' ||
        attachment.kind === 'video' ||
        attachment.kind === 'audio') &&
      attachment.uri &&
      !attachment.uri.startsWith('http://') &&
      !attachment.uri.startsWith('https://')
    ) {
      const remoteUri = await platformApi.uploadMedia(token, {
        kind: attachment.kind,
        uri: attachment.uri,
        label: attachment.label,
        hint: attachment.label,
        mimeType: attachment.mimeType,
      });
      nextAttachments.push({
        ...attachment,
        uri: remoteUri,
      });
      continue;
    }

    nextAttachments.push(attachment);
  }

  return nextAttachments;
}

function reducer(state: AppSnapshot, action: AppAction): AppSnapshot {
  switch (action.type) {
    case 'hydrate':
      return normalizeSnapshot(action.payload);
    case 'logout_account':
      return {
        ...state,
        auth: {
          ...state.auth,
          isAuthenticated: false,
          sessionToken: undefined,
        },
      };
    case 'start_conversation':
      return {
        ...state,
        conversations: [action.payload, ...state.conversations],
      };
    case 'mark_conversation_read':
      return {
        ...state,
        conversations: state.conversations.map((conversation) =>
          conversation.id === action.payload.conversationId
            ? { ...conversation, unread: 0 }
            : conversation,
        ),
      };
    case 'send_message': {
      const updated = state.conversations.map((conversation) => {
        if (conversation.id !== action.payload.conversationId) {
          return conversation;
        }

        const nextMessage: ConversationMessage = {
          id: `message-${Date.now()}`,
          senderHandle: state.profile.handle,
          senderName: state.profile.name,
          text: action.payload.text,
          time: nowLabel(),
          isMine: true,
          attachments: action.payload.attachments ?? [],
        };

        const lastMessagePreview =
          action.payload.text.trim() || action.payload.attachments?.[0]?.label || '';

        return {
          ...conversation,
          unread: 0,
          lastMessage: lastMessagePreview,
          lastSeen: nowLabel(),
          messages: [...conversation.messages, nextMessage],
        };
      });

      const activeConversation = updated.find(
        (conversation) => conversation.id === action.payload.conversationId,
      );

      if (!activeConversation) {
        return state;
      }

      return {
        ...state,
        conversations: [
          activeConversation,
          ...updated.filter((conversation) => conversation.id !== action.payload.conversationId),
        ],
      };
    }
    case 'append_ai_message':
      return {
        ...state,
        aiMessages: [...state.aiMessages, action.payload],
      };
    case 'set_profile_segment':
      return {
        ...state,
        profileSegment: action.payload,
      };
    case 'toggle_like':
      return {
        ...state,
        posts: state.posts.map((post) => {
          if (post.id !== action.payload.postId) {
            return post;
          }

          const liked = Boolean(post.likedByUser);
          return {
            ...post,
            likedByUser: !liked,
            likes: liked ? Math.max(0, post.likes - 1) : post.likes + 1,
          };
        }),
      };
    case 'toggle_save':
      return {
        ...state,
        posts: state.posts.map((post) => {
          if (post.id !== action.payload.postId) {
            return post;
          }

          const saved = Boolean(post.savedByUser);
          return {
            ...post,
            savedByUser: !saved,
            listing: post.listing
              ? {
                  ...post.listing,
                  stats: {
                    ...post.listing.stats,
                    saves: saved
                      ? Math.max(0, post.listing.stats.saves - 1)
                      : post.listing.stats.saves + 1,
                  },
                }
              : post.listing,
          };
        }),
      };
    case 'toggle_repost':
      return {
        ...state,
        posts: state.posts.map((post) =>
          post.id === action.payload.postId
            ? {
                ...post,
                repostedByUser: !post.repostedByUser,
                reposts: post.repostedByUser ? Math.max(0, post.reposts - 1) : post.reposts + 1,
              }
            : post,
        ),
      };
    case 'add_comment':
      return {
        ...state,
        posts: state.posts.map((post) =>
          post.id === action.payload.postId
            ? {
                ...post,
                comments: post.comments + 1,
                commentList: [...post.commentList, action.payload.comment],
              }
            : post,
        ),
      };
    case 'update_profile_photo':
      return {
        ...state,
        profile: {
          ...state.profile,
          avatarUri: action.payload.avatarUri,
        },
      };
    case 'update_cover_photo':
      return {
        ...state,
        profile: {
          ...state.profile,
          coverUri: action.payload.coverUri,
        },
      };
    case 'update_settings':
      return {
        ...state,
        auth: {
          ...state.auth,
          email: action.payload.email?.trim() ?? state.auth.email,
          phone: action.payload.phone?.trim() ?? state.auth.phone,
        },
        settings: {
          ...state.settings,
          ...action.payload,
        },
      };
    case 'toggle_follow': {
      const isFollowing = state.profile.followingHandles.includes(action.payload.handle);
      const followingHandles = isFollowing
        ? state.profile.followingHandles.filter((handle) => handle !== action.payload.handle)
        : [...state.profile.followingHandles, action.payload.handle];

      return {
        ...state,
        profile: {
          ...state.profile,
          followingHandles,
          following: followingHandles.length,
        },
      };
    }
    case 'track_listing':
      return {
        ...state,
        posts: state.posts.map((post) => {
          if (post.id !== action.payload.postId) {
            return post;
          }

          const views = action.payload.kind === 'view' ? post.views + 1 : post.views;
          const shares = action.payload.kind === 'share' ? post.shares + 1 : post.shares;

          return {
            ...post,
            views,
            shares,
            listing: post.listing
              ? {
                  ...post.listing,
                  stats: {
                    views: post.listing.stats.views + (action.payload.kind === 'view' ? 1 : 0),
                    saves: post.listing.stats.saves,
                    shares: post.listing.stats.shares + (action.payload.kind === 'share' ? 1 : 0),
                    messages:
                      post.listing.stats.messages + (action.payload.kind === 'message' ? 1 : 0),
                    calls: post.listing.stats.calls + (action.payload.kind === 'call' ? 1 : 0),
                  },
                }
              : post.listing,
          };
        }),
      };
    default:
      return state;
  }
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [snapshot, dispatch] = useReducer(reducer, seedAppSnapshot, normalizeSnapshot);
  const [isHydrated, setIsHydrated] = useState(false);
  const [quickLoginLabel, setQuickLoginLabel] = useState('');
  const [quickLoginAvailable, setQuickLoginAvailable] = useState(false);
  const users = useMemo(() => buildUserDirectory(snapshot), [snapshot]);
  const sessionToken = snapshot.auth.sessionToken;

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        if (appConfig.legacyStorageKeys.length) {
          await AsyncStorage.multiRemove([...appConfig.legacyStorageKeys]);
        }

        const raw = await AsyncStorage.getItem(appConfig.storageKey);
        if (raw && !cancelled) {
          const parsed = JSON.parse(raw) as Partial<AppSnapshot>;
          dispatch({ type: 'hydrate', payload: normalizeSnapshot(parsed) });
        }
      } catch {
        await AsyncStorage.removeItem(appConfig.storageKey).catch(() => undefined);
      } finally {
        if (!cancelled) {
          setIsHydrated(true);
        }
      }
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    AsyncStorage.setItem(appConfig.storageKey, JSON.stringify(stripTransientMedia(snapshot))).catch(
      () => undefined,
    );
  }, [isHydrated, snapshot]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    void getQuickLoginPayload().then((payload) => {
      setQuickLoginAvailable(Boolean(payload?.token));
      setQuickLoginLabel(payload?.displayName || payload?.email || payload?.phone || '');
    });
  }, [isHydrated]);

  useEffect(() => {
    if (!isHydrated || !sessionToken) {
      return;
    }

    let cancelled = false;

    const bootstrapRemote = async () => {
      try {
        const response = await platformApi.bootstrap(sessionToken);
        if (!cancelled && response.snapshot) {
          dispatch({ type: 'hydrate', payload: response.snapshot });
        }
      } catch {
        if (!cancelled) {
          dispatch({
            type: 'hydrate',
            payload: {
              ...snapshot,
              auth: {
                ...snapshot.auth,
                isAuthenticated: false,
                sessionToken: undefined,
              },
            },
          });
        }
      }
    };

    void bootstrapRemote();

    return () => {
      cancelled = true;
    };
  }, [isHydrated, sessionToken]);

  useEffect(() => {
    if (!isHydrated || !snapshot.auth.isAuthenticated || !snapshot.auth.sessionToken) {
      return;
    }

    if (!snapshot.settings.quickLoginEnabled) {
      void clearQuickLoginPayload();
      setQuickLoginAvailable(false);
      setQuickLoginLabel('');
      return;
    }

    const payload = {
      token: snapshot.auth.sessionToken,
      email: snapshot.auth.email,
      phone: snapshot.auth.phone,
      displayName: snapshot.profile.name,
      biometricLock: snapshot.settings.biometricLock,
    };

    void saveQuickLoginPayload(payload).then(() => {
      setQuickLoginAvailable(true);
      setQuickLoginLabel(payload.displayName || payload.email || payload.phone || '');
    });
  }, [
    isHydrated,
    snapshot.auth.email,
    snapshot.auth.isAuthenticated,
    snapshot.auth.phone,
    snapshot.auth.sessionToken,
    snapshot.profile.name,
    snapshot.settings.biometricLock,
    snapshot.settings.quickLoginEnabled,
  ]);

  const replaceSnapshot = (payload: AppSnapshot) => {
    dispatch({ type: 'hydrate', payload });
  };

  const syncRemoteSnapshot = (task: Promise<{ snapshot?: AppSnapshot }>) => {
    void task
      .then((response) => {
        if (response.snapshot) {
          replaceSnapshot(response.snapshot);
        }
      })
      .catch(() => undefined);
  };

  const value = useMemo<AppStoreValue>(
    () => ({
      isHydrated,
      snapshot,
      users,
      quickLoginAvailable,
      quickLoginLabel,
      startVerification: async (payload) => {
        try {
          const response = await platformApi.startVerification(payload);
          return {
            success: true,
            message: response.message,
            verificationId: response.verificationId,
            expiresAt: response.expiresAt,
            maskedDestination: response.maskedDestination,
            verificationChannel: response.verificationChannel,
            emailDisabled: response.emailDisabled,
            emailNotConfigured: response.emailNotConfigured,
            smsDisabled: response.smsDisabled,
            smsNotConfigured: response.smsNotConfigured,
          };
        } catch (error) {
          return {
            success: false,
            message: error instanceof Error ? error.message : 'Doğrulama kodu gönderilemedi.',
          };
        }
      },
      registerAccount: async (payload) => {
        const name = payload.name.trim();
        const handle = payload.handle.trim();
        const password = payload.password.trim();
        const email = payload.email.trim();
        const phone = payload.phone?.trim() || '';
        const primaryChannel = payload.primaryChannel === 'phone' ? 'phone' : 'email';

        if (!name || !handle || !password || (!email && !phone)) {
          return {
            success: false,
            message: 'Ad, kullanici adi, sifre ve en az bir iletisim alani zorunludur.',
          };
        }

        if (primaryChannel === 'email' && !email) {
          return {
            success: false,
            message: 'E-posta ile kayit icin gecerli bir e-posta adresi gereklidir.',
          };
        }

        if (primaryChannel === 'phone' && !phone) {
          return {
            success: false,
            message: 'Telefon ile kayit icin gecerli bir telefon numarasi gereklidir.',
          };
        }

        if (password.length < 8) {
          return {
            success: false,
            message: 'Sifre en az 8 karakter olmalidir.',
          };
        }

        try {
          const response = await platformApi.register({
            ...payload,
            name,
            handle,
            email,
            phone,
            password,
            bio: payload.bio.trim(),
          });

          if (response.snapshot) {
            replaceSnapshot(response.snapshot);
          }

          return {
            success: true,
            message: response.message || 'Uyelik olusturuldu.',
            email: response.email,
            phone: response.phone,
            expiresAt: response.expiresAt,
            maskedDestination: response.maskedDestination,
            verificationChannel: response.verificationChannel,
            deliveryFailed: response.deliveryFailed,
            emailDisabled: response.emailDisabled,
            emailNotConfigured: response.emailNotConfigured,
            smsDisabled: response.smsDisabled,
            smsNotConfigured: response.smsNotConfigured,
          };
        } catch (error) {
          return {
            success: false,
            message: error instanceof Error ? error.message : 'Uyelik olusturulamadi.',
          };
        }
      },
      verifyEmailCode: async (payload) => {
        const email = payload.email.trim();
        const code = payload.code.trim();
        if (!email || !code) {
          return {
            success: false,
            message: 'E-posta ve doğrulama kodu zorunludur.',
          };
        }

        try {
          const response = await platformApi.verifyEmail({ email, code });
          if (response.snapshot) {
            replaceSnapshot(response.snapshot);
          }

          return {
            success: true,
            message: response.message || 'E-posta doğrulandı.',
          };
        } catch (error) {
          return {
            success: false,
            message: error instanceof Error ? error.message : 'E-posta doğrulanamadı.',
          };
        }
      },
      resendEmailCode: async (payload) => {
        const email = payload.email.trim();
        if (!email) {
          return {
            success: false,
            message: 'Geçerli bir e-posta girin.',
          };
        }

        try {
          const response = await platformApi.resendCode({ email });
          return {
            success: true,
            message: response.message || 'Doğrulama kodu yeniden gönderildi.',
            email: response.email,
            expiresAt: response.expiresAt,
            maskedDestination: response.maskedDestination,
            emailDisabled: response.emailDisabled,
            emailNotConfigured: response.emailNotConfigured,
          };
        } catch (error) {
          return {
            success: false,
            message: error instanceof Error ? error.message : 'Kod yeniden gönderilemedi.',
          };
        }
      },
      loginAccount: async (payload) => {
        if (!payload.identifier.trim() || !payload.password.trim()) {
          return {
            success: false,
            message: 'E-posta veya telefon ile şifre alanları zorunludur.',
          };
        }

        try {
          const response = await platformApi.login({
            identifier: payload.identifier.trim(),
            password: payload.password.trim(),
          });

          if (response.snapshot) {
            replaceSnapshot(response.snapshot);
          }

          return { success: true, message: 'Giriş yapıldı.' };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Giriş yapılamadı.';
          return {
            success: false,
            message,
            email:
              message.includes('henüz doğrulanmadı') && payload.identifier.includes('@')
                ? payload.identifier.trim()
                : undefined,
            requiresVerification: message.includes('henüz doğrulanmadı'),
          };
        }
      },
      socialAuthAccount: async (payload) => {
        try {
          const response = await platformApi.socialAuth(payload);
          if (response.snapshot) {
            replaceSnapshot(response.snapshot);
          }

          return {
            success: true,
            message:
              response.message ||
              (payload.provider === 'apple'
                ? 'iCloud hesabı ile giriş yapıldı.'
                : 'Google hesabı ile giriş yapıldı.'),
          };
        } catch (error) {
          return {
            success: false,
            message: error instanceof Error ? error.message : 'Sosyal giriş tamamlanamadı.',
          };
        }
      },
      quickLoginAccount: async () => {
        try {
          const payload = await getQuickLoginPayload();
          if (!payload?.token) {
            return {
              success: false,
              message: 'Bu cihazda hızlı giriş için kayıtlı bir oturum bulunamadı.',
            };
          }

          const allowed = await runQuickLoginSecurityCheck(Boolean(payload.biometricLock));
          if (!allowed) {
            return {
              success: false,
              message: 'Biyometrik doğrulama tamamlanamadı.',
            };
          }

          const response = await platformApi.bootstrap(payload.token);
          if (response.snapshot) {
            replaceSnapshot(response.snapshot);
            return {
              success: true,
              message: 'Hızlı giriş başarılı.',
            };
          }

          return {
            success: false,
            message: 'Hızlı giriş sırasında oturum geri yüklenemedi.',
          };
        } catch (error) {
          await clearQuickLoginPayload().catch(() => undefined);
          setQuickLoginAvailable(false);
          setQuickLoginLabel('');
          return {
            success: false,
            message: error instanceof Error ? error.message : 'Hızlı giriş yapılamadı.',
          };
        }
      },
      logoutAccount: () => {
        const shouldKeepQuickLogin = snapshot.settings.quickLoginEnabled;
        if (sessionToken && !shouldKeepQuickLogin) {
          void platformApi.logout(sessionToken).catch(() => undefined);
        }
        if (!shouldKeepQuickLogin) {
          void clearQuickLoginPayload().catch(() => undefined);
          setQuickLoginAvailable(false);
          setQuickLoginLabel('');
        }
        dispatch({ type: 'logout_account' });
      },
      replaceSnapshot,
      createOrUpdatePost: async (payload) => {
        if (!sessionToken) {
          throw new Error('Oturum bulunamadı.');
        }

        const uploadedMedia = await uploadRemoteMedia(sessionToken, payload.selectedMedia);
        const response = await platformApi.createOrUpdatePost(sessionToken, {
          ...payload,
          selectedMedia: uploadedMedia,
        });

        if (response.snapshot) {
          replaceSnapshot(response.snapshot);
        }

          return {
            message: response.message,
            url: response.url,
            listingFlow: response.listingFlow,
          };
        },
      deletePost: (postId) => {
        if (sessionToken) {
          syncRemoteSnapshot(platformApi.deletePost(sessionToken, postId));
        }
      },
      toggleListingSold: (postId, isSold) => {
        if (sessionToken) {
          syncRemoteSnapshot(platformApi.setListingSoldStatus(sessionToken, postId, isSold));
        }
      },
      saveOnboarding: (payload) => {
        if (!sessionToken) {
          return;
        }

        void (async () => {
          const nextProfile = { ...payload.profile };

          if (nextProfile.avatarUri) {
            nextProfile.avatarUri = await uploadProfileAsset(
              sessionToken,
              nextProfile.avatarUri,
              'Profil fotoğrafı',
            );
          }

          if (nextProfile.coverUri) {
            nextProfile.coverUri = await uploadProfileAsset(
              sessionToken,
              nextProfile.coverUri,
              'Kapak fotoğrafı',
            );
          }

          const response = await platformApi.saveOnboarding(sessionToken, {
            ...payload,
            profile: nextProfile,
          });

          if (response.snapshot) {
            replaceSnapshot(response.snapshot);
          }
        })().catch(() => undefined);
      },
      ensureConversation: async (user) => {
        const existingConversation = snapshot.conversations.find(
          (conversation) => conversation.type === 'direct' && conversation.handle === user.handle,
        );

        if (existingConversation) {
          dispatch({
            type: 'mark_conversation_read',
            payload: { conversationId: existingConversation.id },
          });
          return existingConversation.id;
        }

        if (!sessionToken) {
          throw new Error('Oturum bulunamadı. Lütfen yeniden giriş yapın.');
        }

        const response = await platformApi.ensureConversation(sessionToken, user.handle);
        if (!response.snapshot) {
          throw new Error('Sohbet sunucudan alınamadı.');
        }

        replaceSnapshot(response.snapshot);
        const conversationId = response.snapshot.conversations.find(
          (conversation) => conversation.type === 'direct' && conversation.handle === user.handle,
        )?.id;

        if (!conversationId) {
          throw new Error('Sohbet kaydı oluşturulamadı.');
        }

        return conversationId;
      },
      ensureListingConversation: async (postId) => {
        const existingConversation = snapshot.conversations.find(
          (conversation) =>
            conversation.type === 'listing' && conversation.listingContext?.postId === postId,
        );

        if (existingConversation) {
          dispatch({
            type: 'mark_conversation_read',
            payload: { conversationId: existingConversation.id },
          });
          return existingConversation.id;
        }

        if (!sessionToken) {
          throw new Error('Oturum bulunamadı. Lütfen yeniden giriş yapın.');
        }

        const response = await platformApi.ensureListingConversation(sessionToken, postId);
        if (!response.snapshot) {
          throw new Error('İlan sohbeti sunucudan alınamadı.');
        }

        replaceSnapshot(response.snapshot);
        const conversationId = response.snapshot.conversations.find(
          (conversation) =>
            conversation.type === 'listing' && conversation.listingContext?.postId === postId,
        )?.id;

        if (!conversationId) {
          throw new Error('İlan sohbeti oluşturulamadı.');
        }

        return conversationId;
      },
      shareListingRegistration: async (conversationId) => {
        if (!sessionToken) {
          throw new Error('Oturum bulunamadı. Lütfen yeniden giriş yapın.');
        }

        const response = await platformApi.shareListingRegistration(sessionToken, conversationId);
        if (response.snapshot) {
          replaceSnapshot(response.snapshot);
        }
      },
      createInsurancePayment: async (conversationId) => {
        if (!sessionToken) {
          throw new Error('Oturum bulunamadı. Lütfen yeniden giriş yapın.');
        }

        const response = await platformApi.createInsurancePayment(sessionToken, conversationId);
        if (response.snapshot) {
          replaceSnapshot(response.snapshot);
        }

        return response.payment || null;
      },
      startSaleProcess: async (listingId) => {
        if (!sessionToken) {
          throw new Error('Oturum bulunamadı. Lütfen yeniden giriş yapın.');
        }

        await platformApi.startSaleProcess(sessionToken, listingId);
        const bootstrap = await platformApi.bootstrap(sessionToken);
        if (bootstrap.snapshot) {
          replaceSnapshot(bootstrap.snapshot);
        }
      },
      acknowledgeSafePayment: async (listingId) => {
        if (!sessionToken) {
          throw new Error('Oturum bulunamadı. Lütfen yeniden giriş yapın.');
        }

        await platformApi.acknowledgeSafePayment(sessionToken, listingId, [
          {
            type: 'safe_payment_information',
            accepted: true,
            version: '2026-04',
            sourceScreen: 'messages_safe_payment',
          },
        ]);
        const bootstrap = await platformApi.bootstrap(sessionToken);
        if (bootstrap.snapshot) {
          replaceSnapshot(bootstrap.snapshot);
        }
      },
      markSaleReadyForNotary: async (listingId) => {
        if (!sessionToken) {
          throw new Error('Oturum bulunamadı. Lütfen yeniden giriş yapın.');
        }

        await platformApi.markSaleReadyForNotary(sessionToken, listingId);
        const bootstrap = await platformApi.bootstrap(sessionToken);
        if (bootstrap.snapshot) {
          replaceSnapshot(bootstrap.snapshot);
        }
      },
      completeSaleProcess: async (listingId) => {
        if (!sessionToken) {
          throw new Error('Oturum bulunamadı. Lütfen yeniden giriş yapın.');
        }

        await platformApi.completeSaleProcess(sessionToken, listingId);
        const bootstrap = await platformApi.bootstrap(sessionToken);
        if (bootstrap.snapshot) {
          replaceSnapshot(bootstrap.snapshot);
        }
      },
      createGroupConversation: async (groupUsers, name) => {
        if (!sessionToken) {
          throw new Error('Oturum bulunamadı. Lütfen yeniden giriş yapın.');
        }

        const groupName = name.trim() || 'Yeni grup';
        const response = await platformApi.createGroupConversation(
          sessionToken,
          groupUsers.map((user) => user.handle),
          groupName,
        );
        if (!response.snapshot) {
          throw new Error('Grup sohbeti sunucudan alınamadı.');
        }

        replaceSnapshot(response.snapshot);
        const conversationId = response.snapshot.conversations.find(
          (conversation) => conversation.type === 'group' && conversation.name === groupName,
        )?.id;

        if (!conversationId) {
          throw new Error('Grup sohbeti oluşturulamadı.');
        }

        return conversationId;
      },
      markConversationRead: (conversationId) =>
        dispatch({ type: 'mark_conversation_read', payload: { conversationId } }),
      sendConversationMessage: (conversationId, payload) => {
        dispatch({
          type: 'send_message',
          payload: {
            conversationId,
            text: payload.text,
            attachments: payload.attachments,
          },
        });
        if (sessionToken) {
          void (async () => {
            const uploadedAttachments = await uploadMessageAttachments(
              sessionToken,
              payload.attachments,
            );
            syncRemoteSnapshot(
              platformApi.sendConversationMessage(sessionToken, conversationId, {
                text: payload.text,
                attachments: uploadedAttachments,
              }),
            );
          })().catch(() => undefined);
        }
      },
      appendAIMessage: (message) => dispatch({ type: 'append_ai_message', payload: message }),
      setProfileSegment: (segment) => dispatch({ type: 'set_profile_segment', payload: segment }),
      toggleLike: (postId) => {
        dispatch({ type: 'toggle_like', payload: { postId } });
        if (sessionToken) {
          syncRemoteSnapshot(platformApi.toggleLike(sessionToken, postId));
        }
      },
      toggleSave: (postId) => {
        dispatch({ type: 'toggle_save', payload: { postId } });
        if (sessionToken) {
          syncRemoteSnapshot(platformApi.toggleSave(sessionToken, postId));
        }
      },
      toggleRepost: (postId) => {
        dispatch({ type: 'toggle_repost', payload: { postId } });
        if (sessionToken) {
          syncRemoteSnapshot(platformApi.toggleRepost(sessionToken, postId));
        }
      },
      addComment: (postId, content) => {
        dispatch({
          type: 'add_comment',
          payload: {
            postId,
            comment: {
              id: `comment-${Date.now()}`,
              authorName: snapshot.profile.name,
              handle: snapshot.profile.handle,
              authorAvatarUri: snapshot.profile.avatarUri,
              content,
              time: nowLabel(),
            },
          },
        });
        if (sessionToken) {
          syncRemoteSnapshot(platformApi.addComment(sessionToken, postId, content));
        }
      },
      updateProfilePhoto: (avatarUri) => {
        dispatch({ type: 'update_profile_photo', payload: { avatarUri } });
        if (!sessionToken) {
          return;
        }

        void (async () => {
          const remoteUri = await uploadProfileAsset(sessionToken, avatarUri, 'Profil fotoğrafı');
          const response = await platformApi.updateProfileMedia(sessionToken, { avatarUri: remoteUri });
          if (response.snapshot) {
            replaceSnapshot(response.snapshot);
          }
        })().catch(() => undefined);
      },
      updateCoverPhoto: (coverUri) => {
        dispatch({ type: 'update_cover_photo', payload: { coverUri } });
        if (!sessionToken) {
          return;
        }

        void (async () => {
          const remoteUri = await uploadProfileAsset(sessionToken, coverUri, 'Kapak fotoğrafı');
          const response = await platformApi.updateProfileMedia(sessionToken, { coverUri: remoteUri });
          if (response.snapshot) {
            replaceSnapshot(response.snapshot);
          }
        })().catch(() => undefined);
      },
      updateSettings: (payload) => {
        dispatch({ type: 'update_settings', payload });
        if (sessionToken) {
          syncRemoteSnapshot(platformApi.updateSettings(sessionToken, payload));
        }
      },
      toggleFollow: (handle) => {
        dispatch({ type: 'toggle_follow', payload: { handle } });
        if (sessionToken) {
          syncRemoteSnapshot(platformApi.toggleFollow(sessionToken, handle));
        }
      },
      toggleListingAgreement: (conversationId) => {
        if (sessionToken) {
          syncRemoteSnapshot(platformApi.toggleListingAgreement(sessionToken, conversationId));
        }
      },
      trackListing: (postId, kind) => {
        dispatch({ type: 'track_listing', payload: { postId, kind } });
        if (sessionToken) {
          syncRemoteSnapshot(platformApi.trackListing(sessionToken, postId, kind));
        }
      },
    }),
    [isHydrated, quickLoginAvailable, quickLoginLabel, sessionToken, snapshot, users],
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const context = useContext(AppStoreContext);

  if (!context) {
    throw new Error('useAppStore must be used within AppStoreProvider.');
  }

  return context;
}

