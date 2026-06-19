// ─── SmartCampus AI — AI Student Assistant Chat ──────────

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, SafeAreaView,
} from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme/colors';
import { useChatStore } from '../../store/chatStore';
import { CHAT_CONFIG } from '../../constants';
import type { ChatMessage } from '../../types';

const AI_RESPONSES: Record<string, string> = {
  attendance: 'Based on your records, you have attended 111 out of 120 classes this semester. Your current attendance percentage is 92.5%. You missed 9 classes.',
  missed: "You've missed 9 classes this semester. The subjects with most absences are: Database Systems (4 misses), Machine Learning (3), and Data Structures (2).",
  percentage: 'Your overall attendance percentage is 92.5%. By subject: Data Structures 96%, Machine Learning 88%, Database Systems 85%, Algorithms 91%.',
  next: 'Your next class is Data Structures with Dr. Verma in CSE-101 at 9:00 AM tomorrow.',
  engagement: 'Your average engagement score is 78/100. You are most engaged during morning lectures (85/100) and least engaged during afternoon labs (65/100).',
  risk: 'Based on current metrics, you are at LOW risk. Your attendance (92.5%) and engagement (78/100) are above thresholds. Keep up the good work!',
  improve: 'Subjects needing improvement: Database Systems (85% attendance, 65% engagement). Consider participating more in lab sessions.',
};

export const ChatScreen: React.FC = () => {
  const { messages, isTyping, addMessage, setTyping } = useChatStore();
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const getAIResponse = (text: string): string => {
    const lower = text.toLowerCase();
    if (lower.includes('miss') || lower.includes('absent')) return AI_RESPONSES.missed;
    if (lower.includes('percentage') || lower.includes('percent')) return AI_RESPONSES.percentage;
    if (lower.includes('next') || lower.includes('schedule') || lower.includes('when')) return AI_RESPONSES.next;
    if (lower.includes('engagement') || lower.includes('score')) return AI_RESPONSES.engagement;
    if (lower.includes('risk') || lower.includes('danger') || lower.includes('worry')) return AI_RESPONSES.risk;
    if (lower.includes('improve') || lower.includes('weak') || lower.includes('need')) return AI_RESPONSES.improve;
    return AI_RESPONSES.attendance;
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date().toISOString(),
    };
    addMessage(userMessage);
    setInputText('');
    setTyping(true);

    // Simulate AI response delay
    await new Promise(r => setTimeout(r, CHAT_CONFIG.typingDelayMs));

    const aiMessage: ChatMessage = {
      id: `ai-${Date.now()}`,
      text: getAIResponse(userMessage.text),
      sender: 'ai',
      timestamp: new Date().toISOString(),
    };
    addMessage(aiMessage);
    setTyping(false);
  };

  const handleSuggestion = (suggestion: string) => {
    setInputText(suggestion);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <View style={[styles.messageRow, item.sender === 'user' ? styles.userRow : styles.aiRow]}>
      {item.sender === 'ai' && (
        <View style={styles.aiAvatar}>
          <Text style={styles.aiAvatarText}>AI</Text>
        </View>
      )}
      <View style={[styles.messageBubble, item.sender === 'user' ? styles.userBubble : styles.aiBubble]}>
        <Text style={[styles.messageText, item.sender === 'user' && styles.userMessageText]}>
          {item.text}
        </Text>
        <Text style={[styles.messageTime, item.sender === 'user' && styles.userMessageTime]}>
          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );

  const renderSuggestions = () => {
    if (messages.length <= 1) {
      return (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>Try asking:</Text>
          <View style={styles.suggestionsGrid}>
            {CHAT_CONFIG.suggestions.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={styles.suggestionChip}
                onPress={() => handleSuggestion(s.text)}
              >
                <Text style={styles.suggestionIcon}>{s.icon}</Text>
                <Text style={styles.suggestionText}>{s.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesContainer}
          ListFooterComponent={isTyping ? (
            <View style={styles.typingIndicator}>
              <View style={styles.typingDot} />
              <View style={[styles.typingDot, styles.typingDot2]} />
              <View style={[styles.typingDot, styles.typingDot3]} />
            </View>
          ) : null}
          ListHeaderComponent={renderSuggestions}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask me anything..."
            placeholderTextColor={colors.textDim}
            multiline
            maxLength={500}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  flex: { flex: 1 },
  messagesContainer: { padding: spacing.lg, paddingBottom: spacing.md },
  messageRow: { flexDirection: 'row', marginBottom: spacing.md, maxWidth: '85%' },
  userRow: { alignSelf: 'flex-end' },
  aiRow: { alignSelf: 'flex-start' },
  aiAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(34, 211, 238, 0.15)',
    justifyContent: 'center', alignItems: 'center',
    marginRight: spacing.sm, marginTop: 4,
  },
  aiAvatarText: { color: colors.aiBlue, fontSize: 9, fontWeight: fontWeight.bold },
  messageBubble: {
    padding: spacing.md, borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  userBubble: {
    backgroundColor: colors.aiBlue,
    borderColor: colors.aiBlue + '30',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  messageText: { color: colors.textPrimary, fontSize: fontSize.sm, lineHeight: 20 },
  userMessageText: { color: '#fff' },
  messageTime: { color: colors.textMuted, fontSize: 9, marginTop: 4, alignSelf: 'flex-end' },
  userMessageTime: { color: 'rgba(255,255,255,0.7)' },
  typingIndicator: {
    flexDirection: 'row', padding: spacing.md, gap: 4, alignSelf: 'flex-start',
    backgroundColor: colors.bgCard, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  typingDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: colors.aiBlue,
  },
  typingDot2: { opacity: 0.6 },
  typingDot3: { opacity: 0.3 },
  suggestionsContainer: { marginBottom: spacing.lg },
  suggestionsTitle: { color: colors.textMuted, fontSize: fontSize.sm, marginBottom: spacing.md },
  suggestionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  suggestionChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard, borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  suggestionIcon: { fontSize: 12, marginRight: spacing.xs },
  suggestionText: { color: colors.textSecondary, fontSize: fontSize.xs },
  inputContainer: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.bgSecondary,
  },
  input: {
    flex: 1, backgroundColor: colors.bgCard, borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    color: colors.textPrimary, fontSize: fontSize.md,
    maxHeight: 100, borderWidth: 1, borderColor: colors.border,
  },
  sendButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.aiBlue, justifyContent: 'center', alignItems: 'center',
    marginLeft: spacing.sm,
  },
  sendButtonDisabled: { backgroundColor: colors.textDim },
  sendIcon: { color: '#fff', fontSize: 16 },
});
