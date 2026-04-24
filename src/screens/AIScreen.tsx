import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { getLocale } from '../i18n';
import { theme } from '../theme';
import { AIMessage, AppLanguage, Post, VehicleProfile } from '../types';

interface AIScreenProps {
  language: AppLanguage;
  messages: AIMessage[];
  posts: Post[];
  vehicle?: VehicleProfile;
  isResponding: boolean;
  onClearChat: () => Promise<void> | void;
  onDeleteMessage: (messageId: string) => Promise<void> | void;
  onEditMessage: (messageId: string, content: string) => Promise<void> | void;
  onOpenListing: (post: Post) => void;
  onSendMessage: (message: string) => Promise<void> | void;
}

type ParsedMessageBlock =
  | { type: 'text'; lines: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] };

function cleanInlineMarkdown(value: string) {
  return value
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

function isTableLine(line: string) {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.endsWith('|');
}

function isTableDivider(line: string) {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed
    .split('|')
    .every((cell) => /^[:\-\s]+$/.test(cell.trim()));
}

function parseTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cleanInlineMarkdown(cell));
}

function parseMessageBlocks(content: string) {
  const lines = content.replace(/\r/g, '').split('\n');
  const blocks: ParsedMessageBlock[] = [];
  let textBuffer: string[] = [];

  const flushText = () => {
    if (!textBuffer.length) {
      return;
    }

    blocks.push({ type: 'text', lines: textBuffer });
    textBuffer = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!isTableLine(line)) {
      textBuffer.push(line);
      continue;
    }

    const tableLines = [line];
    let cursor = index + 1;
    while (cursor < lines.length && isTableLine(lines[cursor])) {
      tableLines.push(lines[cursor]);
      cursor += 1;
    }

    const headers = parseTableRow(tableLines[0]);
    const divider = tableLines[1];
    if (headers.length >= 2 && divider && isTableDivider(divider)) {
      flushText();
      blocks.push({
        type: 'table',
        headers,
        rows: tableLines.slice(2).map(parseTableRow).filter((row) => row.length >= 2),
      });
      index = cursor - 1;
      continue;
    }

    textBuffer.push(...tableLines);
    index = cursor - 1;
  }

  flushText();
  return blocks;
}

export function AIScreen({
  language,
  messages,
  posts,
  vehicle,
  isResponding,
  onClearChat,
  onDeleteMessage,
  onEditMessage,
  onOpenListing,
  onSendMessage,
}: AIScreenProps) {
  const locale = getLocale(language);
  const [draft, setDraft] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const suggestedPrompts = useMemo(
    () =>
      language === 'en'
        ? [
            'Which car should we buy today?',
            'Find the best automatic sedan under my budget',
            'Estimate my car market value',
            'Write a strong listing description for my vehicle',
          ]
        : [
            'Bugün hangi arabayı alıyoruz?',
            'Bütçeme göre en iyi otomatik sedanı bul',
            'Kendi aracımın piyasa değerini hesapla',
            'Aracım için güçlü bir ilan açıklaması yaz',
          ],
    [language],
  );

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, isResponding]);

  useEffect(() => {
    if (!editingMessageId) {
      return;
    }

    const editedMessage = messages.find((message) => message.id === editingMessageId);
    if (!editedMessage) {
      setEditingMessageId(null);
      setDraft('');
    }
  }, [editingMessageId, messages]);

  const send = async () => {
    if (!draft.trim() || isResponding) {
      return;
    }

    const nextDraft = draft.trim();
    setDraft('');
    if (editingMessageId) {
      const targetMessageId = editingMessageId;
      setEditingMessageId(null);
      await onEditMessage(targetMessageId, nextDraft);
      return;
    }

    await onSendMessage(nextDraft);
  };

  const handleLongPressMessage = (message: AIMessage) => {
    if (message.role === 'user' && message.canEdit) {
      Alert.alert('AI mesajı', 'Bu mesaj için ne yapmak istersin?', [
        {
          text: 'Düzenle',
          onPress: () => {
            setDraft(message.content);
            setEditingMessageId(message.id);
          },
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            void onDeleteMessage(message.id);
          },
        },
        { text: 'Vazgeç', style: 'cancel' },
      ]);
      return;
    }

    Alert.alert('AI mesajı', 'Bu mesajı silmek ister misin?', [
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          void onDeleteMessage(message.id);
        },
      },
      { text: 'Vazgeç', style: 'cancel' },
    ]);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
      style={styles.screen}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        <View style={styles.vehicleBar}>
          <View style={styles.vehicleCopy}>
            <Text style={styles.vehicleLabel}>{locale.ai.vehicleContext}</Text>
            <Text style={styles.vehicleText}>
              {vehicle
                ? `${vehicle.brand} ${vehicle.model} ${vehicle.year} • OBD ${
                    vehicle.obdConnected ? locale.ai.connected : locale.ai.disconnected
                  }`
                : locale.ai.noVehicle}
            </Text>
          </View>
          <View style={styles.vehicleActions}>
            {messages.length ? (
              <Pressable
                onPress={() => {
                  Alert.alert(
                    language === 'en' ? 'Clear chat' : 'Sohbeti temizle',
                    language === 'en'
                      ? 'This will remove the current AI conversation.'
                      : 'Bu işlem mevcut AI konuşmasını temizler.',
                    [
                      { text: language === 'en' ? 'Cancel' : 'Vazgeç', style: 'cancel' },
                      {
                        text: language === 'en' ? 'Clear' : 'Temizle',
                        style: 'destructive',
                        onPress: () => {
                          void onClearChat();
                        },
                      },
                    ],
                  );
                }}
                style={styles.vehicleIconButton}
              >
                <Feather color={theme.colors.textSoft} name="trash-2" size={16} />
              </Pressable>
            ) : null}
            <View style={styles.vehicleCpu}>
              <Feather color={theme.colors.primary} name="cpu" size={18} />
            </View>
          </View>
        </View>

        <View style={styles.chat}>
          {messages.length ? (
            messages.map((message) => (
            <AIMessageBubble
              key={message.id}
              editedLabel={language === 'en' ? 'Edited' : 'Düzenlendi'}
              locale={locale}
              message={message}
              onLongPress={handleLongPressMessage}
                onOpenListing={onOpenListing}
                posts={posts}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {language === 'en' ? 'How can Loi AI help today?' : 'Loi AI bugün nasıl yardımcı olsun?'}
              </Text>
              <Text style={styles.emptyText}>
                {language === 'en'
                  ? 'Ask about buying, pricing, comparisons, listing copy or faults.'
                  : 'Alım, fiyat, karşılaştırma, ilan açıklaması veya arıza hakkında soru sor.'}
              </Text>
              <View style={styles.promptGrid}>
                {suggestedPrompts.map((prompt) => (
                  <Pressable
                    key={prompt}
                    onPress={() => setDraft(prompt)}
                    style={styles.promptCard}
                  >
                    <Text style={styles.promptCardText}>{prompt}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {isResponding ? (
            <View style={[styles.messageRow, styles.messageRowAi]}>
              <View style={styles.aiBadge}>
                <Text style={styles.aiBadgeText}>L</Text>
              </View>
              <View style={[styles.bubble, styles.bubbleAi]}>
                <Text style={styles.loadingText}>{locale.ai.loading}</Text>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.composerDock}>
        {editingMessageId ? (
          <View style={styles.editingBar}>
            <View style={styles.editingCopy}>
              <Text style={styles.editingTitle}>
                {language === 'en' ? 'Editing message' : 'Mesaj düzenleniyor'}
              </Text>
              <Text style={styles.editingHint}>
                {language === 'en'
                  ? 'Saving will re-run Loi AI with the updated message.'
                  : 'Kaydettiğinde Loi AI bu mesajı tekrar işleyip yeni cevap üretecek.'}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setEditingMessageId(null);
                setDraft('');
              }}
              style={styles.editingClose}
            >
              <Feather color={theme.colors.textSoft} name="x" size={16} />
            </Pressable>
          </View>
        ) : null}
        <View style={styles.composerInputRow}>
          <TextInput
            multiline
            editable={!isResponding}
            onChangeText={setDraft}
            placeholder={locale.ai.placeholder}
            placeholderTextColor={theme.colors.textSoft}
            style={styles.input}
            value={draft}
          />
          <Pressable
            disabled={isResponding}
            onPress={() => {
              void send();
            }}
            style={[styles.sendButton, isResponding && styles.sendButtonDisabled]}
          >
            <Feather color={theme.colors.card} name="send" size={16} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function AIMessageBubble({
  editedLabel,
  locale,
  message,
  posts,
  onLongPress,
  onOpenListing,
}: {
  editedLabel: string;
  locale: ReturnType<typeof getLocale>;
  message: AIMessage;
  posts: Post[];
  onLongPress: (message: AIMessage) => void;
  onOpenListing: (post: Post) => void;
}) {
  const mine = message.role === 'user';
  const relatedListings = useMemo(
    () =>
      (message.relatedPostIds ?? [])
        .map((postId) => posts.find((post) => post.id === postId))
        .filter((post): post is Post => Boolean(post && post.type === 'listing')),
    [message.relatedPostIds, posts],
  );

  return (
    <View style={[styles.messageRow, mine ? styles.messageRowMine : styles.messageRowAi]}>
      {!mine ? (
        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>L</Text>
        </View>
      ) : null}

      <View style={styles.messageStack}>
        <Pressable
          delayLongPress={220}
          onLongPress={() => onLongPress(message)}
          style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleAi]}
        >
          <AIMessageContent content={message.content} mine={mine} />
          {message.editedAt ? (
            <Text style={[styles.editedLabel, mine && styles.editedLabelMine]}>
              {editedLabel}
            </Text>
          ) : null}
        </Pressable>

        {!mine && relatedListings.length ? (
          <View style={styles.relatedWrap}>
            <Text style={styles.relatedLabel}>{locale.ai.relatedListings}</Text>
            {relatedListings.map((post) => (
              <Pressable
                key={post.id}
                onPress={() => onOpenListing(post)}
                style={styles.relatedCard}
              >
                <View style={styles.relatedTop}>
                  <Text numberOfLines={1} style={styles.relatedTitle}>
                    {post.listing?.title}
                  </Text>
                  <Feather color={theme.colors.primary} name="arrow-up-right" size={14} />
                </View>
                <Text style={styles.relatedPrice}>{post.listing?.price}</Text>
                <Text numberOfLines={1} style={styles.relatedMeta}>
                  {post.listing?.location}
                </Text>
                <Text numberOfLines={1} style={styles.relatedMeta}>
                  {post.listing?.summaryLine}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function AIMessageContent({
  content,
  mine,
}: {
  content: string;
  mine: boolean;
}) {
  const blocks = useMemo(() => parseMessageBlocks(content), [content]);

  return (
    <View style={styles.blockStack}>
      {blocks.map((block, blockIndex) => {
        if (block.type === 'table') {
          return (
            <ScrollView
              horizontal
              key={`table-${blockIndex}`}
              showsHorizontalScrollIndicator={false}
              style={styles.tableWrap}
            >
              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableRowHeader]}>
                  {block.headers.map((header, headerIndex) => (
                    <View
                      key={`${header}-${headerIndex}`}
                      style={[
                        styles.tableCell,
                        styles.tableCellHeader,
                        headerIndex === 0 && styles.tableCellFirst,
                      ]}
                    >
                      <Text
                        numberOfLines={2}
                        style={[styles.tableCellText, mine && styles.tableCellTextMine, styles.tableCellHeaderText]}
                      >
                        {header}
                      </Text>
                    </View>
                  ))}
                </View>

                {block.rows.map((row, rowIndex) => (
                  <View key={`row-${rowIndex}`} style={styles.tableRow}>
                    {row.map((cell, cellIndex) => (
                      <View
                        key={`${rowIndex}-${cellIndex}`}
                        style={[styles.tableCell, cellIndex === 0 && styles.tableCellFirst]}
                      >
                        <Text style={[styles.tableCellText, mine && styles.tableCellTextMine]}>
                          {cell}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          );
        }

        return (
          <View key={`text-${blockIndex}`} style={styles.textBlock}>
            {block.lines.map((line, lineIndex) => {
              const headingMatch = cleanInlineMarkdown(line).match(/^#{1,3}\s+(.*)$/);
              const contentLine = headingMatch ? headingMatch[1] : cleanInlineMarkdown(line);
              const isHeading = Boolean(headingMatch);
              const isBullet = /^[-•]\s+/.test(contentLine) || /^\d+\.\s+/.test(contentLine);

              if (!contentLine.length) {
                return <View key={`space-${lineIndex}`} style={styles.blockSpacer} />;
              }

              return (
                <Text
                  key={`line-${lineIndex}`}
                  style={[
                    styles.bubbleText,
                    mine && styles.bubbleTextMine,
                    isHeading && styles.bubbleHeading,
                    isHeading && mine && styles.bubbleHeadingMine,
                    isBullet && styles.bubbleBullet,
                  ]}
                >
                  {contentLine}
                </Text>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.md,
  },
  vehicleBar: {
    marginHorizontal: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  vehicleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  vehicleIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  vehicleCpu: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleCopy: {
    flex: 1,
    gap: 2,
  },
  vehicleLabel: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  vehicleText: {
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  chat: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.md,
  },
  messageRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'flex-end',
  },
  messageRowMine: {
    justifyContent: 'flex-end',
  },
  messageRowAi: {
    justifyContent: 'flex-start',
  },
  messageStack: {
    maxWidth: '84%',
    gap: theme.spacing.sm,
  },
  editedLabel: {
    color: theme.colors.textSoft,
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
  editedLabelMine: {
    color: '#DDFBFF',
  },
  aiBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySoft,
  },
  aiBadgeText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  bubble: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 20,
  },
  bubbleAi: {
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: 8,
  },
  bubbleMine: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 8,
  },
  bubbleText: {
    color: theme.colors.text,
    lineHeight: 21,
  },
  bubbleTextMine: {
    color: theme.colors.card,
  },
  blockStack: {
    gap: theme.spacing.sm,
  },
  textBlock: {
    gap: theme.spacing.xs,
  },
  blockSpacer: {
    height: 2,
  },
  bubbleHeading: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
    color: theme.colors.accent,
  },
  bubbleHeadingMine: {
    color: theme.colors.card,
  },
  bubbleBullet: {
    paddingLeft: 2,
  },
  tableWrap: {
    marginTop: 2,
  },
  table: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  tableRowHeader: {
    borderTopWidth: 0,
    backgroundColor: theme.colors.primarySoft,
  },
  tableCell: {
    minWidth: 108,
    maxWidth: 180,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 10,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
  },
  tableCellFirst: {
    borderLeftWidth: 0,
  },
  tableCellHeader: {
    borderLeftWidth: 0,
  },
  tableCellText: {
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 17,
  },
  tableCellTextMine: {
    color: theme.colors.text,
  },
  tableCellHeaderText: {
    color: theme.colors.primary,
    fontWeight: '800',
  },
  relatedWrap: {
    gap: theme.spacing.xs,
  },
  emptyState: {
    minHeight: 360,
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    color: theme.colors.textSoft,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 320,
  },
  promptGrid: {
    width: '100%',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  promptCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
  },
  promptCardText: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  relatedLabel: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  relatedCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    gap: 4,
  },
  relatedTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  relatedTitle: {
    flex: 1,
    color: theme.colors.text,
    fontWeight: '800',
  },
  relatedPrice: {
    color: theme.colors.primary,
    fontWeight: '800',
  },
  relatedMeta: {
    color: theme.colors.textSoft,
    fontSize: 13,
    lineHeight: 18,
  },
  loadingText: {
    color: theme.colors.textSoft,
    fontStyle: 'italic',
  },
  composerDock: {
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  editingBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    paddingHorizontal: 2,
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
  composerInputRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    minHeight: 56,
    maxHeight: 112,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    color: theme.colors.text,
    textAlignVertical: 'top',
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

