import { Feather } from '@expo/vector-icons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { appFeatureFlags } from '../config/featureFlags';
import { getLocale } from '../i18n';
import { getCurrentResolvedLocation } from '../services/location';
import { pickComposerMedia } from '../services/mediaPicker';
import { theme } from '../theme';
import { AppLanguage, Conversation, MessageAttachment, SearchResultUser } from '../types';

interface MessagesScreenProps {
  language: AppLanguage;
  conversations: Conversation[];
  users: SearchResultUser[];
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onBackToList: () => void;
  onSendMessage: (id: string, payload: { text: string; attachments?: MessageAttachment[] }) => void;
  onEditMessage: (conversationId: string, messageId: string, text: string) => Promise<void> | void;
  onDeleteMessage: (
    conversationId: string,
    messageId: string,
    scope: 'self' | 'everyone',
  ) => Promise<void> | void;
  onStartConversation: (user: SearchResultUser) => Promise<void>;
  onCreateGroup: (users: SearchResultUser[], name: string) => Promise<void>;
  onToggleListingAgreement?: (conversationId: string) => void;
  onShareListingRegistration?: (conversationId: string) => void;
  onCreateInsurancePayment?: (conversationId: string) => void;
  onStartSaleProcess?: (listingId: string) => Promise<void> | void;
  onAcknowledgeSafePayment?: (listingId: string) => Promise<void> | void;
  onMarkSaleReadyForNotary?: (listingId: string) => Promise<void> | void;
  onCompleteSaleProcess?: (listingId: string) => Promise<void> | void;
}

function AudioAttachmentPreview({ attachment }: { attachment: MessageAttachment }) {
  const player = useAudioPlayer(attachment.uri ? { uri: attachment.uri } : null);
  const status = useAudioPlayerStatus(player);

  return (
    <Pressable
      onPress={() => {
        if (status.playing) {
          player.pause();
        } else {
          player.play();
        }
      }}
      style={styles.audioBox}
    >
      <View style={styles.audioIcon}>
        <Feather
          color={theme.colors.card}
          name={status.playing ? 'pause' : 'play'}
          size={14}
        />
      </View>
      <View style={styles.audioCopy}>
        <Text style={styles.audioTitle}>{attachment.label}</Text>
        <Text style={styles.audioMeta}>
          {attachment.durationMs ? `${Math.max(1, Math.round(attachment.durationMs / 1000))} sn` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

function AttachmentPreview({ attachment }: { attachment: MessageAttachment }) {
  if (attachment.kind === 'image' && attachment.uri) {
    return <Image source={{ uri: attachment.uri }} style={styles.attachmentImage} />;
  }

  if (attachment.kind === 'video') {
    return (
      <View style={styles.attachmentBox}>
        <Feather color={theme.colors.primary} name="film" size={18} />
        <Text style={styles.attachmentText}>{attachment.label}</Text>
      </View>
    );
  }

  if (attachment.kind === 'location') {
    return (
      <View style={styles.attachmentBox}>
        <Feather color={theme.colors.primary} name="map-pin" size={18} />
        <Text style={styles.attachmentText}>{attachment.locationLine || attachment.label}</Text>
      </View>
    );
  }

  if (attachment.kind === 'audio') {
    return <AudioAttachmentPreview attachment={attachment} />;
  }

  if (attachment.kind === 'report') {
    const canOpen = Boolean(attachment.uri);

    return (
      <Pressable
        disabled={!canOpen}
        onPress={() => {
          if (!attachment.uri) {
            return;
          }

          void Linking.openURL(attachment.uri).catch(() => {
            Alert.alert('Dosya acilamadi', 'Belge baglantisi su anda acilamiyor.');
          });
        }}
        style={[styles.reportAttachmentBox, !canOpen && styles.salePrimaryButtonDisabled]}
      >
        <View style={styles.reportAttachmentCopy}>
          <Text style={styles.reportAttachmentTitle}>{attachment.label}</Text>
          <Text style={styles.reportAttachmentMeta}>
            {attachment.mimeType || 'application/pdf'}
          </Text>
        </View>
        <View style={styles.reportAttachmentAction}>
          <Text style={styles.reportAttachmentActionText}>Ac</Text>
        </View>
      </Pressable>
    );
  }

  return null;
}

export function MessagesScreen({
  language,
  conversations,
  users,
  selectedConversationId,
  onSelectConversation,
  onBackToList,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onStartConversation,
  onCreateGroup,
  onToggleListingAgreement,
  onShareListingRegistration,
  onCreateInsurancePayment,
  onStartSaleProcess,
  onAcknowledgeSafePayment,
  onMarkSaleReadyForNotary,
  onCompleteSaleProcess,
}: MessagesScreenProps) {
  const locale = getLocale(language);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 200);
  const [draft, setDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupMode, setGroupMode] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedHandles, setSelectedHandles] = useState<string[]>([]);
  const [pendingAttachments, setPendingAttachments] = useState<MessageAttachment[]>([]);
  const [composerError, setComposerError] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [showSafePaymentInfo, setShowSafePaymentInfo] = useState(false);
  const [saleActionKey, setSaleActionKey] = useState<string | null>(null);

  const activeConversation = useMemo(
    () =>
      selectedConversationId
        ? conversations.find((conversation) => conversation.id === selectedConversationId) ?? null
        : null,
    [conversations, selectedConversationId],
  );

  useEffect(() => {
    if (!editingMessageId || !activeConversation) {
      return;
    }

    const stillExists = activeConversation.messages.some((message) => message.id === editingMessageId);
    if (!stillExists) {
      setEditingMessageId(null);
      setDraft('');
      setPendingAttachments([]);
    }
  }, [activeConversation, editingMessageId]);

  useEffect(() => {
    setShowSafePaymentInfo(false);
    setSaleActionKey(null);
  }, [activeConversation?.id]);

  const normalizedQuery = searchQuery.trim().toLocaleLowerCase('tr');

  const filteredConversations = useMemo(() => {
    if (!normalizedQuery) {
      return conversations;
    }

    return conversations.filter((conversation) => {
      const haystack = `${conversation.name} ${conversation.handle} ${conversation.lastMessage}`
        .toLocaleLowerCase('tr');
      return haystack.includes(normalizedQuery);
    });
  }, [conversations, normalizedQuery]);

  const filteredUsers = useMemo(() => {
    const uniqueUsers = users.filter(
      (user, index) => users.findIndex((item) => item.handle === user.handle) === index,
    );

    if (!normalizedQuery) {
      return uniqueUsers;
    }

    return uniqueUsers.filter((user) => {
      const haystack = `${user.name} ${user.handle} ${user.note}`.toLocaleLowerCase('tr');
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery, users]);

  const send = () => {
    if (!activeConversation || (!draft.trim() && !pendingAttachments.length)) {
      return;
    }

    if (editingMessageId) {
      void onEditMessage(activeConversation.id, editingMessageId, draft.trim());
      setEditingMessageId(null);
      setDraft('');
      setPendingAttachments([]);
      setComposerError('');
      return;
    }

    onSendMessage(activeConversation.id, {
      text: draft.trim(),
      attachments: pendingAttachments,
    });
    setDraft('');
    setPendingAttachments([]);
    setComposerError('');
  };

  const toggleGroupUser = (user: SearchResultUser) => {
    setSelectedHandles((current) =>
      current.includes(user.handle)
        ? current.filter((item) => item !== user.handle)
        : [...current, user.handle],
    );
  };

  const createGroup = () => {
    const selectedUsers = filteredUsers.filter((user) => selectedHandles.includes(user.handle));
    if (selectedUsers.length < 2) {
      return;
    }

    void onCreateGroup(selectedUsers, groupName.trim());
    setGroupMode(false);
    setGroupName('');
    setSelectedHandles([]);
  };

  const handleMessageLongPress = (message: Conversation['messages'][number]) => {
    if (!activeConversation) {
      return;
    }

    const actions = [];
    if (message.isMine && message.canEdit && !message.attachments?.length) {
      actions.push({
        text: language === 'en' ? 'Edit' : 'Düzenle',
        onPress: () => {
          setDraft(message.text);
          setEditingMessageId(message.id);
          setPendingAttachments([]);
        },
      });
    }

    actions.push({
      text: language === 'en' ? 'Delete for me' : 'Benden sil',
      style: 'destructive' as const,
      onPress: () => {
        void onDeleteMessage(activeConversation.id, message.id, 'self');
      },
    });

    if (message.isMine && message.canDeleteForEveryone) {
      actions.push({
        text: language === 'en' ? 'Delete for everyone' : 'Herkesten sil',
        style: 'destructive' as const,
        onPress: () => {
          void onDeleteMessage(activeConversation.id, message.id, 'everyone');
        },
      });
    }

    actions.push({
      text: language === 'en' ? 'Cancel' : 'Vazgeç',
      style: 'cancel' as const,
    });

    Alert.alert(
      language === 'en' ? 'Message actions' : 'Mesaj işlemleri',
      language === 'en'
        ? 'Choose what to do with this message.'
        : 'Bu mesaj için yapmak istediğin işlemi seç.',
      actions,
    );
  };

  const addAttachment = async (kind: 'image' | 'video') => {
    try {
      const pickedMedia = await pickComposerMedia(kind);
      if (!pickedMedia?.uri) {
        return;
      }

      setPendingAttachments((current) => [
        ...current,
        {
          id: `pending-${Date.now()}-${current.length}`,
          kind,
          label: pickedMedia.label,
          uri: pickedMedia.uri,
          mimeType: pickedMedia.mimeType,
        },
      ]);
      setComposerError('');
    } catch {
      setComposerError(kind === 'image' ? locale.messages.attachPhoto : locale.messages.attachVideo);
    }
  };

  const shareLocation = async () => {
    try {
      const location = await getCurrentResolvedLocation();
      setPendingAttachments((current) => [
        ...current,
        {
          id: `location-${Date.now()}`,
          kind: 'location',
          label: locale.messages.locationShared,
          latitude: location.latitude,
          longitude: location.longitude,
          city: location.city,
          district: location.district,
          locationLine: location.locationLine,
        },
      ]);
      setComposerError('');
    } catch (error) {
      setComposerError(error instanceof Error ? error.message : locale.messages.locationShared);
    }
  };

  const toggleVoiceRecording = async () => {
    try {
      if (recorderState.isRecording) {
        await recorder.stop();
        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          interruptionMode: 'duckOthers',
        });

        const status = recorder.getStatus();
        const uri = recorder.uri || status.url;
        if (!uri) {
          setComposerError(locale.messages.voiceComingSoon);
          return;
        }

        setPendingAttachments((current) => [
          ...current,
          {
            id: `audio-${Date.now()}`,
            kind: 'audio',
            label: locale.messages.voiceReady,
            uri,
            mimeType: 'audio/m4a',
            durationMs: status.durationMillis,
          },
        ]);
        setComposerError('');
        return;
      }

      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setComposerError(locale.messages.voiceComingSoon);
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: 'duckOthers',
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setComposerError('');
    } catch (error) {
      setComposerError(error instanceof Error ? error.message : locale.messages.voiceComingSoon);
    }
  };

  const runSaleAction = async (
    actionKey: string,
    handler: (() => Promise<void> | void) | undefined,
    fallbackError: string,
  ) => {
    if (!handler) {
      return;
    }

    try {
      setSaleActionKey(actionKey);
      await handler();
    } catch (error) {
      Alert.alert(
        language === 'en' ? 'Action failed' : 'İşlem tamamlanamadı',
        error instanceof Error ? error.message : fallbackError,
      );
    } finally {
      setSaleActionKey(null);
    }
  };

  if (activeConversation) {
    const isListingConversation = activeConversation.type === 'listing' && activeConversation.listingContext;
    const listingContext = activeConversation.listingContext;
    const agreement = activeConversation.agreement;
    const agreementLabel =
      agreement?.buyerAgreed && agreement?.sellerAgreed
        ? 'İki taraf da anlaştı. Satış evrak ve ödeme adımlarına geçebilirsiniz.'
        : agreement?.myAgreed
          ? 'Onayınız gönderildi. Karşı tarafın da onayı bekleniyor.'
          : 'Araç üzerinde anlaştığınızda iki tarafta da görünen "Anlaştık" butonunu kullanın.';
    const agreementButtonLabel = agreement?.myAgreed ? 'Anlaşmayı geri al' : 'Anlaştık';
    const insuranceStatus = activeConversation.insuranceStatus;
    const registrationEntries = Object.entries(insuranceStatus?.registrationInfo || {}).filter(
      ([, value]) => Boolean(value),
    );
    const saleProcess = activeConversation.saleProcess;
    const guidanceEnabled =
      saleProcess?.guidanceEnabled ?? appFeatureFlags.enableSafePaymentGuidance;
    const saleSteps = [
      { key: 'interest', label: 'Ilgi' },
      { key: 'negotiating', label: 'Muzakere' },
      { key: 'payment_guidance_shown', label: 'Bilgilendirme' },
      { key: 'ready_for_notary', label: 'Notere hazir' },
      { key: 'completed', label: 'Tamamlandi' },
    ] as const;
    const saleStepIndex = saleProcess
      ? Math.max(0, saleSteps.findIndex((step) => step.key === saleProcess.status))
      : -1;
    const saleStatusText =
      saleProcess?.status === 'completed'
        ? 'Satış süreci tamamlandı olarak işaretlendi. Resmi devir süreci noterde tamamlanmalıdır.'
        : saleProcess?.status === 'cancelled'
          ? 'Satis sureci iptal edildi. Yeni bir ilerleme gerekirse yeniden baslatilabilir.'
        : saleProcess?.status === 'ready_for_notary'
          ? 'Taraflar noter hazırlık aşamasına geçti. Platform resmi ödeme sağlayıcısı değildir.'
          : saleProcess?.status === 'payment_guidance_shown'
            ? 'Güvenli ödeme bilgilendirmesi gösterildi. Resmi güvenli ödeme süreci izlenmelidir.'
            : saleProcess?.status === 'negotiating'
              ? 'Müzakere sürüyor. Noter hazırlığı öncesi güvenli ödeme bilgisi onaylanmalıdır.'
              : saleProcess?.status === 'interest'
                ? 'İlgilenme aşaması başladı. Taraflar ilerleyince güvenli ödeme bilgilendirmesi gösterilir.'
                : 'Satış süreci henüz başlatılmadı.';
    const canShowReadyForNotary =
      saleProcess?.status !== undefined &&
      saleProcess.status !== 'cancelled' &&
      saleProcess.status !== 'ready_for_notary' &&
      saleProcess.status !== 'completed';
    const canCompleteSale = saleProcess?.status === 'ready_for_notary';
    const needsGuidanceAck = Boolean(
      saleProcess?.requiresGuidanceAcknowledgement && guidanceEnabled,
    );
    const canShareRegistration =
      agreement?.myRole === 'seller' &&
      agreement?.buyerAgreed &&
      agreement?.sellerAgreed &&
      !insuranceStatus?.registrationSharedAt;
    const canRequestInsurancePayment =
      agreement?.myRole === 'buyer' &&
      Boolean(insuranceStatus?.registrationSharedAt) &&
      insuranceStatus?.paymentStatus === 'quoted';
    const insuranceText =
      insuranceStatus?.paymentStatus === 'policy_sent'
        ? 'Poliçe gönderildi.'
        : insuranceStatus?.paymentStatus === 'processing'
          ? 'Ödeme alındı, sigorta kesim süreci başladı.'
          : insuranceStatus?.paymentStatus === 'payment_pending'
            ? 'Ödeme bağlantısı oluşturuldu.'
            : insuranceStatus?.paymentStatus === 'quoted'
              ? `Sigorta teklifi hazır: ${insuranceStatus.quoteAmount}`
              : insuranceStatus?.registrationSharedAt
                ? 'Ruhsat paylaşıldı. Admin teklif girişi bekleniyor.'
                : 'Henüz ruhsat paylaşılmadı.';

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        style={styles.threadScreen}
      >
        <View style={styles.threadHeader}>
          <Pressable onPress={onBackToList} style={styles.backButton}>
            <Feather color={theme.colors.text} name="arrow-left" size={18} />
          </Pressable>

          <View style={styles.threadIdentity}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{activeConversation.name.slice(0, 1)}</Text>
            </View>

            <View style={styles.threadCopy}>
              <Text style={styles.threadName}>{activeConversation.name}</Text>
              <Text style={styles.threadHandle}>
                {isListingConversation
                  ? 'İlan sohbeti'
                  : activeConversation.type === 'group'
                  ? locale.messages.groupParticipants(activeConversation.participantHandles.length)
                  : activeConversation.isOnline
                    ? locale.messages.activeNow
                    : activeConversation.handle}
              </Text>
            </View>
          </View>
        </View>

        {isListingConversation && listingContext ? (
          <View style={styles.listingThreadCard}>
            <View style={styles.listingThreadTop}>
              <View style={styles.listingBadge}>
                <Text style={styles.listingBadgeText}>İlan sohbeti</Text>
              </View>
              <Text style={styles.listingPrice}>{listingContext.price}</Text>
            </View>
            <Text style={styles.listingTitle}>{listingContext.title}</Text>
            <Text style={styles.listingMeta}>{listingContext.location}</Text>
            <Text style={styles.listingSummary}>{listingContext.summaryLine}</Text>
            {agreement ? (
              <View style={styles.agreementCard}>
                <View style={styles.agreementCopy}>
                  <Text style={styles.agreementTitle}>Anlaşma durumu</Text>
                  <Text style={styles.agreementText}>{agreementLabel}</Text>
                  <Text style={styles.agreementMeta}>
                    Alıcı: {agreement.buyerAgreed ? 'Onayladı' : 'Bekliyor'} • Satıcı:{' '}
                    {agreement.sellerAgreed ? 'Onayladı' : 'Bekliyor'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => onToggleListingAgreement?.(activeConversation.id)}
                  style={[styles.agreementButton, agreement.myAgreed && styles.agreementButtonMuted]}
                >
                  <Text
                    style={[
                      styles.agreementButtonText,
                      agreement.myAgreed && styles.agreementButtonTextMuted,
                    ]}
                  >
                    {agreementButtonLabel}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.saleCard}>
              <View style={styles.saleCardHeader}>
                <View>
                  <Text style={styles.saleCardTitle}>Guvenli odeme ve satis sureci</Text>
                  <Text style={styles.saleCardText}>{saleStatusText}</Text>
                </View>
                <View style={styles.saleBadge}>
                  <Text style={styles.saleBadgeText}>
                    {saleProcess?.status || 'not_started'}
                  </Text>
                </View>
              </View>

              <View style={styles.saleStepsRow}>
                {saleSteps.map((step, index) => {
                  const isDone = saleStepIndex >= index;
                  const isCurrent = saleStepIndex === index;
                  return (
                    <View
                      key={step.key}
                      style={[
                        styles.saleStepChip,
                        isDone && styles.saleStepChipDone,
                        isCurrent && styles.saleStepChipCurrent,
                      ]}
                    >
                      <Text
                        style={[
                          styles.saleStepChipText,
                          isDone && styles.saleStepChipTextDone,
                        ]}
                      >
                        {step.label}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <Text style={styles.saleNoticeText}>
                Platform resmi odeme saglayicisi degildir. Resmi guvenli odeme sureci izlenmelidir.
              </Text>

              {!saleProcess ? (
                <Pressable
                  onPress={() =>
                    void runSaleAction(
                      'start-sale',
                      () => onStartSaleProcess?.(listingContext.postId),
                      'Satis sureci baslatilamadi.',
                    )
                  }
                  style={styles.salePrimaryButton}
                >
                  <Text style={styles.salePrimaryButtonText}>
                    {saleActionKey === 'start-sale' ? 'Baslatiliyor...' : 'Satis surecini baslat'}
                  </Text>
                </Pressable>
              ) : (
                <>
                  <View style={styles.saleActionRow}>
                    <Pressable
                      onPress={() => setShowSafePaymentInfo((current) => !current)}
                      style={styles.saleSecondaryButton}
                    >
                      <Text style={styles.saleSecondaryButtonText}>
                        {showSafePaymentInfo ? 'Bilgiyi gizle' : 'Guvenli odeme bilgisini ac'}
                      </Text>
                    </Pressable>

                    {canShowReadyForNotary ? (
                      <Pressable
                        onPress={() =>
                          void runSaleAction(
                            'ready-notary',
                            () => onMarkSaleReadyForNotary?.(listingContext.postId),
                            'Noter adimina gecilemedi.',
                          )
                        }
                        style={[
                          styles.salePrimaryButton,
                          needsGuidanceAck && styles.salePrimaryButtonDisabled,
                        ]}
                        disabled={needsGuidanceAck}
                      >
                        <Text style={styles.salePrimaryButtonText}>
                          {saleActionKey === 'ready-notary'
                            ? 'Hazirlaniyor...'
                            : 'Notere hazir'}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>

                  {showSafePaymentInfo ? (
                    <View style={styles.safePaymentInfoBox}>
                      <Text style={styles.safePaymentInfoTitle}>Guvenli odeme bilgilendirmesi</Text>
                      <Text style={styles.safePaymentInfoText}>
                        Resmi guvenli odeme sureci takip edilmeden noter hazirligina gecilmemelidir.
                        Platform odeme emanet kurumu veya resmi odeme saglayicisi degildir.
                      </Text>
                      <Text style={styles.safePaymentInfoText}>
                        Taraflar ek dogrulama gerekebilecegini ve resmi sureci izlemeleri gerektigini kabul eder.
                      </Text>
                      {needsGuidanceAck ? (
                        <Pressable
                          onPress={() =>
                            void runSaleAction(
                              'ack-guidance',
                              () => onAcknowledgeSafePayment?.(listingContext.postId),
                              'Guvenli odeme bilgilendirmesi kaydedilemedi.',
                            )
                          }
                          style={styles.salePrimaryButton}
                        >
                          <Text style={styles.salePrimaryButtonText}>
                            {saleActionKey === 'ack-guidance'
                              ? 'Kaydediliyor...'
                              : 'Bilgilendirmeyi kabul et'}
                          </Text>
                        </Pressable>
                      ) : (
                        <Text style={styles.safePaymentInfoMeta}>
                          Bilgilendirme daha once kabul edildi.
                        </Text>
                      )}
                    </View>
                  ) : null}

                  {canCompleteSale ? (
                    <Pressable
                      onPress={() =>
                        void runSaleAction(
                          'complete-sale',
                          () => onCompleteSaleProcess?.(listingContext.postId),
                          'Satis sureci tamamlanamadi.',
                        )
                      }
                      style={styles.salePrimaryButton}
                    >
                      <Text style={styles.salePrimaryButtonText}>
                        {saleActionKey === 'complete-sale'
                          ? 'Tamamlaniyor...'
                          : 'Satisi tamamlandi olarak isaretle'}
                      </Text>
                    </Pressable>
                  ) : null}
                </>
              )}
            </View>

            {insuranceStatus ? (
              <View style={styles.insuranceCard}>
                <Text style={styles.insuranceTitle}>Ruhsat ve sigorta</Text>
                <Text style={styles.insuranceText}>{insuranceText}</Text>
                {insuranceStatus.registrationSharedAt ? (
                  <Text style={styles.insuranceMeta}>
                    Ruhsat paylaşıldı: {insuranceStatus.registrationSharedAt}
                  </Text>
                ) : null}
                {registrationEntries.length ? (
                  <View style={styles.registrationInfoCard}>
                    <Text style={styles.registrationInfoTitle}>Paylasilan ruhsat bilgileri</Text>
                    {registrationEntries.map(([key, value]) => (
                      <View key={key} style={styles.registrationInfoRow}>
                        <Text style={styles.registrationInfoLabel}>{key}</Text>
                        <Text style={styles.registrationInfoValue}>{value}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                {insuranceStatus.policyUri ? (
                  <Pressable
                    onPress={() =>
                      void Linking.openURL(insuranceStatus.policyUri || '').catch(() => {
                        Alert.alert('Belge acilamadi', 'Police baglantisi su anda acilamiyor.');
                      })
                    }
                    style={styles.saleSecondaryButton}
                  >
                    <Text style={styles.saleSecondaryButtonText}>Policiyi ac</Text>
                  </Pressable>
                ) : null}
                {insuranceStatus.invoiceUri ? (
                  <Pressable
                    onPress={() =>
                      void Linking.openURL(insuranceStatus.invoiceUri || '').catch(() => {
                        Alert.alert('Belge acilamadi', 'Fatura baglantisi su anda acilamiyor.');
                      })
                    }
                    style={styles.saleSecondaryButton}
                  >
                    <Text style={styles.saleSecondaryButtonText}>Faturayi ac</Text>
                  </Pressable>
                ) : null}
                {canShareRegistration ? (
                  <Pressable
                    onPress={() => onShareListingRegistration?.(activeConversation.id)}
                    style={styles.insurancePrimaryButton}
                  >
                    <Text style={styles.insurancePrimaryButtonText}>Ruhsatı gönder</Text>
                  </Pressable>
                ) : null}
                {canRequestInsurancePayment ? (
                  <Pressable
                    onPress={() => onCreateInsurancePayment?.(activeConversation.id)}
                    style={styles.insurancePrimaryButton}
                  >
                    <Text style={styles.insurancePrimaryButtonText}>Sigorta kes</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        <ScrollView
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          style={styles.chatScroll}
        >
          {activeConversation.messages.length ? (
            activeConversation.messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageRow,
                  message.isMine ? styles.messageRowMine : styles.messageRowTheir,
                ]}
              >
                <Pressable
                  delayLongPress={220}
                  onLongPress={() => handleMessageLongPress(message)}
                  style={[styles.bubble, message.isMine ? styles.bubbleMine : styles.bubbleTheir]}
                >
                  {!message.isMine && activeConversation.type === 'group' ? (
                    <Text style={styles.groupSender}>{message.senderName}</Text>
                  ) : null}
                  {message.text ? (
                    <Text style={[styles.messageText, message.isMine && styles.messageTextMine]}>
                      {message.text}
                    </Text>
                  ) : null}
                  {message.attachments?.length ? (
                    <View style={styles.attachmentStack}>
                      {message.attachments.map((attachment) => (
                        <AttachmentPreview attachment={attachment} key={attachment.id} />
                      ))}
                    </View>
                  ) : null}
                  <Text style={[styles.messageTime, message.isMine && styles.messageTimeMine]}>
                    {message.time}
                  </Text>
                  {message.editedAt && !message.isDeletedForEveryone ? (
                    <Text style={[styles.messageEdited, message.isMine && styles.messageEditedMine]}>
                      {language === 'en' ? 'Edited' : 'Düzenlendi'}
                    </Text>
                  ) : null}
                </Pressable>
              </View>
            ))
          ) : (
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatTitle}>
                {isListingConversation ? 'İlan mesajı başlatıldı' : locale.messages.newChat}
              </Text>
              <Text style={styles.emptyChatText}>
                {isListingConversation
                  ? 'Araçla ilgili detayları burada konuşabilir, fotoğraf, video, konum ve ses notu paylaşabilirsiniz.'
                  : locale.messages.newChatText}
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.composer}>
          {editingMessageId ? (
            <View style={styles.editingBar}>
              <View style={styles.editingCopy}>
                <Text style={styles.editingTitle}>
                  {language === 'en' ? 'Editing message' : 'Mesaj düzenleniyor'}
                </Text>
                <Text style={styles.editingHint}>
                  {language === 'en'
                    ? 'Saving updates this message for everyone.'
                    : 'Kaydettiğinde bu mesaj herkes için güncellenecek.'}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setEditingMessageId(null);
                  setDraft('');
                  setPendingAttachments([]);
                }}
                style={styles.editingClose}
              >
                <Feather color={theme.colors.textSoft} name="x" size={16} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.mediaTools}>
              <Pressable onPress={() => void addAttachment('image')} style={styles.toolButton}>
                <Feather color={theme.colors.textSoft} name="image" size={16} />
              </Pressable>
              <Pressable onPress={() => void addAttachment('video')} style={styles.toolButton}>
                <Feather color={theme.colors.textSoft} name="film" size={16} />
              </Pressable>
              <Pressable onPress={() => void shareLocation()} style={styles.toolButton}>
                <Feather color={theme.colors.textSoft} name="map-pin" size={16} />
              </Pressable>
              <Pressable
                onPress={() => {
                  void toggleVoiceRecording();
                }}
                style={[styles.toolButton, recorderState.isRecording && styles.toolButtonActive]}
              >
                <Feather
                  color={recorderState.isRecording ? theme.colors.card : theme.colors.textSoft}
                  name={recorderState.isRecording ? 'square' : 'mic'}
                  size={16}
                />
              </Pressable>
            </View>
          )}

          {recorderState.isRecording ? (
            <View style={styles.recordingBar}>
              <View style={styles.recordDot} />
              <Text style={styles.recordingText}>
                {locale.messages.recording} · {Math.max(1, Math.round(recorderState.durationMillis / 1000))} sn
              </Text>
            </View>
          ) : null}

          {pendingAttachments.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pendingRow}>
              {pendingAttachments.map((attachment) => (
                <View key={attachment.id} style={styles.pendingChip}>
                  <Text style={styles.pendingChipText}>
                    {attachment.kind === 'location'
                      ? attachment.locationLine || locale.messages.locationShared
                      : attachment.kind === 'audio'
                        ? `${attachment.label} ${
                            attachment.durationMs
                              ? `${Math.max(1, Math.round(attachment.durationMs / 1000))} sn`
                              : ''
                          }`
                        : attachment.label}
                  </Text>
                  <Pressable
                    onPress={() =>
                      setPendingAttachments((current) =>
                        current.filter((item) => item.id !== attachment.id),
                      )
                    }
                  >
                    <Feather color={theme.colors.textSoft} name="x" size={14} />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          ) : null}

          {composerError ? <Text style={styles.composerError}>{composerError}</Text> : null}

          <View style={styles.inputWrap}>
            <TextInput
              onChangeText={setDraft}
              placeholder={locale.messages.inputPlaceholder}
              placeholderTextColor={theme.colors.textSoft}
              style={styles.input}
              value={draft}
            />
            <Pressable onPress={send} style={styles.sendButton}>
              <Feather color={theme.colors.card} name="send" size={15} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
      <View style={styles.searchBox}>
        <Feather color={theme.colors.textSoft} name="search" size={16} />
        <TextInput
          autoCapitalize="none"
          onChangeText={setSearchQuery}
          placeholder={locale.messages.searchPlaceholder}
          placeholderTextColor={theme.colors.textSoft}
          style={styles.searchInput}
          value={searchQuery}
        />
      </View>

      <View style={styles.toolbar}>
        <Text style={styles.searchHint}>{locale.messages.searchHint}</Text>
        <Pressable
          onPress={() => {
            setGroupMode((current) => !current);
            setSelectedHandles([]);
            setGroupName('');
          }}
          style={styles.groupButton}
        >
          <Text style={styles.groupButtonText}>
            {groupMode ? locale.messages.cancel : locale.messages.createGroup}
          </Text>
        </Pressable>
      </View>

      {groupMode ? (
        <View style={styles.groupPanel}>
          <Text style={styles.groupTitle}>{locale.messages.newGroup}</Text>
          <TextInput
            onChangeText={setGroupName}
            placeholder={locale.messages.groupName}
            placeholderTextColor={theme.colors.textSoft}
            style={styles.groupInput}
            value={groupName}
          />
          <Text style={styles.groupHelper}>{locale.messages.groupHelper}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{locale.messages.threads}</Text>

        {filteredConversations.length ? (
          filteredConversations.map((conversation) => (
            <Pressable
              key={conversation.id}
              onPress={() => onSelectConversation(conversation.id)}
              style={styles.row}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{conversation.name.slice(0, 1)}</Text>
              </View>

              <View style={styles.rowCopy}>
                <View style={styles.nameLine}>
                  <Text style={styles.rowTitle}>{conversation.name}</Text>
                  <Text style={styles.rowMeta}>{conversation.lastSeen}</Text>
                </View>
                <Text numberOfLines={1} style={styles.rowPreview}>
                  {conversation.lastMessage}
                </Text>
              </View>

              {conversation.unread ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{conversation.unread}</Text>
                </View>
              ) : null}
            </Pressable>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>
              {normalizedQuery ? locale.messages.noResults : locale.messages.noThreads}
            </Text>
            <Text style={styles.emptyStateText}>
              {normalizedQuery
                ? locale.messages.noSearchResultsText
                : locale.messages.noThreadsText}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {groupMode ? locale.messages.selectPeople : locale.messages.people}
        </Text>

        {filteredUsers.length ? (
          filteredUsers.map((user) => {
            const existingConversation = conversations.find(
              (conversation) => conversation.type === 'direct' && conversation.handle === user.handle,
            );
            const selected = selectedHandles.includes(user.handle);

            return (
              <Pressable
                key={user.id}
                onPress={() =>
                  groupMode
                    ? toggleGroupUser(user)
                    : existingConversation
                      ? onSelectConversation(existingConversation.id)
                      : void onStartConversation(user)
                }
                style={[styles.row, groupMode && selected && styles.rowSelected]}
              >
                <View style={[styles.avatar, styles.avatarAlt]}>
                  <Text style={styles.avatarText}>{user.name.slice(0, 1)}</Text>
                </View>

                <View style={styles.rowCopy}>
                  <View style={styles.nameLine}>
                    <Text style={styles.rowTitle}>{user.name}</Text>
                    <Text style={styles.rowMeta}>{user.handle}</Text>
                  </View>
                  <Text numberOfLines={2} style={styles.rowPreview}>
                    {user.note}
                  </Text>
                </View>

                {groupMode ? (
                  <View style={[styles.selectionCircle, selected && styles.selectionCircleActive]}>
                    {selected ? <Feather color={theme.colors.card} name="check" size={14} /> : null}
                  </View>
                ) : (
                  <View style={styles.actionPill}>
                    <Text style={styles.actionPillText}>
                      {existingConversation ? locale.messages.open : locale.messages.write}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>{locale.messages.noUsers}</Text>
            <Text style={styles.emptyStateText}>{locale.messages.noUsersText}</Text>
          </View>
        )}

        {groupMode ? (
          <Pressable
            disabled={selectedHandles.length < 2}
            onPress={createGroup}
            style={[styles.createGroupButton, selectedHandles.length < 2 && styles.disabledButton]}
          >
            <Text style={styles.createGroupText}>{locale.messages.startGroup}</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchBox: {
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    minHeight: 48,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 15,
  },
  toolbar: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  searchHint: {
    color: theme.colors.textSoft,
    fontSize: 13,
    lineHeight: 18,
  },
  groupButton: {
    alignSelf: 'flex-start',
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
  },
  groupButtonText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  groupPanel: {
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    borderRadius: 20,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  groupTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  groupInput: {
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    color: theme.colors.text,
  },
  groupHelper: {
    color: theme.colors.textSoft,
    fontSize: 13,
    lineHeight: 18,
  },
  section: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xs,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rowSelected: {
    backgroundColor: theme.colors.primarySoft,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarAlt: {
    backgroundColor: '#EEF6FF',
  },
  avatarText: {
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  rowCopy: {
    flex: 1,
    gap: 4,
  },
  nameLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  rowTitle: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  rowMeta: {
    color: theme.colors.textSoft,
    fontSize: 12,
  },
  rowPreview: {
    color: theme.colors.textSoft,
    fontSize: 13,
    lineHeight: 18,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: theme.colors.card,
    fontSize: 12,
    fontWeight: '800',
  },
  actionPill: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 7,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySoft,
  },
  actionPillText: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  selectionCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionCircleActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  createGroupButton: {
    marginTop: theme.spacing.md,
    minHeight: 44,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.4,
  },
  createGroupText: {
    color: theme.colors.card,
    fontWeight: '800',
  },
  emptyState: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  emptyStateTitle: {
    color: theme.colors.text,
    fontWeight: '800',
  },
  emptyStateText: {
    color: theme.colors.textSoft,
    textAlign: 'center',
    lineHeight: 19,
  },
  threadScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  threadIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  threadCopy: {
    flex: 1,
    gap: 2,
  },
  threadName: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  threadHandle: {
    color: theme.colors.textSoft,
    fontSize: 13,
  },
  listingThreadCard: {
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: 22,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  listingThreadTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  listingBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySoft,
  },
  listingBadgeText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  listingPrice: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  listingTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  listingMeta: {
    color: theme.colors.textSoft,
    fontSize: 13,
  },
  listingSummary: {
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
  agreementCard: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  agreementCopy: {
    gap: 4,
  },
  agreementTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  agreementText: {
    color: theme.colors.textSoft,
    lineHeight: 19,
  },
  agreementMeta: {
    color: theme.colors.textSoft,
    fontSize: 12,
  },
  agreementButton: {
    alignSelf: 'flex-start',
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
  },
  agreementButtonMuted: {
    backgroundColor: theme.colors.surfaceMuted,
  },
  agreementButtonText: {
    color: theme.colors.card,
    fontSize: 13,
    fontWeight: '800',
  },
  agreementButtonTextMuted: {
    color: theme.colors.text,
  },
  insuranceCard: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  insuranceTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  insuranceText: {
    color: theme.colors.textSoft,
    lineHeight: 19,
  },
  insuranceMeta: {
    color: theme.colors.textSoft,
    fontSize: 12,
  },
  registrationInfoCard: {
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    gap: 8,
  },
  registrationInfoTitle: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  registrationInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    paddingVertical: 4,
  },
  registrationInfoLabel: {
    color: theme.colors.textSoft,
    fontSize: 12,
    textTransform: 'capitalize',
    flex: 1,
  },
  registrationInfoValue: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  insurancePrimaryButton: {
    alignSelf: 'flex-start',
    marginTop: theme.spacing.xs,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
  },
  insurancePrimaryButtonText: {
    color: theme.colors.card,
    fontSize: 13,
    fontWeight: '800',
  },
  saleCard: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  saleCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  saleCardTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  saleCardText: {
    color: theme.colors.textSoft,
    marginTop: 6,
    lineHeight: 19,
    maxWidth: 240,
  },
  saleBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
  },
  saleBadgeText: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: '800',
  },
  saleStepsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  saleStepChip: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 7,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
  },
  saleStepChipDone: {
    backgroundColor: theme.colors.primarySoft,
  },
  saleStepChipCurrent: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  saleStepChipText: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: '700',
  },
  saleStepChipTextDone: {
    color: theme.colors.primary,
  },
  saleNoticeText: {
    color: theme.colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
  },
  saleActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  salePrimaryButton: {
    alignSelf: 'flex-start',
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
  },
  salePrimaryButtonDisabled: {
    opacity: 0.45,
  },
  salePrimaryButtonText: {
    color: theme.colors.card,
    fontSize: 13,
    fontWeight: '800',
  },
  saleSecondaryButton: {
    alignSelf: 'flex-start',
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
  },
  saleSecondaryButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  safePaymentInfoBox: {
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  safePaymentInfoTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  safePaymentInfoText: {
    color: theme.colors.textSoft,
    lineHeight: 19,
  },
  safePaymentInfoMeta: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  chatScroll: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  messageRow: {
    flexDirection: 'row',
  },
  messageRowMine: {
    justifyContent: 'flex-end',
  },
  messageRowTheir: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 20,
    gap: 6,
  },
  bubbleMine: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 8,
  },
  bubbleTheir: {
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: 8,
  },
  groupSender: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  messageText: {
    color: theme.colors.text,
    lineHeight: 21,
  },
  messageTextMine: {
    color: theme.colors.card,
  },
  messageTime: {
    color: theme.colors.textSoft,
    fontSize: 12,
  },
  messageTimeMine: {
    color: '#DDFBFF',
  },
  messageEdited: {
    color: theme.colors.textSoft,
    fontSize: 11,
    fontStyle: 'italic',
  },
  messageEditedMine: {
    color: '#DDFBFF',
  },
  attachmentStack: {
    gap: theme.spacing.xs,
  },
  attachmentBox: {
    borderRadius: 14,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attachmentImage: {
    width: 188,
    height: 140,
    borderRadius: 14,
  },
  attachmentText: {
    color: theme.colors.text,
    flex: 1,
  },
  reportAttachmentBox: {
    borderRadius: 16,
    padding: theme.spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  reportAttachmentCopy: {
    flex: 1,
    gap: 2,
  },
  reportAttachmentTitle: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  reportAttachmentMeta: {
    color: theme.colors.textSoft,
    fontSize: 12,
  },
  reportAttachmentAction: {
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 7,
  },
  reportAttachmentActionText: {
    color: theme.colors.card,
    fontSize: 12,
    fontWeight: '800',
  },
  audioBox: {
    borderRadius: 16,
    padding: theme.spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  audioIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioCopy: {
    flex: 1,
    gap: 2,
  },
  audioTitle: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  audioMeta: {
    color: theme.colors.textSoft,
    fontSize: 12,
  },
  emptyChat: {
    marginTop: theme.spacing.xl,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.xs,
  },
  emptyChatTitle: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 16,
  },
  emptyChatText: {
    color: theme.colors.textSoft,
    lineHeight: 20,
  },
  composer: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  editingBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  editingCopy: {
    flex: 1,
    gap: 2,
  },
  editingTitle: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  editingHint: {
    color: theme.colors.textSoft,
    fontSize: 12,
    lineHeight: 17,
  },
  editingClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  mediaTools: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  toolButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceMuted,
  },
  toolButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  recordDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.danger,
  },
  recordingText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  pendingRow: {
    maxHeight: 42,
  },
  pendingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
    marginRight: theme.spacing.sm,
  },
  pendingChipText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  composerError: {
    color: theme.colors.danger,
    fontSize: 12,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 46,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    color: theme.colors.text,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
});

