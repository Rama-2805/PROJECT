import React from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { Brain } from "lucide-react";
import { GlassButton } from "./GlassButton";

export function GlassNavbar() {
  const { scrollY } = useScroll();
  
  // Transform values for organic scroll response
  const width = useTransform(scrollY, [0, 100], ["100%", "80%"]);
  const y = useTransform(scrollY, [0, 100], [0, 10]);
  const blur = useTransform(scrollY, [0, 100], ["10px", "40px"]);
  const bgColor = useTransform(scrollY, [0, 100], ["rgba(255,255,255,0.05)", "rgba(255,255,255,0.15)"]);

  return (
    <motion.nav 
      className="fixed top-0 inset-x-0 z-50 flex justify-center py-4 px-6 pointer-events-none"
      style={{ y }}
    >
      <motion.div 
        style={{ width, backdropFilter: `blur(40px) saturate(200%)`, WebkitBackdropFilter: `blur(40px) saturate(200%)`, backgroundColor: bgColor }}
        className="pointer-events-auto max-w-7xl rounded-[2rem] px-6 py-4 flex items-center justify-between border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,0.35),inset_0_1px_2px_rgba(255,255,255,0.8)] transition-all"
      >
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-ai-blue to-ai-purple flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.5)] group-hover:scale-110 transition-transform">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold tracking-tight text-xl hidden sm:block">SmartCampus</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
          {["Features", "AI Technology", "Digital Twin", "Solutions", "Pricing"].map(item => (
            <a key={item} href={`#${item.toLowerCase().replace(" ", "-")}`} className="relative hover:text-white transition-colors group">
              {item}
              <span className="absolute -bottom-2 left-0 w-full h-[2px] bg-ai-blue scale-x-0 group-hover:scale-x-100 transition-transform origin-left rounded-full" />
            </a>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <Link href="/auth/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors hidden sm:block">
            Login
          </Link>
          <GlassButton variant="primary" magnetic={false} className="!px-6 !py-2 !rounded-2xl !text-sm">
            Start AI Demo
          </GlassButton>
        </div>
      </motion.div>
    </motion.nav>
  );
}
