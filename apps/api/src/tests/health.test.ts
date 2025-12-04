import { describe, it, expect } from 'vitest';

describe('Health Check', () => {
  it('should return healthy status', () => {
    // Basic smoke test
    expect(true).toBe(true);
  });

  it('should validate config structure', async () => {
    const { config } = await import('../config.js');

    expect(config).toBeDefined();
    expect(config.NODE_ENV).toBe('test');
    expect(config.PORT).toBeTypeOf('number');
    expect(config.REDIS_URL).toBeTypeOf('string');
    expect(config.ALLOWED_ORIGINS).toBeInstanceOf(Array);
  });

  it('should validate constants', async () => {
    const { CONSTANTS } = await import('../config.js');

    expect(CONSTANTS.MAX_FILE_SIZE).toBe(500 * 1024 * 1024);
    expect(CONSTANTS.TRANSCRIBE_CONCURRENCY).toBeGreaterThan(0);
    expect(CONSTANTS.SUMMARIZE_CONCURRENCY).toBeGreaterThan(0);
  });
});
