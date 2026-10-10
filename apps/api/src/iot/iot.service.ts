import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  RegisterDeviceDto,
  HeartbeatDto,
  DeviceLogDto,
  DeviceCommandDto,
  DeviceFilterDto,
  AuthDeviceDto,
} from "./iot.dto";
import { randomUUID as uuid } from "node:crypto";

@Injectable()
export class IotService {
  constructor(private prisma: PrismaService) {}

  async authenticate(dto: AuthDeviceDto) {
    let device = await this.prisma.device.findUnique({
      where: { deviceId: dto.deviceId },
    });

    if (!device) {
      // First-time registration via auth
      device = await this.prisma.device.create({
        data: {
          deviceId: dto.deviceId,
          name: dto.deviceId,
          type: dto.deviceType,
          institutionId: "inst-001",
          status: "ONLINE",
          authToken: `edge-token-${uuid().slice(0, 8)}`,
        },
      });
    }

    return {
      token: device.authToken || `edge-token-${uuid().slice(0, 8)}`,
      deviceId: device.deviceId,
      status: device.status,
      config: {
        frameInterval: 0.5,
        detectionThreshold: 0.6,
        recognitionInterval: 30,
        behaviorAnalysisInterval: 60,
      },
    };
  }

  async register(dto: RegisterDeviceDto) {
    const existing = await this.prisma.device.findUnique({
      where: { deviceId: dto.deviceId },
    });

    if (existing) {
      return this.prisma.device.update({
        where: { deviceId: dto.deviceId },
        data: {
          name: dto.deviceName,
          type: dto.deviceType,
          classroomId: dto.classroomId,
          location: dto.location,
          firmwareVersion: dto.firmwareVersion || existing.firmwareVersion,
          modelVersion: dto.modelVersion || existing.modelVersion,
          status: "ONLINE",
          lastHeartbeat: new Date(),
        },
      });
    }

    return this.prisma.device.create({
      data: {
        deviceId: dto.deviceId,
        name: dto.deviceName,
        type: dto.deviceType,
        institutionId: dto.institutionId,
        classroomId: dto.classroomId,
        location: dto.location,
        firmwareVersion: dto.firmwareVersion || "1.0.0",
        modelVersion: dto.modelVersion || "1.0.0",
        status: "ONLINE",
        authToken: `edge-token-${uuid().slice(0, 8)}`,
        lastHeartbeat: new Date(),
      },
    });
  }

  async processHeartbeat(dto: HeartbeatDto) {
    const device = await this.prisma.device.findUnique({
      where: { deviceId: dto.deviceId },
    });
    if (!device) throw new NotFoundException("Device not found");

    // Update device status
    await this.prisma.device.update({
      where: { deviceId: dto.deviceId },
      data: {
        status: dto.status,
        cpuUsage: dto.cpu,
        memoryUsage: dto.memory,
        temperature: dto.temperature,
        networkQuality: dto.network || "GOOD",
        lastHeartbeat: new Date(),
        firmwareVersion: dto.firmwareVersion || device.firmwareVersion,
        modelVersion: dto.aiModel || device.modelVersion,
      },
    });

    // Record heartbeat history
    const heartbeat = await this.prisma.deviceHeartbeat.create({
      data: {
        deviceId: device.id,
        cpuUsage: dto.cpu,
        memoryUsage: dto.memory,
        temperature: dto.temperature,
        networkQuality: dto.network || "GOOD",
        uptimeSeconds: dto.uptimeSeconds || 0,
        status: dto.status,
      },
    });

    // Check for alerts
    const alerts: string[] = [];
    if (dto.cpu > 90) alerts.push("WARNING: CPU usage above 90%");
    if (dto.temperature > 75) alerts.push("WARNING: High temperature detected");
    if (dto.status === "ERROR") alerts.push("ERROR: Device reported error state");

    return { heartbeat, alerts };
  }

  async queryDevices(filter: DeviceFilterDto) {
    const where: any = { isActive: true };
    if (filter.status) where.status = filter.status;
    if (filter.classroomId) where.classroomId = filter.classroomId;
    if (filter.deviceType) where.type = filter.deviceType;
    if (filter.search) {
      where.OR = [
        { deviceId: { contains: filter.search, mode: "insensitive" } },
        { name: { contains: filter.search, mode: "insensitive" } },
        { location: { contains: filter.search, mode: "insensitive" } },
      ];
    }

    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const skip = (page - 1) * limit;

    const [devices, total] = await Promise.all([
      this.prisma.device.findMany({ where, skip, take: limit, orderBy: { lastHeartbeat: { sort: "desc", nulls: "last" } } }),
      this.prisma.device.count({ where }),
    ]);

    return { devices, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getDevice(deviceId: string) {
    const device = await this.prisma.device.findUnique({ where: { deviceId } });
    if (!device) throw new NotFoundException("Device not found");
    return device;
  }

  async getDeviceHeartbeats(deviceId: string, hours: number = 24) {
    const device = await this.prisma.device.findUnique({ where: { deviceId } });
    if (!device) throw new NotFoundException("Device not found");

    const since = new Date(Date.now() - hours * 3600000);
    return this.prisma.deviceHeartbeat.findMany({
      where: { deviceId: device.id, timestamp: { gte: since } },
      orderBy: { timestamp: "asc" },
    });
  }

  async getDeviceLogs(deviceId: string, level?: string) {
    const device = await this.prisma.device.findUnique({ where: { deviceId } });
    if (!device) throw new NotFoundException("Device not found");

    const where: any = { deviceId: device.id };
    if (level) where.level = level;

    return this.prisma.deviceLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: 100,
    });
  }

  async addDeviceLog(dto: DeviceLogDto) {
    const device = await this.prisma.device.findUnique({ where: { deviceId: dto.deviceId } });
    if (!device) throw new NotFoundException("Device not found");

    return this.prisma.deviceLog.create({
      data: {
        deviceId: device.id,
        level: dto.level,
        message: dto.message,
        metadata: dto.metadata ? JSON.stringify(dto.metadata) : undefined,
      },
    });
  }

  async sendCommand(deviceId: string, dto: DeviceCommandDto, issuedById: string) {
    const device = await this.prisma.device.findUnique({ where: { deviceId } });
    if (!device) throw new NotFoundException("Device not found");

    return this.prisma.deviceCommand.create({
      data: {
        deviceId: device.id,
        command: dto.command,
        parameters: dto.parameters ? JSON.stringify(dto.parameters) : undefined,
        status: "SENT",
        issuedById,
        sentAt: new Date(),
      },
    });
  }

  async getCommandHistory(deviceId: string) {
    const device = await this.prisma.device.findUnique({ where: { deviceId } });
    if (!device) throw new NotFoundException("Device not found");

    return this.prisma.deviceCommand.findMany({
      where: { deviceId: device.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { issuedBy: { select: { fullName: true, email: true } } },
    });
  }

  async getDeviceStats() {
    const [total, online, offline, error, updating] = await Promise.all([
      this.prisma.device.count({ where: { isActive: true } }),
      this.prisma.device.count({ where: { status: "ONLINE", isActive: true } }),
      this.prisma.device.count({ where: { status: "OFFLINE", isActive: true } }),
      this.prisma.device.count({ where: { status: "ERROR", isActive: true } }),
      this.prisma.device.count({ where: { status: "UPDATING", isActive: true } }),
    ]);

    return { total, online, offline, error, updating };
  }

  async getModelRegistry() {
    return this.prisma.aIModel.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
  }

  async getOfflineDevices(thresholdMinutes: number = 2) {
    const threshold = new Date(Date.now() - thresholdMinutes * 60000);
    const devices = await this.prisma.device.findMany({
      where: {
        isActive: true,
        OR: [
          { status: "OFFLINE" },
          { lastHeartbeat: { lt: threshold } },
        ],
      },
    });

    // Generate alerts for offline devices
    for (const device of devices) {
      if (device.status !== "OFFLINE") {
        await this.prisma.device.update({
          where: { id: device.id },
          data: { status: "OFFLINE" },
        });
      }
    }

    return devices;
  }
}
