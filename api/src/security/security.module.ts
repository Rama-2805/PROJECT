import { Module, Global } from "@nestjs/common";
import { EncryptionService } from "./encryption.service";
import { AuditService } from "./audit.service";
import { SecurityGuard } from "./security.guard";

@Global()
@Module({
  providers: [EncryptionService, AuditService, SecurityGuard],
  exports: [EncryptionService, AuditService, SecurityGuard],
})
export class SecurityModule {}
