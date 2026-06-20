"use client";

import React from "react";
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

export default function Home() {
  return (
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
  );
}

