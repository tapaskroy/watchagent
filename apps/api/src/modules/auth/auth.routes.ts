import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { db, users } from '@watchagent/database';
import { AuthService } from '../../services/auth/auth.service';
import { GoogleAuthService } from '../../services/auth/google-auth.service';
import {
  loginSchema,
  registerSchema,
  LoginRequest,
  RegisterRequest,
  RefreshTokenRequest,
} from '@watchagent/shared';

export async function authRoutes(app: FastifyInstance) {
  const authService = new AuthService(app);
  const googleAuthService = new GoogleAuthService(app);

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

  /**
   * POST /api/v1/auth/google/initiate
   * Verify Google ID token and send OTP to the associated email
   */
  app.post<{ Body: { idToken: string } }>(
    '/google/initiate',
    {
      schema: {
        description: 'Send OTP to Google-account email',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['idToken'],
          properties: { idToken: { type: 'string' } },
        },
      },
    },
    async (request, reply) => {
      const { idToken } = request.body;
      const result = await googleAuthService.initiate(idToken);
      return reply.send({ success: true, data: result });
    }
  );

  /**
   * POST /api/v1/auth/google/verify
   * Verify OTP and complete login/register
   */
  app.post<{ Body: { idToken: string; code: string; flow?: 'login' | 'register' } }>(
    '/google/verify',
    {
      schema: {
        description: 'Verify Google OTP and issue JWT tokens',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['idToken', 'code'],
          properties: {
            idToken: { type: 'string' },
            code: { type: 'string', minLength: 6, maxLength: 6 },
            flow: { type: 'string', enum: ['login', 'register'] },
          },
        },
      },
    },
    async (request, reply) => {
      const { idToken, code, flow = 'login' } = request.body;
      const result = await googleAuthService.verify(idToken, code, flow);
      return reply.send({ success: true, data: result });
    }
  );

  /**
   * POST /api/v1/auth/google/resend
   * Resend OTP (rate limited to 1 per 60 s)
   */
  app.post<{ Body: { idToken: string } }>(
    '/google/resend',
    {
      schema: {
        description: 'Resend Google OTP',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['idToken'],
          properties: { idToken: { type: 'string' } },
        },
      },
    },
    async (request, reply) => {
      const { idToken } = request.body;
      const result = await googleAuthService.resend(idToken);
      return reply.send({ success: true, data: result });
    }
  );

  /**
   * GET /api/v1/auth/check-username?username=...
   * Check if a username is available (used by UsernamePrompt)
   */
  app.get<{ Querystring: { username: string } }>(
    '/check-username',
    {
      schema: {
        description: 'Check username availability',
        tags: ['auth'],
        querystring: {
          type: 'object',
          required: ['username'],
          properties: { username: { type: 'string' } },
        },
      },
    },
    async (request, reply) => {
      const { username } = request.query;
      const user = await db.query.users.findFirst({
        where: eq(users.username, username),
        columns: { id: true },
      });
      return reply.send({ success: true, data: { available: !user } });
    }
  );
}
