"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";

export function FAQ() {
  const faqs = [
    {
      question: "Is the facial recognition system privacy compliant?",
      answer: "Yes. SmartCampus AI employs a zero-trust architecture. We don't store photos; we store mathematical, encrypted vector embeddings of faces using AES-256 encryption. We are fully compliant with GDPR, FERPA, and SOC 2 Type II data security standards."
    },
    {
      question: "Can SmartCampus integrate with our existing SIS or LMS?",
      answer: "Absolutely. We offer robust API endpoints and native integrations with Canvas, Blackboard, Moodle, and major Student Information Systems like Ellucian and Workday. Attendance and engagement data syncs automatically."
    },
    {
      question: "What hardware is required for the classrooms?",
      answer: "Our edge AI models are incredibly efficient. You can either deploy our proprietary SmartCampus Edge Cameras, or we can integrate with your existing IP security cameras by placing an edge computing gateway in your server room."
    },
    {
      question: "How accurate is the AI attendance tracking?",
      answer: "Our proprietary computer vision models achieve over 99.8% accuracy in diverse lighting conditions, accounting for occlusions like glasses, masks, and hats. The system processes multiple faces simultaneously in under 200 milliseconds."
    },
    {
      question: "How long does a typical university deployment take?",
      answer: "For a mid-sized campus (10,000 students), a full deployment including the 3D Digital Twin, SIS integration, and edge device installation typically takes 4 to 6 weeks."
    }
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-24 relative overflow-hidden bg-[#060814]">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.05),transparent_50%)] pointer-events-none" />
      
      <div className="max-w-4xl mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">Frequently Asked Questions</h2>
          <p className="text-gray-400">Everything you need to know about the SmartCampus platform.</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div 
                key={index} 
                className="bg-[#090b16]/60 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md transition-colors"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left text-white hover:bg-white/[0.02] transition-colors focus:outline-none"
                >
                  <span className="font-semibold text-lg">{faq.question}</span>
                  {isOpen ? (
                    <Minus className="w-5 h-5 text-blue-500" />
                  ) : (
                    <Plus className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="px-6 pb-6 text-gray-400 leading-relaxed">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
