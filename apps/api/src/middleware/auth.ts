import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from './error-handler';
import { ApiErrorCode, HttpStatus } from '@watchagent/shared';

// Extend FastifyRequest to include user
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      username: string;
    };
  }
}

export function authMiddleware(app: FastifyInstance) {
  return async function authenticate(request: FastifyRequest, reply: FastifyReply) {
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
    request.user = undefined;
  }
}
