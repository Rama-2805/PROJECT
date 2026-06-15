// ─── SmartCampus AI — Campus Digital Twin Store ─────────

'use client';

import { create } from 'zustand';
import type { BuildingData, DeviceIndicator, Prediction, CampusEvent } from '@/lib/mock/campus';
import { CAMPUS_BUILDINGS, CAMPUS_DEVICES, CAMPUS_PREDICTIONS, CAMPUS_EVENTS, CAMPUS_GLOBAL } from '@/lib/mock/campus';

interface TimeMachineState {
  mode: 'past' | 'present' | 'future';
  timestamp: Date;
}

interface CampusStore {
  buildings: BuildingData[];
  devices: DeviceIndicator[];
  predictions: Prediction[];
  events: CampusEvent[];
  globalStatus: typeof CAMPUS_GLOBAL;
  selectedBuilding: BuildingData | null;
  selectedDevice: DeviceIndicator | null;
  timeMachine: TimeMachineState;
  showPredictions: boolean;
  showDevices: boolean;
  showLabels: boolean;
  cameraTarget: [number, number, number];

  setSelectedBuilding: (building: BuildingData | null) => void;
  setSelectedDevice: (device: DeviceIndicator | null) => void;
  setTimeMachine: (state: Partial<TimeMachineState>) => void;
  setShowPredictions: (show: boolean) => void;
  setShowDevices: (show: boolean) => void;
  setShowLabels: (show: boolean) => void;
  setCameraTarget: (target: [number, number, number]) => void;
  addEvent: (event: CampusEvent) => void;
  simulateEvent: () => void;
}

export const useCampusStore = create<CampusStore>((set, get) => ({
  buildings: CAMPUS_BUILDINGS,
  devices: CAMPUS_DEVICES,
  predictions: CAMPUS_PREDICTIONS,
  events: CAMPUS_EVENTS,
  globalStatus: CAMPUS_GLOBAL,
  selectedBuilding: null,
  selectedDevice: null,
  timeMachine: { mode: 'present', timestamp: new Date() },
  showPredictions: false,
  showDevices: true,
  showLabels: true,
  cameraTarget: [0, 5, 15],

  setSelectedBuilding: (building) => set({ selectedBuilding: building, selectedDevice: null }),
  setSelectedDevice: (device) => set({ selectedDevice: device }),
  setTimeMachine: (state) => set((prev) => ({ timeMachine: { ...prev.timeMachine, ...state } })),
  setShowPredictions: (show) => set({ showPredictions: show }),
  setShowDevices: (show) => set({ showDevices: show }),
  setShowLabels: (show) => set({ showLabels: show }),
  setCameraTarget: (target) => set({ cameraTarget: target }),

  addEvent: (event) => set((state) => ({ events: [event, ...state.events].slice(0, 50) })),

  simulateEvent: () => {
    const types = ['attendance', 'alert', 'device', 'system'] as const;
    const severities = ['info', 'warning', 'error'] as const;
    const type = types[Math.floor(Math.random() * types.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const buildings = get().buildings;
    const building = buildings[Math.floor(Math.random() * buildings.length)];

    const messages: Record<string, string[]> = {
      attendance: [
        `Student recognized in ${building.shortName} Block`,
        `Attendance updated: ${building.shortName} — ${building.attendanceRate}%`,
        `${Math.floor(Math.random() * 10) + 1} students marked present in ${building.shortName}`,
      ],
      alert: [
        `Low engagement detected in ${building.shortName}`,
        `${building.aiAlerts} active alerts in ${building.name}`,
        `Device health dropping: ${building.name} at ${building.deviceHealth}%`,
      ],
      device: [
        `Device heartbeat received from ${building.shortName}`,
        `Edge AI processing: ${Math.floor(Math.random() * 30 + 50)}% CPU in ${building.shortName}`,
        `Camera feed stable: ${building.name}`,
      ],
      system: [
        `AI prediction updated for ${building.name}`,
        `Occupancy: ${building.studentsPresent} students in ${building.shortName}`,
        `Campus health maintained at ${get().globalStatus.campusHealth}%`,
      ],
    };

    const msg = messages[type][Math.floor(Math.random() * messages[type].length)];
    get().addEvent({ id: `evt-${Date.now()}`, type, message: msg, buildingId: building.id, severity, timestamp: 'Just now' });
  },
}));
