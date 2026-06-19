// @ts-nocheck
// ─── SmartCampus AI — AI Campus Assistant Panel ───────

'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCampusStore } from '@/store/campusStore';

const SUGGESTIONS = [
  'Show classrooms with low attendance',
  'Which devices are offline?',
  'Which department has highest engagement?',
  'Show predictions for today',
];

const API_RESPONSES: Record<string, string> = {
  'show classrooms with low attendance': '📊 Classrooms with < 75% attendance: CSE-205 (62%), MECH-101 (58%), ECE-304 (71%). Consider sending reminders and scheduling interactive workshops.',
  'which devices are offline': '🔴 Offline Devices: Edge AI JSN-003 (LAB-302) — 25 minutes since last heartbeat. Camera CAM-201 showing warning signs (high temperature).',
  'which department has highest engagement': '🏆 Top Engagement: CSE Department (88%), Central Library (85%), Engineering Block (82%). Lowest: Administration (60%).',
  'show predictions for today': '🔮 Today\'s Predictions: CSE Block will reach 95% occupancy at 10 AM. Afternoon engagement predicted to drop 18%. Mechanical Block attendance trending below 85%.',
};

interface Message {
  text: string;
  isUser: boolean;
}

export function AIAssistantPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { text: '👋 Hi! I\'m your Campus AI assistant. Ask me anything about the campus or click a suggestion below.', isUser: false },
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (text: string) => {
    const query = text.toLowerCase().trim();
    setMessages((prev) => [...prev, { text, isUser: true }]);

    // Find matching response
    const matchedKey = Object.keys(API_RESPONSES).find((k) => query.includes(k));
    const response = matchedKey
      ? API_RESPONSES[matchedKey]
      : '🤖 I can help with: classroom attendance, device status, engagement analytics, and AI predictions. Try one of the suggestions below!';

    setTimeout(() => {
      setMessages((prev) => [...prev, { text: response, isUser: false }]);
    }, 500);
  };

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute bottom-4 left-4 z-20 w-10 h-10 rounded-2xl bg-[#111111]/85 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition-all shadow-xl"
      >
        <span className="text-lg">{isOpen ? '✕' : '🤖'}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-16 left-4 z-20 w-80"
          >
            <div className="backdrop-blur-xl bg-[#111111]/95 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🤖</span>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Campus AI</h3>
                    <span className="text-[10px] text-emerald-400">Online</span>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="h-56 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-white/10">
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed border ${
                        msg.isUser
                          ? 'bg-white/10 border-white/10 text-white rounded-br-md'
                          : 'bg-white/[0.03] border-white/5 text-gray-300 rounded-bl-md'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Suggestions */}
              <div className="px-3 py-2 border-t border-white/5 flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="px-2 py-1 rounded-lg bg-white/[0.03] border border-white/5 text-[10px] text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div className="px-3 py-2 border-t border-white/5">
                <div className="flex gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && input.trim()) { handleSend(input.trim()); setInput(''); } }}
                    placeholder="Ask about campus..."
                    className="flex-1 px-3 py-1.5 rounded-xl bg-black border border-white/10 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30"
                  />
                  <button
                    onClick={() => { if (input.trim()) { handleSend(input.trim()); setInput(''); } }}
                    className="px-3 py-1.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-gray-200 transition-colors"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
