// ─── SmartCampus AI — Campus Digital Twin Service ─────

import { Injectable } from '@nestjs/common';

interface Building {
  id: string; name: string; shortName: string; description: string;
  floors: number; position: number[]; size: number[];
  health: string; activeClassrooms: number; totalClassrooms: number;
  studentsPresent: number; totalStudents: number;
  deviceHealth: number; aiAlerts: number;
  attendanceRate: number; engagementScore: number;
}

interface Device {
  id: string; deviceId: string; name: string; buildingId: string;
  position: number[]; type: string; status: string;
  cpuUsage: number; memoryUsage: number; temperature: number;
  modelVersion: string; lastHeartbeat: string;
}

interface Prediction {
  id: string; title: string; description: string;
  confidence: number; impact: string; category: string;
  targetTime: string; recommendation: string;
}

interface CampusEvent {
  id: string; type: string; message: string;
  buildingId?: string; severity: string; timestamp: string;
}

@Injectable()
export class CampusService {
  private readonly buildings: Building[] = [
    { id: 'eng-blk', name: 'Engineering Block', shortName: 'ENG', description: 'School of Engineering & Technology', floors: 5, position: [-8, 0, -5], size: [6, 3, 4], health: 'normal', activeClassrooms: 42, totalClassrooms: 50, studentsPresent: 2350, totalStudents: 2500, deviceHealth: 98, aiAlerts: 3, attendanceRate: 94, engagementScore: 82 },
    { id: 'sci-blk', name: 'Science Block', shortName: 'SCI', description: 'School of Sciences & Mathematics', floors: 4, position: [8, 0, -5], size: [5, 2.5, 4], health: 'normal', activeClassrooms: 28, totalClassrooms: 35, studentsPresent: 1800, totalStudents: 1900, deviceHealth: 96, aiAlerts: 1, attendanceRate: 91, engagementScore: 78 },
    { id: 'lib', name: 'Central Library', shortName: 'LIB', description: 'University Knowledge Center', floors: 3, position: [-5, 0, 4], size: [4, 2, 3], health: 'normal', activeClassrooms: 0, totalClassrooms: 0, studentsPresent: 890, totalStudents: 0, deviceHealth: 99, aiAlerts: 0, attendanceRate: 0, engagementScore: 85 },
    { id: 'aud', name: 'Auditorium', shortName: 'AUD', description: 'Main Auditorium & Event Center', floors: 2, position: [5, 0, 4], size: [3.5, 1.5, 3], health: 'warning', activeClassrooms: 0, totalClassrooms: 0, studentsPresent: 0, totalStudents: 0, deviceHealth: 85, aiAlerts: 2, attendanceRate: 0, engagementScore: 0 },
    { id: 'admin', name: 'Administration', shortName: 'ADM', description: 'University Administrative Offices', floors: 3, position: [0, 0, -8], size: [3, 1.8, 2.5], health: 'critical', activeClassrooms: 0, totalClassrooms: 0, studentsPresent: 120, totalStudents: 0, deviceHealth: 72, aiAlerts: 5, attendanceRate: 0, engagementScore: 60 },
    { id: 'cse-dept', name: 'CSE Department', shortName: 'CSE', description: 'Computer Science & Engineering', floors: 4, position: [-4, 0, 2], size: [3.5, 2, 3], health: 'normal', activeClassrooms: 18, totalClassrooms: 20, studentsPresent: 980, totalStudents: 1050, deviceHealth: 97, aiAlerts: 1, attendanceRate: 96, engagementScore: 88 },
    { id: 'ece-dept', name: 'ECE Department', shortName: 'ECE', description: 'Electronics & Communication', floors: 4, position: [4, 0, 2], size: [3.5, 2, 3], health: 'normal', activeClassrooms: 15, totalClassrooms: 18, studentsPresent: 750, totalStudents: 800, deviceHealth: 95, aiAlerts: 2, attendanceRate: 93, engagementScore: 80 },
    { id: 'mech-blk', name: 'Mechanical Block', shortName: 'MECH', description: 'Mechanical Engineering Workshops', floors: 3, position: [-10, 0, 0], size: [4, 1.8, 3], health: 'warning', activeClassrooms: 8, totalClassrooms: 12, studentsPresent: 420, totalStudents: 500, deviceHealth: 82, aiAlerts: 3, attendanceRate: 88, engagementScore: 72 },
    { id: 'cafeteria', name: 'Cafeteria', shortName: 'CAFE', description: 'Student Dining & Common Area', floors: 1, position: [0, 0, 6], size: [3, 0.8, 2.5], health: 'normal', activeClassrooms: 0, totalClassrooms: 0, studentsPresent: 340, totalStudents: 0, deviceHealth: 0, aiAlerts: 0, attendanceRate: 0, engagementScore: 0 },
    { id: 'sports', name: 'Sports Complex', shortName: 'SPT', description: 'Indoor Sports & Recreation', floors: 1, position: [-7, 0, 7], size: [3, 0.6, 2], health: 'normal', activeClassrooms: 0, totalClassrooms: 0, studentsPresent: 180, totalStudents: 0, deviceHealth: 0, aiAlerts: 0, attendanceRate: 0, engagementScore: 0 },
  ];

  private readonly devices: Device[] = [
    { id: 'd1', deviceId: 'CAM-101', name: 'Camera LAB-101', buildingId: 'cse-dept', position: [-3.5, 3, 2.5], type: 'camera', status: 'online', cpuUsage: 45, memoryUsage: 62, temperature: 42, modelVersion: '2.1.0', lastHeartbeat: '30s ago' },
    { id: 'd2', deviceId: 'JSN-001', name: 'Edge AI LAB-101', buildingId: 'cse-dept', position: [-4.5, 3.5, 1.5], type: 'edge_ai', status: 'online', cpuUsage: 78, memoryUsage: 85, temperature: 58, modelVersion: '2.1.0', lastHeartbeat: '15s ago' },
    { id: 'd3', deviceId: 'CAM-201', name: 'Camera LAB-201', buildingId: 'ece-dept', position: [4.5, 3, 2.5], type: 'camera', status: 'warning', cpuUsage: 72, memoryUsage: 88, temperature: 65, modelVersion: '1.3.0', lastHeartbeat: '2m ago' },
    { id: 'd4', deviceId: 'SENS-001', name: 'Temp Sensor LIB', buildingId: 'lib', position: [-4.5, 2.5, 4.5], type: 'sensor', status: 'online', cpuUsage: 12, memoryUsage: 30, temperature: 32, modelVersion: '1.0.0', lastHeartbeat: '45s ago' },
    { id: 'd5', deviceId: 'JSN-003', name: 'Edge AI LAB-302', buildingId: 'eng-blk', position: [-7.5, 4.5, -4], type: 'edge_ai', status: 'offline', cpuUsage: 0, memoryUsage: 0, temperature: 28, modelVersion: '2.0.0', lastHeartbeat: '25m ago' },
    { id: 'd6', deviceId: 'CAM-301', name: 'Camera LAB-302', buildingId: 'eng-blk', position: [-6.5, 4, -3.5], type: 'camera', status: 'online', cpuUsage: 52, memoryUsage: 58, temperature: 38, modelVersion: '2.1.0', lastHeartbeat: '10s ago' },
    { id: 'd7', deviceId: 'SENS-002', name: 'Air Quality ENG', buildingId: 'mech-blk', position: [-9.5, 2, 0.5], type: 'sensor', status: 'warning', cpuUsage: 25, memoryUsage: 45, temperature: 48, modelVersion: '1.0.0', lastHeartbeat: '5m ago' },
    { id: 'd8', deviceId: 'JSN-005', name: 'Edge AI AUD', buildingId: 'aud', position: [5.5, 2.5, 4.5], type: 'edge_ai', status: 'online', cpuUsage: 35, memoryUsage: 52, temperature: 36, modelVersion: '1.3.0', lastHeartbeat: '20s ago' },
  ];

  private readonly predictions: Prediction[] = [
    { id: 'p1', title: 'CSE Block Peak Occupancy', description: 'CSE Block will reach 95% occupancy at 10:00 AM', confidence: 88, impact: 'high', category: 'occupancy', targetTime: '10:00 AM', recommendation: 'Consider opening additional lab sessions in ECE Block' },
    { id: 'p2', title: 'Device Failure Risk', description: 'Camera CAM-301 has a 72% chance of failure in the next 7 days', confidence: 72, impact: 'medium', category: 'device', targetTime: '7 days', recommendation: 'Schedule maintenance for CAM-301 within 48 hours' },
    { id: 'p3', title: 'Afternoon Engagement Drop', description: 'Student engagement predicted to decrease 18% in afternoon sessions (2-4 PM)', confidence: 85, impact: 'high', category: 'engagement', targetTime: 'Daily 2:00 PM', recommendation: 'Schedule interactive activities during afternoon slots' },
    { id: 'p4', title: 'Attendance Decline Trend', description: 'Mechanical Block attendance predicted to drop below 85% next week', confidence: 79, impact: 'medium', category: 'attendance', targetTime: 'Next Monday', recommendation: 'Send attendance reminders to MECH students' },
    { id: 'p5', title: 'Library Peak Capacity', description: 'Library expected to reach maximum capacity during exam week', confidence: 93, impact: 'low', category: 'occupancy', targetTime: 'Exam week', recommendation: 'Extend library hours and open additional study halls' },
  ];

  getOverview() {
    const totalStudents = this.buildings.reduce((sum, b) => sum + b.totalStudents, 0);
    const presentStudents = this.buildings.reduce((sum, b) => sum + b.studentsPresent, 0);
    const onlineDevices = this.devices.filter((d) => d.status === 'online').length;
    const criticalAlerts = this.buildings.filter((b) => b.health === 'critical').length;
    const activeClassrooms = this.buildings.reduce((sum, b) => sum + b.activeClassrooms, 0);
    const totalClassrooms = this.buildings.reduce((sum, b) => sum + b.totalClassrooms, 0);
    const avgEngagement = Math.round(
      this.buildings.filter((b) => b.engagementScore > 0).reduce((sum, b) => sum + b.engagementScore, 0) /
      this.buildings.filter((b) => b.engagementScore > 0).length
    );
    const avgAttendance = Math.round(
      this.buildings.filter((b) => b.attendanceRate > 0).reduce((sum, b) => sum + b.attendanceRate, 0) /
      this.buildings.filter((b) => b.attendanceRate > 0).length
    );

    return {
      campusHealth: Math.round((onlineDevices / this.devices.length) * 100),
      studentsPresent: presentStudents,
      totalStudents,
      activeDevices: onlineDevices,
      totalDevices: this.devices.length,
      aiProcessingRate: 1200,
      criticalAlerts,
      totalBuildings: this.buildings.length,
      activeClassrooms,
      totalClassrooms,
      attendanceRate: avgAttendance,
      avgEngagement,
    };
  }

  getBuildings() {
    return this.buildings;
  }

  getBuilding(id: string) {
    return this.buildings.find((b) => b.id === id) || null;
  }

  getDevices() {
    return this.devices;
  }

  getDevicesByBuilding(buildingId: string) {
    return this.devices.filter((d) => d.buildingId === buildingId);
  }

  getPredictions() {
    return this.predictions;
  }

  getOccupancy() {
    return this.buildings
      .filter((b) => b.totalClassrooms > 0 || b.totalStudents > 0)
      .map((b) => ({
        buildingId: b.id,
        buildingName: b.name,
        currentOccupancy: b.studentsPresent,
        maxCapacity: b.totalStudents || 100,
        occupancyRate: b.totalStudents > 0 ? Math.round((b.studentsPresent / b.totalStudents) * 100) : 0,
        trend: (b.attendanceRate >= 90 ? 'increasing' : b.attendanceRate >= 80 ? 'stable' : 'decreasing') as 'increasing' | 'stable' | 'decreasing',
        timestamp: new Date().toISOString(),
      }))
      .sort((a, b) => b.occupancyRate - a.occupancyRate);
  }

  getStatusUpdates() {
    const events: CampusEvent[] = this.buildings
      .filter((b) => b.aiAlerts > 0)
      .map((b) => ({
        id: `evt-${b.id}-${Date.now()}`,
        type: b.health === 'critical' ? 'alert' : 'device',
        message: `${b.name}: ${b.aiAlerts} active alerts, ${b.deviceHealth}% device health`,
        buildingId: b.id,
        severity: b.health === 'critical' ? 'error' : b.health === 'warning' ? 'warning' : 'info',
        timestamp: new Date().toISOString(),
      }));
    return events;
  }

  generateEvent() {
    const buildings = this.buildings;
    const building = buildings[Math.floor(Math.random() * buildings.length)];
    const types = ['attendance', 'alert', 'device', 'system'] as const;
    const type = types[Math.floor(Math.random() * types.length)];
    const severities = ['info', 'warning', 'error'] as const;
    const severity = severities[Math.floor(Math.random() * severities.length)];

    const messages: Record<string, string[]> = {
      attendance: [`Student recognized in ${building.shortName} Block`, `Attendance updated: ${building.shortName}`, `${Math.floor(Math.random() * 10) + 1} students marked present in ${building.shortName}`],
      alert: [`Low engagement detected in ${building.shortName}`, `${building.aiAlerts} active alerts in ${building.name}`, `Device health dropping: ${building.name} at ${building.deviceHealth}%`],
      device: [`Device heartbeat received from ${building.shortName}`, `Edge AI processing: ${Math.floor(Math.random() * 30 + 50)}% CPU in ${building.shortName}`, `Camera feed stable: ${building.name}`],
      system: [`AI prediction updated for ${building.name}`, `Occupancy: ${building.studentsPresent} students in ${building.shortName}`, `Campus health maintained`],
    };

    const msg = messages[type][Math.floor(Math.random() * messages[type].length)];
    return { id: `evt-${Date.now()}`, type, message: msg, buildingId: building.id, severity, timestamp: 'Just now' };
  }
}
