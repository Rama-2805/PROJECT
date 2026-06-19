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

const BUILDINGS = ["Main Block", "Engineering Block", "Science Block", "Library", "Innovation Hub"];
const ROOM_TYPES = ["LAB", "Lecture Hall", "Seminar Room", "Smart Classroom", "Conference Room"];

function generateMockClassrooms(): Classroom[] {
  const classrooms: Classroom[] = [];
  let id = 1;
  for (const building of BUILDINGS) {
    const floors = building === "Library" ? 3 : building === "Innovation Hub" ? 2 : 4;
    for (let floor = 1; floor <= floors; floor++) {
      const roomsPerFloor = building === "Library" ? 2 : 3 + Math.floor(Math.random() * 3);
      for (let r = 1; r <= roomsPerFloor; r++) {
        const type = ROOM_TYPES[Math.floor(Math.random() * ROOM_TYPES.length)];
        const deptNames = ["Computer Science & Engineering", "Electronics & Communication", "Mechanical Engineering", "Civil Engineering", "Electrical Engineering", "Biotechnology", "Management Studies"];
        const dept = deptNames[Math.floor(Math.random() * deptNames.length)];
        const deviceCount = Math.floor(Math.random() * 4) + 2;
        const deviceNames = ["Camera", "Smart Board", "Projector", "Speaker", "Edge Node", "WiFi AP"];
        const devices = Array.from({ length: deviceCount }, (_, i) => deviceNames[i % deviceNames.length]);
        const online = Math.floor(deviceCount * (0.7 + Math.random() * 0.3));

        classrooms.push({
          id: `room-${String(id).padStart(3, "0")}`,
          roomNumber: `${building === "Main Block" ? "MB" : building === "Engineering Block" ? "EB" : building === "Science Block" ? "SB" : building === "Library" ? "LB" : "IH"}-${floor}${String(r).padStart(2, "0")}`,
          building,
          floor,
          capacity: type === "Lecture Hall" ? 60 + Math.floor(Math.random() * 40) : type === "LAB" ? 30 + Math.floor(Math.random() * 20) : 20 + Math.floor(Math.random() * 20),
          departmentId: `dept-${dept.split(" ")[0].toLowerCase().slice(0, 3)}`,
          departmentName: dept,
          devices,
          deviceOnline: online,
          deviceTotal: deviceCount,
          isActive: true,
          currentSession: Math.random() > 0.4 ? "Data Structures" : undefined,
          availability: Math.random() > 0.5 ? "available" : Math.random() > 0.5 ? "occupied" : "maintenance",
        });
        id++;
      }
    }
  }
  return classrooms;
}

const mockClassrooms = generateMockClassrooms();

export function getClassrooms(departmentId?: string): Promise<Classroom[]> {
  const filtered = departmentId
    ? mockClassrooms.filter((c) => c.departmentId === departmentId)
    : mockClassrooms;
  return Promise.resolve(filtered);
}

export function getClassroomById(id: string): Promise<Classroom | undefined> {
  return Promise.resolve(mockClassrooms.find((c) => c.id === id));
}
