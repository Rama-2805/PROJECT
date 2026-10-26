// @ts-nocheck
// ─── SmartCampus AI — AI Campus Assistant Panel ───────

'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCampusStore } from '@/store/campusStore';
import { Bot, X, Send, Sparkles, MessageSquare } from 'lucide-react';

const SUGGESTIONS = [
  'Show classrooms with low attendance',
  'Which devices are offline?',
  'Which department has highest engagement?',
  'Show predictions for today',
];

const API_RESPONSES: Record<string, string> = {
  'show classrooms with low attendance': '📊 Classrooms with < 75% attendance: CSE-205 (62%), MECH-101 (58%), ECE-304 (71%). Automated parent notices prepared in Reports Center.',
  'which devices are offline': '🔴 Offline Devices: Edge AI JSN-003 (ENG Block) — 25 minutes since last heartbeat. Camera CAM-201 showing warning signs (high temperature 65°C).',
  'which department has highest engagement': '🏆 Top Engagement: CSE Department (88%), Central Library (85%), Engineering Block (82%). Lowest: Administration (60%).',
  'show predictions for today': '🔮 Today\'s Predictions: CSE Block will reach 95% occupancy at 10 AM. Afternoon engagement predicted to drop 18% around 2 PM.',
};

interface Message {
  text: string;
  isUser: boolean;
}

export function AIAssistantPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { text: '👋 Hi! I am your Campus AI assistant. Ask me anything about classroom occupancy, IoT devices, or student attendance.', isUser: false },
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && isOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = (text: string) => {
    const query = text.toLowerCase().trim();
    if (!query) return;
    setMessages((prev) => [...prev, { text, isUser: true }]);
    setInput('');

    // Find matching response
    const matchedKey = Object.keys(API_RESPONSES).find((k) => query.includes(k));
    const response = matchedKey
      ? API_RESPONSES[matchedKey]
      : '🤖 I monitor campus operations: ask about low attendance, edge camera status, classroom occupancy, or AI predictions!';

    setTimeout(() => {
      setMessages((prev) => [...prev, { text: response, isUser: false }]);
    }, 400);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <div className="absolute bottom-4 left-4 z-40 pointer-events-auto">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-2 rounded-2xl backdrop-blur-2xl border transition-all shadow-xl font-medium text-xs ${
            isOpen
              ? 'bg-ai-blue text-black border-ai-blue/40 shadow-ai-blue/20'
              : 'bg-[#0b0f19]/90 text-white border-white/15 hover:bg-white/15'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>{isOpen ? 'Close AI' : 'Campus AI'}</span>
          {!isOpen && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
          )}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-16 left-4 z-40 w-80 sm:w-96 pointer-events-auto"
          >
            <div className="backdrop-blur-2xl bg-[#0b0f19]/95 rounded-2xl border border-white/15 shadow-2xl overflow-hidden flex flex-col">
              {/* Header */}
              <div className="px-4 py-3 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-lg bg-ai-blue/20 text-ai-blue border border-ai-blue/30">
                    <Sparkles className="w-3.5 h-3.5" />
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-white">Campus AI Assistant</h3>
                    <span className="text-[10px] text-emerald-400 font-mono">Agent Active • Connected</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Chat Messages */}
              <div ref={scrollRef} className="h-60 overflow-y-auto p-3 space-y-2.5 scrollbar-thin scrollbar-thumb-white/10">
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed border ${
                        msg.isUser
                          ? 'bg-ai-blue/20 border-ai-blue/30 text-white rounded-br-sm'
                          : 'bg-white/[0.04] border-white/10 text-gray-200 rounded-bl-sm'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Suggestions */}
              <div className="p-2 border-t border-white/5 bg-black/20 flex flex-wrap gap-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="text-[10px] px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300 hover:text-white transition-colors truncate max-w-full"
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Input field */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend(input);
                }}
                className="p-2.5 border-t border-white/10 flex items-center gap-2 bg-white/[0.01]"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything about the campus..."
                  className="flex-1 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-ai-blue"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="p-1.5 rounded-xl bg-ai-blue disabled:opacity-30 text-black font-semibold hover:bg-ai-blue/90 transition-all shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}