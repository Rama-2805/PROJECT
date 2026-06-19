"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { ClassroomCard } from "@/components/classrooms/ClassroomCard";
import { DeviceStatusIndicator } from "@/components/classrooms/DeviceStatusIndicator";
import { getClassrooms, type Classroom } from "@/lib/mock/classrooms";
import { cn } from "@/lib/utils/cn";

export default function ClassroomsPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterBuilding, setFilterBuilding] = useState("");

  useEffect(() => {
    getClassrooms().then((data) => {
      setClassrooms(data);
      setLoading(false);
    });
  }, []);

  const filtered = filterBuilding
    ? classrooms.filter((c) => c.building === filterBuilding)
    : classrooms;
  const buildings = [...new Set(classrooms.map((c) => c.building))];
  const totalOnline = classrooms.reduce((sum, c) => sum + c.deviceOnline, 0);
  const totalDevices = classrooms.reduce((sum, c) => sum + c.deviceTotal, 0);
  const availableRooms = classrooms.filter((c) => c.availability === "available").length;

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Classroom Management</h2>
          <p className="text-xs text-text-muted">Monitor and manage all classrooms across campus</p>
        </div>
        <Button size="sm">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Classroom
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <GlassCard subtle>
          <p className="text-[10px] text-text-muted mb-1">Total Rooms</p>
          <p className="text-lg font-bold text-text-primary">{classrooms.length}</p>
        </GlassCard>
        <GlassCard subtle>
          <p className="text-[10px] text-text-muted mb-1">Available Now</p>
          <p className="text-lg font-bold text-success">{availableRooms}</p>
        </GlassCard>
        <GlassCard subtle>
          <p className="text-[10px] text-text-muted mb-1">Connected Devices</p>
          <DeviceStatusIndicator online={totalOnline} total={totalDevices} size="md" />
        </GlassCard>
        <GlassCard subtle>
          <p className="text-[10px] text-text-muted mb-1">Buildings</p>
          <p className="text-lg font-bold text-text-primary">{buildings.length}</p>
        </GlassCard>
      </div>

      {/* Building Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilterBuilding("")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
            !filterBuilding ? "bg-ai-blue text-black font-semibold" : "glass text-text-dim hover:text-text-primary",
          )}
        >
          All Buildings
        </button>
        {buildings.map((b) => (
          <button
            key={b}
            onClick={() => setFilterBuilding(b)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              filterBuilding === b ? "bg-ai-blue text-black font-semibold" : "glass text-text-dim hover:text-text-primary",
            )}
          >
            {b}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="h-4 w-4 border-2 border-ai-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((room, i) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <ClassroomCard classroom={room} />
            </motion.div>
          ))}
        </div>
      )}
    </>
  );
}
