/**
 * Database client configuration
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import Redis from 'ioredis';
import * as schema from './schema';

// PostgreSQL client
const connectionString = process.env.DATABASE_URL || 'postgresql://stripemeter:stripemeter_dev@localhost:5432/stripemeter';
const sql = postgres(connectionString, {
  max: 10, // connection pool size
  idle_timeout: 20,
  connect_timeout: 10,
});

// Drizzle ORM instance
export const db = drizzle(sql, { schema });

// Redis client for caching and queues
export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      // Only reconnect when the error contains "READONLY"
      return true;
    }
    return false;
  },
});

// Redis pub/sub client (separate connection)
export const redisPub = redis.duplicate();
export const redisSub = redis.duplicate();

// Health check functions
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

export async function checkRedisHealth(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}

// Cleanup function
export async function closeConnections(): Promise<void> {
  await redis.quit();
  await redisPub.quit();
  await redisSub.quit();
  await sql.end();
}

// Export schema for type inference
export { schema };
