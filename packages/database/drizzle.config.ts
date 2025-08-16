import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

export default {
  schema: './src/schema/*.ts',
  out: './migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || 'postgresql://stripeflex:stripeflex_dev@localhost:5432/stripeflex',
  },
  verbose: true,
  strict: true,
} satisfies Config;
