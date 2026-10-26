import { api } from "@/lib/api/client";

export interface Classroom {
  id: string;
  roomNumber: string;
  building: string;
  floor: number;
  capacity: number;
  departmentId: string;
  departmentName: string;
  devices: string[];
  deviceOnline: number;
  deviceTotal: number;
  isActive: boolean;
  currentSession?: string;
  availability: "available" | "occupied" | "maintenance";
}

const CLASSROOM_STORE_KEY = "smartcampus-classrooms";

export function initializeClassrooms() {
  if (typeof window === "undefined") return;
  const existing = localStorage.getItem(CLASSROOM_STORE_KEY);
  if (existing) {
    try {
      const parsed = JSON.parse(existing);
      // Cleanse any legacy mock rooms (e.g. MB-101, EB-xxx) from the client's storage
      if (Array.isArray(parsed) && parsed.some((r: any) => r.roomNumber?.startsWith("MB-") || r.id?.startsWith("room-0"))) {
        localStorage.removeItem(CLASSROOM_STORE_KEY);
      }
    } catch {
      localStorage.removeItem(CLASSROOM_STORE_KEY);
    }
  }
}

export function getClassroomsFromStorage(): Classroom[] {
  if (typeof window === "undefined") return [];
  initializeClassrooms();
  const data = localStorage.getItem(CLASSROOM_STORE_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveClassroomsToStorage(rooms: Classroom[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CLASSROOM_STORE_KEY, JSON.stringify(rooms));
}

function mapApiClassroom(c: any): Classroom {
  let devicesList: string[] = ["Camera", "Smart Board"];
  if (c.devices) {
    try {
      devicesList = typeof c.devices === "string" ? JSON.parse(c.devices) : c.devices;
    } catch {
      devicesList = ["Camera", "Smart Board"];
    }
  }

  return {
    id: c.id,
    roomNumber: c.roomNumber,
    building: c.building || "Main Block",
    floor: c.floor || 1,
    capacity: c.capacity || 40,
    departmentId: c.departmentId || "",
    departmentName: c.department?.code || c.department?.name || "CSE",
    devices: devicesList,
    deviceOnline: Math.max(1, devicesList.length),
    deviceTotal: Math.max(1, devicesList.length),
    isActive: c.isActive ?? true,
    currentSession: undefined,
    availability: "available",
  };
}

export async function getClassrooms(departmentId?: string): Promise<Classroom[]> {
  try {
    const res = await api.get<any[]>("/classrooms");
    if (res.success && Array.isArray(res.data)) {
      const realRooms = res.data.map(mapApiClassroom);
      saveClassroomsToStorage(realRooms);
      return departmentId
        ? realRooms.filter((c) => c.departmentId === departmentId || c.departmentName === departmentId)
        : realRooms;
    }
  } catch {
    /* Fallback to local storage if API is unreachable */
  }

  const stored = getClassroomsFromStorage();
  return departmentId
    ? stored.filter((c) => c.departmentId === departmentId || c.departmentName === departmentId)
    : stored;
}

export async function getClassroomById(id: string): Promise<Classroom | undefined> {
  try {
    const res = await api.get<any>(`/classrooms/${id}`);
    if (res.success && res.data) {
      return mapApiClassroom(res.data);
    }
  } catch {
    /* Fallback */
  }
  const rooms = getClassroomsFromStorage();
  return rooms.find((c) => c.id === id);
}

export async function createClassroom(room: Omit<Classroom, "id" | "deviceOnline" | "deviceTotal">): Promise<Classroom> {
  try {
    const res = await api.post<any>("/classrooms", {
      roomNumber: room.roomNumber,
      building: room.building,
      floor: room.floor,
      capacity: room.capacity,
      departmentId: room.departmentId?.startsWith("dept-") ? undefined : room.departmentId,
      devices: room.devices,
    });

    if (res.success && res.data) {
      const created = mapApiClassroom(res.data);
      const rooms = getClassroomsFromStorage().filter((r) => r.id !== created.id);
      rooms.unshift(created);
      saveClassroomsToStorage(rooms);
      return created;
    }
  } catch (err) {
    console.warn("API classroom create fallback:", err);
  }

  // Local storage fallback
  const rooms = getClassroomsFromStorage();
  const nextId = `room-${Date.now()}`;
  const newRoom: Classroom = {
    ...room,
    id: nextId,
    deviceOnline: 2,
    deviceTotal: 2,
  };
  rooms.unshift(newRoom);
  saveClassroomsToStorage(rooms);
  return newRoom;
}

export async function updateClassroom(id: string, updated: Partial<Classroom>): Promise<Classroom> {
  try {
    await api.patch<any>(`/classrooms/${id}`, {
      roomNumber: updated.roomNumber,
      building: updated.building,
      floor: updated.floor,
      capacity: updated.capacity,
      isActive: updated.isActive,
      devices: updated.devices,
    });
  } catch {
    /* Fallback */
  }

  const rooms = getClassroomsFromStorage();
  const idx = rooms.findIndex((c) => c.id === id);
  if (idx !== -1) {
    rooms[idx] = { ...rooms[idx], ...updated };
    saveClassroomsToStorage(rooms);
    return rooms[idx];
  }
  throw new Error("Classroom not found");
}

export async function deleteClassroom(id: string): Promise<boolean> {
  try {
    await api.delete(`/classrooms/${id}`);
  } catch {
    /* Fallback */
  }

  const rooms = getClassroomsFromStorage();
  const filtered = rooms.filter((c) => c.id !== id);
  saveClassroomsToStorage(filtered);
  return true;
}
