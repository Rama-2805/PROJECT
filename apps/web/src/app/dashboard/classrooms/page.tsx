"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { ClassroomCard } from "@/components/classrooms/ClassroomCard";
import { DeviceStatusIndicator } from "@/components/classrooms/DeviceStatusIndicator";
import { 
  getClassrooms, 
  createClassroom, 
  updateClassroom, 
  deleteClassroom, 
  type Classroom 
} from "@/lib/mock/classrooms";
import { cn } from "@/lib/utils/cn";
import { X, Plus, Edit2, Trash2 } from "lucide-react";

const DEPARTMENTS = ["CSE", "ISE", "ECE", "EEE", "AIML", "CSE(AI)", "MECH", "CIVIL"];
const BUILDINGS = ["Main Block", "Engineering Block", "Science Block", "Library", "Innovation Hub"];

export default function ClassroomsPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterBuilding, setFilterBuilding] = useState("");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Classroom | null>(null);

  // Add form state
  const [addRoomNumber, setAddRoomNumber] = useState("");
  const [addBuilding, setAddBuilding] = useState("Main Block");
  const [addFloor, setAddFloor] = useState(1);
  const [addCapacity, setAddCapacity] = useState(40);
  const [addDept, setAddDept] = useState("CSE");
  const [addAvail, setAddAvail] = useState<"available" | "occupied" | "maintenance">("available");
  const [addError, setAddError] = useState<string | null>(null);

  // Edit form state
  const [editRoomNumber, setEditRoomNumber] = useState("");
  const [editBuilding, setEditBuilding] = useState("Main Block");
  const [editFloor, setEditFloor] = useState(1);
  const [editCapacity, setEditCapacity] = useState(40);
  const [editDept, setEditDept] = useState("CSE");
  const [editAvail, setEditAvail] = useState<"available" | "occupied" | "maintenance">("available");
  const [editError, setEditError] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    getClassrooms().then((data) => {
      setClassrooms(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    if (!addRoomNumber.trim()) {
      setAddError("Room number is required");
      return;
    }

    try {
      await createClassroom({
        roomNumber: addRoomNumber,
        building: addBuilding,
        floor: Number(addFloor),
        capacity: Number(addCapacity),
        departmentId: `dept-${addDept.toLowerCase()}`,
        departmentName: addDept,
        devices: ["Camera", "WiFi AP", "Smart Board"],
        isActive: true,
        availability: addAvail,
      });

      setAddRoomNumber("");
      setIsAddModalOpen(false);
      loadData();
    } catch (err: any) {
      setAddError(err.message || "Failed to create classroom");
    }
  };

  const triggerEdit = (room: Classroom) => {
    setEditTarget(room);
    setEditRoomNumber(room.roomNumber);
    setEditBuilding(room.building);
    setEditFloor(room.floor);
    setEditCapacity(room.capacity);
    setEditDept(room.departmentName);
    setEditAvail(room.availability);
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    if (!editTarget) return;

    try {
      await updateClassroom(editTarget.id, {
        roomNumber: editRoomNumber,
        building: editBuilding,
        floor: Number(editFloor),
        capacity: Number(editCapacity),
        departmentId: `dept-${editDept.toLowerCase()}`,
        departmentName: editDept,
        availability: editAvail,
      });

      setIsEditModalOpen(false);
      setEditTarget(null);
      loadData();
    } catch (err: any) {
      setEditError(err.message || "Failed to update classroom");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this classroom?")) {
      try {
        await deleteClassroom(id);
        loadData();
      } catch (err: any) {
        alert(err.message || "Failed to delete classroom");
      }
    }
  };

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
        <Button size="sm" onClick={() => setIsAddModalOpen(true)} className="self-start sm:self-auto min-h-[40px]">
          <Plus className="w-4 h-4 mr-1.5" />
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
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
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
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
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
              <ClassroomCard 
                classroom={room} 
                onEdit={triggerEdit}
                onDelete={handleDelete}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Classroom Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-secondary/95 border border-glass-border rounded-2xl w-full max-w-md p-6 relative z-10 shadow-2xl backdrop-blur-xl text-xs text-text-primary"
            >
              <button 
                className="absolute top-4 right-4 text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-glass-light transition-colors" 
                onClick={() => setIsAddModalOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-base font-bold uppercase tracking-wider mb-1">Add Classroom</h3>
              <p className="text-text-muted mb-4">Provision a new physical space in the smart grid.</p>

              {addError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-4">
                  {addError}
                </div>
              )}

              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Room Number / Code</label>
                  <input
                    type="text"
                    required
                    value={addRoomNumber}
                    onChange={(e) => setAddRoomNumber(e.target.value)}
                    placeholder="e.g. MB-104 or CSE-LAB-1"
                    className="w-full bg-glass-light border border-glass-border rounded-xl px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-glass-border/60 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Building</label>
                    <select
                      value={addBuilding}
                      onChange={(e) => setAddBuilding(e.target.value)}
                      className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-glass-border/60 transition-colors"
                    >
                      {BUILDINGS.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Floor</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={addFloor}
                      onChange={(e) => setAddFloor(Number(e.target.value))}
                      className="w-full bg-glass-light border border-glass-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-glass-border/60 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Capacity (Seats)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={addCapacity}
                      onChange={(e) => setAddCapacity(Number(e.target.value))}
                      className="w-full bg-glass-light border border-glass-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-glass-border/60 transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Department</label>
                    <select
                      value={addDept}
                      onChange={(e) => setAddDept(e.target.value)}
                      className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-glass-border/60 transition-colors"
                    >
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Availability State</label>
                  <select
                    value={addAvail}
                    onChange={(e) => setAddAvail(e.target.value as any)}
                    className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-glass-border/60 transition-colors"
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button size="sm" variant="ghost" type="button" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                  <Button size="sm" type="submit">Create Classroom</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Classroom Modal */}
      <AnimatePresence>
        {isEditModalOpen && editTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-secondary/95 border border-glass-border rounded-2xl w-full max-w-md p-6 relative z-10 shadow-2xl backdrop-blur-xl text-xs text-text-primary"
            >
              <button 
                className="absolute top-4 right-4 text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-glass-light transition-colors" 
                onClick={() => setIsEditModalOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-base font-bold uppercase tracking-wider mb-1">Edit Classroom</h3>
              <p className="text-text-muted mb-4">Modify properties of classroom <strong className="text-text-primary">{editTarget.roomNumber}</strong>.</p>

              {editError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-4">
                  {editError}
                </div>
              )}

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Room Number / Code</label>
                  <input
                    type="text"
                    required
                    value={editRoomNumber}
                    onChange={(e) => setEditRoomNumber(e.target.value)}
                    className="w-full bg-glass-light border border-glass-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-glass-border/60 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Building</label>
                    <select
                      value={editBuilding}
                      onChange={(e) => setEditBuilding(e.target.value)}
                      className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-glass-border/60 transition-colors"
                    >
                      {BUILDINGS.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Floor</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={editFloor}
                      onChange={(e) => setEditFloor(Number(e.target.value))}
                      className="w-full bg-glass-light border border-glass-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-glass-border/60 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Capacity (Seats)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={editCapacity}
                      onChange={(e) => setEditCapacity(Number(e.target.value))}
                      className="w-full bg-glass-light border border-glass-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-glass-border/60 transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Department</label>
                    <select
                      value={editDept}
                      onChange={(e) => setEditDept(e.target.value)}
                      className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-glass-border/60 transition-colors"
                    >
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">Availability State</label>
                  <select
                    value={editAvail}
                    onChange={(e) => setEditAvail(e.target.value as any)}
                    className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-glass-border/60 transition-colors"
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button size="sm" variant="ghost" type="button" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                  <Button size="sm" type="submit">Save Changes</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
