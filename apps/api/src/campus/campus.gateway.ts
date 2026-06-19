// ─── SmartCampus AI — Campus WebSocket Gateway ────────

import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { OnModuleDestroy } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { CampusService } from './campus.service';

@WebSocketGateway({
  namespace: '/campus',
  cors: { origin: '*', credentials: true },
})
export class CampusGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  @WebSocketServer() server: Server;

  private intervals: NodeJS.Timeout[] = [];

  constructor(private readonly campusService: CampusService) {}

  afterInit() {
    // Broadcast campus updates every 10 seconds
    this.intervals.push(setInterval(() => {
      this.server.emit('CAMPUS_UPDATE', {
        overview: this.campusService.getOverview(),
        timestamp: new Date().toISOString(),
      });
    }, 10000));

    // Broadcast random events every 5 seconds
    this.intervals.push(setInterval(() => {
      const event = this.campusService.generateEvent();
      this.server.emit('ALERT_CREATED', event);
    }, 5000));

    // Broadcast occupancy updates every 15 seconds
    this.intervals.push(setInterval(() => {
      this.server.emit('OCCUPANCY_CHANGED', {
        occupancy: this.campusService.getOccupancy(),
        timestamp: new Date().toISOString(),
      });
    }, 15000));
  }

  handleConnection(client: Socket) {
    console.log(`Campus client connected: ${client.id}`);
    // Send initial data on connection
    client.emit('CAMPUS_UPDATE', {
      overview: this.campusService.getOverview(),
      timestamp: new Date().toISOString(),
    });
  }

  handleDisconnect(client: Socket) {
    console.log(`Campus client disconnected: ${client.id}`);
  }

  onModuleDestroy() {
    // Clean up all intervals to prevent memory leaks
    this.intervals.forEach((interval) => clearInterval(interval));
    this.intervals = [];
  }
}
