// @ts-nocheck
// ─── SmartCampus AI — Environmental Intelligence Panel ──
// Displays real-time environmental data from campus sensors:
// temperature, humidity, CO₂, noise, electricity consumption.

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useCampusStore } from '@/store/campusStore';

interface EnvironmentalData {
  id: string;
  buildingId: string;
  buildingName: string;
  temperature: number;
  humidity: number;
  co2: number;
  noise: number;
  electricity: number;
  status: 'good' | 'warning' | 'critical';
}

const MOCK_ENV_DATA: EnvironmentalData[] = [
  { id: 'env-1', buildingId: 'eng-blk', buildingName: 'Engineering Block', temperature: 24.5, humidity: 55, co2: 480, noise: 52, electricity: 78, status: 'good' },
  { id: 'env-2', buildingId: 'sci-blk', buildingName: 'Science Block', temperature: 23.2, humidity: 58, co2: 520, noise: 45, electricity: 65, status: 'good' },
  { id: 'env-3', buildingId: 'lib', buildingName: 'Central Library', temperature: 22.0, humidity: 45, co2: 610, noise: 28, electricity: 55, status: 'warning' },
  { id: 'env-4', buildingId: 'aud', buildingName: 'Auditorium', temperature: 25.8, humidity: 62, co2: 720, noise: 68, electricity: 92, status: 'warning' },
  { id: 'env-5', buildingId: 'admin', buildingName: 'Administration', temperature: 23.8, humidity: 50, co2: 440, noise: 38, electricity: 45, status: 'good' },
  { id: 'env-6', buildingId: 'cse-dept', buildingName: 'CSE Department', temperature: 24.0, humidity: 52, co2: 510, noise: 48, electricity: 82, status: 'good' },
  { id: 'env-7', buildingId: 'ece-dept', buildingName: 'ECE Department', temperature: 26.2, humidity: 60, co2: 580, noise: 55, electricity: 88, status: 'warning' },
  { id: 'env-8', buildingId: 'mech-blk', buildingName: 'Mechanical Block', temperature: 28.5, humidity: 65, co2: 690, noise: 72, electricity: 95, status: 'critical' },
  { id: 'env-9', buildingId: 'cafeteria', buildingName: 'Cafeteria', temperature: 25.0, humidity: 58, co2: 820, noise: 65, electricity: 60, status: 'warning' },
  { id: 'env-10', buildingId: 'sports', buildingName: 'Sports Complex', temperature: 24.8, humidity: 55, co2: 450, noise: 58, electricity: 35, status: 'good' },
];

const METER_COLORS = {
  good: { bar: 'bg-emerald-400/80', text: 'text-emerald-400', bg: 'bg-emerald-500/5 border-emerald-500/20' },
  warning: { bar: 'bg-yellow-400/80', text: 'text-yellow-400', bg: 'bg-yellow-500/5 border-yellow-500/20' },
  critical: { bar: 'bg-red-400/80', text: 'text-red-400', bg: 'bg-red-500/5 border-red-500/20' },
};

const METER_ICONS: Record<string, string> = {
  temperature: '🌡️',
  humidity: '💧',
  co2: '🫁',
  noise: '🔊',
  electricity: '⚡',
};

function MeterBar({ label, value, unit, max, icon, status }: {
  label: string; value: number; unit: string; max: number; icon: string; status: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  const colors = METER_COLORS[status as keyof typeof METER_COLORS] || METER_COLORS.good;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs">{icon}</span>
          <span className="text-[10px] text-slate-400">{label}</span>
        </div>
        <span className={`text-xs font-mono font-medium ${colors.text}`}>
          {value}{unit}
        </span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={`h-full rounded-full ${colors.bar}`}
        />
      </div>
    </div>
  );
}

export function EnvironmentalPanel() {
  const selectedBuilding = useCampusStore((s) => s.selectedBuilding);
  const envData = selectedBuilding
    ? MOCK_ENV_DATA.find((e) => e.buildingId === selectedBuilding.id)
    : null;

  const insights = [
    { text: 'Classroom B-204 is consuming 25% more electricity than average.', severity: 'warning' as const },
    { text: 'Cafeteria CO₂ levels peak during lunch hours (12-2 PM)', severity: 'info' as const },
    { text: 'Mechanical Block temperature above optimal range for 6+ hours', severity: 'critical' as const },
    { text: 'Library noise levels minimal — optimal for study environment', severity: 'good' as const },
  ];

  return (
    <AnimatePresence>
      {selectedBuilding && envData && (
        <motion.div
          key="env-panel"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden border-t border-slate-700/50"
        >
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white uppercase tracking-wider">Environmental</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${METER_COLORS[envData.status].bg} ${METER_COLORS[envData.status].text}`}>
                {envData.status === 'good' ? 'Optimal' : envData.status === 'warning' ? 'Caution' : 'Critical'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/30">
                <MeterBar label="Temperature" value={envData.temperature} unit="°C" max={35} icon={METER_ICONS.temperature}
                  status={envData.temperature > 27 ? 'critical' : envData.temperature > 25 ? 'warning' : 'good'} />
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/30">
                <MeterBar label="Humidity" value={envData.humidity} unit="%" max={80} icon={METER_ICONS.humidity}
                  status={envData.humidity > 65 ? 'warning' : envData.humidity > 75 ? 'critical' : 'good'} />
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/30">
                <MeterBar label="CO₂ Level" value={envData.co2} unit="ppm" max={1000} icon={METER_ICONS.co2}
                  status={envData.co2 > 800 ? 'critical' : envData.co2 > 600 ? 'warning' : 'good'} />
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/30">
                <MeterBar label="Noise" value={envData.noise} unit="dB" max={80} icon={METER_ICONS.noise}
                  status={envData.noise > 70 ? 'critical' : envData.noise > 55 ? 'warning' : 'good'} />
              </div>
              <div className="col-span-2 p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/30">
                <MeterBar label="Electricity Usage" value={envData.electricity} unit="%" max={100} icon={METER_ICONS.electricity}
                  status={envData.electricity > 90 ? 'critical' : envData.electricity > 75 ? 'warning' : 'good'} />
              </div>
            </div>

            {/* Smart Energy Insights */}
            <div className="space-y-1 border-t border-slate-700/30 pt-3">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Energy Insights</span>
              {insights.slice(0, 2).map((insight, i) => (
                <div key={i} className={`flex items-start gap-1.5 p-2 rounded-lg text-[10px] ${
                  insight.severity === 'critical' ? 'bg-red-500/5 text-red-300' :
                  insight.severity === 'warning' ? 'bg-yellow-500/5 text-yellow-300' :
                  insight.severity === 'good' ? 'bg-emerald-500/5 text-emerald-300' :
                  'bg-slate-800/50 text-slate-400'
                }`}>
                  <span className="shrink-0 mt-0.5">
                    {insight.severity === 'critical' ? '🔴' : insight.severity === 'warning' ? '🟡' : insight.severity === 'good' ? '🟢' : '💡'}
                  </span>
                  <span>{insight.text}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
