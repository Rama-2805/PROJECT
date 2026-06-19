"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Cloud, Globe } from "lucide-react";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Features", href: "#features" },
    { name: "Solutions", href: "#solutions" },
    { name: "Technology", href: "#technology" },
    { name: "Resources", href: "#resources" },
    { name: "Pricing", href: "#pricing" },
  ];

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-4">
      <motion.nav
        className={`w-full max-w-[1400px] flex items-center justify-between px-8 py-4 rounded-[20px] transition-all duration-300 backdrop-blur-[35px] border ${
          scrolled
            ? "bg-[#060814]/85 border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
            : "bg-[#060814]/45 border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.2)]"
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
      >
        <Link href="/" className="flex items-center gap-3 group">
          <Cloud className="w-8 h-8 text-white fill-white group-hover:scale-105 transition-transform" />
          <div className="flex flex-col">
            <span className="text-[1.35rem] font-bold text-white leading-none tracking-wider">SMARTCAMPUS</span>
            <span className="text-[0.6rem] font-semibold text-gray-500 uppercase tracking-widest mt-0.5">Intelligent Education</span>
          </div>
        </Link>

        {/* Liquid Glass Hover Pill Navigation */}
        <div 
          className="hidden lg:flex items-center gap-1 text-[15px] font-medium text-gray-300 relative py-1"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {navLinks.map((link, idx) => (
            <Link
              key={link.name}
              href={link.href}
              className={`relative px-5 py-2.5 transition-colors duration-250 rounded-xl flex items-center justify-center ${
                hoveredIndex === idx ? "text-white font-semibold" : "text-gray-400 hover:text-white"
              }`}
              onMouseEnter={() => setHoveredIndex(idx)}
            >
              <span className="relative z-10">{link.name}</span>
              <AnimatePresence>
                {hoveredIndex === idx && (
                  <motion.span
                    layoutId="navbar-hover-pill"
                    className="absolute inset-0 rounded-xl bg-white/5 border border-white/10 shadow-[0_4px_12px_rgba(255,255,255,0.05)]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 28,
                      mass: 0.8,
                    }}
                  />
                )}
              </AnimatePresence>
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/5 text-gray-400 hover:text-white cursor-pointer transition-colors">
            <Globe className="w-5 h-5" />
          </div>
          <div className="hidden md:flex items-center gap-2">
             <Link href="/login" className="relative text-[15px] font-semibold text-gray-300 hover:text-white px-4 py-3 transition-colors rounded-xl group overflow-hidden">
                <span className="relative z-10">Sign in</span>
                <div className="absolute inset-0 bg-white/[0.03] opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
             </Link>
             <button className="relative bg-white hover:bg-gray-200 text-black px-6 py-3 rounded-xl text-[15px] font-semibold overflow-hidden transition-all duration-300 shadow-[0_4px_12px_rgba(255,255,255,0.1)] hover:shadow-[0_6px_20px_rgba(255,255,255,0.2)] group cursor-pointer">
               <span className="relative z-10">Book a demo</span>
               {/* Gloss shimmer overlay */}
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-[-100%] group-hover:animate-shimmer pointer-events-none" />
             </button>
          </div>
        </div>
      </motion.nav>
    </div>
  );
}
