import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { Role } from '@lms/common';
import { SupabaseService } from '@lms/supabase';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService,
  ) {}

  private createAnonClient() {
    const url = this.configService.get<string>('SUPABASE_URL');
    const anonKey = this.configService.get<string>('SUPABASE_ANON_KEY');
    if (!url || !anonKey) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be configured');
    }
    return createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  async login(dto: LoginDto) {
    const anonClient = this.createAnonClient();
    const { data, error } = await anonClient.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error || !data.session || !data.user) {
      throw new UnauthorizedException(error?.message ?? 'Invalid credentials');
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: (data.user.app_metadata?.role as Role) ?? Role.STUDENT,
        name: data.user.user_metadata?.name ?? '',
      },
    };
  }

  async register(dto: RegisterDto) {
    const anonClient = this.createAnonClient();
    const { data, error } = await anonClient.auth.signUp({
      email: dto.email,
      password: dto.password,
      options: {
        data: { name: dto.name },
      },
    });

    if (error || !data.user) {
      throw new BadRequestException(error?.message ?? 'Registration failed');
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        role: Role.STUDENT,
      },
      session: data.session
        ? {
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
          }
        : null,
    };
  }

  async getProfile(userId: string) {
    const admin = this.supabaseService.getClient('public');
    const { data, error } = await admin
      .from('profiles')
      .select('id, email, name, role, created_at')
      .eq('id', userId)
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }
    return data;
  }

  async updateUserRole(targetUserId: string, role: Role) {
    const admin = this.supabaseService.getClient('public');
    const { data, error } = await admin.auth.admin.updateUserById(targetUserId, {
      app_metadata: { role },
    });

    if (error || !data.user) {
      throw new BadRequestException(error?.message ?? 'Failed to update user role');
    }

    return {
      id: data.user.id,
      email: data.user.email,
      role: data.user.app_metadata?.role ?? role,
    };
  }
}
