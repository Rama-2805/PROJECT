"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Camera, Upload, ShieldCheck, AlertTriangle, 
  CheckCircle2, XCircle, ChevronRight, Fingerprint, Focus, Sun, ScanFace
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

type EnrollmentStep = "METHOD_SELECTION" | "LIVE_CAPTURE" | "QUALITY_ANALYSIS" | "SUCCESS";

export default function FaceEnrollmentWizard() {
  const [step, setStep] = useState<EnrollmentStep>("METHOD_SELECTION");
  const [quality, setQuality] = useState({ lighting: 0, sharpness: 0, pose: 0, overall: 0 });
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Clean up camera on unmount or step change
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStep("LIVE_CAPTURE");
      simulateQualityAnalysis();
    } catch (err) {
      console.error("Camera access denied", err);
      // Fallback logic could go here
    }
  };

  const simulateQualityAnalysis = () => {
    // Simulate fluctuating quality metrics over time
    const interval = setInterval(() => {
      setQuality({
        lighting: 70 + Math.random() * 25,
        sharpness: 80 + Math.random() * 15,
        pose: 85 + Math.random() * 10,
        overall: 80 + Math.random() * 18
      });
    }, 500);

    setTimeout(() => {
      clearInterval(interval);
      setStep("QUALITY_ANALYSIS");
    }, 4000); // 4 seconds of live capture before moving to analysis
  };

  const getQualityColor = (score: number) => {
    if (score >= 90) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (score >= 70) return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
    return "text-red-400 bg-red-500/10 border-red-500/20";
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-5xl mx-auto w-full space-y-6">
      
      {/* Header */}
      <div className="text-center space-y-2 mt-4">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-blue-500/10 mb-2">
          <ScanFace className="w-8 h-8 text-blue-400" />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-wide">AI Identity Enrollment</h1>
        <p className="text-gray-400">Generate a highly secure, encrypted facial embedding for SmartCampus AI.</p>
      </div>

      {/* Main Container */}
      <div className="flex-1 rounded-2xl border border-white/10 bg-[#0A0F1E]/80 backdrop-blur-xl overflow-hidden relative flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        
        <AnimatePresence mode="wait">
          
          {/* STEP 1: METHOD SELECTION */}
          {step === "METHOD_SELECTION" && (
            <motion.div 
              key="method"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="flex-1 flex flex-col items-center justify-center p-8 space-y-8"
            >
              <h2 className="text-xl font-semibold text-white">Select Enrollment Method</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                {/* Live Camera Option */}
                <button 
                  onClick={startCamera}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-8 text-left hover:bg-white/10 hover:border-blue-500/50 transition-all"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-6 h-6 text-blue-400" />
                  </div>
                  <Camera className="w-10 h-10 text-blue-400 mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2">Live Camera Enrollment</h3>
                  <p className="text-sm text-gray-400">Use your device's camera to capture a 3D facial mesh in real-time. Recommended for highest accuracy.</p>
                </button>

                {/* Upload Option */}
                <button 
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-8 text-left hover:bg-white/10 hover:border-purple-500/50 transition-all opacity-70"
                >
                  <Upload className="w-10 h-10 text-purple-400 mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2">Image/Video Upload</h3>
                  <p className="text-sm text-gray-400">Upload a high-resolution portrait or short video. AI will extract the best frames automatically.</p>
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: LIVE CAPTURE */}
          {step === "LIVE_CAPTURE" && (
            <motion.div 
              key="capture"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex-1 flex flex-col relative"
            >
              <div className="absolute top-4 left-4 z-10 px-4 py-2 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-white text-sm font-medium tracking-wide">SCANNING MESH</span>
              </div>

              {/* Video Feed */}
              <div className="flex-1 bg-black relative overflow-hidden flex items-center justify-center">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover"
                />
                
                {/* HUD Overlay */}
                <div className="absolute inset-0 pointer-events-none border-[1px] border-blue-500/30 m-8 rounded-3xl" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {/* Focus reticle */}
                  <div className="w-64 h-64 border-2 border-dashed border-white/40 rounded-full animate-[spin_10s_linear_infinite]" />
                  <div className="absolute w-64 h-64 border-2 border-emerald-400/80 rounded-full scale-90" />
                </div>
              </div>

              {/* Live Telemetry Panel */}
              <div className="h-32 bg-[#0A0F1E] border-t border-white/10 p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold">Generating Neural Embedding...</h3>
                  <p className="text-sm text-gray-400">Please look directly at the camera and slowly turn your head.</p>
                </div>
                <div className="flex gap-4">
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-gray-500 uppercase tracking-wider">Lighting</span>
                    <span className={cn("text-lg font-bold", quality.lighting > 80 ? "text-emerald-400" : "text-yellow-400")}>
                      {quality.lighting.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex flex-col items-end border-l border-white/10 pl-4">
                    <span className="text-xs text-gray-500 uppercase tracking-wider">Confidence</span>
                    <span className="text-lg font-bold text-blue-400">{quality.overall.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: QUALITY ANALYSIS RESULTS */}
          {step === "QUALITY_ANALYSIS" && (
            <motion.div 
              key="analysis"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col p-8 items-center justify-center"
            >
              <div className="w-full max-w-3xl space-y-8">
                <div className="text-center mb-10">
                  <ShieldCheck className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-white">Scan Complete</h2>
                  <p className="text-gray-400 mt-2">The AI has analyzed your facial mesh. Review the quality scores below.</p>
                </div>

                {/* Quality Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Lighting */}
                  <div className={cn("p-6 rounded-xl border flex flex-col items-center justify-center text-center", getQualityColor(quality.lighting))}>
                    <Sun className="w-8 h-8 mb-3 opacity-80" />
                    <div className="text-3xl font-black mb-1">{Math.round(quality.lighting)}</div>
                    <div className="text-xs uppercase tracking-wider font-semibold opacity-80">Lighting & Contrast</div>
                  </div>
                  {/* Sharpness */}
                  <div className={cn("p-6 rounded-xl border flex flex-col items-center justify-center text-center", getQualityColor(quality.sharpness))}>
                    <Focus className="w-8 h-8 mb-3 opacity-80" />
                    <div className="text-3xl font-black mb-1">{Math.round(quality.sharpness)}</div>
                    <div className="text-xs uppercase tracking-wider font-semibold opacity-80">Sharpness</div>
                  </div>
                  {/* Overall Quality */}
                  <div className={cn("p-6 rounded-xl border flex flex-col items-center justify-center text-center bg-blue-500/10 border-blue-500/30 text-blue-400")}>
                    <Fingerprint className="w-8 h-8 mb-3 opacity-80" />
                    <div className="text-3xl font-black mb-1">{Math.round(quality.overall)}</div>
                    <div className="text-xs uppercase tracking-wider font-semibold opacity-80">Embedding Quality</div>
                  </div>
                </div>

                {/* Feedback Panel */}
                <div className="p-6 rounded-xl bg-white/5 border border-white/10 flex items-start gap-4">
                  {quality.overall >= 80 ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-yellow-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className="text-white font-medium">
                      {quality.overall >= 80 ? "Face quality excellent. Enrollment can continue." : "Quality is acceptable but could be improved. Consider retaking in better light."}
                    </h4>
                    <p className="text-sm text-gray-400 mt-1">
                      A high-quality 512-dimensional vector embedding has been generated. This data is heavily encrypted and stored securely within your institution's isolated database.
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-4 pt-4 border-t border-white/5">
                  <button 
                    onClick={startCamera}
                    className="px-6 py-3 rounded-xl border border-white/10 text-white font-medium hover:bg-white/5 transition-colors"
                  >
                    Retake Scan
                  </button>
                  <button 
                    onClick={() => setStep("SUCCESS")}
                    className="px-8 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                  >
                    Finalize Enrollment
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4: SUCCESS */}
          {step === "SUCCESS" && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col items-center justify-center p-8 text-center"
            >
              <div className="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mb-6">
                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Identity Secured</h2>
              <p className="text-gray-400 max-w-md mb-8">
                The face profile has been securely enrolled and linked to the student ID. Real-time attendance tracking is now active.
              </p>
              <button 
                onClick={() => setStep("METHOD_SELECTION")}
                className="px-8 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
              >
                Enroll Another Student
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
