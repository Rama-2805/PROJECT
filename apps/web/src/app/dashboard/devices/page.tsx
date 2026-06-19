"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Server, Cpu, Wifi, AlertTriangle, 
  Settings, Activity, Eye, RefreshCw, Box, Layers, Camera
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

type DeviceStatus = "ONLINE" | "WARNING" | "OFFLINE" | "MAINTENANCE";

interface Device {
  id: string;
  name: string;
  serial: string;
  location: string;
  status: DeviceStatus;
  fps: number;
  cpu: number;
  temp: number;
  latency: number;
  model: string;
}

const MOCK_DEVICES: Device[] = [
  { id: "CAM-01", name: "Main Hall Entry", serial: "NV-8821X", location: "Building A • Floor 1", status: "ONLINE", fps: 30, cpu: 45, temp: 62, latency: 12, model: "FaceNet v2.1" },
  { id: "CAM-02", name: "CS-301 Classroom", serial: "NV-8822X", location: "Building C • Floor 3", status: "WARNING", fps: 24, cpu: 88, temp: 85, latency: 45, model: "FaceNet v2.1" },
  { id: "CAM-03", name: "Library Gate East", serial: "NV-8823X", location: "Library • Floor 1", status: "ONLINE", fps: 30, cpu: 30, temp: 55, latency: 8, model: "FaceNet v2.1" },
  { id: "CAM-04", name: "Cafeteria South", serial: "NV-8824X", location: "Building B • Floor 1", status: "OFFLINE", fps: 0, cpu: 0, temp: 0, latency: 0, model: "Unknown" },
  { id: "CAM-05", name: "Data Center Auth", serial: "NV-8825X", location: "Basement • Secure", status: "MAINTENANCE", fps: 0, cpu: 10, temp: 40, latency: 5, model: "FaceNet v2.1" },
];

const StatusBadge = ({ status }: { status: DeviceStatus }) => {
  const styles = {
    ONLINE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    WARNING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    OFFLINE: "bg-red-500/10 text-red-400 border-red-500/20",
    MAINTENANCE: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  };

  return (
    <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5", styles[status])}>
      {status === "ONLINE" && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
      {status === "WARNING" && <AlertTriangle className="w-3 h-3" />}
      {status}
    </span>
  );
};

export default function EdgeDevicesDashboard() {
  const [devices, setDevices] = useState<Device[]>(MOCK_DEVICES);

  // Simulate telemetry fluctuations
  useEffect(() => {
    const interval = setInterval(() => {
      setDevices(prev => prev.map(dev => {
        if (dev.status === "OFFLINE" || dev.status === "MAINTENANCE") return dev;
        return {
          ...dev,
          cpu: Math.max(10, Math.min(95, dev.cpu + (Math.random() * 10 - 5))),
          temp: Math.max(40, Math.min(90, dev.temp + (Math.random() * 4 - 2))),
          latency: Math.max(5, Math.min(100, dev.latency + (Math.random() * 6 - 3))),
        };
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
            <Server className="w-6 h-6 text-blue-400" />
            Edge AI Infrastructure
          </h1>
          <p className="text-gray-400 text-sm mt-1">Manage AI cameras, IoT sensors, and compute nodes across the campus.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-colors">
            <RefreshCw className="w-4 h-4" /> Sync Devices
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors">
            <Box className="w-4 h-4" /> Provision Node
          </button>
        </div>
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
          <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Total Active Nodes</div>
          <div className="text-2xl font-bold text-white">412</div>
          <div className="text-xs text-emerald-400 mt-1">98.5% uptime</div>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
          <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Total AI Events (24h)</div>
          <div className="text-2xl font-bold text-white">1.2M</div>
          <div className="text-xs text-blue-400 mt-1">+12% vs yesterday</div>
        </div>
        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 backdrop-blur-md">
          <div className="text-yellow-400 text-xs uppercase tracking-wider mb-1">Active Warnings</div>
          <div className="text-2xl font-bold text-yellow-500">3</div>
          <div className="text-xs text-yellow-400 mt-1">Thermal throttling detected</div>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
          <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Average Latency</div>
          <div className="text-2xl font-bold text-white">18ms</div>
          <div className="text-xs text-gray-500 mt-1">Campus intranet</div>
        </div>
      </div>

      {/* Device Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
        {devices.map((device) => (
          <motion.div 
            key={device.id}
            layout
            className="p-5 rounded-2xl bg-[#0A0F1E]/80 border border-white/10 backdrop-blur-md hover:border-white/20 transition-all flex flex-col group"
          >
            {/* Card Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center border",
                  device.status === "ONLINE" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                  device.status === "WARNING" ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400" :
                  "bg-gray-800/50 border-gray-700 text-gray-500"
                )}>
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white font-bold">{device.name}</h3>
                  <p className="text-xs text-gray-400 font-mono">{device.id} • {device.serial}</p>
                </div>
              </div>
              <StatusBadge status={device.status} />
            </div>

            <div className="text-sm text-gray-400 mb-4">{device.location}</div>

            {/* Telemetry Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6 flex-1">
              <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                <div className="flex items-center gap-2 text-xs text-gray-500 uppercase mb-1">
                  <Activity className="w-3 h-3" /> FPS
                </div>
                <div className="text-lg font-mono text-white">{device.fps.toFixed(0)}</div>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                <div className="flex items-center gap-2 text-xs text-gray-500 uppercase mb-1">
                  <Cpu className="w-3 h-3" /> Compute
                </div>
                <div className={cn("text-lg font-mono", device.cpu > 80 ? "text-yellow-400" : "text-white")}>
                  {device.cpu.toFixed(1)}% / {device.temp.toFixed(1)}°C
                </div>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                <div className="flex items-center gap-2 text-xs text-gray-500 uppercase mb-1">
                  <Wifi className="w-3 h-3" /> Latency
                </div>
                <div className="text-lg font-mono text-white">{device.latency.toFixed(0)} ms</div>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                <div className="flex items-center gap-2 text-xs text-gray-500 uppercase mb-1">
                  <Layers className="w-3 h-3" /> Model
                </div>
                <div className="text-sm font-medium text-blue-400 mt-1 truncate">{device.model}</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="flex-1 flex justify-center items-center gap-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm transition-colors">
                <Eye className="w-4 h-4" /> Live Feed
              </button>
              <button className="flex-1 flex justify-center items-center gap-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm transition-colors">
                <Settings className="w-4 h-4" /> Config
              </button>
            </div>

          </motion.div>
        ))}
      </div>
    </div>
  );
}
