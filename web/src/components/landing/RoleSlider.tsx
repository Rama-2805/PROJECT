"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

const roles = [
  {
    id: "admin",
    name: "University Administrators",
    desc: "Gain complete oversight of the entire campus through our interactive Digital Twin and high-level predictive analytics. Make data-driven decisions on facility usage and student retention."
  },
  {
    id: "security",
    name: "Security & IT Directors",
    desc: "A centralized command center for thousands of IoT edge devices and AI cameras. Ensure campus-wide safety with instant threat detection and automated emergency protocols."
  },
  {
    id: "professors",
    name: "Professors & Faculty",
    desc: "Eliminate manual roll calls. Let the edge AI cameras automatically mark attendance and focus entirely on teaching and engaging with your students."
  }
];

export function RoleSlider() {
  const [activeIndex, setActiveIndex] = useState(1); 

  const handleNext = () => setActiveIndex((prev) => (prev + 1) % roles.length);
  const handlePrev = () => setActiveIndex((prev) => (prev - 1 + roles.length) % roles.length);

  return (
    <section className="w-full py-32 bg-black px-6 border-t border-white/10">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex px-3 py-1 rounded-full border border-white/20 text-[11px] font-bold text-gray-300 mb-6 uppercase tracking-widest bg-white/5">
            [ Who's It For? ]
          </div>
          <h2 className="text-4xl md:text-5xl font-medium text-white mb-6 tracking-tight">
            Built for every role that drives your university
          </h2>
          <p className="text-[18px] text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed font-light">
            Whether you're managing multi-campus operations, securing facilities, or leading a classroom, our AI operating system unifies your workflow with one secure, scalable solution.
          </p>
          <button className="bg-white hover:bg-gray-200 text-black px-6 py-3 rounded-xl text-[15px] font-semibold transition-colors">
            Book a demo <span className="ml-2">↗</span>
          </button>
        </div>

        <div className="relative w-full mt-16 pb-12 overflow-hidden px-16">
          {/* Slider content */}
          <div className="flex gap-8 items-center justify-center min-h-[450px] relative w-full">
            <AnimatePresence mode="popLayout">
              {roles.map((role, idx) => {
                const isActive = idx === activeIndex;
                const isLeft = idx === (activeIndex - 1 + roles.length) % roles.length;
                
                return (
                  <motion.div
                    key={role.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ 
                      opacity: isActive ? 1 : 0.4, 
                      scale: isActive ? 1 : 0.85,
                      x: isActive ? 0 : (isLeft ? -50 : 50)
                    }}
                    transition={{ duration: 0.4 }}
                    className={`flex items-center absolute ${isActive ? 'w-full max-w-5xl z-10' : (isLeft ? 'left-[-15%] w-[400px] z-0 cursor-pointer hidden md:flex' : 'right-[-15%] w-[400px] z-0 cursor-pointer hidden md:flex')}`}
                    onClick={() => !isActive && setActiveIndex(idx)}
                  >
                    {isActive && (
                       <div className="w-1/3 flex flex-col justify-center pr-8">
                          <div className="flex items-center gap-3 mb-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-white" />
                             <h3 className="text-3xl font-medium text-white">{role.name}</h3>
                          </div>
                       </div>
                    )}
                    
                    <div className={`${isActive ? 'w-full md:w-2/3 aspect-[16/10]' : 'w-full aspect-[4/3]'} rounded-2xl overflow-hidden bg-[#111111] relative shadow-2xl transition-all border border-white/10`}>
                       <div className="absolute inset-0 bg-cover bg-center opacity-40 bg-[url('https://images.unsplash.com/photo-1541888086225-ee5315d19cbf?q=80&w=2000&auto=format&fit=crop')] grayscale mix-blend-luminosity" />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-8">
                          {isActive && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2 }}
                            >
                               <p className="text-gray-300 text-lg leading-relaxed mb-6 max-w-md">{role.desc}</p>
                               <button className="text-white font-medium flex items-center gap-2 group text-sm border border-white/20 px-4 py-2 w-fit rounded-full hover:bg-white/10 transition-colors">
                                 Learn more <span className="group-hover:translate-x-1 transition-transform">↗</span>
                               </button>
                            </motion.div>
                          )}
                       </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Navigation Dots/Labels */}
          <div className="flex items-center justify-center gap-12 mt-12">
            <div className="flex gap-8 text-[15px] font-medium text-gray-500">
               {roles.map((r, i) => (
                 <div key={r.id} className="flex items-center gap-2">
                   {i === activeIndex && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                   <span className={`cursor-pointer transition-colors ${i === activeIndex ? 'text-white' : 'hover:text-gray-300'}`} onClick={() => setActiveIndex(i)}>
                      {r.name}
                   </span>
                 </div>
               ))}
            </div>
            <div className="flex gap-3">
              <button onClick={handlePrev} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={handleNext} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
