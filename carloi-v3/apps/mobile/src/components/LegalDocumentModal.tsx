import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { createLegalModalContract, LEGAL_PACKAGE_NOTICE, type LegalDocumentDefinition, type LegalFlowKey } from '@carloi-v3/legal';

import { theme } from '../theme';

interface LegalDocumentModalProps {
  visible: boolean;
  document: LegalDocumentDefinition | null;
  flow: LegalFlowKey;
  onClose: () => void;
  onAccept: (documentId: string, version: string) => void;
}

export function LegalDocumentModal({
  visible,
  document,
  flow,
  onClose,
  onAccept,
}: LegalDocumentModalProps) {
  if (!document) {
    return null;
  }

  const contract = createLegalModalContract(document, flow);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title}>{contract.modalTitle}</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={22} color={theme.colors.text} />
          </Pressable>
        </View>
        <Text style={styles.meta}>Surum {document.version} • {document.updatedAt}</Text>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.summary}>{document.summary}</Text>
          {document.sections.map((section) => (
            <View key={section.id} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.heading}</Text>
              {section.paragraphs.map((paragraph, index) => (
                <Text key={`${section.id}-${index}`} style={styles.paragraph}>
                  {paragraph}
                </Text>
              ))}
            </View>
          ))}
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{LEGAL_PACKAGE_NOTICE}</Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable onPress={onClose} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Kapat</Text>
          </Pressable>
          <Pressable
            onPress={() => onAccept(document.id, document.version)}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryText}>Kabul et</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: 18,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
  },
  meta: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    color: theme.colors.muted,
    fontSize: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 18,
  },
  summary: {
    color: theme.colors.textSoft,
    lineHeight: 22,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
  },
  paragraph: {
    color: theme.colors.textSoft,
    lineHeight: 22,
  },
  noticeBox: {
    backgroundColor: '#fff7ed',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#fed7aa',
    padding: 14,
  },
  noticeText: {
    color: '#9a3412',
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  secondaryText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: theme.colors.text,
  },
  primaryText: {
    color: theme.colors.surface,
    fontWeight: '800',
  },
});
