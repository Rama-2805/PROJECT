import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RoleName } from '../../_shared/enums/roles';
import * as crypto from 'crypto';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    const internalApiKey = process.env.INTERNAL_API_KEY;

    // 1. Authenticate internal service-to-service calls with scoped privileges
    // Strict requirement: INTERNAL_API_KEY must be set in environment; timing-safe comparison
    const isProd = process.env.NODE_ENV === 'production';
    if (
      isProd &&
      (internalApiKey === 'sc-internal-service-key-dev-only' ||
        !internalApiKey ||
        internalApiKey.length < 16)
    ) {
      // In production, reject default or weak internal API keys
      return super.canActivate(context) as Promise<boolean>;
    }

    if (
      typeof apiKey === 'string' &&
      typeof internalApiKey === 'string' &&
      apiKey.length > 0 &&
      apiKey.length === internalApiKey.length &&
      crypto.timingSafeEqual(Buffer.from(apiKey), Buffer.from(internalApiKey))
    ) {
      request.user = {
        id: 'service:internal',
        roles: [RoleName.DEVICE_MANAGER, RoleName.TEACHER],
      };
      return true;
    }

    // In development / local testing, allow camera stream & frame preview even if browser cookie is detached
    if (
      !isProd &&
      (request.path?.includes('/camera/stream') ||
        request.path?.includes('/camera/frame'))
    ) {
      try {
        const can = await (super.canActivate(context) as Promise<boolean>);
        if (can) return true;
      } catch {
        // Fallback for media element img tags without cookies
        request.user = {
          id: 'dev-stream-user',
          roles: [RoleName.TEACHER, RoleName.DEVICE_MANAGER],
        };
        return true;
      }
    }

    // 2. Enforce strict Passport JWT verification on all user requests
    return super.canActivate(context) as Promise<boolean>;
  }
}


