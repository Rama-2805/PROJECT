"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, ShieldCheck, Mail, Phone, MapPin, Building } from "lucide-react";
import { useUIStore } from "@/store/uiStore";

export function BookDemoModal() {
  const isOpen = useUIStore((s) => s.demoModalOpen);
  const setIsOpen = useUIStore((s) => s.setDemoModalOpen);

  const [form, setForm] = useState({
    collegeName: "",
    contactPerson: "",
    designation: "",
    officialEmail: "",
    phoneNumber: "",
    department: "Computer Science",
    numStudents: "",
    numTeachers: "",
    numClassrooms: "",
    numCameras: "",
    city: "",
    state: "",
    requirements: ""
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.collegeName.trim()) newErrors.collegeName = "College Name is required";
    if (!form.contactPerson.trim()) newErrors.contactPerson = "Contact Person is required";
    if (!form.designation.trim()) newErrors.designation = "Designation is required";
    
    // Email validation
    if (!form.officialEmail.trim()) {
      newErrors.officialEmail = "Official Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.officialEmail)) {
      newErrors.officialEmail = "Invalid email format";
    }

    // Phone validation
    if (!form.phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone Number is required";
    } else if (!/^\+?[0-9\s\-]{8,15}$/.test(form.phoneNumber)) {
      newErrors.phoneNumber = "Invalid phone number format";
    }

    if (!form.city.trim()) newErrors.city = "City is required";
    if (!form.state.trim()) newErrors.state = "State is required";

    // Numeric validations
    const checkNum = (val: string, field: string) => {
      if (!val) {
        newErrors[field] = "Required";
      } else if (isNaN(Number(val)) || Number(val) < 0) {
        newErrors[field] = "Must be a positive number";
      }
    };

    checkNum(form.numStudents, "numStudents");
    checkNum(form.numTeachers, "numTeachers");
    checkNum(form.numClassrooms, "numClassrooms");
    checkNum(form.numCameras, "numCameras");

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/demo-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        setSubmitSuccess(true);
      } else {
        // Fallback for standalone demo mode
        console.warn("Backend API returned error, simulating success on front-end.");
        setSubmitSuccess(true);
      }
    } catch (err) {
      console.error("Failed to submit request:", err);
      // Simulate success in case backend is offline
      setSubmitSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setSubmitSuccess(false);
    setForm({
      collegeName: "",
      contactPerson: "",
      designation: "",
      officialEmail: "",
      phoneNumber: "",
      department: "Computer Science",
      numStudents: "",
      numTeachers: "",
      numClassrooms: "",
      numCameras: "",
      city: "",
      state: "",
      requirements: ""
    });
    setErrors({});
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
      {/* Background Overlay */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300"
        onClick={handleClose}
      />

      <AnimatePresence mode="wait">
        {!submitSuccess ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-[#070913]/90 border border-white/10 p-6 sm:p-8 rounded-2xl shadow-2xl backdrop-blur-xl z-10 my-8"
          >
            {/* Close Button */}
            <button 
              onClick={handleClose}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="mb-6 flex gap-3 items-center">
              <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">Request a Live Demonstration</h3>
                <p className="text-xs text-gray-400">Transform your university operating workflow with SmartCampus AI</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-left text-xs">
              
              {/* Row 1: College details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-gray-400 uppercase tracking-wider text-[10px]">College Name *</label>
                  <input
                    type="text"
                    value={form.collegeName}
                    onChange={(e) => setForm({ ...form, collegeName: e.target.value })}
                    className="bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30"
                    placeholder="e.g. Vemana Institute of Technology"
                  />
                  {errors.collegeName && <span className="text-red-400 text-[10px]">{errors.collegeName}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-gray-400 uppercase tracking-wider text-[10px]">Primary Department *</label>
                  <select
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className="bg-[#0c0e1b] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-white/30"
                  >
                    <option value="Computer Science">Computer Science (CSE)</option>
                    <option value="Information Science">Information Science (ISE)</option>
                    <option value="Electronics & Communication">Electronics (ECE)</option>
                    <option value="Electrical & Electronics">Electrical (EEE)</option>
                    <option value="Artificial Intelligence">AI & ML (AIML)</option>
                    <option value="Mechanical Eng">Mechanical (MECH)</option>
                    <option value="Civil Eng">Civil (CIVIL)</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Contact Person details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-gray-400 uppercase tracking-wider text-[10px]">Contact Person *</label>
                  <input
                    type="text"
                    value={form.contactPerson}
                    onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                    className="bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30"
                    placeholder="Full Name"
                  />
                  {errors.contactPerson && <span className="text-red-400 text-[10px]">{errors.contactPerson}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-gray-400 uppercase tracking-wider text-[10px]">Designation *</label>
                  <input
                    type="text"
                    value={form.designation}
                    onChange={(e) => setForm({ ...form, designation: e.target.value })}
                    className="bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30"
                    placeholder="e.g. HOD CSE / Principal"
                  />
                  {errors.designation && <span className="text-red-400 text-[10px]">{errors.designation}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-gray-400 uppercase tracking-wider text-[10px]">City *</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30"
                    placeholder="e.g. Bangalore"
                  />
                  {errors.city && <span className="text-red-400 text-[10px]">{errors.city}</span>}
                </div>
              </div>

              {/* Row 3: Email and Phone details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1 col-span-1 md:col-span-2">
                  <label className="font-semibold text-gray-400 uppercase tracking-wider text-[10px]">Official Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
                    <input
                      type="email"
                      value={form.officialEmail}
                      onChange={(e) => setForm({ ...form, officialEmail: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30"
                      placeholder="e.g. manjunatha@vemana.edu.in"
                    />
                  </div>
                  {errors.officialEmail && <span className="text-red-400 text-[10px]">{errors.officialEmail}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-gray-400 uppercase tracking-wider text-[10px]">Phone Number *</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={form.phoneNumber}
                      onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30"
                      placeholder="Phone or Mobile"
                    />
                  </div>
                  {errors.phoneNumber && <span className="text-red-400 text-[10px]">{errors.phoneNumber}</span>}
                </div>
              </div>

              {/* Row 4: Metrics inputs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/[0.02] p-4 rounded-xl border border-white/5">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Number Of Students *</label>
                  <input
                    type="text"
                    value={form.numStudents}
                    onChange={(e) => setForm({ ...form, numStudents: e.target.value })}
                    className="bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-center text-white"
                    placeholder="e.g. 1200"
                  />
                  {errors.numStudents && <span className="text-red-400 text-[8px] text-center">{errors.numStudents}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Number Of Teachers *</label>
                  <input
                    type="text"
                    value={form.numTeachers}
                    onChange={(e) => setForm({ ...form, numTeachers: e.target.value })}
                    className="bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-center text-white"
                    placeholder="e.g. 80"
                  />
                  {errors.numTeachers && <span className="text-red-400 text-[8px] text-center">{errors.numTeachers}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Number Of Classrooms *</label>
                  <input
                    type="text"
                    value={form.numClassrooms}
                    onChange={(e) => setForm({ ...form, numClassrooms: e.target.value })}
                    className="bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-center text-white"
                    placeholder="e.g. 45"
                  />
                  {errors.numClassrooms && <span className="text-red-400 text-[8px] text-center">{errors.numClassrooms}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Number Of Cameras *</label>
                  <input
                    type="text"
                    value={form.numCameras}
                    onChange={(e) => setForm({ ...form, numCameras: e.target.value })}
                    className="bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-center text-white"
                    placeholder="e.g. 20"
                  />
                  {errors.numCameras && <span className="text-red-400 text-[8px] text-center">{errors.numCameras}</span>}
                </div>
              </div>

              {/* Row 5: Geography and Requirements */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-gray-400 uppercase tracking-wider text-[10px]">State *</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30"
                      placeholder="e.g. Karnataka"
                    />
                  </div>
                  {errors.state && <span className="text-red-400 text-[10px]">{errors.state}</span>}
                </div>

                <div className="flex flex-col gap-1 col-span-1 md:col-span-2">
                  <label className="font-semibold text-gray-400 uppercase tracking-wider text-[10px]">Additional Requirements / Notes</label>
                  <input
                    type="text"
                    value={form.requirements}
                    onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                    className="bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30"
                    placeholder="Specify integrations or timelines"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2.5 rounded-xl border border-white/10 text-white font-medium hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-white hover:bg-gray-200 text-black px-6 py-2.5 rounded-xl font-bold flex items-center justify-center min-w-[120px] transition-all cursor-pointer shadow-[0_4px_12px_rgba(255,255,255,0.15)]"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-black/25 border-t-black rounded-full animate-spin" />
                  ) : (
                    "Submit Request"
                  )}
                </button>
              </div>

            </form>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-[#070913]/90 border border-white/10 p-8 rounded-2xl shadow-2xl text-center backdrop-blur-xl z-10 space-y-6"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Thank you for contacting SmartCampus AI.</h3>
              <p className="text-xs text-gray-400 px-4">Our team will contact you shortly to schedule your dedicated platform walkthrough.</p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-left text-[11px] text-gray-500 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0" />
              <span>Simulated confirmation email dispatched to <strong>contact@smartcampusai.com</strong>.</span>
            </div>

            <button 
              onClick={handleClose}
              className="w-full bg-white hover:bg-gray-200 text-black py-2.5 rounded-xl font-bold transition-all cursor-pointer"
            >
              Close Window
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
