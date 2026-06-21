import { Module } from "@nestjs/common";
import { AttendanceController } from "./attendance.controller";
import { ClustersController } from "./clusters.controller";
import { LearningController } from "./learning.controller";
import { AttendanceService } from "./attendance.service";

@Module({
  controllers: [AttendanceController, ClustersController, LearningController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
