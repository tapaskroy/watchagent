import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from './config/env';
import { logger } from './config/logger';
import { errorHandler } from './middleware/error-handler';
import { authMiddleware } from './middleware/auth';
import { authRoutes } from './modules/auth/auth.routes';
import { contentRoutes } from './modules/content/content.routes';
import { watchlistRoutes } from './modules/watchlist/watchlist.routes';
import { ratingsRoutes } from './modules/ratings/ratings.routes';

export async function buildApp(): Promise<FastifyInstance> {
  // Create Fastify instance
  const app = Fastify({
    logger,
    requestIdLogLabel: 'reqId',
    disableRequestLogging: false,
    trustProxy: true,
  });

  // Register plugins
  await app.register(helmet, {
    contentSecurityPolicy: env.isProduction,
  });

  await app.register(cors, {
    origin: env.corsOrigin,
    credentials: true,
  });

  await app.register(rateLimit, {
    max: env.rateLimit.max,
    timeWindow: env.rateLimit.window,
    cache: 10000,
    allowList: env.isDevelopment ? ['127.0.0.1'] : [],
  });

  // JWT
  await app.register(jwt, {
    secret: env.jwt.accessSecret,
    sign: {
      expiresIn: env.jwt.accessExpiry,
    },
  });

  // Swagger documentation
  if (env.isDevelopment) {
    await app.register(swagger, {
      openapi: {
        info: {
          title: 'WatchAgent API',
          description: 'Video recommendation service API',
          version: '1.0.0',
        },
        servers: [
          {
            url: `http://localhost:${env.port}`,
            description: 'Development server',
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
      },
    });

    await app.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: true,
      },
    });
  }

  // Auth middleware decorator
  app.decorate('authenticate', authMiddleware(app));

  // Health check
  app.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: env.nodeEnv,
    };
  });

  // Root endpoint
  app.get('/', async () => {
    return {
      name: 'WatchAgent API',
      version: '1.0.0',
      docs: env.isDevelopment ? '/docs' : undefined,
    };
  });

  // Register routes
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(contentRoutes, { prefix: '/api/v1/content' });
  await app.register(watchlistRoutes, { prefix: '/api/v1/watchlist' });
  await app.register(ratingsRoutes, { prefix: '/api/v1/ratings' });
  // await app.register(userRoutes, { prefix: '/api/v1/users' });
  // await app.register(recommendationRoutes, { prefix: '/api/v1/recommendations' });
  // await app.register(socialRoutes, { prefix: '/api/v1/social' });

  // Error handler
  app.setErrorHandler(errorHandler);

  // 404 handler
  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method}:${request.url} not found`,
      },
    });
  });

  return app;
}
