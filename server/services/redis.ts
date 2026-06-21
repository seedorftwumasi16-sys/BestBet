import dotenv from "dotenv";

dotenv.config();

type CacheClient = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  connected: boolean;
};

const memoryCache = new Map<string, { value: string; expires: number }>();

const memoryClient: CacheClient = {
  connected: false,
  async get(key) {
    const entry = memoryCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      memoryCache.delete(key);
      return null;
    }
    return entry.value;
  },
  async set(key, value, ttlSeconds = 300) {
    memoryCache.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
  },
  async del(key) {
    memoryCache.delete(key);
  },
};

let client: CacheClient = memoryClient;

export async function initRedis(): Promise<void> {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.log("[Redis] No REDIS_URL — using in-memory cache");
    return;
  }

  try {
    const { createClient } = await import("redis");
    const redis = createClient({ url });
    await redis.connect();

    client = {
      connected: true,
      async get(key) {
        return redis.get(key);
      },
      async set(key, value, ttlSeconds = 300) {
        await redis.setEx(key, ttlSeconds, value);
      },
      async del(key) {
        await redis.del(key);
      },
    };
    console.log("[Redis] Connected");
  } catch {
    console.warn("[Redis] Unavailable — using in-memory cache");
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = await client.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  await client.set(key, JSON.stringify(value), ttlSeconds);
}

export async function cacheDel(key: string): Promise<void> {
  await client.del(key);
}

export function isRedisConnected(): boolean {
  return client.connected;
}
