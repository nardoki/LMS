import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, QueryResult, QueryResultRow } from 'pg';

/**
 * Direct PostgreSQL connection pool using the Supabase connection pooler URI
 * (`DATABASE_URL`) for transactions and complex SQL queries inside services.
 */
@Injectable()
export class PgPoolService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PgPoolService.name);
  private pool: Pool | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const connectionString = this.configService.get<string>('DATABASE_URL');

    if (!connectionString || connectionString.includes('your-project-ref')) {
      this.logger.warn(
        'DATABASE_URL is not configured; direct Postgres pool is inactive.',
      );
      return;
    }

    this.pool = new Pool({
      connectionString,
      max: 10,
      ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
        ? false
        : { rejectUnauthorized: false },
    });
  }

  isConfigured(): boolean {
    return this.pool !== null;
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params: unknown[] = [],
  ): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error(
        'DATABASE_URL is not configured. Set the Supabase pooler URI in .env.',
      );
    }
    return this.pool.query<T>(text, params);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}
