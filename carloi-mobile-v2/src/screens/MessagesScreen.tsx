import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { safeRelativeTime } from '@/lib/date';
import { getReadableErrorMessage } from '@/lib/errors';
import { getMobileApiClient } from '@/lib/api';
import { NetworkBanner } from '@/components/NetworkBanner';
import { StatusBadge } from '@/components/StatusBadge';
import { TopHeader } from '@/components/TopHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SectionCard } from '@/components/ui/SectionCard';
import { useSessionStore } from '@/store/session-store';
import { tokens } from '@/theme/tokens';

export function MessagesScreen({ navigation, route }: { navigation: any; route: any }) {
  const snapshot = useSessionStore((state) => state.snapshot);
  const setSnapshot = useSessionStore((state) => state.setSnapshot);
  const apiStatus = useSessionStore((state) => state.apiStatus);
  const apiMessage = useSessionStore((state) => state.apiMessage);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(route?.params?.conversationId || null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const client = useMemo(() => getMobileApiClient(), []);

  const conversations = snapshot?.conversations || [];
  const selectedConversation =
    conversations.find((item) => item.id === selectedConversationId) || conversations[0] || null;

  useEffect(() => {
    if (route?.params?.conversationId) {
      setSelectedConversationId(route.params.conversationId);
    }
  }, [route?.params?.conversationId]);

  async function sendMessage() {
    if (!selectedConversation || !draft.trim()) {
      setError('Mesaj alani bos birakilamaz.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const response = await client.sendConversationMessage(selectedConversation.id, draft.trim());
      if (response.snapshot) {
        setSnapshot(response.snapshot);
      }
      setDraft('');
    } catch (messageError) {
      setError(getReadableErrorMessage(messageError, 'Mesaj gonderilemedi.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function markAgreement() {
    if (!selectedConversation) {
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      const response = await client.toggleConversationAgreement(selectedConversation.id);
      if (response.snapshot) {
        setSnapshot(response.snapshot);
      }
    } catch (agreementError) {
      setError(getReadableErrorMessage(agreementError, 'Anlasma durumu guncellenemedi.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function startInsurance() {
    if (!selectedConversation) {
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      const response = await client.startConversationInsurancePayment(selectedConversation.id);
      if (response.snapshot) {
        setSnapshot(response.snapshot);
      }
      if (response.url) {
        await Linking.openURL(response.url);
      }
    } catch (insuranceError) {
      setError(getReadableErrorMessage(insuranceError, 'Sigorta akisi baslatilamadi.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer>
      <TopHeader
        title="Mesajlar"
        subtitle="Ilan baglamli ve dogrudan sohbetler"
        onPressCreate={() => navigation.getParent()?.navigate('Create')}
        onPressSearch={() => navigation.getParent()?.navigate('Search')}
      />

      <NetworkBanner status={apiStatus} message={apiMessage} />

      {!conversations.length ? (
        <EmptyState title="Mesaj kutun bos" description="Bir ilana mesaj attiginda veya kullaniciya ulasildiginda burada gorunur." />
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.conversationRow}>
            {conversations.map((conversation) => (
              <Pressable
                key={conversation.id}
                style={[styles.conversationChip, selectedConversation?.id === conversation.id && styles.conversationChipActive]}
                onPress={() => setSelectedConversationId(conversation.id)}
              >
                <Text style={styles.conversationChipTitle}>{conversation.name}</Text>
                <Text style={styles.conversationChipMeta}>{conversation.unread ? `${conversation.unread} yeni` : 'Guncel'}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {selectedConversation ? (
            <>
              <SectionCard>
                <View style={styles.headerRow}>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text style={styles.sectionTitle}>{selectedConversation.name}</Text>
                    <Text style={styles.sectionMeta}>@{selectedConversation.handle}</Text>
                  </View>
                  <StatusBadge
                    label={selectedConversation.isOnline ? 'Cevrim ici' : 'Son gorulme kayitli'}
                    tone={selectedConversation.isOnline ? 'success' : 'neutral'}
                  />
                </View>

                {selectedConversation.listingContext ? (
                  <View style={styles.listingContextCard}>
                    <Text style={styles.contextTitle}>{selectedConversation.listingContext.title}</Text>
                    <Text style={styles.contextMeta}>{selectedConversation.listingContext.price}</Text>
                    <Text style={styles.contextMeta}>{selectedConversation.listingContext.location}</Text>
                    <View style={styles.contextActions}>
                      <PrimaryButton label="Anlastik" onPress={markAgreement} disabled={submitting} />
                      <PrimaryButton
                        label="Sigorta kes"
                        variant="secondary"
                        onPress={startInsurance}
                        disabled={submitting || !selectedConversation.saleProcess?.guidanceEnabled}
                      />
                    </View>
                    {!selectedConversation.saleProcess?.guidanceEnabled ? (
                      <Text style={styles.contextHint}>
                        Sigorta akisi, anlasma ve teklif bilgisi hazir oldugunda aktif olur.
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </SectionCard>

              <SectionCard>
                <View style={styles.messageList}>
                  {selectedConversation.messages.map((message) => (
                    <View
                      key={message.id}
                      style={[styles.messageBubble, message.isMine ? styles.mineBubble : styles.otherBubble]}
                    >
                      <Text style={[styles.messageSender, message.isMine && styles.mineSender]}>
                        {message.isMine ? 'Sen' : message.senderName}
                      </Text>
                      <Text style={[styles.messageText, message.isMine && styles.mineText]}>{message.text}</Text>
                      <Text style={[styles.messageTime, message.isMine && styles.mineTime]}>
                        {safeRelativeTime(message.time)}
                      </Text>
                    </View>
                  ))}
                </View>

                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Mesaj yaz"
                  placeholderTextColor={tokens.colors.muted}
                  style={styles.messageInput}
                  multiline
                />
                <PrimaryButton
                  label={submitting ? 'Gonderiliyor...' : 'Mesaji gonder'}
                  onPress={sendMessage}
                  disabled={submitting}
                />
              </SectionCard>
            </>
          ) : null}
        </>
      )}

      <ErrorBanner message={error} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  conversationRow: {
    gap: 10,
  },
  conversationChip: {
    width: 160,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: '#ffffff',
    padding: 14,
    gap: 6,
  },
  conversationChipActive: {
    borderColor: tokens.colors.accent,
    backgroundColor: tokens.colors.accentSoft,
  },
  conversationChipTitle: {
    fontWeight: '800',
    color: tokens.colors.text,
  },
  conversationChipMeta: {
    color: tokens.colors.muted,
    fontSize: 12,
  },
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
  sectionMeta: {
    color: tokens.colors.muted,
  },
  listingContextCard: {
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    padding: 14,
    gap: 10,
  },
  contextTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  contextMeta: {
    color: tokens.colors.muted,
  },
  contextActions: {
    gap: 10,
  },
  contextHint: {
    color: tokens.colors.muted,
    lineHeight: 20,
  },
  messageList: {
    gap: 10,
  },
  messageBubble: {
    maxWidth: '86%',
    borderRadius: 18,
    padding: 12,
    gap: 4,
  },
  mineBubble: {
    alignSelf: 'flex-end',
    backgroundColor: tokens.colors.accent,
  },
  otherBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#f8fafc',
  },
  messageSender: {
    fontWeight: '800',
    color: tokens.colors.text,
  },
  mineSender: {
    color: '#ffffff',
  },
  messageText: {
    color: tokens.colors.text,
    lineHeight: 20,
  },
  mineText: {
    color: '#ffffff',
  },
  messageTime: {
    color: tokens.colors.muted,
    fontSize: 11,
  },
  mineTime: {
    color: 'rgba(255,255,255,0.84)',
  },
  messageInput: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: tokens.colors.text,
    textAlignVertical: 'top',
  },
});
