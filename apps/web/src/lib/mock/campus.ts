// ─── SmartCampus AI — Campus Digital Twin Mock Data ────

export interface BuildingData {
  id: string;
  name: string;
  shortName: string;
  description: string;
  floors: number;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  health: 'normal' | 'warning' | 'critical';
  activeClassrooms: number;
  totalClassrooms: number;
  studentsPresent: number;
  totalStudents: number;
  deviceHealth: number;
  aiAlerts: number;
  attendanceRate: number;
  engagementScore: number;
}

export interface DeviceIndicator {
  id: string;
  deviceId: string;
  name: string;
  buildingId: string;
  position: [number, number, number];
  type: 'camera' | 'edge_ai' | 'sensor';
  status: 'online' | 'warning' | 'offline';
  cpuUsage: number;
  memoryUsage: number;
  temperature: number;
  modelVersion: string;
  lastHeartbeat: string;
}

export interface Prediction {
  id: string;
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  category: 'occupancy' | 'device' | 'engagement' | 'attendance';
  targetTime: string;
  recommendation: string;
}

export interface CampusEvent {
  id: string;
  type: 'attendance' | 'alert' | 'device' | 'system';
  message: string;
  buildingId?: string;
  severity: 'info' | 'warning' | 'error';
  timestamp: string;
}

export const CAMPUS_BUILDINGS: BuildingData[] = [
  { id: 'eng-blk', name: 'Engineering Block', shortName: 'ENG', description: 'School of Engineering & Technology', floors: 5, position: [-8, 0, -5], size: [6, 3, 4], color: '#22D3EE', health: 'normal', activeClassrooms: 42, totalClassrooms: 50, studentsPresent: 2350, totalStudents: 2500, deviceHealth: 98, aiAlerts: 3, attendanceRate: 94, engagementScore: 82 },
  { id: 'sci-blk', name: 'Science Block', shortName: 'SCI', description: 'School of Sciences & Mathematics', floors: 4, position: [8, 0, -5], size: [5, 2.5, 4], color: '#A78BFA', health: 'normal', activeClassrooms: 28, totalClassrooms: 35, studentsPresent: 1800, totalStudents: 1900, deviceHealth: 96, aiAlerts: 1, attendanceRate: 91, engagementScore: 78 },
  { id: 'lib', name: 'Central Library', shortName: 'LIB', description: 'University Knowledge Center', floors: 3, position: [-5, 0, 4], size: [4, 2, 3], color: '#34D399', health: 'normal', activeClassrooms: 0, totalClassrooms: 0, studentsPresent: 890, totalStudents: 0, deviceHealth: 99, aiAlerts: 0, attendanceRate: 0, engagementScore: 85 },
  { id: 'aud', name: 'Auditorium', shortName: 'AUD', description: 'Main Auditorium & Event Center', floors: 2, position: [5, 0, 4], size: [3.5, 1.5, 3], color: '#FBBF24', health: 'warning', activeClassrooms: 0, totalClassrooms: 0, studentsPresent: 0, totalStudents: 0, deviceHealth: 85, aiAlerts: 2, attendanceRate: 0, engagementScore: 0 },
  { id: 'admin', name: 'Administration', shortName: 'ADM', description: 'University Administrative Offices', floors: 3, position: [0, 0, -8], size: [3, 1.8, 2.5], color: '#F87171', health: 'critical', activeClassrooms: 0, totalClassrooms: 0, studentsPresent: 120, totalStudents: 0, deviceHealth: 72, aiAlerts: 5, attendanceRate: 0, engagementScore: 60 },
  { id: 'cse-dept', name: 'CSE Department', shortName: 'CSE', description: 'Computer Science & Engineering', floors: 4, position: [-4, 0, 2], size: [3.5, 2, 3], color: '#22D3EE', health: 'normal', activeClassrooms: 18, totalClassrooms: 20, studentsPresent: 980, totalStudents: 1050, deviceHealth: 97, aiAlerts: 1, attendanceRate: 96, engagementScore: 88 },
  { id: 'ece-dept', name: 'ECE Department', shortName: 'ECE', description: 'Electronics & Communication', floors: 4, position: [4, 0, 2], size: [3.5, 2, 3], color: '#A78BFA', health: 'normal', activeClassrooms: 15, totalClassrooms: 18, studentsPresent: 750, totalStudents: 800, deviceHealth: 95, aiAlerts: 2, attendanceRate: 93, engagementScore: 80 },
  { id: 'mech-blk', name: 'Mechanical Block', shortName: 'MECH', description: 'Mechanical Engineering Workshops', floors: 3, position: [-10, 0, 0], size: [4, 1.8, 3], color: '#FBBF24', health: 'warning', activeClassrooms: 8, totalClassrooms: 12, studentsPresent: 420, totalStudents: 500, deviceHealth: 82, aiAlerts: 3, attendanceRate: 88, engagementScore: 72 },
  { id: 'cafeteria', name: 'Cafeteria', shortName: 'CAFE', description: 'Student Dining & Common Area', floors: 1, position: [0, 0, 6], size: [3, 0.8, 2.5], color: '#34D399', health: 'normal', activeClassrooms: 0, totalClassrooms: 0, studentsPresent: 340, totalStudents: 0, deviceHealth: 0, aiAlerts: 0, attendanceRate: 0, engagementScore: 0 },
  { id: 'sports', name: 'Sports Complex', shortName: 'SPT', description: 'Indoor Sports & Recreation', floors: 1, position: [-7, 0, 7], size: [3, 0.6, 2], color: '#22D3EE', health: 'normal', activeClassrooms: 0, totalClassrooms: 0, studentsPresent: 180, totalStudents: 0, deviceHealth: 0, aiAlerts: 0, attendanceRate: 0, engagementScore: 0 },
];

export const CAMPUS_DEVICES: DeviceIndicator[] = [
  { id: 'd1', deviceId: 'CAM-101', name: 'Camera LAB-101', buildingId: 'cse-dept', position: [-3.5, 3, 2.5], type: 'camera', status: 'online', cpuUsage: 45, memoryUsage: 62, temperature: 42, modelVersion: '2.1.0', lastHeartbeat: '30s ago' },
  { id: 'd2', deviceId: 'JSN-001', name: 'Edge AI LAB-101', buildingId: 'cse-dept', position: [-4.5, 3.5, 1.5], type: 'edge_ai', status: 'online', cpuUsage: 78, memoryUsage: 85, temperature: 58, modelVersion: '2.1.0', lastHeartbeat: '15s ago' },
  { id: 'd3', deviceId: 'CAM-201', name: 'Camera LAB-201', buildingId: 'ece-dept', position: [4.5, 3, 2.5], type: 'camera', status: 'warning', cpuUsage: 72, memoryUsage: 88, temperature: 65, modelVersion: '1.3.0', lastHeartbeat: '2m ago' },
  { id: 'd4', deviceId: 'SENS-001', name: 'Temp Sensor LIB', buildingId: 'lib', position: [-4.5, 2.5, 4.5], type: 'sensor', status: 'online', cpuUsage: 12, memoryUsage: 30, temperature: 32, modelVersion: '1.0.0', lastHeartbeat: '45s ago' },
  { id: 'd5', deviceId: 'JSN-003', name: 'Edge AI LAB-302', buildingId: 'eng-blk', position: [-7.5, 4.5, -4], type: 'edge_ai', status: 'offline', cpuUsage: 0, memoryUsage: 0, temperature: 28, modelVersion: '2.0.0', lastHeartbeat: '25m ago' },
  { id: 'd6', deviceId: 'CAM-301', name: 'Camera LAB-302', buildingId: 'eng-blk', position: [-6.5, 4, -3.5], type: 'camera', status: 'online', cpuUsage: 52, memoryUsage: 58, temperature: 38, modelVersion: '2.1.0', lastHeartbeat: '10s ago' },
  { id: 'd7', deviceId: 'SENS-002', name: 'Air Quality ENG', buildingId: 'mech-blk', position: [-9.5, 2, 0.5], type: 'sensor', status: 'warning', cpuUsage: 25, memoryUsage: 45, temperature: 48, modelVersion: '1.0.0', lastHeartbeat: '5m ago' },
  { id: 'd8', deviceId: 'JSN-005', name: 'Edge AI AUD', buildingId: 'aud', position: [5.5, 2.5, 4.5], type: 'edge_ai', status: 'online', cpuUsage: 35, memoryUsage: 52, temperature: 36, modelVersion: '1.3.0', lastHeartbeat: '20s ago' },
];

export const CAMPUS_PREDICTIONS: Prediction[] = [
  { id: 'p1', title: 'CSE Block Peak Occupancy', description: 'CSE Block will reach 95% occupancy at 10:00 AM', confidence: 88, impact: 'high', category: 'occupancy', targetTime: '10:00 AM', recommendation: 'Consider opening additional lab sessions in ECE Block' },
  { id: 'p2', title: 'Device Failure Risk', description: 'Camera DEVICE_301 (CAM-301) has a 72% chance of failure in the next 7 days', confidence: 72, impact: 'medium', category: 'device', targetTime: '7 days', recommendation: 'Schedule maintenance for CAM-301 within 48 hours' },
  { id: 'p3', title: 'Afternoon Engagement Drop', description: 'Student engagement is predicted to decrease 18% in afternoon sessions (2-4 PM)', confidence: 85, impact: 'high', category: 'engagement', targetTime: 'Daily 2:00 PM', recommendation: 'Schedule interactive activities during afternoon slots' },
  { id: 'p4', title: 'Attendance Decline Trend', description: 'Mechanical Block attendance predicted to drop below 85% next week', confidence: 79, impact: 'medium', category: 'attendance', targetTime: 'Next Monday', recommendation: 'Send attendance reminders to MECH students' },
  { id: 'p5', title: 'Library Occupancy Alert', description: 'Library expected to reach maximum capacity during exam week', confidence: 93, impact: 'low', category: 'occupancy', targetTime: 'Exam week', recommendation: 'Extend library hours and open additional study halls' },
];

export const CAMPUS_EVENTS: CampusEvent[] = [
  { id: 'e1', type: 'attendance', message: 'Student CSE2026015 marked present in Data Structures (CSE-101)', buildingId: 'cse-dept', severity: 'info', timestamp: 'Just now' },
  { id: 'e2', type: 'device', message: 'Edge AI JSN-001 processing: 78% CPU, stable', buildingId: 'cse-dept', severity: 'info', timestamp: '15s ago' },
  { id: 'e3', type: 'alert', message: 'Camera CAM-201 temperature high: 65°C', buildingId: 'ece-dept', severity: 'warning', timestamp: '1m ago' },
  { id: 'e4', type: 'attendance', message: 'Engineering Block: 42 active classes, 2,350 students present', buildingId: 'eng-blk', severity: 'info', timestamp: '3m ago' },
  { id: 'e5', type: 'system', message: 'AI Prediction: CSE Block occupancy will peak at 95% at 10 AM', buildingId: 'cse-dept', severity: 'info', timestamp: '5m ago' },
  { id: 'e6', type: 'alert', message: 'Admin Building: 72% device health, 5 active alerts', buildingId: 'admin', severity: 'error', timestamp: '7m ago' },
  { id: 'e7', type: 'device', message: 'Edge AI JSN-003 (LAB-302) offline — 25 minutes since last heartbeat', buildingId: 'eng-blk', severity: 'error', timestamp: '10m ago' },
  { id: 'e8', type: 'system', message: 'Campus health: 98% — 15,420 students across 9 buildings', severity: 'info', timestamp: '15m ago' },
];

export const CAMPUS_GLOBAL = {
  campusHealth: 98,
  studentsPresent: 15420,
  totalStudents: 20000,
  activeDevices: 340,
  totalDevices: 380,
  aiProcessingRate: 1200,
  criticalAlerts: 2,
  totalBuildings: 10,
  activeClassrooms: 111,
  totalClassrooms: 135,
  attendanceRate: 93,
  avgEngagement: 80,
};
