import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';

import {
  pickDocuments,
  pickImagesFromLibrary,
  requestInsurancePayment,
  sendConversationMessage,
  shareListingRegistration,
  toggleListingAgreement,
  uploadPickedAssets,
} from '../lib/api';
import { StateCard } from '../components/StateCard';
import { useSessionStore } from '../store/session-store';
import { theme } from '../theme';
import type { RootStackParamList } from '../types/navigation';

type Route = RouteProp<RootStackParamList, 'Chat'>;

export function ChatScreen() {
  const route = useRoute<Route>();
  const snapshot = useSessionStore((state) => state.snapshot);
  const refreshSnapshot = useSessionStore((state) => state.refreshSnapshot);
  const conversation = useMemo(
    () => snapshot?.conversations.find((item) => item.id === route.params.conversationId),
    [route.params.conversationId, snapshot?.conversations],
  );
  const [text, setText] = useState('');
  const [registrationOwner, setRegistrationOwner] = useState('');
  const [registrationPlate, setRegistrationPlate] = useState('');
  const [registrationCity, setRegistrationCity] = useState('');

  if (!conversation) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <StateCard title="Sohbet bulunamadi" description="Secilen sohbet artik erisilebilir degil." tone="danger" />
        </View>
      </SafeAreaView>
    );
  }

  const activeConversation = conversation;

  async function handleSend() {
    if (!text.trim()) {
      return;
    }

    await sendConversationMessage(activeConversation.id, text.trim());
    setText('');
    await refreshSnapshot();
  }

  async function handleMediaMessage() {
    const imageAssets = await pickImagesFromLibrary();
    const documentAssets = await pickDocuments();
    const uploaded = await uploadPickedAssets([...imageAssets, ...documentAssets]);
    await sendConversationMessage(
      activeConversation.id,
      text.trim() || 'Medya paylasimi',
      uploaded.map((item) => ({
        url: item.url,
        type: item.type,
        name: item.name,
      })),
    );
    setText('');
    await refreshSnapshot();
  }

  async function handleAgreement() {
    await toggleListingAgreement(activeConversation.id);
    await refreshSnapshot();
  }

  async function handleRegistrationShare() {
    await shareListingRegistration(activeConversation.id, {
      ownerName: registrationOwner,
      plateNumber: registrationPlate,
      registrationCity,
    });
    await refreshSnapshot();
  }

  async function handleInsurancePayment() {
    const result = await requestInsurancePayment(activeConversation.id, {
      insuranceType: 'Trafik sigortasi',
    });
    Alert.alert('Odeme akisi', (result as { message?: string }).message || 'Guvenli odeme baglantisi hazirlandi.');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>{activeConversation.name}</Text>
        {activeConversation.listingContext?.listing?.title ? (
          <View style={styles.contextCard}>
            <Text style={styles.contextTitle}>{activeConversation.listingContext.listing.title}</Text>
            <Text style={styles.contextText}>
              {activeConversation.listingContext.listing.price ? `${activeConversation.listingContext.listing.price} TL` : 'Fiyat hazirlaniyor'}
            </Text>
          </View>
        ) : null}

        {activeConversation.type === 'listing' ? (
          <StateCard
            title="Ilan sureci"
            description={
              activeConversation.agreement?.myAgreed
                ? 'Sen anlasmayi onayladin. Karsi tarafin da onayi gelince ruhsat paylasimi aktif olur.'
                : 'Ilan surecini baslatmak icin Anlastik adimini kullanabilirsin.'
            }
            actionLabel="Anlastik"
            onAction={() => void handleAgreement()}
          />
        ) : null}

        {activeConversation.agreement?.buyerAgreed && activeConversation.agreement?.sellerAgreed ? (
          <View style={styles.registrationCard}>
            <Text style={styles.sectionTitle}>Ruhsat paylasimi</Text>
            <TextInput value={registrationOwner} onChangeText={setRegistrationOwner} placeholder="Ruhsat sahibi" style={styles.input} />
            <TextInput value={registrationPlate} onChangeText={setRegistrationPlate} placeholder="Plaka" style={styles.input} />
            <TextInput value={registrationCity} onChangeText={setRegistrationCity} placeholder="Ruhsat ili" style={styles.input} />
            <Pressable onPress={() => void handleRegistrationShare()} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>Ruhsat kartini gonder</Text>
            </Pressable>
            {activeConversation.insuranceStatus?.quoteAmount ? (
              <Pressable onPress={() => void handleInsurancePayment()} style={styles.primaryButton}>
                <Text style={styles.primaryText}>Sigorta odeme akisini ac</Text>
              </Pressable>
            ) : (
              <StateCard
                title="Sigorta teklifi bekleniyor"
                description="Admin panelde teklif hazirlandiginda tutar ve PDF burada gosterilecek."
              />
            )}
          </View>
        ) : null}

        <ScrollView contentContainerStyle={styles.messages}>
          {activeConversation.messages.map((message) => (
            <View
              key={message.id}
              style={[styles.messageBubble, message.isMine ? styles.mine : styles.theirs]}
            >
              <Text style={styles.messageAuthor}>{message.isMine ? 'Sen' : message.senderName}</Text>
              <Text style={styles.messageText}>{message.text}</Text>
              {message.attachments?.length ? (
                <Text style={styles.attachmentLabel}>{message.attachments.length} ek dosya</Text>
              ) : null}
            </View>
          ))}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Mesaj yaz"
            multiline
            style={styles.composerInput}
          />
          <View style={styles.row}>
            <Pressable onPress={() => void handleMediaMessage()} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>Foto / dosya</Text>
            </Pressable>
            <Pressable onPress={() => void handleSend()} style={styles.primaryButton}>
              <Text style={styles.primaryText}>Gonder</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.colors.text,
  },
  contextCard: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  contextTitle: {
    color: theme.colors.text,
    fontWeight: '800',
  },
  contextText: {
    color: theme.colors.muted,
    marginTop: 4,
  },
  registrationCard: {
    gap: 10,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 16,
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
  },
  messages: {
    gap: 10,
    paddingBottom: 8,
  },
  messageBubble: {
    maxWidth: '88%',
    borderRadius: 18,
    padding: 12,
    gap: 4,
  },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.text,
  },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  messageAuthor: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.muted,
  },
  messageText: {
    color: theme.colors.text,
    lineHeight: 20,
  },
  attachmentLabel: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  composer: {
    gap: 10,
  },
  composerInput: {
    minHeight: 80,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    textAlignVertical: 'top',
    backgroundColor: theme.colors.surface,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: theme.colors.surface,
  },
  secondaryText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
    borderRadius: 999,
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: theme.colors.text,
  },
  primaryText: {
    color: theme.colors.surface,
    fontWeight: '800',
  },
});
