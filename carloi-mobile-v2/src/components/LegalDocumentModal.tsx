import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { LegalDocument } from '@/lib/consents';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { tokens } from '@/theme/tokens';

export function LegalDocumentModal({
  visible,
  document,
  accepted,
  onClose,
  onAccept,
}: {
  visible: boolean;
  document: LegalDocument | null;
  accepted: boolean;
  onClose: () => void;
  onAccept: () => void;
}) {
  if (!document) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{document.title}</Text>
              <Text style={styles.meta}>
                Surum {document.version} · Son guncelleme {document.updatedAt}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>Kapat</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <View style={styles.notice}>
              <Text style={styles.noticeTitle}>Hukuki not</Text>
              <Text style={styles.noticeText}>
                Bu metin urun ici hukuki taslak niteligindedir. Canli kullanim oncesinde hukuk danismani
                tarafindan son incelemeden gecirilmelidir.
              </Text>
            </View>

            {document.sections.map((section) => (
              <View key={section.heading} style={styles.section}>
                <Text style={styles.sectionHeading}>{section.heading}</Text>
                {section.paragraphs.map((paragraph) => (
                  <Text key={paragraph} style={styles.paragraph}>
                    {paragraph}
                  </Text>
                ))}
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <PrimaryButton
              label={accepted ? 'Kabul edildi' : 'Okudum ve kabul ediyorum'}
              onPress={onAccept}
              disabled={accepted}
            />
            <PrimaryButton label="Kapat" variant="secondary" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: tokens.colors.surface,
    padding: 20,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  meta: {
    marginTop: 4,
    color: tokens.colors.muted,
    fontSize: 12,
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
  },
  closeText: {
    color: tokens.colors.text,
    fontWeight: '700',
  },
  scroll: {
    maxHeight: 520,
  },
  scrollContent: {
    gap: 18,
    paddingBottom: 12,
  },
  notice: {
    borderRadius: 18,
    backgroundColor: '#fff7ed',
    padding: 14,
    gap: 6,
  },
  noticeTitle: {
    fontWeight: '700',
    color: tokens.colors.text,
  },
  noticeText: {
    color: tokens.colors.muted,
    lineHeight: 20,
  },
  section: {
    gap: 10,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: tokens.colors.text,
  },
  paragraph: {
    color: tokens.colors.text,
    lineHeight: 22,
  },
  footer: {
    gap: 10,
  },
});
