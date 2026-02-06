import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from './error-handler';
import { ApiErrorCode, HttpStatus } from '@watchagent/shared';

// Extend @fastify/jwt user type
declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: {
      id: string;
      email: string;
      username: string;
    };
  }
}

// Extend FastifyInstance to include authenticate decorator
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export function authMiddleware(_app: FastifyInstance) {
  return async function authenticate(request: FastifyRequest, _reply: FastifyReply) {
    try {
      // Verify JWT token
      await request.jwtVerify();

      // Token payload is automatically attached to request.user by fastify-jwt
      if (!request.user) {
        throw new AppError(
          ApiErrorCode.UNAUTHORIZED,
          'Authentication required',
          HttpStatus.UNAUTHORIZED
        );
      }
    } catch (error) {
      throw new AppError(
        ApiErrorCode.TOKEN_INVALID,
        'Invalid or expired token',
        HttpStatus.UNAUTHORIZED
      );
    }
  };
}

// Optional authentication (doesn't throw error if no token)
export async function optionalAuth(request: FastifyRequest) {
  try {
    await request.jwtVerify();
  } catch {
    // Ignore authentication errors for optional auth
    // User will remain undefined if verification fails
  }
}
