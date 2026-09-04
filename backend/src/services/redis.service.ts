import Redis from 'ioredis';

let redisClient: Redis | null = null;
let isRedisConnected = false;

export const initRedis = (): Redis | null => {
  try {
    const redisUrl = process.env.REDIS_URL;
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
    const redisPassword = process.env.REDIS_PASSWORD || undefined;

    if (redisUrl) {
      // Connect using full connection URI string (e.g., Upstash or Redis Cloud rediss://)
      redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          if (times > 5) {
            console.warn('⚠️ Cloud Redis connection retry limit reached. Operating without cache.');
            return null; // Stop retrying
          }
          return Math.min(times * 200, 2000);
        },
      });
    } else {
      // Connect using Host / Port / Password parameters
      redisClient = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword,
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          if (times > 5) {
            console.warn('⚠️ Cloud Redis connection retry limit reached. Operating without cache.');
            return null;
          }
          return Math.min(times * 200, 2000);
        },
      });
    }

    redisClient.on('connect', () => {
      isRedisConnected = true;
      console.log('⚡ Cloud Redis Connected Successfully!');
    });

    redisClient.on('error', (err) => {
      isRedisConnected = false;
      console.error('❌ Redis Error:', err.message);
    });

    return redisClient;
  } catch (err: any) {
    console.error('Failed to initialize Redis:', err.message);
    return null;
  }
};

export const getRedisClient = (): Redis | null => {
  if (!redisClient) {
    return initRedis();
  }
  return redisClient;
};

export const isRedisActive = (): boolean => isRedisConnected;

/**
 * Cache Helper: Get cached value or fetch from fallback DB query
 */
export const getOrSetCache = async <T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<{ data: T; isCached: boolean }> => {
  const client = getRedisClient();

  if (client && isRedisConnected) {
    try {
      const cachedData = await client.get(key);
      if (cachedData) {
        return { data: JSON.parse(cachedData) as T, isCached: true };
      }
    } catch (err) {
      console.warn(`Redis GET failed for key "${key}", falling back to DB:`, err);
    }
  }

  // Fetch fresh data from Database
  const freshData = await fetchFn();

  // Store in Redis if connected
  if (client && isRedisConnected && freshData) {
    try {
      await client.setex(key, ttlSeconds, JSON.stringify(freshData));
    } catch (err) {
      console.warn(`Redis SETEX failed for key "${key}":`, err);
    }
  }

  return { data: freshData, isCached: false };
};

/**
 * Invalidate (delete) cache key
 */
export const invalidateCache = async (key: string): Promise<void> => {
  const client = getRedisClient();
  if (client && isRedisConnected) {
    try {
      await client.del(key);
    } catch (err) {
      console.warn(`Redis DEL failed for key "${key}":`, err);
    }
  }
};
