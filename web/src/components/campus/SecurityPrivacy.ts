// ─── SmartCampus AI — Campus Digital Twin Security & Privacy ──
// Role-based access control, data anonymization, and
// secure real-time channels for the Digital Twin.

'use client';

import { create } from 'zustand';
import type { BuildingData, DeviceIndicator, Prediction, CampusEvent } from '@/lib/mock/campus';
import { CAMPUS_BUILDINGS, CAMPUS_DEVICES, CAMPUS_PREDICTIONS, CAMPUS_EVENTS, CAMPUS_GLOBAL } from '@/lib/mock/campus';

// ── Role Definitions ─────────────────────────────────────────

export type CampusRole = 'admin' | 'faculty' | 'security' | 'maintenance' | 'guest' | 'student';

export interface CampusPermissions {
  canViewLiveVideo: boolean;
  canViewStudentDetails: boolean;
  canAccessDeviceControls: boolean;
  canViewPredictions: boolean;
  canViewEnvironmentalData: boolean;
  canAccessTimeMachine: boolean;
  canViewOccupancyHeatmaps: boolean;
  canManageDevices: boolean;
  canManageBuildings: boolean;
  canViewAnonymizedData: boolean;
}

const ROLE_PERMISSIONS: Record<CampusRole, CampusPermissions> = {
  admin: {
    canViewLiveVideo: true, canViewStudentDetails: true, canAccessDeviceControls: true,
    canViewPredictions: true, canViewEnvironmentalData: true, canAccessTimeMachine: true,
    canViewOccupancyHeatmaps: true, canManageDevices: true, canManageBuildings: true,
    canViewAnonymizedData: false,
  },
  faculty: {
    canViewLiveVideo: true, canViewStudentDetails: false, canAccessDeviceControls: false,
    canViewPredictions: true, canViewEnvironmentalData: true, canAccessTimeMachine: false,
    canViewOccupancyHeatmaps: true, canManageDevices: false, canManageBuildings: false,
    canViewAnonymizedData: true,
  },
  security: {
    canViewLiveVideo: true, canViewStudentDetails: false, canAccessDeviceControls: false,
    canViewPredictions: true, canViewEnvironmentalData: false, canAccessTimeMachine: false,
    canViewOccupancyHeatmaps: true, canManageDevices: false, canManageBuildings: false,
    canViewAnonymizedData: true,
  },
  maintenance: {
    canViewLiveVideo: false, canViewStudentDetails: false, canAccessDeviceControls: true,
    canViewPredictions: true, canViewEnvironmentalData: true, canAccessTimeMachine: false,
    canViewOccupancyHeatmaps: false, canManageDevices: true, canManageBuildings: false,
    canViewAnonymizedData: true,
  },
  guest: {
    canViewLiveVideo: false, canViewStudentDetails: false, canAccessDeviceControls: false,
    canViewPredictions: false, canViewEnvironmentalData: true, canAccessTimeMachine: false,
    canViewOccupancyHeatmaps: false, canManageDevices: false, canManageBuildings: false,
    canViewAnonymizedData: true,
  },
  student: {
    canViewLiveVideo: false, canViewStudentDetails: false, canAccessDeviceControls: false,
    canViewPredictions: true, canViewEnvironmentalData: true, canAccessTimeMachine: false,
    canViewOccupancyHeatmaps: false, canManageDevices: false, canManageBuildings: false,
    canViewAnonymizedData: true,
  },
};

// ── Student Data Anonymizer ──────────────────────────────────

export function anonymizeStudentData(data: any, level: 'none' | 'partial' | 'full' = 'full'): any {
  if (!data || level === 'none') return data;

  const anonymized = { ...data };

  if (level === 'full') {
    // Replace student IDs with anonymous identifiers
    if (anonymized.studentId) {
      anonymized.studentId = `STU-${anonymized.studentId.slice(-4).padStart(4, '0')}`;
    }
    if (anonymized.fullName) {
      const nameParts = anonymized.fullName.split(' ');
      anonymized.fullName = `${nameParts[0]} ${nameParts.length > 1 ? nameParts[nameParts.length - 1][0] + '.' : ''}`;
    }
    if (anonymized.email) {
      const [local, domain] = anonymized.email.split('@');
      anonymized.email = `${local[0]}***@${domain}`;
    }
  }

  if (level === 'partial') {
    if (anonymized.studentId) {
      anonymized.studentId = `${anonymized.studentId.slice(0, 3)}-XXXX`;
    }
  }

  return anonymized;
}

// ── Device Location Obfuscator ───────────────────────────────

export function obfuscateDevicePosition(
  position: [number, number, number],
  role: CampusRole,
): [number, number, number] {
  // Only admin and maintenance see exact positions
  if (role === 'admin' || role === 'maintenance') return position;

  // Add random noise (±1 unit) to obfuscate exact location
  const noise = (offset: number) =>
    offset + (Math.sin(offset * 100) * 0.5 + Math.cos(offset * 50) * 0.5);

  return [
    noise(position[0]),
    position[1], // Keep height
    noise(position[2]),
  ];
}

// ── Secure Event Filter ──────────────────────────────────────

export function filterEventsByRole(
  events: CampusEvent[],
  role: CampusRole,
): CampusEvent[] {
  const perms = ROLE_PERMISSIONS[role];

  if (!perms.canViewLiveVideo) {
    // Remove camera/device specific events for restricted roles
    return events.filter((e) => e.type !== 'device');
  }

  if (!perms.canViewStudentDetails) {
    // Anonymize student names in events
    return events.map((e) => ({
      ...e,
      message: e.message.replace(
        /(student\s+)([A-Z]+[0-9]+)/gi,
        (_, prefix, id) => `${prefix}${id.slice(0, 3)}-XXXX`,
      ),
    }));
  }

  return events;
}

// ── CCTV & Location Privacy ──────────────────────────────────

export interface PrivacyConfig {
  /** Whether to show real-time camera feeds */
  showLiveFeeds: boolean;
  /** Whether to show exact student locations */
  showStudentLocations: boolean;
  /** Data retention in days for occupancy history */
  dataRetentionDays: number;
  /** Whether to blur faces in live feeds */
  blurFaces: boolean;
}

const DEFAULT_PRIVACY: PrivacyConfig = {
  showLiveFeeds: false,
  showStudentLocations: false,
  dataRetentionDays: 30,
  blurFaces: true,
};

// ── Role & Privacy Store ─────────────────────────────────────

interface SecurityStore {
  currentRole: CampusRole;
  permissions: CampusPermissions;
  privacy: PrivacyConfig;
  setRole: (role: CampusRole) => void;
  updatePrivacy: (config: Partial<PrivacyConfig>) => void;
}

export const useCampusSecurity = create<SecurityStore>((set) => ({
  currentRole: 'admin',
  permissions: ROLE_PERMISSIONS.admin,
  privacy: DEFAULT_PRIVACY,

  setRole: (role) => set({
    currentRole: role,
    permissions: ROLE_PERMISSIONS[role],
  }),

  updatePrivacy: (config) => set((state) => ({
    privacy: { ...state.privacy, ...config },
  })),
}));

// ── Access Control Hook ──────────────────────────────────────

export function useCampusAccess() {
  const { currentRole, permissions, privacy } = useCampusSecurity();

  const getAccessibleBuildings = (buildings: BuildingData[]): BuildingData[] => {
    if (currentRole === 'admin' || currentRole === 'faculty') return buildings;

    // Security sees all buildings but with anonymized data
    if (currentRole === 'security') {
      return buildings.map((b) => ({
        ...b,
        studentsPresent: Math.round(b.studentsPresent / 10) * 10, // Round to nearest 10
        totalStudents: Math.round(b.totalStudents / 10) * 10,
      }));
    }

    // Guests/students see limited data
    return buildings.map((b) => ({
      ...b,
      aiAlerts: 0,
      deviceHealth: b.deviceHealth > 0 ? b.deviceHealth : 0,
    }));
  };

  const getAccessibleDevices = (devices: DeviceIndicator[]): DeviceIndicator[] => {
    if (permissions.canAccessDeviceControls) return devices;

    // Limited view: no exact CPU/memory for non-admin roles
    return devices.map((d) => ({
      ...d,
      cpuUsage: Math.round(d.cpuUsage / 10) * 10,
      memoryUsage: Math.round(d.memoryUsage / 10) * 10,
      position: obfuscateDevicePosition(d.position, currentRole),
    }));
  };

  return {
    currentRole,
    permissions,
    privacy,
    getAccessibleBuildings,
    getAccessibleDevices,
  };
}
