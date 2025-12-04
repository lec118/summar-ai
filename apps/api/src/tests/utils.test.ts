import { describe, it, expect } from 'vitest';
import { randomUUID } from 'crypto';

describe('Utility Functions', () => {
  it('should generate valid UUID', () => {
    const uuid = randomUUID();

    expect(uuid).toBeTypeOf('string');
    expect(uuid.length).toBe(36);
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('should validate environment variables', async () => {
    const { config } = await import('../config.js');

    // Required fields should exist
    expect(config.OPENAI_API_KEY).toBeDefined();
    expect(config.REDIS_URL).toBeDefined();

    // Defaults should be set
    expect(config.OPENAI_STT_MODEL).toBe('whisper-1');
    expect(config.OPENAI_EMBEDDING_MODEL).toBe('text-embedding-3-large');
    expect(config.SUMM_LLM).toBe('openai');
  });

  it('should parse ALLOWED_ORIGINS correctly', async () => {
    const { config } = await import('../config.js');

    expect(config.ALLOWED_ORIGINS).toBeInstanceOf(Array);
    expect(config.ALLOWED_ORIGINS.every(origin => typeof origin === 'string')).toBe(true);
    expect(config.ALLOWED_ORIGINS.every(origin => origin.length > 0)).toBe(true);
  });
});
