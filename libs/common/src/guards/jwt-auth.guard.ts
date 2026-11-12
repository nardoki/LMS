import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import {
  createRemoteJWKSet,
  decodeProtectedHeader,
  JWTPayload,
  jwtVerify,
} from 'jose';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { Role } from '../enums/role.enum';
import { AuthUser } from '../interfaces/auth-user.interface';

interface SupabaseJwtPayload extends JWTPayload {
  email?: string;
  app_metadata?: {
    role?: string;
  };
}

/**
 * Verifies Supabase Bearer JWTs on incoming Gateway requests.
 * Supports HS256 (SUPABASE_JWT_SECRET) and asymmetric keys via Supabase JWKS.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: AuthUser;
    }>();

    const token = this.extractBearerToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Missing Bearer access token');
    }

    const payload = await this.verifyToken(token);
    if (!payload.sub) {
      throw new UnauthorizedException('Token missing subject claim');
    }

    const rawRole = payload.app_metadata?.role;
    const role = this.parseRole(rawRole);

    request.user = {
      id: payload.sub,
      email: payload.email,
      role,
    };

    return true;
  }

  private extractBearerToken(headerValue: string | string[] | undefined): string | null {
    const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    if (!raw) {
      return null;
    }
    const [scheme, token] = raw.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      return null;
    }
    return token.trim();
  }

  private async verifyToken(token: string): Promise<SupabaseJwtPayload> {
    try {
      const header = decodeProtectedHeader(token);
      if (header.alg?.startsWith('HS')) {
        const secret = this.configService.get<string>('SUPABASE_JWT_SECRET');
        if (!secret) {
          throw new UnauthorizedException('SUPABASE_JWT_SECRET is not configured');
        }
        const { payload } = await jwtVerify<SupabaseJwtPayload>(
          token,
          new TextEncoder().encode(secret),
        );
        return payload;
      }

      const jwks = this.getJwks();
      const { payload } = await jwtVerify<SupabaseJwtPayload>(token, jwks);
      return payload;
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  private getJwks(): ReturnType<typeof createRemoteJWKSet> {
    if (!this.jwks) {
      const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
      if (!supabaseUrl) {
        throw new UnauthorizedException('SUPABASE_URL is not configured');
      }
      const jwksUrl = new URL('/auth/v1/.well-known/jwks.json', supabaseUrl);
      this.jwks = createRemoteJWKSet(jwksUrl);
    }
    return this.jwks;
  }

  private parseRole(rawRole?: string): Role {
    if (rawRole === Role.ADMIN || rawRole === Role.INSTRUCTOR || rawRole === Role.STUDENT) {
      return rawRole;
    }
    return Role.STUDENT;
  }
}
