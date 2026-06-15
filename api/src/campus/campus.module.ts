// ─── SmartCampus AI — Campus Digital Twin Module ──────

import { Module } from '@nestjs/common';
import { CampusController } from './campus.controller';
import { CampusService } from './campus.service';
import { CampusGateway } from './campus.gateway';

@Module({
  controllers: [CampusController],
  providers: [CampusService, CampusGateway],
  exports: [CampusService],
})
export class CampusModule {}
