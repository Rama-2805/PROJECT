"use client";

import React, { useState } from "react";
import { 
  DndContext, 
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { CalendarDays, Save, Undo, Plus, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

// --- Types ---
type ClassSession = {
  id: string;
  course: string;
  code: string;
  teacher: string;
  room: string;
  color: string;
};

type SlotId = string; // e.g., "Monday-09:00"
type ScheduleMap = Record<SlotId, ClassSession | null>;

// --- Constants ---
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const TIMES = ["09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM"];

const UNASSIGNED_CLASSES: ClassSession[] = [
  { id: "class-1", course: "Intro to AI", code: "CS-101", teacher: "Dr. Alan Turing", room: "Turing Hall", color: "bg-blue-500" },
  { id: "class-2", course: "Machine Learning", code: "CS-302", teacher: "Dr. Geoffrey Hinton", room: "Lab 4", color: "bg-purple-500" },
  { id: "class-3", course: "Calculus III", code: "MATH-201", teacher: "Prof. Newton", room: "Room 101", color: "bg-emerald-500" },
  { id: "class-4", course: "Robotics", code: "ENG-405", teacher: "Dr. Boston", room: "Mech Lab", color: "bg-orange-500" },
  { id: "class-5", course: "Data Structures", code: "CS-201", teacher: "Prof. Lovelace", room: "Ada Hall", color: "bg-pink-500" },
];

// --- Components ---

// Draggable Class Card
function ClassCard({ session, isDragging }: { session: ClassSession; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: session.id,
    data: session,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "p-3 rounded-xl border cursor-grab active:cursor-grabbing text-white transition-all shadow-lg",
        "bg-white/10 backdrop-blur-md hover:bg-white/15",
        isDragging ? "opacity-50 ring-2 ring-ai-blue scale-105 z-50 shadow-[0_0_30px_rgba(59,130,246,0.3)]" : "border-white/10",
        session.color.replace("bg-", "border-").concat("/30") // Subtle colored border
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className={cn("w-2 h-2 rounded-full", session.color)} />
        <span className="text-xs font-mono font-bold tracking-wider">{session.code}</span>
      </div>
      <h4 className="font-bold text-sm leading-tight mb-2 truncate">{session.course}</h4>
      <div className="flex justify-between items-center text-xs text-gray-400">
        <span className="truncate max-w-[80px]">{session.teacher}</span>
        <span>{session.room}</span>
      </div>
    </div>
  );
}

// Droppable Time Slot
function TimeSlot({ id, session }: { id: string; session: ClassSession | null }) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[100px] p-2 rounded-xl border transition-all relative overflow-hidden",
        isOver ? "bg-ai-blue/10 border-ai-blue/50 ring-1 ring-ai-blue/50" : "bg-white/5 border-white/5",
        !session && "border-dashed border-white/10 hover:border-white/20"
      )}
    >
      {isOver && !session && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-ai-blue font-medium text-xs">Drop Here</div>
        </div>
      )}
      {session && <ClassCard session={session} />}
    </div>
  );
}

// --- Main Page ---
export default function TimetableBuilder() {
  const [schedule, setSchedule] = useState<ScheduleMap>({});
  const [unassigned, setUnassigned] = useState<ClassSession[]>(UNASSIGNED_CLASSES);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const sessionId = active.id as string;
    const dropZoneId = over.id as string;

    // Find the session being dragged
    const session = 
      unassigned.find(s => s.id === sessionId) || 
      Object.values(schedule).find(s => s?.id === sessionId);

    if (!session) return;

    // If dropping into "unassigned" zone
    if (dropZoneId === "unassigned-zone") {
      setUnassigned(prev => prev.some(s => s.id === session.id) ? prev : [...prev, session]);
      setSchedule(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => { if (next[k]?.id === session.id) next[k] = null; });
        return next;
      });
      return;
    }

    // Dropping into a time slot
    setSchedule(prev => {
      const next = { ...prev };
      
      // Remove from previous slot if it was already scheduled
      Object.keys(next).forEach(k => { if (next[k]?.id === session.id) next[k] = null; });
      
      // If there's already a class in the drop slot, swap them or bounce
      if (next[dropZoneId]) {
        // Simple logic: bounce back (don't overwrite)
        // A robust system would swap or allow conflict resolution.
        return prev;
      }

      next[dropZoneId] = session;
      return next;
    });

    // Remove from unassigned if it was there
    setUnassigned(prev => prev.filter(s => s.id !== session.id));
  };

  const activeSession = activeId 
    ? unassigned.find(s => s.id === activeId) || Object.values(schedule).find(s => s?.id === activeId)
    : null;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-ai-purple" />
            Timetable Builder
          </h1>
          <p className="text-gray-400 text-sm mt-1">Drag and drop class sessions into the academic grid.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-colors">
            <Undo className="w-4 h-4" /> Reset
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ai-blue hover:bg-ai-blue/80 text-white font-medium transition-colors shadow-lg shadow-ai-blue/20">
            <Save className="w-4 h-4" /> Save Schedule
          </button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 flex-1 min-h-0">
          
          {/* Left Column: Unassigned Classes */}
          <div className="col-span-1 rounded-2xl glass-card flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
              <h2 className="font-bold text-white">Unassigned</h2>
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs font-bold">{unassigned.length}</span>
            </div>
            
            <DroppableZone id="unassigned-zone" className="flex-1 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-3">
              {unassigned.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 opacity-50">
                  <AlertCircle className="w-8 h-8 mb-2" />
                  <p className="text-sm">All classes scheduled</p>
                </div>
              ) : (
                unassigned.map(session => (
                  <ClassCard key={session.id} session={session} />
                ))
              )}
            </DroppableZone>
            
            <div className="p-4 border-t border-white/10 bg-white/5">
              <button className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-white/20 text-gray-400 hover:text-white hover:border-white/40 hover:bg-white/5 transition-all text-sm font-medium">
                <Plus className="w-4 h-4" /> Create New Class
              </button>
            </div>
          </div>

          {/* Right Column: Calendar Grid */}
          <div className="col-span-1 xl:col-span-3 rounded-2xl glass-card overflow-hidden flex flex-col">
            <div className="flex-1 overflow-auto custom-scrollbar">
              <div className="min-w-[800px] h-full p-6">
                
                {/* Calendar Header (Days) */}
                <div className="grid grid-cols-6 gap-4 mb-4">
                  <div className="col-span-1" /> {/* Empty corner */}
                  {DAYS.map(day => (
                    <div key={day} className="text-center font-bold text-gray-300 uppercase tracking-widest text-xs">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Body (Times & Slots) */}
                <div className="flex flex-col gap-4">
                  {TIMES.map(time => (
                    <div key={time} className="grid grid-cols-6 gap-4">
                      {/* Time Label */}
                      <div className="col-span-1 flex items-start justify-end pr-4 mt-2">
                        <span className="text-xs font-mono text-gray-500">{time}</span>
                      </div>
                      
                      {/* Slots for this time across all days */}
                      {DAYS.map(day => {
                        const slotId = `${day}-${time}`;
                        return (
                          <TimeSlot key={slotId} id={slotId} session={schedule[slotId] || null} />
                        );
                      })}
                    </div>
                  ))}
                </div>

              </div>
            </div>
          </div>

        </div>

        {/* Drag Overlay for smooth animations */}
        <DragOverlay zIndex={1000}>
          {activeSession ? <ClassCard session={activeSession} isDragging /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

// Helper component for the unassigned area
function DroppableZone({ id, className, children }: { id: string; className?: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={cn(className, isOver && "bg-white/5 ring-inset ring-1 ring-ai-blue/30 rounded-xl")}>
      {children}
    </div>
  );
}
