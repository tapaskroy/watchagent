import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../../services/auth/auth.service';
import {
  loginSchema,
  registerSchema,
  LoginRequest,
  RegisterRequest,
  RefreshTokenRequest,
} from '@watchagent/shared';

export async function authRoutes(app: FastifyInstance) {
  const authService = new AuthService(app);

  /**
   * POST /api/v1/auth/register
   * Register a new user
   */
  app.post<{ Body: RegisterRequest }>(
    '/register',
    {
      schema: {
        description: 'Register a new user',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['username', 'email', 'password'],
          properties: {
            username: { type: 'string', minLength: 3, maxLength: 50 },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            fullName: { type: 'string', maxLength: 100 },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                  expiresIn: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: RegisterRequest }>, reply: FastifyReply) => {
      // Validate request body
      const validated = registerSchema.parse(request.body);

      // Register user
      const tokens = await authService.register(validated);

      return reply.code(201).send({
        success: true,
        data: tokens,
      });
    }
  );

  /**
   * POST /api/v1/auth/login
   * Login user
   */
  app.post<{ Body: LoginRequest }>(
    '/login',
    {
      schema: {
        description: 'Login user',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
            rememberMe: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                  expiresIn: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: LoginRequest }>, reply: FastifyReply) => {
      // Validate request body
      const validated = loginSchema.parse(request.body);

      // Login user
      const tokens = await authService.login(validated);

      return reply.send({
        success: true,
        data: tokens,
      });
    }
  );

  /**
   * POST /api/v1/auth/refresh
   * Refresh access token
   */
  app.post<{ Body: RefreshTokenRequest }>(
    '/refresh',
    {
      schema: {
        description: 'Refresh access token',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                  expiresIn: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: RefreshTokenRequest }>, reply: FastifyReply) => {
      const { refreshToken } = request.body;

      // Refresh token
      const tokens = await authService.refreshToken(refreshToken);

      return reply.send({
        success: true,
        data: tokens,
      });
    }
  );

  /**
   * POST /api/v1/auth/logout
   * Logout user
   */
  app.post<{ Body: RefreshTokenRequest }>(
    '/logout',
    {
      schema: {
        description: 'Logout user',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: RefreshTokenRequest }>, reply: FastifyReply) => {
      const { refreshToken } = request.body;

      // Logout user
      await authService.logout(refreshToken);

      return reply.send({
        success: true,
        message: 'Logged out successfully',
      });
    }
  );
}
