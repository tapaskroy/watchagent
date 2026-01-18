import { buildApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { testConnection, closeDatabase } from '@watchagent/database';
import { redis } from './config/redis';

async function start() {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }

    // Build and start server
    const app = await buildApp();

    await app.listen({
      port: env.port,
      host: env.host,
    });

    logger.info(`🚀 Server listening on http://${env.host}:${env.port}`);
    if (env.isDevelopment) {
      logger.info(`📚 API documentation available at http://localhost:${env.port}/docs`);
    }
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await closeDatabase();
  await redis.quit();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await closeDatabase();
  await redis.quit();
  process.exit(0);
});

// Start server
start();
