"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

const PLANS = [
  {
    name: "Basic",
    subtitle: "For small departments",
    price: "$0",
    period: "free forever",
    description: "Essential attendance tracking for classroom management.",
    features: [
      "Real-time attendance tracking",
      "Student database (up to 500)",
      "Basic analytics dashboard",
      "Manual attendance marking",
      "CSV export reports",
      "Email support",
    ],
    notIncluded: ["AI face recognition", "Behavioral analytics", "IoT device support", "Advanced insights"],
    cta: "Get Started",
    popular: false,
    gradient: "from-ai-blue/20 to-ai-purple/20",
    border: "border-glass-border",
  },
  {
    name: "Professional",
    subtitle: "For entire departments",
    price: "$299",
    period: "per month",
    description: "AI-powered attendance and behavior analytics for comprehensive insights.",
    features: [
      "Everything in Basic",
      "AI face recognition (up to 5,000 students)",
      "Behavioral analytics engine",
      "Real-time engagement monitoring",
      "AI-generated insights",
      "Auto-generated reports (PDF/CSV)",
      "Email + chat support",
      "API access",
    ],
    notIncluded: ["IoT edge device support", "Multi-campus management", "Custom AI model training"],
    cta: "Start Free Trial",
    popular: true,
    gradient: "from-ai-blue to-ai-purple",
    border: "border-ai-blue/50",
  },
  {
    name: "Enterprise",
    subtitle: "For entire universities",
    price: "$999",
    period: "per month",
    description: "Full IoT integration, edge computing, and advanced AI for multi-campus deployment.",
    features: [
      "Everything in Professional",
      "Unlimited students & classrooms",
      "IoT edge device management",
      "Live video stream monitoring",
      "Custom AI model training",
      "Multi-campus support",
      "SLA guarantee (99.9% uptime)",
      "Dedicated account manager",
      "On-premise deployment option",
      "SSO & advanced security",
      "Custom integrations",
      "24/7 phone + email support",
    ],
    notIncluded: [],
    cta: "Contact Sales",
    popular: false,
    gradient: "from-ai-purple/20 to-ai-cyan/20",
    border: "border-glass-border",
  },
];

const FEATURES_COMPARISON = [
  { category: "Attendance", features: [
    { name: "Real-time attendance tracking", basic: true, pro: true, enterprise: true },
    { name: "AI face recognition", basic: false, pro: true, enterprise: true },
    { name: "Multi-camera support", basic: false, pro: true, enterprise: true },
    { name: "Offline attendance buffering", basic: false, pro: true, enterprise: true },
  ]},
  { category: "Analytics", features: [
    { name: "Basic dashboard", basic: true, pro: true, enterprise: true },
    { name: "Behavioral analytics", basic: false, pro: true, enterprise: true },
    { name: "AI-generated insights", basic: false, pro: true, enterprise: true },
    { name: "Custom report builder", basic: false, false: true, enterprise: true },
    { name: "Executive dashboard", basic: false, pro: true, enterprise: true },
  ]},
  { category: "IoT & Infrastructure", features: [
    { name: "Edge device management", basic: false, pro: false, enterprise: true },
    { name: "Live video monitoring", basic: false, pro: false, enterprise: true },
    { name: "MQTT device support", basic: false, pro: false, enterprise: true },
    { name: "On-premise deployment", basic: false, pro: false, enterprise: true },
    { name: "Multi-campus support", basic: false, pro: false, enterprise: true },
  ]},
  { category: "Support & Security", features: [
    { name: "Email support", basic: true, pro: true, enterprise: true },
    { name: "Chat support", basic: false, pro: true, enterprise: true },
    { name: "Phone support", basic: false, pro: false, enterprise: true },
    { name: "Dedicated account manager", basic: false, pro: false, enterprise: true },
    { name: "SSO & advanced security", basic: false, pro: false, enterprise: true },
    { name: "SLA guarantee", basic: false, pro: false, enterprise: true },
  ]},
];

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-3.5 h-3.5 text-success shrink-0"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function DashIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-3.5 h-3.5 text-text-dim shrink-0"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
    </svg>
  );
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  return (
    <>
      {/* Header */}
      <div className="text-center mb-10">
        <h2 className="text-2xl font-bold text-text-primary mb-2">Simple, Transparent Pricing</h2>
        <p className="text-sm text-text-muted max-w-2xl mx-auto">
          Choose the plan that fits your institution. All plans include a 14-day free trial.
          No credit card required.
        </p>
        {/* Toggle */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <span className={cn("text-xs font-medium", !annual ? "text-text-primary" : "text-text-muted")}>Monthly</span>
          <button
            onClick={() => setAnnual(!annual)}
            className={cn(
              "relative h-5 w-10 rounded-full transition-colors",
              annual ? "bg-ai-blue" : "bg-glass-light border border-glass-border",
            )}
          >
            <span className={cn(
              "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform shadow-sm",
              annual ? "translate-x-5" : "translate-x-0.5",
            )} />
          </button>
          <span className={cn("text-xs font-medium", annual ? "text-text-primary" : "text-text-muted")}>
            Annual <span className="text-success text-[10px]">Save 20%</span>
          </span>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {PLANS.map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className={cn(
              "relative rounded-xl border p-6 transition-all hover:translate-y-[-4px]",
              plan.border,
              plan.popular ? "bg-gradient-to-b" : "bg-glass-heavy",
              plan.gradient,
            )}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-ai-blue to-ai-purple text-[9px] font-bold text-white uppercase tracking-wider">
                Most Popular
              </div>
            )}
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold text-text-primary">{plan.name}</h3>
              <p className="text-[10px] text-text-muted mt-0.5">{plan.subtitle}</p>
              <div className="mt-4">
                <span className="text-3xl font-bold text-text-primary">{annual ? `$${Math.round(parseInt(plan.price.slice(1)) * 0.8 * 12 / 12)}` : plan.price}</span>
                {plan.price !== "$0" && <span className="text-xs text-text-muted ml-1">/month</span>}
              </div>
              <p className="text-[9px] text-text-muted mt-0.5">{periodDisplay(plan, annual)}</p>
              <p className="text-[10px] text-text-muted mt-3">{plan.description}</p>
            </div>

            <ul className="space-y-2 mb-6">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <CheckIcon />
                  <span className="text-[10px] text-text-primary">{f}</span>
                </li>
              ))}
              {plan.notIncluded.map((f) => (
                <li key={f} className="flex items-start gap-2 opacity-40">
                  <DashIcon />
                  <span className="text-[10px] text-text-muted">{f}</span>
                </li>
              ))}
            </ul>

            <Button
              className="w-full"
              variant={plan.popular ? "primary" : "secondary"}
              size="sm"
            >
              {plan.cta}
            </Button>
          </motion.div>
        ))}
      </div>

      {/* Feature Comparison Table */}
      <GlassCard>
        <h3 className="text-sm font-semibold text-text-primary mb-4">Full Feature Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="text-[9px] text-text-muted uppercase tracking-wider border-b border-glass-border">
                <th className="text-left pb-2 pr-4 font-semibold">Feature</th>
                <th className="text-center pb-2 pr-4 font-semibold text-ai-blue">Basic</th>
                <th className="text-center pb-2 pr-4 font-semibold text-ai-cyan">Professional</th>
                <th className="text-center pb-2 font-semibold text-ai-purple">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES_COMPARISON.map((section) => (
                <>
                  <tr key={section.category} className="border-b border-glass-border">
                    <td colSpan={4} className="py-2 text-[10px] font-semibold text-text-primary">{section.category}</td>
                  </tr>
                  {section.features.map((f) => (
                    <tr key={f.name} className="border-b border-glass-border/50 text-[10px]">
                      <td className="py-1.5 pr-4 text-text-muted">{f.name}</td>
                      <td className="py-1.5 pr-4 text-center">{f.basic ? <CheckIcon className="mx-auto" /> : <DashIcon className="mx-auto" />}</td>
                      <td className="py-1.5 pr-4 text-center">{f.pro ? <CheckIcon className="mx-auto" /> : <DashIcon className="mx-auto" />}</td>
                      <td className="py-1.5 text-center">{f.enterprise ? <CheckIcon className="mx-auto" /> : <DashIcon className="mx-auto" />}</td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </>
  );
}

function periodDisplay(plan: typeof PLANS[0], annual: boolean): string {
  if (plan.price === "$0") return "Free forever";
  const monthly = parseInt(plan.price.slice(1));
  if (annual) return `$${Math.round(monthly * 12 * 0.8).toLocaleString()} billed annually (save 20%)`;
  return "Billed monthly";
}
