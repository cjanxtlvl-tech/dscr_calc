const { createClient } = require("redis");

const REQUEST_WINDOW_SECONDS = 60;
const MAX_REQUESTS_PER_WINDOW = 5;

function createMemoryLimiter() {
  const store = new Map();

  return {
    async isLimited(clientId) {
      const now = Date.now();
      const cutoff = now - REQUEST_WINDOW_SECONDS * 1000;
      const record = store.get(clientId) || { timestamps: [] };

      record.timestamps = record.timestamps.filter((ts) => ts > cutoff);

      if (record.timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
        store.set(clientId, record);
        return true;
      }

      record.timestamps.push(now);
      store.set(clientId, record);
      return false;
    }
  };
}

function createRedisLimiter(redisUrl) {
  const client = createClient({ url: redisUrl });

  client.on("error", (error) => {
    console.error("Redis client error:", error.message);
  });

  const readyPromise = client.connect().catch((error) => {
    console.error("Redis connection failed, falling back to memory limiter:", error.message);
    return null;
  });

  return {
    async isLimited(clientId) {
      const readyClient = await readyPromise;
      if (!readyClient) {
        throw new Error("Redis not available");
      }

      const nowSeconds = Math.floor(Date.now() / 1000);
      const windowBucket = Math.floor(nowSeconds / REQUEST_WINDOW_SECONDS);
      const key = `rate:leads:${windowBucket}:${clientId}`;

      const count = await client.incr(key);
      if (count === 1) {
        await client.expire(key, REQUEST_WINDOW_SECONDS + 5);
      }

      return count > MAX_REQUESTS_PER_WINDOW;
    }
  };
}

function createRateLimiter() {
  const redisUrl = process.env.REDIS_URL;
  const memoryLimiter = createMemoryLimiter();

  if (!redisUrl) {
    return memoryLimiter;
  }

  const redisLimiter = createRedisLimiter(redisUrl);

  return {
    async isLimited(clientId) {
      try {
        return await redisLimiter.isLimited(clientId);
      } catch (_error) {
        return memoryLimiter.isLimited(clientId);
      }
    }
  };
}

module.exports = {
  createRateLimiter
};
