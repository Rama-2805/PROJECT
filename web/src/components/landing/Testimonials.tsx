"use client";

import React from "react";
import { Play } from "lucide-react";

export function Testimonials() {
  const testimonials = [
    {
      quote: "SmartCampus AI completely eliminated manual attendance. Our professors save 15 minutes every lecture, and our security has never been tighter.",
      name: "Dr. Robert Chen",
      role: "Dean of Engineering",
      company: "Stanford Tech University",
      image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=300&auto=format&fit=crop"
    },
    {
      quote: "Deploying the digital twin across our 300-acre campus gave us unprecedented visibility into facility utilization. It's the future of education.",
      name: "Sarah Jenkins",
      role: "Chief Information Officer",
      company: "Oxbridge College",
      image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=300&auto=format&fit=crop"
    },
    {
      quote: "The behavioral analytics integration helped us identify disengaged students weeks before midterms, allowing us to intervene proactively.",
      name: "Michael Torres",
      role: "VP of Student Success",
      company: "Atlantic State Univ",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=300&auto=format&fit=crop"
    }
  ];

  return (
    <section className="w-full py-32 bg-[#050505] px-6">
      <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-16 items-center">
         
         <div className="lg:w-1/3 flex flex-col items-start">
            <div className="inline-flex px-3 py-1 rounded-full border border-white/20 text-[11px] font-bold text-gray-300 mb-6 uppercase tracking-widest bg-white/5">
              [ Case Studies ]
            </div>
            <h2 className="text-4xl md:text-6xl font-medium text-white leading-[1.1] mb-6 tracking-tight">
              Trusted by leading institutions
            </h2>
            <p className="text-lg text-gray-400 mb-8 max-w-md font-light leading-relaxed">
              Discover how universities around the world are transforming their campuses into intelligent, data-driven environments.
            </p>
            <button className="bg-white hover:bg-gray-200 text-black px-6 py-3 rounded-xl text-[15px] font-semibold transition-colors flex items-center gap-2">
              See all case studies <span className="ml-2">↗</span>
            </button>
         </div>

         <div className="lg:w-2/3 grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-[#111111] rounded-2xl p-8 border border-white/10 flex flex-col group relative overflow-hidden">
                 {/* Video Play overlay */}
                 <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 flex items-center justify-center cursor-pointer backdrop-blur-sm">
                    <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
                       <Play className="w-6 h-6 text-black fill-black ml-1" />
                    </div>
                 </div>

                 {/* Content */}
                 <div className="mb-8">
                   <div className="flex gap-1 mb-6">
                     {[...Array(5)].map((_, idx) => (
                       <svg key={idx} className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                         <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                       </svg>
                     ))}
                   </div>
                   <p className="text-[15px] leading-relaxed text-gray-300 relative z-0">"{t.quote}"</p>
                 </div>
                 
                 <div className="mt-auto flex items-center gap-4 relative z-0">
                    <div className="w-12 h-12 rounded-full overflow-hidden grayscale border border-white/20">
                      <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="text-white font-medium text-sm">{t.name}</h4>
                      <p className="text-gray-500 text-xs">{t.role}, {t.company}</p>
                    </div>
                 </div>
              </div>
            ))}
         </div>

      </div>
    </section>
  );
}
