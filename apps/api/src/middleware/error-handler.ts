import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { ApiErrorCode, HttpStatus } from '@watchagent/shared';
import { logError } from '../config/logger';

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Log error
  logError(error, {
    url: request.url,
    method: request.method,
    query: request.query,
    params: request.params,
  });

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return reply.code(HttpStatus.BAD_REQUEST).send({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'Validation failed',
        details: error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      },
    });
  }

  // Handle JWT errors
  if (error.message?.includes('jwt') || error.message?.includes('token')) {
    return reply.code(HttpStatus.UNAUTHORIZED).send({
      success: false,
      error: {
        code: ApiErrorCode.TOKEN_INVALID,
        message: 'Invalid or expired token',
      },
    });
  }

  // Handle Fastify validation errors
  if (error.validation) {
    return reply.code(HttpStatus.BAD_REQUEST).send({
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'Request validation failed',
        details: error.validation,
      },
    });
  }

  // Handle rate limit errors
  if (error.statusCode === HttpStatus.TOO_MANY_REQUESTS) {
    return reply.code(HttpStatus.TOO_MANY_REQUESTS).send({
      success: false,
      error: {
        code: ApiErrorCode.RATE_LIMIT_EXCEEDED,
        message: 'Too many requests, please try again later',
      },
    });
  }

  // Handle custom application errors
  if ('code' in error && typeof error.code === 'string') {
    return reply.code(error.statusCode || HttpStatus.BAD_REQUEST).send({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
  }

  // Default to internal server error
  return reply.code(HttpStatus.INTERNAL_SERVER_ERROR).send({
    success: false,
    error: {
      code: ApiErrorCode.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
    },
  });
}

// Custom error class
export class AppError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}
