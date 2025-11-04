// src/config.ts
import "dotenv/config";
function getRequiredEnv(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}
function getOptionalEnv(key, defaultValue) {
  const value = process.env[key];
  return value && value.trim() !== "" ? value : defaultValue;
}
function validateConfig() {
  const config2 = {
    NODE_ENV: getOptionalEnv("NODE_ENV", "development"),
    PORT: parseInt(getOptionalEnv("PORT", "4000"), 10),
    REDIS_URL: getOptionalEnv("REDIS_URL", "redis://127.0.0.1:6379"),
    ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:3001").split(",").map((origin) => origin.trim()).filter(Boolean),
    OPENAI_API_KEY: getRequiredEnv("OPENAI_API_KEY"),
    OPENAI_STT_MODEL: getOptionalEnv("OPENAI_STT_MODEL", "whisper-1"),
    OPENAI_EMBEDDING_MODEL: getOptionalEnv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-large"),
    SUMM_LLM: getOptionalEnv("SUMM_LLM", "openai"),
    SUMM_OPENAI_MODEL: getOptionalEnv("SUMM_OPENAI_MODEL", "gpt-4-turbo"),
    API_INTERNAL_URL: process.env.API_INTERNAL_URL,
    API_URL: process.env.API_URL
  };
  if (isNaN(config2.PORT) || config2.PORT < 1 || config2.PORT > 65535) {
    throw new Error(`Invalid PORT: ${config2.PORT}. Must be between 1 and 65535.`);
  }
  if (!config2.REDIS_URL.startsWith("redis://") && !config2.REDIS_URL.startsWith("rediss://")) {
    throw new Error(`Invalid REDIS_URL format. Must start with redis:// or rediss://`);
  }
  return config2;
}
var config = validateConfig();
var CONSTANTS = {
  // File upload limits
  MAX_FILE_SIZE: 500 * 1024 * 1024,
  // 500MB
  MAX_FILES_PER_REQUEST: 1,
  // Worker settings
  TRANSCRIBE_CONCURRENCY: 5,
  TRANSCRIBE_RATE_LIMIT_MAX: 10,
  TRANSCRIBE_RATE_LIMIT_DURATION: 6e4,
  // 1 minute
  SUMMARIZE_CONCURRENCY: 3,
  // Redis settings
  REDIS_MAX_RETRIES: 3,
  REDIS_RETRY_DELAY: 1e3,
  // 1 second
  // Polling intervals
  SESSION_POLL_INTERVAL: 5e3,
  // 5 seconds
  // Timeouts
  API_TIMEOUT: 3e4,
  // 30 seconds
  WORKER_JOB_TIMEOUT: 3e5,
  // 5 minutes
  // Transcription
  MIN_SENTENCE_DURATION: 2e3,
  // 2 seconds
  CHAR_TO_MS_RATIO: 50
  // 50ms per character
};

// src/redis.ts
import IORedis from "ioredis";
function createRedisConnection(options) {
  const connection = new IORedis(config.REDIS_URL, {
    maxRetriesPerRequest: options?.maxRetriesPerRequest ?? null,
    retryStrategy: (times) => {
      if (times > CONSTANTS.REDIS_MAX_RETRIES) {
        console.error(`Redis connection failed after ${CONSTANTS.REDIS_MAX_RETRIES} retries`);
        return null;
      }
      const delay = Math.min(times * CONSTANTS.REDIS_RETRY_DELAY, 5e3);
      console.log(`Redis reconnecting in ${delay}ms... (attempt ${times}/${CONSTANTS.REDIS_MAX_RETRIES})`);
      return delay;
    },
    enableReadyCheck: options?.enableReadyCheck ?? true,
    lazyConnect: options?.lazyConnect ?? false,
    showFriendlyErrorStack: config.NODE_ENV === "development"
  });
  connection.on("connect", () => {
    console.log("Redis: Connected");
  });
  connection.on("ready", () => {
    console.log("Redis: Ready to accept commands");
  });
  connection.on("error", (err) => {
    console.error("Redis connection error:", err.message);
  });
  connection.on("close", () => {
    console.log("Redis: Connection closed");
  });
  connection.on("reconnecting", (timeToReconnect) => {
    console.log(`Redis: Reconnecting in ${timeToReconnect}ms...`);
  });
  connection.on("end", () => {
    console.log("Redis: Connection ended");
  });
  return connection;
}
async function testRedisConnection(connection) {
  try {
    const pong = await connection.ping();
    return pong === "PONG";
  } catch (error) {
    console.error("Redis health check failed:", error);
    return false;
  }
}

export {
  config,
  CONSTANTS,
  createRedisConnection,
  testRedisConnection
};
