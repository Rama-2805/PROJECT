export interface Device {
  id: string;
  deviceId: string;
  name: string;
  type: "JETSON_NANO" | "RASPBERRY_PI_5" | "CORAL_TPU" | "VIRTUAL";
  classroomId: string;
  location: string;
  status: "ONLINE" | "OFFLINE" | "PROCESSING" | "ERROR" | "UPDATING";
  cpuUsage: number;
  memoryUsage: number;
  temperature: number;
  networkQuality: "GOOD" | "FAIR" | "POOR";
  firmwareVersion: string;
  modelVersion: string;
  lastHeartbeat: string;
  uptime: string;
}

export interface DeviceHeartbeat {
  cpuUsage: number;
  memoryUsage: number;
  temperature: number;
  networkQuality: string;
  status: string;
  timestamp: string;
}

export interface DeviceLog {
  id: string;
  level: "INFO" | "WARNING" | "ERROR";
  message: string;
  timestamp: string;
}

export interface DeviceCommand {
  id: string;
  command: string;
  status: "PENDING" | "SENT" | "DELIVERED" | "COMPLETED" | "FAILED";
  issuedBy: string;
  createdAt: string;
}

export interface DeviceStats {
  total: number;
  online: number;
  offline: number;
  error: number;
  updating: number;
}

const DEVICE_TYPES: Device["type"][] = ["JETSON_NANO", "RASPBERRY_PI_5", "CORAL_TPU", "VIRTUAL"];
const LOCATIONS = [
  "Building A, Floor 1, CSE Lab 101", "Building A, Floor 2, CSE Lab 201",
  "Building A, Floor 3, CSE Lab 301", "Building B, Floor 1, ECE Lab 101",
  "Building B, Floor 2, ECE Lab 201", "Building C, Floor 1, ME Workshop",
  "Building D, Floor 1, Physics Lab", "Building D, Floor 2, Chemistry Lab",
  "Building E, Floor 1, Library", "Building F, Floor 1, Auditorium",
  "Admin Block, Floor 1", "Sports Complex", "Hostel Block A", "Hostel Block B",
  "Building G, Floor 1, BioTech Lab", "Building A, Floor 3, AI Research Lab",
  "Building H, IoT Lab", "Building I, Floor 2, Robotics Lab",
  "Building J, Floor 1, Smart Classroom", "CSE Annex, Floor 2",
];
const CLASSROOMS = [
  "room-001","room-002","room-003","room-004","room-005",
  "room-006","room-007","room-008","room-009","room-010",
  "room-011","room-012","room-013","room-014","room-015",
  "room-016","room-017","room-018","room-019","room-020",
];
const DEVICE_NAMES = [
  "CSE Lab Edge Node", "ECE Lab Edge Node", "ME Workshop Edge Node",
  "Physics Lab Edge Node", "Chemistry Lab Edge Node", "Library Edge Node",
  "Admin Block Edge Node", "Auditorium Edge Node", "Sports Complex Edge Node",
  "Hostel Block A Edge Node", "Hostel Block B Edge Node", "BioTech Lab Edge Node",
  "AI Research Lab Edge Node", "IoT Lab Edge Node", "Robotics Lab Edge Node",
  "Smart Classroom Edge Node", "CSE Annex Edge Node", "Data Center Monitor",
  "Campus Security Node", "Parking Lot Node",
];

function rand(min: number, max: number) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(1));
}

function generateDevices(count: number): Device[] {
  const devices: Device[] = [];
  for (let i = 0; i < count; i++) {
    const isOffline = i >= 18 && i < 20;
    const isError = i >= 20 && i < 21;
    const isUpdating = i >= 21 && i < 22;
    const status: Device["status"] = isOffline ? "OFFLINE" : isError ? "ERROR" : isUpdating ? "UPDATING" : Math.random() > 0.6 ? "PROCESSING" : "ONLINE";
    const typeIdx = i % DEVICE_TYPES.length;
    const nameIdx = i % DEVICE_NAMES.length;
    const locIdx = i % LOCATIONS.length;
    const roomIdx = i % CLASSROOMS.length;
    const hours = Math.floor(Math.random() * 720);
    const mins = Math.floor(Math.random() * 60);

    devices.push({
      id: `device-${String(i + 1).padStart(3, "0")}`,
      deviceId: `DEVICE_${["CSE","ECE","ME","PHY","CHEM","LIB","ADMIN","AUDI","SPORTS","HOSTEL","HOSTEL","BIO","AI","IOT","ROBO","SMART","CSE","DC","CAMPUS","PARK"][i]}_${String(i + 1).padStart(3, "0")}`,
      name: DEVICE_NAMES[nameIdx],
      type: DEVICE_TYPES[typeIdx],
      classroomId: CLASSROOMS[roomIdx],
      location: LOCATIONS[locIdx],
      status,
      cpuUsage: status === "OFFLINE" ? 0 : rand(10, 95),
      memoryUsage: status === "OFFLINE" ? 0 : rand(25, 92),
      temperature: status === "OFFLINE" ? 0 : rand(38, 78),
      networkQuality: status === "OFFLINE" ? "POOR" : rand(0, 1) > 0.8 ? "FAIR" : "GOOD",
      firmwareVersion: `2.${Math.floor(Math.random() * 5)}.${Math.floor(Math.random() * 10)}`,
      modelVersion: `SmartCampus-AI-v1.${Math.floor(Math.random() * 3)}`,
      lastHeartbeat: isOffline ? new Date(Date.now() - rand(180, 3600) * 1000).toISOString() : new Date(Date.now() - rand(0, 30) * 1000).toISOString(),
      uptime: `${hours}h ${mins}m`,
    });
  }
  return devices;
}

function generateHeartbeats(count: number): DeviceHeartbeat[] {
  const heartbeats: DeviceHeartbeat[] = [];
  const now = Date.now();
  for (let i = count - 1; i >= 0; i--) {
    heartbeats.push({
      cpuUsage: rand(15, 88),
      memoryUsage: rand(30, 90),
      temperature: rand(38, 72),
      networkQuality: rand(0, 1) > 0.85 ? "FAIR" : "GOOD",
      status: "ONLINE",
      timestamp: new Date(now - i * 30000).toISOString(),
    });
  }
  return heartbeats;
}

function generateLogs(): DeviceLog[] {
  const levels: DeviceLog["level"][] = ["INFO", "INFO", "INFO", "WARNING", "ERROR"];
  const messages: Record<string, string[]> = {
    INFO: [
      "Camera connected successfully",
      "AI model loaded: SmartCampus-AI-v1.0",
      "MQTT connection established",
      "Heartbeat sent to backend",
      "Frame processing cycle completed",
      "Attendance session started",
      "Face recognition pipeline initialized",
      "Configuration synchronized with cloud",
      "Network connectivity check passed",
      "Scheduled diagnostic completed",
    ],
    WARNING: [
      "High CPU usage detected: 88%",
      "Temperature above normal: 72°C",
      "Memory usage approaching limit: 85%",
      "Network latency above threshold: 250ms",
      "Frame processing rate degraded: 12 FPS",
      "Camera auto-focus recalibrated",
      "MQTT reconnection attempt #3",
      "Low confidence recognition: 0.62",
    ],
    ERROR: [
      "MQTT connection lost - buffering events",
      "Camera stream interrupted - restarting",
      "AI inference timeout - model unresponsive",
      "Failed to sync configuration",
      "Disk space warning: 92% full",
      "Authentication token expired",
    ],
  };
  const logs: DeviceLog[] = [];
  const now = Date.now();
  const timestampOffset = 0;

  for (let i = 0; i < 30; i++) {
    const level = levels[Math.floor(Math.random() * levels.length)];
    const msgList = messages[level];
    const message = msgList[Math.floor(Math.random() * msgList.length)];
    logs.push({
      id: `log-${String(i + 1).padStart(3, "0")}`,
      level,
      message,
      timestamp: new Date(now - (30 - i) * 120000).toISOString(),
    });
  }
  return logs;
}

export const MOCK_DEVICES = generateDevices(24);

export const DEVICE_STATS: DeviceStats = {
  total: MOCK_DEVICES.length,
  online: MOCK_DEVICES.filter((d) => d.status === "ONLINE" || d.status === "PROCESSING").length,
  offline: MOCK_DEVICES.filter((d) => d.status === "OFFLINE").length,
  error: MOCK_DEVICES.filter((d) => d.status === "ERROR").length,
  updating: MOCK_DEVICES.filter((d) => d.status === "UPDATING").length,
};

export function getDevicesData() {
  return Promise.resolve({
    devices: MOCK_DEVICES,
    stats: DEVICE_STATS,
    healthScore: 96,
    currentModel: "SmartCampus-AI-v1.0",
  });
}

export function getDeviceDetailData(deviceId: string) {
  const device = MOCK_DEVICES.find((d) => d.deviceId === deviceId);
  if (!device) return Promise.reject(new Error("Device not found"));

  return Promise.resolve({
    device,
    heartbeats: generateHeartbeats(48),
    logs: generateLogs(),
    commands: [
      { id: "cmd-001", command: "RESTART", status: "COMPLETED" as const, issuedBy: "Admin", createdAt: new Date(Date.now() - 86400000).toISOString() },
      { id: "cmd-002", command: "UPDATE_CONFIG", status: "COMPLETED" as const, issuedBy: "Admin", createdAt: new Date(Date.now() - 172800000).toISOString() },
      { id: "cmd-003", command: "DIAGNOSTIC", status: "COMPLETED" as const, issuedBy: "Teacher", createdAt: new Date(Date.now() - 259200000).toISOString() },
      { id: "cmd-004", command: "RESTART_AI", status: "COMPLETED" as const, issuedBy: "Admin", createdAt: new Date(Date.now() - 432000000).toISOString() },
    ],
  });
}

export function getDeviceLogsData(deviceId: string): Promise<DeviceLog[]> {
  return Promise.resolve(generateLogs());
}
