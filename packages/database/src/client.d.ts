/**
 * Database client configuration
 */
import Redis from 'ioredis';
import * as schema from './schema';
export declare const db: import("drizzle-orm/postgres-js").PostgresJsDatabase<typeof schema>;
export declare const redis: Redis;
export declare const redisPub: Redis;
export declare const redisSub: Redis;
export declare function checkDatabaseHealth(): Promise<boolean>;
export declare function checkRedisHealth(): Promise<boolean>;
export declare function closeConnections(): Promise<void>;
export { schema };
//# sourceMappingURL=client.d.ts.map