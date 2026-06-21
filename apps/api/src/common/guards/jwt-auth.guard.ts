import { Injectable, ExecutionContext } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleName } from "../../_shared/enums/roles";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers["x-api-key"];
    const expectedApiKey = process.env.INTERNAL_API_KEY || process.env.ENCRYPTION_KEY;

    if (apiKey && apiKey === expectedApiKey) {
      request.user = {
        id: "system",
        roles: [RoleName.SUPER_ADMIN, RoleName.DEVICE_MANAGER, RoleName.TEACHER],
      };
      return true;
    }

    return super.canActivate(context);
  }
}
