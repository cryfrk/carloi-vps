import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { chatWithAi, clearAiChat } from '../lib/api';
import { extractSnapshot } from '../lib/api';
import { StateCard } from '../components/StateCard';
import { useGarageStore } from '../store/garage-store';
import { useSessionStore } from '../store/session-store';
import { theme } from '../theme';

export function LoiAiScreen() {
  const snapshot = useSessionStore((state) => state.snapshot);
  const setSnapshot = useSessionStore((state) => state.setSnapshot);
  const refreshSnapshot = useSessionStore((state) => state.refreshSnapshot);
  const selectedVehicleId = useGarageStore((state) => state.selectedVehicleId);
  const vehicles = useGarageStore((state) => state.vehicles);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const selectedVehicle = vehicles.find((item) => item.id === selectedVehicleId);

  async function handleSend() {
    if (!message.trim()) {
      return;
    }

    setLoading(true);
    setLocalError(null);
    try {
      const contextualMessage = selectedVehicle
        ? `Secili arac: ${selectedVehicle.selection.brandNameManual || selectedVehicle.selection.brandSlug || ''} ${selectedVehicle.selection.modelNameManual || selectedVehicle.selection.modelSlug || ''}. ${message.trim()}`
        : message.trim();
      const envelope = await chatWithAi(contextualMessage, {
        location: snapshot?.settings?.profileVisibility || 'turkiye',
      });
      const nextSnapshot = extractSnapshot(envelope);
      if (nextSnapshot) {
        setSnapshot(nextSnapshot);
      } else {
        await refreshSnapshot();
      }
      setMessage('');
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'AI yanit veremedi.');
    } finally {
      setLoading(false);
    }
  }

  async function handleClear() {
    setLoading(true);
    try {
      const envelope = await clearAiChat();
      const nextSnapshot = extractSnapshot(envelope);
      if (nextSnapshot) {
        setSnapshot(nextSnapshot);
      } else {
        await refreshSnapshot();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Loi AI</Text>
        <Text style={styles.subtitle}>
          Ilan karsilastir, arac sagligi sor, OBD verini yorumlat veya butcene gore arac onerisi al.
        </Text>

        {selectedVehicle ? (
          <View style={styles.contextCard}>
            <Text style={styles.contextTitle}>Secili arac baglami aktif</Text>
            <Text style={styles.contextText}>
              {selectedVehicle.selection.brandNameManual || selectedVehicle.selection.brandSlug} {' '}
              {selectedVehicle.selection.modelNameManual || selectedVehicle.selection.modelSlug}
            </Text>
          </View>
        ) : null}

        <ScrollView contentContainerStyle={styles.messages}>
          {(snapshot?.aiMessages || []).map((item) => (
            <View
              key={item.id}
              style={[styles.messageBubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}
            >
              <Text style={styles.messageRole}>{item.role === 'user' ? 'Sen' : 'Loi AI'}</Text>
              <Text style={styles.messageText}>{item.content}</Text>
            </View>
          ))}

          {(!snapshot?.aiMessages || snapshot.aiMessages.length === 0) ? (
            <StateCard
              title="AI sohbete hazir"
              description="Arac arizasi, ilan analizi, butceye gore arac secimi ve ekspertiz yorumu icin hemen soru sorabilirsin."
            />
          ) : null}

          {localError ? (
            <StateCard
              title="AI gecici olarak yanit veremiyor"
              description={localError}
              tone="warning"
            />
          ) : null}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Loi AI'a soru sor"
            multiline
            style={styles.input}
          />
          <View style={styles.actions}>
            <Pressable onPress={() => void handleClear()} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>Temizle</Text>
            </Pressable>
            <Pressable onPress={() => void handleSend()} style={styles.primaryButton}>
              <Text style={styles.primaryText}>{loading ? 'Gonderiliyor...' : 'Gonder'}</Text>
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
    fontSize: 24,
    fontWeight: '900',
    color: theme.colors.text,
  },
  subtitle: {
    color: theme.colors.textSoft,
    lineHeight: 22,
  },
  contextCard: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: theme.colors.accentSoft,
    gap: 4,
  },
  contextTitle: {
    fontWeight: '800',
    color: theme.colors.accent,
  },
  contextText: {
    color: theme.colors.text,
  },
  messages: {
    gap: 12,
    paddingVertical: 8,
  },
  messageBubble: {
    borderRadius: 20,
    padding: 14,
    gap: 6,
  },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '88%',
    backgroundColor: theme.colors.text,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    maxWidth: '92%',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  messageRole: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.muted,
  },
  messageText: {
    color: theme.colors.text,
    lineHeight: 21,
  },
  composer: {
    gap: 10,
  },
  input: {
    minHeight: 110,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: 14,
    textAlignVertical: 'top',
  },
  actions: {
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
