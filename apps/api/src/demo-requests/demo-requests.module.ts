import { Module } from "@nestjs/common";
import { DemoRequestsController } from "./demo-requests.controller";
import { DemoRequestsService } from "./demo-requests.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [DemoRequestsController],
  providers: [DemoRequestsService],
  exports: [DemoRequestsService],
})
export class DemoRequestsModule {}
