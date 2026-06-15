"use client";

import React from "react";

export function Pricing() {
  const plans = [
    {
      name: "Starter",
      desc: "For small campuses and individual departments.",
      price: "$2,500",
      period: "/month",
      features: [
        "Up to 5,000 Students",
        "50 Edge AI Cameras",
        "Basic Face Recognition",
        "Automated Attendance",
        "7-day Data Retention"
      ],
      button: "Start Free Trial",
      isPopular: false
    },
    {
      name: "Premium",
      desc: "The complete AI OS for mid-sized universities.",
      price: "$7,500",
      period: "/month",
      features: [
        "Up to 25,000 Students",
        "500 Edge AI Cameras",
        "Behavioral Analytics",
        "IoT Device Management",
        "Digital Twin (2D)",
        "API & Webhooks"
      ],
      button: "Get Premium",
      isPopular: true
    },
    {
      name: "Enterprise",
      desc: "Maximum scale and security for large institutions.",
      price: "Custom",
      period: "",
      features: [
        "Unlimited Students",
        "Unlimited Cameras",
        "Full 3D Digital Twin",
        "Zero-trust Security (RLS)",
        "On-premise Deployment",
        "Dedicated Support Team"
      ],
      button: "Contact Sales",
      isPopular: false
    }
  ];

  return (
    <section className="w-full py-32 bg-black px-6 border-t border-white/10" id="pricing">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-20">
          <div className="inline-flex px-3 py-1 rounded-full border border-white/20 text-[11px] font-bold text-gray-300 mb-6 uppercase tracking-widest bg-white/5">
            [ Pricing Plans ]
          </div>
          <h2 className="text-4xl md:text-6xl font-medium text-white tracking-tight mb-6">
            Scale your campus intelligence
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto font-light leading-relaxed">
            Transparent pricing based on your student enrollment and camera density. No hidden setup fees.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-start">
           {plans.map((plan, i) => (
             <div 
               key={i} 
               className={`rounded-3xl p-8 flex flex-col relative ${
                 plan.isPopular 
                   ? 'bg-white text-black border-2 border-white scale-105 shadow-[0_0_50px_rgba(255,255,255,0.1)]' 
                   : 'bg-[#0A0A0A] text-white border border-white/10 mt-4'
               }`}
             >
                {plan.isPopular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black text-white px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase border border-white/20">
                    Most Popular
                  </div>
                )}
                
                <h3 className="text-2xl font-semibold mb-2">{plan.name}</h3>
                <p className={`text-sm mb-8 ${plan.isPopular ? 'text-gray-600' : 'text-gray-400'}`}>{plan.desc}</p>
                
                <div className="flex items-end gap-1 mb-8">
                  <span className="text-5xl font-medium tracking-tight">{plan.price}</span>
                  <span className={`font-semibold mb-1 ${plan.isPopular ? 'text-gray-500' : 'text-gray-500'}`}>{plan.period}</span>
                </div>

                <button 
                  className={`w-full py-4 rounded-xl text-[15px] font-bold transition-all mb-8 ${
                    plan.isPopular 
                      ? 'bg-black text-white hover:bg-gray-800' 
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  {plan.button}
                </button>

                <div className="flex flex-col gap-4 flex-1">
                   <p className={`text-sm font-semibold uppercase tracking-widest ${plan.isPopular ? 'text-gray-400' : 'text-gray-600'}`}>Includes:</p>
                   {plan.features.map((f, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                         <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${plan.isPopular ? 'bg-black' : 'bg-white'}`} />
                         <span className={`text-[15px] ${plan.isPopular ? 'text-gray-800' : 'text-gray-300'}`}>{f}</span>
                      </div>
                   ))}
                </div>
             </div>
           ))}
        </div>
      </div>
    </section>
  );
}
