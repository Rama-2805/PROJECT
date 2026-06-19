"use client";

import React, { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { ScanFace, CheckCircle, ShieldAlert, Cpu, Camera, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

export default function StudentFaceProfilePage() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<string | null>(null);

  const handleTestVerify = () => {
    setIsVerifying(true);
    setVerificationResult(null);
    setTimeout(() => {
      setIsVerifying(false);
      setVerificationResult("Success! Match confidence: 99.64%. Identity fully authenticated.");
    }, 1500);
  };

  const biometricLogs = [
    { timestamp: "June 20, 2026, 10:02:11 AM", location: "Classroom 402 (CS-301)", scanner: "CAM-402-A", confidence: "99.42%", status: "Approved" },
    { timestamp: "June 18, 2026, 02:05:40 PM", location: "Seminar Hall 1 (CS-402)", scanner: "CAM-SEM-1", confidence: "98.71%", status: "Approved" },
    { timestamp: "June 17, 2026, 10:03:02 AM", location: "Classroom 402 (CS-301)", scanner: "CAM-402-A", confidence: "99.11%", status: "Approved" },
    { timestamp: "June 16, 2026, 09:05:15 AM", location: "Computing Lab 3 (CS-101)", scanner: "CAM-LAB-3", confidence: "98.92%", status: "Approved" }
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-text-primary">AI Biometric Identity Registry</h2>
        <p className="text-xs text-text-muted">Manage your face recognition templates, test recognition feeds, and review biometric telemetry matches.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Biometric Registry Status Card */}
        <div className="lg:col-span-1 space-y-6">
          <GlassCard className="p-6 flex flex-col items-center text-center relative overflow-hidden">
            {/* Ambient scan animation background */}
            <div className="absolute inset-0 bg-radial-glow opacity-30 pointer-events-none" />
            
            {/* Glowing biometric visualizer circles */}
            <div className="relative w-28 h-28 rounded-full border border-blue-500/30 flex items-center justify-center p-2 mb-4 animate-glow-pulse">
              <div className="w-full h-full rounded-full border border-blue-400/50 border-dashed animate-spin duration-10000 flex items-center justify-center">
                <ScanFace className="w-12 h-12 text-blue-400" />
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider mb-2 font-mono">
              <CheckCircle className="w-3.5 h-3.5" /> ENROLLED & ACTIVE
            </div>
            
            <h3 className="text-sm font-semibold text-text-primary font-mono uppercase">Biometric Face Registry</h3>
            <p className="text-[10px] text-text-muted mt-1 leading-relaxed">Your template is stored as secure cryptographic feature vectors. It cannot be converted back into raw images.</p>

            <div className="w-full border-t border-glass-border/30 mt-6 pt-4 space-y-2 text-left font-mono text-[10px]">
              <div className="flex justify-between">
                <span className="text-text-muted">Template Version:</span>
                <span className="text-text-secondary">FaceNet v3.2</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Vector Size:</span>
                <span className="text-text-secondary">512 Dimensions</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Min Threshold:</span>
                <span className="text-text-secondary">85.0% Match Rate</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Encryption:</span>
                <span className="text-text-secondary">SHA-256 Hashed Vector</span>
              </div>
            </div>

            <div className="w-full mt-6 space-y-2">
              <Button size="sm" className="w-full flex items-center justify-center gap-1.5" onClick={handleTestVerify}>
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifying...
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5" /> Test Biometric Verification
                  </>
                )}
              </Button>
            </div>
          </GlassCard>

          {verificationResult && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-500/15 border border-emerald-500/35 rounded-xl p-3.5 text-xs text-emerald-400 font-mono"
            >
              {verificationResult}
            </motion.div>
          )}
        </div>

        {/* Biometric Scan Logs */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-4 border-b border-glass-border pb-3">
              <Cpu className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-text-primary font-mono uppercase tracking-wider">Telemetry Verification Logs</h3>
            </div>

            <div className="space-y-4">
              {biometricLogs.map((log, i) => (
                <div key={i} className="p-4 rounded-xl border border-glass-border bg-glass-light/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:border-blue-500/20 transition-all">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-text-primary">{log.location}</p>
                    <p className="text-[10px] text-text-muted font-mono">Scanner: {log.scanner} • Verified: {log.timestamp}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 font-mono text-xs">
                    <div>
                      <span className="text-[10px] text-text-muted">Confidence: </span>
                      <span className="text-emerald-400 font-bold">{log.confidence}</span>
                    </div>
                    <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                      {log.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-5 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
            <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider font-mono mb-2 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-purple-400" /> Privacy & Cryptographic Integrity
            </h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              Your biometric records are fully encrypted using homomorphic mathematical vectors. The camera feeds decode faces locally at the Edge processor and submit only vector hash points to the central campus database for identification checks. Real-time footage is deleted within 3 seconds of verification processing.
            </p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
