import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
export default {
    schema: './src/schema/*.ts',
    out: './migrations',
    driver: 'pg',
    dbCredentials: {
        connectionString: process.env.DATABASE_URL || 'postgresql://stripemeter:stripemeter_dev@localhost:5432/stripemeter',
    },
    verbose: true,
    strict: true,
};
//# sourceMappingURL=drizzle.config.js.map