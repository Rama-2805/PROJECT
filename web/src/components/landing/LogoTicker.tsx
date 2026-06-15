"use client";

import React from "react";
import { motion } from "framer-motion";

const logos = [
  "Acme Corp", "Quantum", "Echo Valley", "Celestia", "Pulse", "Apex", "Acme Corp", "Quantum", "Echo Valley", "Celestia", "Pulse", "Apex"
];

export function LogoTicker() {
  return (
    <div className="w-full bg-[#050505] py-12 overflow-hidden border-t border-white/5 border-b">
      <div className="text-center mb-6">
         <p className="text-gray-500 text-sm font-semibold uppercase tracking-widest">Trusted by innovative universities worldwide</p>
      </div>
      <div className="flex w-[200%]">
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ ease: "linear", duration: 30, repeat: Infinity }}
          className="flex gap-24 pr-24 items-center whitespace-nowrap"
        >
          {logos.map((logo, index) => (
            <span key={index} className="text-gray-400 text-xl font-bold font-serif opacity-50">
               {logo}
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

export function SecondaryLogoTicker() {
  return (
    <div className="w-full bg-black py-12 overflow-hidden">
      <div className="text-center mb-6">
         <div className="inline-flex px-3 py-1 rounded-full border border-white/20 text-[11px] font-bold text-gray-300 mb-6 uppercase tracking-widest bg-white/5">
            [ Global Adoption ]
          </div>
         <p className="text-white text-xl md:text-2xl font-medium tracking-tight">#1 choice for intelligent education.</p>
      </div>
      <div className="flex w-[200%] opacity-40">
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ ease: "linear", duration: 25, repeat: Infinity }}
          className="flex gap-24 pr-24 items-center whitespace-nowrap"
        >
          {logos.map((logo, index) => (
            <span key={index} className="text-gray-400 text-xl font-bold font-serif">
               {logo}
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
