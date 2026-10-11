import { Injectable, ExecutionContext } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleName } from "../../_shared/enums/roles";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = (request.headers["authorization"] as string) || "";
    const apiKey = request.headers["x-api-key"];
    const expectedApiKey = process.env.INTERNAL_API_KEY || process.env.ENCRYPTION_KEY;

    // 1. API key bypass
    if (apiKey && apiKey === expectedApiKey) {
      request.user = {
        id: "system",
        roles: [RoleName.SUPER_ADMIN, RoleName.DEVICE_MANAGER, RoleName.TEACHER],
      };
      return true;
    }

    // 2. Mock token / DEMO mode / Dev mode bypass (strictly disabled in production)
    const isProd = process.env.NODE_ENV === "production";
    const isMockToken = authHeader.includes("mock-token");
    const isDemo = process.env.DEMO_MODE === "true" || process.env.NEXT_PUBLIC_DEMO_MODE === "true";
    const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === "development";

    if (!isProd && (isMockToken || isDemo || isDev)) {
      // Try super.canActivate first if there is a non-mock token
      if (authHeader && !isMockToken) {
        try {
          const result = await (super.canActivate(context) as Promise<boolean>);
          if (result) return true;
        } catch {
          // Token invalid — fall through to dev user fallback
        }
      }

      // Dev/Demo user fallback
      request.user = {
        id: "usr_admin_dev",
        email: "admin@smartcampus.edu",
        roles: [RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER],
      };
      return true;
    }

    return super.canActivate(context) as Promise<boolean>;
  }
}

