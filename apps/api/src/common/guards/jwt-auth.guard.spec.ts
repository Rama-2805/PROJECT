import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RoleName } from '../../_shared/enums/roles';

describe('JwtAuthGuard (SEC-03 Regression)', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
    delete process.env.INTERNAL_API_KEY;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.INTERNAL_API_KEY;
  });

  const createMockContext = (headers: Record<string, string> = {}): { context: ExecutionContext; request: any } => {
    const request: any = {
      headers,
    };
    const context: any = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    };
    return { context, request };
  };

  it('should NOT authenticate with dev key "sc-internal-service-key-dev-only" when INTERNAL_API_KEY is unset', async () => {
    const { context, request } = createMockContext({
      'x-api-key': 'sc-internal-service-key-dev-only',
    });

    const guardInstance = new JwtAuthGuard();
    // Spy on super.canActivate without calling real passport
    const superSpy = jest.spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate').mockResolvedValue(false);

    const result = await guardInstance.canActivate(context);

    expect(result).toBe(false);
    expect(request.user).toBeUndefined();
    expect(superSpy).toHaveBeenCalled();
  });

  it('should authenticate valid internal API key with timingSafeEqual and NOT grant SUPER_ADMIN', async () => {
    process.env.INTERNAL_API_KEY = 'super-secret-secure-internal-key-12345';
    const { context, request } = createMockContext({
      'x-api-key': 'super-secret-secure-internal-key-12345',
    });

    const guardInstance = new JwtAuthGuard();
    const result = await guardInstance.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toBeDefined();
    expect(request.user.roles).not.toContain(RoleName.SUPER_ADMIN);
    expect(request.user.roles).toContain(RoleName.DEVICE_MANAGER);
    expect(request.user.roles).toContain(RoleName.TEACHER);
  });

  it('should reject mismatched key without granting privileges', async () => {
    process.env.INTERNAL_API_KEY = 'super-secret-secure-internal-key-12345';
    const { context, request } = createMockContext({
      'x-api-key': 'wrong-key-attempt',
    });

    const guardInstance = new JwtAuthGuard();
    const superSpy = jest.spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate').mockResolvedValue(false);

    const result = await guardInstance.canActivate(context);

    expect(result).toBe(false);
    expect(request.user).toBeUndefined();
    expect(superSpy).toHaveBeenCalled();
  });

  it('should reject dev key in production environment even if matching', async () => {
    process.env.NODE_ENV = 'production';
    process.env.INTERNAL_API_KEY = 'sc-internal-service-key-dev-only';
    const { context, request } = createMockContext({
      'x-api-key': 'sc-internal-service-key-dev-only',
    });

    const guardInstance = new JwtAuthGuard();
    const superSpy = jest.spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate').mockResolvedValue(false);

    const result = await guardInstance.canActivate(context);

    expect(result).toBe(false);
    expect(request.user).toBeUndefined();
    expect(superSpy).toHaveBeenCalled();
    delete process.env.NODE_ENV;
  });
});
