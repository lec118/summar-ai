/**
 * Test setup file
 * Runs before all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '4001';
process.env.REDIS_URL = 'redis://127.0.0.1:6379';
process.env.OPENAI_API_KEY = 'test-key';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';

// Mock console.log to reduce noise in test output
// global.console.log = () => {};

console.log('✅ Test environment setup complete');
