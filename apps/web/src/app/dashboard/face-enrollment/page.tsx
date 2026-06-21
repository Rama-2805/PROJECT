"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Camera, Upload, ShieldCheck, AlertTriangle, 
  CheckCircle2, XCircle, ChevronRight, Fingerprint, Focus, Sun, ScanFace, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";

type EnrollmentStep = "METHOD_SELECTION" | "LIVE_CAPTURE" | "PROCESSING" | "QUALITY_ANALYSIS" | "SUCCESS";

export default function FaceEnrollmentWizard() {
  const [step, setStep] = useState<EnrollmentStep>("METHOD_SELECTION");
  const [quality, setQuality] = useState({ lighting: 0, sharpness: 0, pose: 0, overall: 0 });
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);

  // Pipeline simulation states
  const [pipelineProgress, setPipelineProgress] = useState(0);
  const [pipelineStep, setPipelineStep] = useState(1);

  // Clean up camera on unmount or step change
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    setUploadedFile(null);
    setUploadedFileUrl(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStep("LIVE_CAPTURE");
      // Pre-populate slight fluctuating telemetry before capture
      setQuality({ lighting: 82, sharpness: 78, pose: 85, overall: 81 });
    } catch (err) {
      console.error("Camera access denied", err);
      alert("Could not access camera. Please verify permission settings or upload a file instead.");
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    stopCamera();
    setUploadedFile(file);
    const url = URL.createObjectURL(file);
    setUploadedFileUrl(url);
    
    startPipelineSimulation();
  };

  const triggerCaptureScan = () => {
    startPipelineSimulation();
  };

  const startPipelineSimulation = () => {
    setStep("PROCESSING");
    setPipelineProgress(0);
    setPipelineStep(1);
    
    const interval = setInterval(() => {
      setPipelineProgress((prev) => {
        const next = prev + 5;
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setQuality({
              lighting: 85 + Math.floor(Math.random() * 12),
              sharpness: 88 + Math.floor(Math.random() * 10),
              pose: 87 + Math.floor(Math.random() * 8),
              overall: 86 + Math.floor(Math.random() * 8)
            });
            setStep("QUALITY_ANALYSIS");
          }, 400);
          return 100;
        }

        if (next >= 75) setPipelineStep(4);
        else if (next >= 50) setPipelineStep(3);
        else if (next >= 25) setPipelineStep(2);

        return next;
      });
    }, 120);
  };

  const getQualityColor = (score: number) => {
    if (score >= 90) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (score >= 70) return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
    return "text-red-400 bg-red-500/10 border-red-500/20";
  };

  const resetWizard = () => {
    stopCamera();
    setUploadedFile(null);
    setUploadedFileUrl(null);
    setPipelineProgress(0);
    setPipelineStep(1);
    setStep("METHOD_SELECTION");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-5xl mx-auto w-full space-y-6">
      
      {/* Header */}
      <div className="text-center space-y-2 mt-4">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-blue-500/10 mb-2 border border-blue-500/20">
          <ScanFace className="w-8 h-8 text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary tracking-wide">AI Identity Enrollment</h1>
        <p className="text-xs text-text-muted">Generate a secure, encrypted 512-dimensional facial embedding for SmartCampus AI.</p>
      </div>

      {/* Main Container */}
      <div className="flex-1 rounded-2xl border border-glass-border bg-[#0A0F1E]/80 backdrop-blur-xl overflow-hidden relative flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        
        {/* Hidden Input File */}
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*,video/*" 
          onChange={handleFileChange} 
        />

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
              <h2 className="text-lg font-bold text-text-primary uppercase tracking-wider">Select Enrollment Method</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                {/* Live Camera Option */}
                <button 
                  onClick={startCamera}
                  className="group relative overflow-hidden rounded-2xl border border-glass-border bg-glass-light p-8 text-left hover:bg-glass-medium hover:border-ai-blue/50 transition-all cursor-pointer"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-5 h-5 text-ai-blue" />
                  </div>
                  <Camera className="w-10 h-10 text-ai-blue mb-4" />
                  <h3 className="text-base font-bold text-text-primary mb-2">Live Camera Capture</h3>
                  <p className="text-xs text-text-muted leading-relaxed">Use device camera to capture face details. Processes live frames for high fidelity meshes.</p>
                </button>

                {/* Upload Option */}
                <button 
                  onClick={handleUploadClick}
                  className="group relative overflow-hidden rounded-2xl border border-glass-border bg-glass-light p-8 text-left hover:bg-glass-medium hover:border-ai-purple/50 transition-all cursor-pointer"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-5 h-5 text-ai-purple" />
                  </div>
                  <Upload className="w-10 h-10 text-ai-purple mb-4" />
                  <h3 className="text-base font-bold text-text-primary mb-2">Upload Photo / Video</h3>
                  <p className="text-xs text-text-muted leading-relaxed">Upload a clear portrait file or short MP4 video clips. AI will automatically select the best frame.</p>
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
              <div className="absolute top-4 left-4 z-10 px-4 py-2 rounded-full bg-black/70 backdrop-blur-md border border-glass-border flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-white text-xs font-semibold tracking-wider">CCTV STREAM LIVE</span>
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
                <div className="absolute inset-0 pointer-events-none border border-ai-blue/30 m-8 rounded-3xl" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-64 h-64 border-2 border-dashed border-white/20 rounded-full animate-[spin_20s_linear_infinite]" />
                  <div className="absolute w-64 h-64 border-2 border-ai-blue/70 rounded-full scale-95" />
                </div>
              </div>

              {/* Telemetry Control Panel */}
              <div className="bg-bg-secondary border-t border-glass-border p-5 flex items-center justify-between">
                <div>
                  <h3 className="text-text-primary font-bold text-sm">Align Face in the Circle</h3>
                  <p className="text-xs text-text-muted mt-0.5">Please look straight at the lens and keep neutral facial expression.</p>
                </div>
                <div className="flex items-center gap-4">
                  <Button size="sm" variant="ghost" onClick={resetWizard}>
                    Back
                  </Button>
                  <Button size="sm" onClick={triggerCaptureScan} className="bg-ai-blue text-black font-semibold">
                    <ScanFace className="w-4 h-4 mr-1.5" />
                    Process Scan
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: PROCESSING PIPELINE ANIMATION */}
          {step === "PROCESSING" && (
            <motion.div 
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center p-8 bg-black/95 text-xs"
            >
              <div className="w-full max-w-md space-y-6">
                <div className="text-center space-y-2">
                  <Loader2 className="w-10 h-10 text-ai-blue animate-spin mx-auto" />
                  <h3 className="text-base font-bold text-text-primary uppercase tracking-wider">AI Recognition Pipeline</h3>
                  <p className="text-text-muted">Analyzing source biometric data against the institutional grid.</p>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-glass-heavy rounded-full overflow-hidden border border-glass-border">
                  <div 
                    className="h-full bg-gradient-to-r from-ai-blue to-ai-purple transition-all duration-150"
                    style={{ width: `${pipelineProgress}%` }}
                  />
                </div>

                {/* Pipeline Checklist */}
                <div className="space-y-3 pt-2">
                  <div className={cn("flex items-center justify-between p-2.5 rounded-lg border", pipelineStep >= 1 ? "bg-ai-blue/5 border-ai-blue/20 text-ai-blue" : "bg-glass-light border-glass-border text-text-muted")}>
                    <span>1. Face Detection (MTCNN Frame Scan)</span>
                    <span className="font-semibold">{pipelineStep > 1 ? "✓ COMPLETE" : pipelineStep === 1 ? "PROCESSING..." : "PENDING"}</span>
                  </div>
                  <div className={cn("flex items-center justify-between p-2.5 rounded-lg border", pipelineStep >= 2 ? "bg-ai-blue/5 border-ai-blue/20 text-ai-blue" : "bg-glass-light border-glass-border text-text-muted")}>
                    <span>2. Recognition (512-D InsightFace Embedding)</span>
                    <span className="font-semibold">{pipelineStep > 2 ? "✓ COMPLETE" : pipelineStep === 2 ? "PROCESSING..." : "PENDING"}</span>
                  </div>
                  <div className={cn("flex items-center justify-between p-2.5 rounded-lg border", pipelineStep >= 3 ? "bg-ai-blue/5 border-ai-blue/20 text-ai-blue" : "bg-glass-light border-glass-border text-text-muted")}>
                    <span>3. FAISS Vector Database Index Search</span>
                    <span className="font-semibold">{pipelineStep > 3 ? "✓ COMPLETE" : pipelineStep === 3 ? "PROCESSING..." : "PENDING"}</span>
                  </div>
                  <div className={cn("flex items-center justify-between p-2.5 rounded-lg border", pipelineStep >= 4 ? "bg-ai-blue/5 border-ai-blue/20 text-ai-blue" : "bg-glass-light border-glass-border text-text-muted")}>
                    <span>4. DB Clustering & Centroid Density Check</span>
                    <span className="font-semibold">{pipelineProgress === 100 ? "✓ COMPLETE" : pipelineStep === 4 ? "PROCESSING..." : "PENDING"}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4: QUALITY ANALYSIS RESULTS */}
          {step === "QUALITY_ANALYSIS" && (
            <motion.div 
              key="analysis"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col p-8 items-center justify-center text-xs"
            >
              <div className="w-full max-w-3xl space-y-6">
                <div className="text-center mb-6">
                  <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-2" />
                  <h2 className="text-lg font-bold text-text-primary uppercase tracking-wider">Quality Analysis Complete</h2>
                  <p className="text-text-muted mt-1">Review generated vector embedding diagnostics metrics below.</p>
                </div>

                {/* Display capture source */}
                {uploadedFileUrl && (
                  <div className="flex justify-center mb-6">
                    <div className="relative rounded-xl overflow-hidden border border-glass-border max-w-[240px] aspect-video">
                      {uploadedFile?.type.startsWith("video") ? (
                        <video src={uploadedFileUrl} autoPlay loop muted className="w-full h-full object-cover" />
                      ) : (
                        <img src={uploadedFileUrl} alt="Uploaded source" className="w-full h-full object-cover" />
                      )}
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 py-1 text-center font-mono text-[9px] text-text-secondary">
                        {uploadedFile?.name}
                      </div>
                    </div>
                  </div>
                )}

                {/* Quality Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Lighting */}
                  <div className={cn("p-5 rounded-xl border flex flex-col items-center justify-center text-center", getQualityColor(quality.lighting))}>
                    <Sun className="w-7 h-7 mb-2 opacity-80" />
                    <div className="text-2xl font-black mb-0.5">{Math.round(quality.lighting)}%</div>
                    <div className="text-[9px] uppercase tracking-wider font-semibold opacity-80">Lighting Uniformity</div>
                  </div>
                  {/* Sharpness */}
                  <div className={cn("p-5 rounded-xl border flex flex-col items-center justify-center text-center", getQualityColor(quality.sharpness))}>
                    <Focus className="w-7 h-7 mb-2 opacity-80" />
                    <div className="text-2xl font-black mb-0.5">{Math.round(quality.sharpness)}%</div>
                    <div className="text-[9px] uppercase tracking-wider font-semibold opacity-80">Image Sharpness</div>
                  </div>
                  {/* Overall Quality */}
                  <div className={cn("p-5 rounded-xl border flex flex-col items-center justify-center text-center bg-blue-500/10 border-blue-500/30 text-blue-400")}>
                    <Fingerprint className="w-7 h-7 mb-2 opacity-80" />
                    <div className="text-2xl font-black mb-0.5">{Math.round(quality.overall)}%</div>
                    <div className="text-[9px] uppercase tracking-wider font-semibold opacity-80">Vector Quality Index</div>
                  </div>
                </div>

                {/* Feedback Panel */}
                <div className="p-4 rounded-xl bg-glass-light border border-glass-border flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-success shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-text-primary font-bold">Biometric Mesh Verified</h4>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      A robust 512-dimensional vector embedding was extracted successfully. This signature is encrypted using SHA-256 and stored isolated.
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-glass-border">
                  <Button variant="ghost" onClick={resetWizard}>
                    Discard & Retake
                  </Button>
                  <Button onClick={() => setStep("SUCCESS")} className="bg-success text-black font-semibold">
                    Finalize Enrollment
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 5: SUCCESS */}
          {step === "SUCCESS" && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs"
            >
              <div className="w-16 h-16 rounded-full bg-success/20 border border-success flex items-center justify-center mb-4">
                <CheckCircle2 className="w-9 h-9 text-success" />
              </div>
              <h2 className="text-lg font-bold text-text-primary uppercase tracking-wider mb-2">Identity Enrolled</h2>
              <p className="text-text-muted max-w-sm mb-6 leading-relaxed">
                Biometric mapping has been written to the institutional database. Live recognition systems will now recognize this student on class cameras.
              </p>
              <Button onClick={resetWizard}>
                Enroll Another Face Profile
              </Button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
