import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type LmsSchema = 'public' | 'course' | 'assessment' | 'mastery';
export type SchemaSupabaseClient = SupabaseClient<any, LmsSchema, any>;

/**
 * Provides schema-scoped Supabase admin clients powered by the service_role key.
 * This client bypasses RLS and must ONLY be used inside backend services.
 */
@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly clients = new Map<LmsSchema, SchemaSupabaseClient>();
  private url: string | undefined;
  private serviceRoleKey: string | undefined;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    this.url = this.configService.get<string>('SUPABASE_URL');
    this.serviceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!this.isConfigured()) {
      this.logger.warn(
        'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set; database operations will wait until configured in .env.',
      );
    }
  }

  isConfigured(): boolean {
    return Boolean(
      this.url &&
        this.serviceRoleKey &&
        !this.url.includes('your-project-ref') &&
        !this.serviceRoleKey.includes('your-service-role-key'),
    );
  }

  /**
   * Returns a cached Supabase admin client pinned to the requested Postgres schema.
   * Each microservice should only request its own schema (`course`, `assessment`, `mastery`)
   * or `public` for shared profiles/certificates.
   */
  getClient(schema: LmsSchema = 'public'): SchemaSupabaseClient {
    if (!this.isConfigured()) {
      throw new Error(
        'Supabase is not configured. Copy .env.example to .env and set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      );
    }

    const existing = this.clients.get(schema);
    if (existing) {
      return existing;
    }

    const client = createClient<any, LmsSchema>(this.url!, this.serviceRoleKey!, {
      db: { schema },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this.clients.set(schema, client);
    return client;
  }
}
