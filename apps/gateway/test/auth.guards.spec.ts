import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { SignJWT } from 'jose';
import { JwtAuthGuard, Role, RolesGuard } from '@lms/common';

const TEST_SECRET = 'super-secret-jwt-token-with-at-least-32-chars';

function createHttpContext(headers: Record<string, string>, user?: unknown): {
  ctx: ExecutionContext;
  request: { headers: Record<string, string>; user?: unknown };
} {
  const request: { headers: Record<string, string>; user?: unknown } = {
    headers,
    user,
  };
  const ctx = {
    getHandler: () => () => undefined,
    getClass: () => class DummyController {},
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
  return { ctx, request };
}

describe('JwtAuthGuard & RolesGuard', () => {
  const config = new ConfigService({ SUPABASE_JWT_SECRET: TEST_SECRET });

  it('rejects requests without a Bearer token', async () => {
    const reflector = { getAllAndOverride: () => false } as unknown as Reflector;
    const guard = new JwtAuthGuard(reflector, config);
    const { ctx } = createHttpContext({});

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('allows @Public() routes without a token', async () => {
    const reflector = { getAllAndOverride: () => true } as unknown as Reflector;
    const guard = new JwtAuthGuard(reflector, config);
    const { ctx } = createHttpContext({});

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('verifies HS256 JWT and reads role strictly from app_metadata', async () => {
    const token = await new SignJWT({
      email: 'alice@masterylms.dev',
      app_metadata: { role: 'student' },
      user_metadata: { role: 'admin' }, // must be ignored
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('22222222-2222-2222-2222-222222222222')
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(TEST_SECRET));

    const reflector = { getAllAndOverride: () => false } as unknown as Reflector;
    const guard = new JwtAuthGuard(reflector, config);
    const { ctx, request } = createHttpContext({ authorization: `Bearer ${token}` });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(request.user).toEqual({
      id: '22222222-2222-2222-2222-222222222222',
      email: 'alice@masterylms.dev',
      role: Role.STUDENT,
    });
  });

  it('blocks a student from an instructor-only route with ForbiddenException', () => {
    const reflector = {
      getAllAndOverride: (key: string) =>
        key === 'isPublic' ? false : [Role.INSTRUCTOR, Role.ADMIN],
    } as unknown as Reflector;

    const rolesGuard = new RolesGuard(reflector);
    const { ctx } = createHttpContext({}, { id: 'stu-1', role: Role.STUDENT });

    expect(() => rolesGuard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('allows an instructor onto an instructor-only route', () => {
    const reflector = {
      getAllAndOverride: (key: string) =>
        key === 'isPublic' ? false : [Role.INSTRUCTOR, Role.ADMIN],
    } as unknown as Reflector;

    const rolesGuard = new RolesGuard(reflector);
    const { ctx } = createHttpContext({}, { id: 'ins-1', role: Role.INSTRUCTOR });

    expect(rolesGuard.canActivate(ctx)).toBe(true);
  });
});
