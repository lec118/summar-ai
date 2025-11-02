import IORedis, { Redis } from "ioredis";
import { config, CONSTANTS } from "./config.js";

/**
 * Creates a Redis connection with proper error handling and retry logic
 */
export function createRedisConnection(options?: {
  maxRetriesPerRequest?: number | null;
  enableReadyCheck?: boolean;
  lazyConnect?: boolean;
}): Redis {
  const connection = new IORedis(config.REDIS_URL, {
    maxRetriesPerRequest: options?.maxRetriesPerRequest ?? null,
    retryStrategy: (times: number) => {
      if (times > CONSTANTS.REDIS_MAX_RETRIES) {
        console.error(`Redis connection failed after ${CONSTANTS.REDIS_MAX_RETRIES} retries`);
        return null; // Stop retrying
      }
      const delay = Math.min(times * CONSTANTS.REDIS_RETRY_DELAY, 5000);
      console.log(`Redis reconnecting in ${delay}ms... (attempt ${times}/${CONSTANTS.REDIS_MAX_RETRIES})`);
      return delay;
    },
    enableReadyCheck: options?.enableReadyCheck ?? true,
    lazyConnect: options?.lazyConnect ?? false,
    showFriendlyErrorStack: config.NODE_ENV === "development"
  });

  // Event handlers for monitoring
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

/**
 * Test Redis connection health
 */
export async function testRedisConnection(connection: Redis): Promise<boolean> {
  try {
    const pong = await connection.ping();
    return pong === "PONG";
  } catch (error) {
    console.error("Redis health check failed:", error);
    return false;
  }
}

/**
 * Gracefully close Redis connection
 */
export async function closeRedisConnection(connection: Redis): Promise<void> {
  try {
    await connection.quit();
    console.log("Redis: Connection closed gracefully");
  } catch (error) {
    console.error("Error closing Redis connection:", error);
    connection.disconnect();
  }
}
