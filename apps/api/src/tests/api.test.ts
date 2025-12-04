import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

describe('API Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({
      logger: false
    });

    // Register basic routes for testing
    app.get('/', async () => ({
      name: 'Summa AI API',
      version: '1.0.0',
      status: 'running'
    }));

    app.get('/health', async () => ({
      ok: true,
      redis: 'disconnected',
      timestamp: new Date().toISOString()
    }));
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return API info on root endpoint', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/'
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.name).toBe('Summa AI API');
    expect(body.status).toBe('running');
  });

  it('should return health status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health'
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.ok).toBe(true);
    expect(body).toHaveProperty('timestamp');
  });
});
