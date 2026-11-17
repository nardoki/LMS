import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private client: Redis | null = null;
  private readonly memoryFallback = new Map<string, { value: unknown; expiresAt: number }>();
  private isConnected = false;

  onModuleInit(): void {
    const redisUrl = process.env.REDIS_URL;
    const redisHost = process.env.REDIS_HOST || '127.0.0.1';
    const redisPort = Number(process.env.REDIS_PORT || 6379);

    try {
      this.client = redisUrl
        ? new Redis(redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true })
        : new Redis({
            host: redisHost,
            port: redisPort,
            maxRetriesPerRequest: 1,
            lazyConnect: true,
            connectTimeout: 3000,
          });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log(`Connected to Redis at ${redisHost}:${redisPort}`);
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`Redis connection unavailable: ${err.message}. Using in-memory fallback.`);
      });

      // Attempt async non-blocking connection
      this.client.connect().catch((err) => {
        this.isConnected = false;
        this.logger.warn(`Initial Redis connection failed: ${err.message}. Operating with in-memory cache.`);
      });
    } catch (err: unknown) {
      this.isConnected = false;
      this.logger.warn(`Redis initialization exception: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.isConnected && this.client) {
      try {
        const raw = await this.client.get(key);
        if (raw) {
          return JSON.parse(raw) as T;
        }
      } catch (err) {
        this.logger.warn(`Failed reading key "${key}" from Redis: ${(err as Error).message}`);
      }
    }

    // Memory fallback
    const entry = this.memoryFallback.get(key);
    if (entry) {
      if (Date.now() > entry.expiresAt) {
        this.memoryFallback.delete(key);
        return null;
      }
      return entry.value as T;
    }

    return null;
  }

  async set(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
    const serialized = JSON.stringify(value);

    if (this.isConnected && this.client) {
      try {
        await this.client.set(key, serialized, 'EX', ttlSeconds);
        return;
      } catch (err) {
        this.logger.warn(`Failed writing key "${key}" to Redis: ${(err as Error).message}`);
      }
    }

    // Memory fallback
    this.memoryFallback.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        await this.client.del(key);
      } catch (err) {
        this.logger.warn(`Failed deleting key "${key}" from Redis: ${(err as Error).message}`);
      }
    }
    this.memoryFallback.delete(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(...keys);
          this.logger.debug(`Invalidated ${keys.length} keys matching pattern: ${pattern}`);
        }
      } catch (err) {
        this.logger.warn(`Failed invalidating pattern "${pattern}" in Redis: ${(err as Error).message}`);
      }
    }

    // Invalidate in memory
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    for (const key of this.memoryFallback.keys()) {
      if (regex.test(key)) {
        this.memoryFallback.delete(key);
      }
    }
  }

  onModuleDestroy(): void {
    if (this.client) {
      this.client.disconnect();
    }
  }
}
