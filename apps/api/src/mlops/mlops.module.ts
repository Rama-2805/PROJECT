// ─── SmartCampus AI — MLOps Module ─────────────────────────

import { Module } from '@nestjs/common';
import { MlopsController } from './mlops.controller';
import { MlopsService } from './mlops.service';

@Module({
  controllers: [MlopsController],
  providers: [MlopsService],
  exports: [MlopsService],
})
export class MlopsModule {}
