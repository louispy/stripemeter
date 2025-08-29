/**
 * Test setup file
 */
import { beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';
// Load test environment variables
dotenv.config({ path: '.env.test' });
beforeAll(() => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    // Mock timers for consistent test results
    // vi.useFakeTimers();
});
afterAll(() => {
    // Cleanup
    // vi.useRealTimers();
});
//# sourceMappingURL=setup.js.map