"use client";

import React from "react";
import Link from "next/link";
import { Cloud } from "lucide-react";

export function Footer() {
  const footerLinks = [
    {
      title: "Platform",
      links: ["Face Recognition", "Digital Twin", "IoT Management", "AI Analytics", "Mobile App", "Security"]
    },
    {
      title: "Solutions",
      links: ["For Universities", "For K-12 Schools", "For Enterprise", "Case Studies", "ROI Calculator"]
    },
    {
      title: "Resources",
      links: ["Documentation", "API Reference", "Blog", "Webinars", "System Status"]
    },
    {
      title: "Company",
      links: ["About Us", "Careers", "Newsroom", "Contact Sales", "Partners"]
    }
  ];

  return (
    <footer className="w-full bg-black pt-24 pb-12 px-6 border-t border-white/10">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-16 mb-20">
          
          <div className="flex flex-col gap-8 max-w-sm">
            <Link href="/" className="flex items-center gap-3">
              <Cloud className="w-8 h-8 text-white fill-white" />
              <div className="flex flex-col">
                <span className="text-[1.35rem] font-medium text-white leading-none tracking-tight">SMARTCAMPUS</span>
                <span className="text-[0.6rem] font-semibold text-gray-500 uppercase tracking-widest mt-0.5">Intelligent Education</span>
              </div>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed">
              The AI-powered university operating system. Transform traditional classrooms into intelligent, data-driven environments with enterprise-grade computer vision and IoT.
            </p>
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors cursor-pointer">
                 <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
               </div>
               <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors cursor-pointer">
                 <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
               </div>
               <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors cursor-pointer">
                 <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M21.582 5.49a2.99 2.99 0 0 0-2.109-2.115c-1.859-.5-9.336-.5-9.336-.5s-7.477 0-9.336.5a2.99 2.99 0 0 0-2.109 2.115C0 7.362 0 12 0 12s0 4.638.5 6.51a2.99 2.99 0 0 0 2.109 2.115c1.859.5 9.336.5 9.336.5s7.477 0 9.336-.5a2.99 2.99 0 0 0 2.109-2.115C24 16.638 24 12 24 12s0-4.638-.5-6.51zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
               </div>
               <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors cursor-pointer">
                 <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-12 gap-y-12 lg:gap-20">
             {footerLinks.map((section, i) => (
               <div key={i} className="flex flex-col gap-6">
                 <h4 className="text-white font-semibold text-sm tracking-wide">{section.title}</h4>
                 <ul className="flex flex-col gap-4">
                   {section.links.map((link, idx) => (
                     <li key={idx}>
                       <Link href="#" className="text-gray-400 text-sm hover:text-white transition-colors">
                         {link}
                       </Link>
                     </li>
                   ))}
                 </ul>
               </div>
             ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/10 text-gray-500 text-sm gap-4">
          <p>© {new Date().getFullYear()} SmartCampus AI. All rights reserved.</p>
          <div className="flex gap-8">
             <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
             <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
             <Link href="#" className="hover:text-white transition-colors">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
