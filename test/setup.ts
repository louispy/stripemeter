/**
 * Test setup file
 */

import { beforeAll, afterAll } from 'vitest';

// Note: Avoid external deps here for CI portability. If env vars are needed,
// populate them in the workflow or load them within specific tests.

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
