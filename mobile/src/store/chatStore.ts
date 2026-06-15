// ─── SmartCampus AI — Chat Store (Zustand) ───────────────

import { create } from 'zustand';
import type { ChatMessage } from '../types';
import { CHAT_CONFIG } from '../constants';

interface ChatStore {
  messages: ChatMessage[];
  isTyping: boolean;
  addMessage: (message: ChatMessage) => void;
  setTyping: (value: boolean) => void;
  clearMessages: () => void;
}

const initialMessages: ChatMessage[] = [
  {
    id: 'welcome',
    text: "Hi! I'm your AI Student Assistant. I can help you with attendance, grades, schedules, and more. What would you like to know?",
    sender: 'ai',
    timestamp: new Date().toISOString(),
  },
];

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: initialMessages,
  isTyping: false,

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message].slice(-CHAT_CONFIG.maxHistoryMessages),
    })),

  setTyping: (value) => set({ isTyping: value }),

  clearMessages: () => set({ messages: initialMessages }),
}));
