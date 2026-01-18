import bcrypt from 'bcrypt';
import { FastifyInstance } from 'fastify';
import { db } from '@watchagent/database';
import { users, sessions, userPreferences } from '@watchagent/database';
import { eq, and } from 'drizzle-orm';
import {
  AuthTokens,
  LoginRequest,
  RegisterRequest,
  ApiErrorCode,
  HttpStatus,
} from '@watchagent/shared';
import { AppError } from '../../middleware/error-handler';
import { env } from '../../config/env';
import { CacheService, cacheKeys } from '../../config/redis';

const BCRYPT_ROUNDS = 12;

export class AuthService {
  constructor(private app: FastifyInstance) {}

  /**
   * Register new user
   */
  async register(data: RegisterRequest): Promise<AuthTokens> {
    // Check if email exists
    const existingEmail = await db.query.users.findFirst({
      where: eq(users.email, data.email),
    });

    if (existingEmail) {
      throw new AppError(
        ApiErrorCode.ALREADY_EXISTS,
        'Email already registered',
        HttpStatus.CONFLICT
      );
    }

    // Check if username exists
    const existingUsername = await db.query.users.findFirst({
      where: eq(users.username, data.username),
    });

    if (existingUsername) {
      throw new AppError(
        ApiErrorCode.ALREADY_EXISTS,
        'Username already taken',
        HttpStatus.CONFLICT
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    // Create user
    const [user] = await db
      .insert(users)
      .values({
        username: data.username,
        email: data.email,
        passwordHash,
        fullName: data.fullName,
      })
      .returning();

    // Create default user preferences
    await db.insert(userPreferences).values({
      userId: user.id,
      preferredGenres: [],
      favoriteActors: [],
      preferredLanguages: ['en'],
      contentTypes: ['movie', 'tv'],
      notificationSettings: {
        emailNotifications: true,
        pushNotifications: true,
        newRecommendations: true,
        friendActivity: true,
        newFollowers: true,
        watchlistUpdates: true,
      },
    });

    // Generate tokens
    return await this.generateTokens(user.id, user.email, user.username);
  }

  /**
   * Login user
   */
  async login(data: LoginRequest): Promise<AuthTokens> {
    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, data.email),
    });

    if (!user) {
      throw new AppError(
        ApiErrorCode.INVALID_CREDENTIALS,
        'Invalid email or password',
        HttpStatus.UNAUTHORIZED
      );
    }

    // Check if account is active
    if (!user.isActive) {
      throw new AppError(
        ApiErrorCode.ACCOUNT_DISABLED,
        'Account is disabled',
        HttpStatus.FORBIDDEN
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);

    if (!isValidPassword) {
      throw new AppError(
        ApiErrorCode.INVALID_CREDENTIALS,
        'Invalid email or password',
        HttpStatus.UNAUTHORIZED
      );
    }

    // Generate tokens
    return await this.generateTokens(user.id, user.email, user.username, data.rememberMe);
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    // Verify refresh token
    let payload: any;
    try {
      payload = await this.app.jwt.verify(refreshToken, {
        key: env.jwt.refreshSecret,
      });
    } catch (error) {
      throw new AppError(
        ApiErrorCode.TOKEN_INVALID,
        'Invalid refresh token',
        HttpStatus.UNAUTHORIZED
      );
    }

    // Check if session exists and is not revoked
    const session = await db.query.sessions.findFirst({
      where: and(eq(sessions.refreshToken, refreshToken), eq(sessions.isRevoked, false)),
    });

    if (!session) {
      throw new AppError(
        ApiErrorCode.TOKEN_INVALID,
        'Invalid or revoked refresh token',
        HttpStatus.UNAUTHORIZED
      );
    }

    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
      throw new AppError(
        ApiErrorCode.TOKEN_EXPIRED,
        'Refresh token expired',
        HttpStatus.UNAUTHORIZED
      );
    }

    // Get user
    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.id),
    });

    if (!user || !user.isActive) {
      throw new AppError(
        ApiErrorCode.UNAUTHORIZED,
        'User not found or inactive',
        HttpStatus.UNAUTHORIZED
      );
    }

    // Revoke old refresh token
    await db
      .update(sessions)
      .set({ isRevoked: true })
      .where(eq(sessions.refreshToken, refreshToken));

    // Generate new tokens
    return await this.generateTokens(user.id, user.email, user.username);
  }

  /**
   * Logout user (revoke refresh token)
   */
  async logout(refreshToken: string): Promise<void> {
    await db
      .update(sessions)
      .set({ isRevoked: true })
      .where(eq(sessions.refreshToken, refreshToken));

    // Clear cached user data
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.refreshToken, refreshToken),
    });

    if (session) {
      await CacheService.delPattern(`user:${session.userId}:*`);
    }
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(
    userId: string,
    email: string,
    username: string,
    rememberMe: boolean = false
  ): Promise<AuthTokens> {
    // Generate access token
    const accessToken = this.app.jwt.sign({
      id: userId,
      email,
      username,
    });

    // Generate refresh token
    const refreshTokenExpiry = rememberMe ? '30d' : env.jwt.refreshExpiry;
    const refreshToken = this.app.jwt.sign(
      {
        id: userId,
        email,
        username,
      },
      {
        key: env.jwt.refreshSecret,
        expiresIn: refreshTokenExpiry,
      }
    );

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (rememberMe ? 30 : 7));

    // Store refresh token in database
    await db.insert(sessions).values({
      userId,
      refreshToken,
      deviceInfo: {}, // Can be populated with user agent, IP, etc.
      expiresAt,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    await db.delete(sessions).where(eq(sessions.isRevoked, true));
  }
}
