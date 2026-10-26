// ─── SmartCampus AI — Mobile API Module ─────────────────

import { Module } from '@nestjs/common';
import { MobileController } from './mobile.controller';
import { MobileService } from './mobile.service';
import { AttendanceModule } from '../attendance/attendance.module';

@Module({
  imports: [AttendanceModule],
  controllers: [MobileController],
  providers: [MobileService],
  exports: [MobileService],
})
export class MobileModule {}
