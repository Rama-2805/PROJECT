"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { LogoTicker, SecondaryLogoTicker } from "@/components/landing/LogoTicker";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { InteractiveDashboard } from "@/components/landing/InteractiveDashboard";
import { FeatureTabs } from "@/components/landing/FeatureTabs";
import { RoleSlider } from "@/components/landing/RoleSlider";
import { HowWeAreDifferent } from "@/components/landing/HowWeAreDifferent";
import { TrustCards } from "@/components/landing/TrustCards";
import { Testimonials } from "@/components/landing/Testimonials";
import { Pricing } from "@/components/landing/Pricing";
import { FAQ } from "@/components/landing/FAQ";
import { Footer } from "@/components/landing/Footer";
import { ProgressiveFluxLoader } from "@/components/ui/progressive-flux-loader";

export default function Home() {
  const [loading, setLoading] = useState(true);

  return (
    <>
      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="loader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1] } }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#060814] px-6"
          >
            <div className="w-full max-w-md flex flex-col items-center gap-6">
              {/* Premium brand badge/logo inside loader */}
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="flex items-center gap-2 mb-4"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#1d6ffb] to-[#74e1ff] flex items-center justify-center shadow-lg">
                  <span className="text-white font-black text-sm">S</span>
                </div>
                <span className="text-white font-extrabold tracking-wider text-xl uppercase">SmartCampus AI</span>
              </motion.div>
              <ProgressiveFluxLoader
                duration={3.0}
                loop={false}
                onComplete={() => setLoading(false)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="min-h-screen bg-[#0A0216]">
        <Navbar />
        <HeroSection />
        <LogoTicker />
        <FeatureGrid />
        <SecondaryLogoTicker />
        <InteractiveDashboard />
        <FeatureTabs />
        <RoleSlider />
        <Testimonials />
        <HowWeAreDifferent />
        <TrustCards />
        <Pricing />
        <FAQ />
        <Footer />
      </main>
    </>
  );
}

