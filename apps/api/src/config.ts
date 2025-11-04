import "dotenv/config";

/**
 * Environment variable configuration with validation
 */

interface AppConfig {
  NODE_ENV: string;
  PORT: number;
  REDIS_URL: string;
  ALLOWED_ORIGINS: string[];
  OPENAI_API_KEY: string;
  OPENAI_STT_MODEL: string;
  OPENAI_EMBEDDING_MODEL: string;
  SUMM_LLM: string;
  SUMM_OPENAI_MODEL: string;
  API_INTERNAL_URL?: string;
  API_URL?: string;
}

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

function validateConfig(): AppConfig {
  const config: AppConfig = {
    NODE_ENV: getOptionalEnv("NODE_ENV", "development"),
    PORT: parseInt(getOptionalEnv("PORT", "4000"), 10),
    REDIS_URL: getOptionalEnv("REDIS_URL", "redis://127.0.0.1:6379"),
    ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:3001")
      .split(",")
      .map(origin => origin.trim())
      .filter(Boolean),
    OPENAI_API_KEY: getRequiredEnv("OPENAI_API_KEY"),
    OPENAI_STT_MODEL: getOptionalEnv("OPENAI_STT_MODEL", "whisper-1"),
    OPENAI_EMBEDDING_MODEL: getOptionalEnv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-large"),
    SUMM_LLM: getOptionalEnv("SUMM_LLM", "openai"),
    SUMM_OPENAI_MODEL: getOptionalEnv("SUMM_OPENAI_MODEL", "gpt-4-turbo"),
    API_INTERNAL_URL: process.env.API_INTERNAL_URL,
    API_URL: process.env.API_URL
  };

  // Validate PORT
  if (isNaN(config.PORT) || config.PORT < 1 || config.PORT > 65535) {
    throw new Error(`Invalid PORT: ${config.PORT}. Must be between 1 and 65535.`);
  }

  // Validate REDIS_URL format
  if (!config.REDIS_URL.startsWith("redis://") && !config.REDIS_URL.startsWith("rediss://")) {
    throw new Error(`Invalid REDIS_URL format. Must start with redis:// or rediss://`);
  }

  return config;
}

export const config = validateConfig();

export const CONSTANTS = {
  // File upload limits
  MAX_FILE_SIZE: 500 * 1024 * 1024, // 500MB
  MAX_FILES_PER_REQUEST: 1,

  // Worker settings
  TRANSCRIBE_CONCURRENCY: 5,
  TRANSCRIBE_RATE_LIMIT_MAX: 10,
  TRANSCRIBE_RATE_LIMIT_DURATION: 60000, // 1 minute
  SUMMARIZE_CONCURRENCY: 3,

  // Redis settings
  REDIS_MAX_RETRIES: 3,
  REDIS_RETRY_DELAY: 1000, // 1 second

  // Polling intervals
  SESSION_POLL_INTERVAL: 5000, // 5 seconds

  // Timeouts
  API_TIMEOUT: 30000, // 30 seconds
  WORKER_JOB_TIMEOUT: 300000, // 5 minutes

  // Transcription
  MIN_SENTENCE_DURATION: 2000, // 2 seconds
  CHAR_TO_MS_RATIO: 50 // 50ms per character
} as const;
