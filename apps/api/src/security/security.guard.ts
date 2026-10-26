import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class SecurityGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();

    // Validate required security headers
    const contentType = request.headers['content-type'];
    if (request.method !== 'GET' && request.method !== 'DELETE') {
      if (
        contentType &&
        !contentType.includes('application/json') &&
        !contentType.includes('multipart/form-data')
      ) {
        return false;
      }
    }

    // Validate user agent
    const userAgent = request.headers['user-agent'];
    if (userAgent && userAgent.length > 500) {
      return false; // Suspicious long user agent
    }

    // Check request size (prevent large payloads)
    const contentLength = parseInt(
      request.headers['content-length'] || '0',
      10,
    );
    if (contentLength > 10 * 1024 * 1024) {
      return false; // Max 10MB
    }

    return true;
  }
}
