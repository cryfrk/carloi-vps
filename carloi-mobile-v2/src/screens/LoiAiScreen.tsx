import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { getMobileApiClient } from '@/lib/api';
import { getReadableErrorMessage } from '@/lib/errors';
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

const quickPrompts = [
  'Aracta olasi ariza belirtilerini yorumla',
  'Bu butceye uygun arac oner',
  'Ilanlari teknik acidan karsilastir',
  'Arac saglik puanini acikla',
];

export function LoiAiScreen({ navigation }: { navigation: any }) {
  const snapshot = useSessionStore((state) => state.snapshot);
  const setSnapshot = useSessionStore((state) => state.setSnapshot);
  const apiStatus = useSessionStore((state) => state.apiStatus);
  const apiMessage = useSessionStore((state) => state.apiMessage);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const client = useMemo(() => getMobileApiClient(), []);
  const aiMessages = snapshot?.aiMessages || [];

  async function sendMessage(message: string) {
    if (!message.trim()) {
      setError('AI icin bir soru yazmalisin.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const response = await client.aiChat(message.trim());
      if (response.snapshot) {
        setSnapshot(response.snapshot);
      }
      setDraft('');
    } catch (aiError) {
      setError(
        getReadableErrorMessage(
          aiError,
          'AI gecici olarak kullanilamiyor. Lutfen daha sonra tekrar deneyin.',
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function clearHistory() {
    try {
      setSubmitting(true);
      const response = await client.clearAi();
      if (response.snapshot) {
        setSnapshot(response.snapshot);
      }
    } catch (clearError) {
      setError(getReadableErrorMessage(clearError, 'AI gecmisi temizlenemedi.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer>
      <TopHeader
        title="Loi AI"
        subtitle="Arac, ilan ve saglik verisini yorumlayan yardimci"
        onPressCreate={() => navigation.getParent()?.navigate('Create')}
        onPressSearch={() => navigation.getParent()?.navigate('Search')}
      />

      <NetworkBanner status={apiStatus} message={apiMessage} />

      <SectionCard>
        <Text style={styles.sectionTitle}>Baglam</Text>
        {snapshot?.vehicle ? (
          <View style={styles.contextCard}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.contextTitle}>
                {snapshot.vehicle.brand} {snapshot.vehicle.model}
              </Text>
              <Text style={styles.contextCopy}>
                {snapshot.vehicle.year} · {snapshot.vehicle.packageName} · {snapshot.vehicle.fuelType || 'Yakit bilgisi yok'}
              </Text>
            </View>
            <StatusBadge
              label={snapshot.vehicle.obdConnected ? 'OBD bagli' : 'OBD bagli degil'}
              tone={snapshot.vehicle.obdConnected ? 'success' : 'warning'}
            />
          </View>
        ) : (
          <EmptyState title="Arac secimi yok" description="Garajim ekranindan arac eklediginde AI bu baglami kullanir." />
        )}

        <View style={styles.promptRow}>
          {quickPrompts.map((prompt) => (
            <Pressable key={prompt} style={styles.promptChip} onPress={() => sendMessage(prompt)}>
              <Text style={styles.promptChipText}>{prompt}</Text>
            </Pressable>
          ))}
        </View>
      </SectionCard>

      {aiMessages.length ? (
        aiMessages.map((message) => (
          <SectionCard key={message.id}>
            <View style={styles.messageHeader}>
              <Text style={styles.messageRole}>{message.role === 'assistant' ? 'Loi AI' : 'Sen'}</Text>
              {message.provider ? <StatusBadge label={message.provider} tone="neutral" /> : null}
            </View>
            <Text style={styles.messageContent}>{message.content}</Text>
          </SectionCard>
        ))
      ) : (
        <EmptyState title="AI sohbeti hazir" description="Ariza sor, ilan karsilastir veya butcene gore arac onerisi al." />
      )}

      <SectionCard>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Loi AI'ya sorunu yaz"
          placeholderTextColor={tokens.colors.muted}
          style={styles.input}
          multiline
        />
        <PrimaryButton
          label={submitting ? 'Gonderiliyor...' : 'Soruyu gonder'}
          onPress={() => sendMessage(draft)}
          disabled={submitting}
        />
        <PrimaryButton label="Sohbeti temizle" variant="secondary" onPress={clearHistory} disabled={submitting || !aiMessages.length} />
      </SectionCard>

      <ErrorBanner message={error} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  contextCard: {
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    padding: 14,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  contextTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  contextCopy: {
    color: tokens.colors.muted,
    lineHeight: 20,
  },
  promptRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  promptChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: tokens.colors.accentSoft,
  },
  promptChipText: {
    color: tokens.colors.accent,
    fontWeight: '700',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  messageRole: {
    fontWeight: '800',
    color: tokens.colors.text,
  },
  messageContent: {
    color: tokens.colors.text,
    lineHeight: 22,
  },
  input: {
    minHeight: 88,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: tokens.colors.text,
    textAlignVertical: 'top',
  },
});
