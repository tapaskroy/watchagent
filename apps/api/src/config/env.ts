import { config } from 'dotenv';
import { z } from 'zod';

// Load environment variables
config();

// Environment schema
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  HOST: z.string().default('0.0.0.0'),

  // Database
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.string().default('5432'),
  DB_NAME: z.string().default('watchagent'),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default('postgres'),
  DB_SSL: z.string().default('false'),
  DB_POOL_SIZE: z.string().default('20'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().default('0'),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // External APIs
  TMDB_API_KEY: z.string().min(1),
  OMDB_API_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3001'),

  // Rate limiting
  RATE_LIMIT_MAX: z.string().default('100'),
  RATE_LIMIT_WINDOW: z.string().default('60000'), // 1 minute in ms

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

// Parse and validate environment variables
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const env = {
  // Server
  nodeEnv: parsed.data.NODE_ENV,
  port: parseInt(parsed.data.PORT),
  host: parsed.data.HOST,
  isDevelopment: parsed.data.NODE_ENV === 'development',
  isProduction: parsed.data.NODE_ENV === 'production',
  isTest: parsed.data.NODE_ENV === 'test',

  // Database
  database: {
    host: parsed.data.DB_HOST,
    port: parseInt(parsed.data.DB_PORT),
    name: parsed.data.DB_NAME,
    user: parsed.data.DB_USER,
    password: parsed.data.DB_PASSWORD,
    ssl: parsed.data.DB_SSL === 'true',
    poolSize: parseInt(parsed.data.DB_POOL_SIZE),
  },

  // Redis
  redis: {
    host: parsed.data.REDIS_HOST,
    port: parseInt(parsed.data.REDIS_PORT),
    password: parsed.data.REDIS_PASSWORD,
    db: parseInt(parsed.data.REDIS_DB),
  },

  // JWT
  jwt: {
    accessSecret: parsed.data.JWT_ACCESS_SECRET,
    refreshSecret: parsed.data.JWT_REFRESH_SECRET,
    accessExpiry: parsed.data.JWT_ACCESS_EXPIRY,
    refreshExpiry: parsed.data.JWT_REFRESH_EXPIRY,
  },

  // External APIs
  externalApis: {
    tmdbApiKey: parsed.data.TMDB_API_KEY,
    omdbApiKey: parsed.data.OMDB_API_KEY,
    anthropicApiKey: parsed.data.ANTHROPIC_API_KEY,
  },

  // CORS
  corsOrigin: parsed.data.CORS_ORIGIN.split(','),

  // Rate limiting
  rateLimit: {
    max: parseInt(parsed.data.RATE_LIMIT_MAX),
    window: parseInt(parsed.data.RATE_LIMIT_WINDOW),
  },

  // Logging
  logLevel: parsed.data.LOG_LEVEL,
};
