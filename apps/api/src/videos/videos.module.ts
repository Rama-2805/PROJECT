import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { VideosController } from './videos.controller';
import { VideosService } from './videos.service';
import { StorageModule } from '../storage/storage.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    JwtModule.register({
      secret:
        process.env.JWT_SECRET || 'dev-jwt-secret-do-not-use-in-production-123',
    }),
  ],
  controllers: [VideosController],
  providers: [VideosService],
  exports: [VideosService],
})
export class VideosModule {}
