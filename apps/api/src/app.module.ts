import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { InstitutionsModule } from "./institutions/institutions.module";
import { StudentsModule } from "./students/students.module";
import { DepartmentsModule } from "./departments/departments.module";
import { ClassroomsModule } from "./classrooms/classrooms.module";
import { CoursesModule } from "./courses/courses.module";
import { TeachersModule } from "./teachers/teachers.module";
import { SubjectsModule } from "./subjects/subjects.module";
import { EnrollmentModule } from "./enrollment/enrollment.module";
import { AttendanceModule } from "./attendance/attendance.module";
import { BehaviorModule } from "./behavior/behavior.module";
import { IotModule } from "./iot/iot.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { ReportsModule } from "./reports/reports.module";
import { SecurityModule } from "./security/security.module";
import { PrivacyModule } from "./privacy/privacy.module";
import { MlopsModule } from "./mlops/mlops.module";
import { MobileModule } from "./mobile/mobile.module";
import { CampusModule } from "./campus/campus.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { DemoRequestsModule } from "./demo-requests/demo-requests.module";
import { StorageModule } from "./storage/storage.module";
import { VideosModule } from "./videos/videos.module";
import { CameraModule } from "./camera/camera.module";

@Module({
  imports: [
    ThrottlerModule.forRoot([
      { name: "default", ttl: 60000, limit: 100 },
    ]),
    PrismaModule,
    StorageModule,
    VideosModule,
    CameraModule,
    AuthModule,
    UsersModule,
    InstitutionsModule,
    StudentsModule,
    DepartmentsModule,
    ClassroomsModule,
    CoursesModule,
    TeachersModule,
    SubjectsModule,
    EnrollmentModule,
    AttendanceModule,
    BehaviorModule,
    IotModule,
    AnalyticsModule,
    ReportsModule,
    SecurityModule,
    PrivacyModule,
    MlopsModule,
    MobileModule,
    CampusModule,
    DashboardModule,
    DemoRequestsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}

