// ─── SmartCampus AI — Campus DTOs ─────────────────────

export class CampusOverviewResponse {
  campusHealth: number;
  studentsPresent: number;
  totalStudents: number;
  activeDevices: number;
  totalDevices: number;
  aiProcessingRate: number;
  criticalAlerts: number;
  totalBuildings: number;
  activeClassrooms: number;
  attendanceRate: number;
  avgEngagement: number;
}

export class BuildingResponse {
  id: string;
  name: string;
  shortName: string;
  description: string;
  floors: number;
  position: number[];
  size: number[];
  health: string;
  activeClassrooms: number;
  totalClassrooms: number;
  studentsPresent: number;
  totalStudents: number;
  deviceHealth: number;
  aiAlerts: number;
  attendanceRate: number;
  engagementScore: number;
}

export class DeviceResponse {
  id: string;
  deviceId: string;
  name: string;
  buildingId: string;
  position: number[];
  type: string;
  status: string;
  cpuUsage: number;
  memoryUsage: number;
  temperature: number;
  modelVersion: string;
  lastHeartbeat: string;
}

export class PredictionResponse {
  id: string;
  title: string;
  description: string;
  confidence: number;
  impact: string;
  category: string;
  targetTime: string;
  recommendation: string;
}

export class OccupancyResponse {
  buildingId: string;
  buildingName: string;
  currentOccupancy: number;
  maxCapacity: number;
  occupancyRate: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  timestamp: string;
}

export class CampusEventResponse {
  id: string;
  type: string;
  message: string;
  buildingId?: string;
  severity: string;
  timestamp: string;
}

export class WebSocketEvent {
  event: string;
  data: any;
}
