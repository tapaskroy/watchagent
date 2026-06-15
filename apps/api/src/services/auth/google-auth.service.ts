import { OAuth2Client } from 'google-auth-library';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { FastifyInstance } from 'fastify';
import { db } from '@watchagent/database';
import { users, userPreferences } from '@watchagent/database';
import { eq, or } from 'drizzle-orm';
import { CacheService } from '../../config/redis';
import { EmailService } from '../email/email.service';
import { env } from '../../config/env';
import { AppError } from '../../middleware/error-handler';
import { ApiErrorCode, HttpStatus, AuthTokens } from '@watchagent/shared';

const OTP_TTL = 600;       // 10 minutes
const RATE_TTL = 600;      // 10 minutes
const RATE_LIMIT = 3;      // max 3 initiations per email per window
const RESEND_TTL = 60;     // 1 minute resend cooldown
const MAX_ATTEMPTS = 3;    // lock code after 3 wrong guesses

interface OtpEntry {
  codeHash: string;
  attempts: number;
  googleId: string;
  email: string;
  name?: string;
  picture?: string;
}

interface GooglePayload {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

export interface GoogleVerifyResult extends AuthTokens {
  isNewUser: boolean;
  linkedExistingAccount: boolean;
}

export class GoogleAuthService {
  private googleClient: OAuth2Client;
  private s3Client: S3Client;
  private emailService: EmailService;

  constructor(private app: FastifyInstance) {
    this.googleClient = new OAuth2Client(env.google.clientId);
    this.s3Client = new S3Client({ region: env.email.sesRegion });
    this.emailService = new EmailService();
  }

  private requireConfigured() {
    if (!env.google.clientId) {
      throw new AppError(
        ApiErrorCode.INTERNAL_SERVER_ERROR,
        'Google authentication is not configured on this server.',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  private async verifyToken(idToken: string): Promise<GooglePayload> {
    this.requireConfigured();
    let ticket;
    try {
      ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: env.google.clientId,
      });
    } catch {
      throw new AppError(
        ApiErrorCode.INVALID_CREDENTIALS,
        'Google token verification failed',
        HttpStatus.BAD_REQUEST
      );
    }
    const p = ticket.getPayload();
    if (!p?.sub || !p.email) {
      throw new AppError(
        ApiErrorCode.INVALID_CREDENTIALS,
        'Google token missing required claims',
        HttpStatus.BAD_REQUEST
      );
    }
    return { sub: p.sub, email: p.email, name: p.name, picture: p.picture };
  }

  private otpKey(email: string, googleId: string) {
    return `google_otp:${email}:${googleId}`;
  }

  async initiate(idToken: string): Promise<{ email: string; expiresIn: number }> {
    const payload = await this.verifyToken(idToken);

    // Rate limit: 3 initiations per email per 10 min
    const rateKey = `google_otp_rate:${payload.email}`;
    const count = await CacheService.incr(rateKey);
    if (count === 1) await CacheService.expire(rateKey, RATE_TTL);
    if (count > RATE_LIMIT) {
      throw new AppError(
        ApiErrorCode.RATE_LIMIT_EXCEEDED,
        'Too many verification requests. Please wait before trying again.',
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // Generate and hash 6-digit code
    const code = crypto.randomInt(100000, 999999).toString().padStart(6, '0');
    const codeHash = await bcrypt.hash(code, 10);

    const entry: OtpEntry = {
      codeHash,
      attempts: 0,
      googleId: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };
    await CacheService.set(this.otpKey(payload.email, payload.sub), entry, OTP_TTL);

    await this.emailService.sendVerificationCode(payload.email, code);

    return { email: payload.email, expiresIn: OTP_TTL };
  }

  async verify(
    idToken: string,
    code: string,
    flow: 'login' | 'register'
  ): Promise<GoogleVerifyResult> {
    const payload = await this.verifyToken(idToken);
    const key = this.otpKey(payload.email, payload.sub);
    const entry = await CacheService.get<OtpEntry>(key);

    if (!entry) {
      throw new AppError(
        ApiErrorCode.TOKEN_EXPIRED,
        'Code has expired. Please try again.',
        HttpStatus.BAD_REQUEST
      );
    }

    // Check attempts
    entry.attempts += 1;
    const remaining = MAX_ATTEMPTS - entry.attempts;

    const valid = await bcrypt.compare(code, entry.codeHash);

    if (!valid) {
      if (remaining <= 0) {
        await CacheService.del(key);
        throw new AppError(
          ApiErrorCode.INVALID_CREDENTIALS,
          'Too many incorrect attempts. Please restart the verification.',
          HttpStatus.BAD_REQUEST
        );
      }
      await CacheService.set(key, entry, OTP_TTL);
      throw new AppError(
        ApiErrorCode.INVALID_CREDENTIALS,
        `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
        HttpStatus.BAD_REQUEST
      );
    }

    // Code correct — consume it
    await CacheService.del(key);

    return this.upsertUser(payload, flow);
  }

  async resend(idToken: string): Promise<{ email: string; expiresIn: number }> {
    const payload = await this.verifyToken(idToken);

    // Resend cooldown
    const cooldownKey = `google_otp_resend_cd:${payload.email}`;
    if (await CacheService.exists(cooldownKey)) {
      throw new AppError(
        ApiErrorCode.RATE_LIMIT_EXCEEDED,
        'Please wait 60 seconds before requesting a new code.',
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // Invalidate any existing OTP
    await CacheService.del(this.otpKey(payload.email, payload.sub));

    // Set resend cooldown
    await CacheService.set(cooldownKey, 1, RESEND_TTL);

    return this.initiate(idToken);
  }

  private async upsertUser(
    payload: GooglePayload,
    flow: 'login' | 'register'
  ): Promise<GoogleVerifyResult> {
    let isNewUser = false;
    let linkedExistingAccount = false;

    // Look up by googleId first, then by email
    let user = await db.query.users.findFirst({
      where: or(
        eq(users.googleId as any, payload.sub),
        eq(users.email, payload.email)
      ),
    });

    if (!user && flow === 'login') {
      throw new AppError(
        ApiErrorCode.NOT_FOUND,
        'No WatchAgent account found for this Google account. Please sign up.',
        HttpStatus.NOT_FOUND
      );
    }

    if (!user) {
      // Create new user (register flow)
      const username = await this.generateUsername(payload.email);
      const avatarUrl = payload.picture
        ? await this.downloadAvatar(payload.picture, crypto.randomUUID())
        : undefined;

      const [created] = await db
        .insert(users)
        .values({
          username,
          email: payload.email,
          googleId: payload.sub,
          fullName: payload.name,
          avatarUrl,
          emailVerified: true,
          passwordHash: null,
        })
        .returning();

      await db.insert(userPreferences).values({
        userId: created.id,
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

      user = created;
      isNewUser = true;
    } else if (!user.googleId) {
      // Existing email/password account — link Google
      await db
        .update(users)
        .set({ googleId: payload.sub, emailVerified: true, updatedAt: new Date() })
        .where(eq(users.id, user.id));
      linkedExistingAccount = true;
    }

    const { accessToken, refreshToken, expiresIn } = await this.generateTokens(
      user.id,
      user.email,
      user.username
    );

    return { accessToken, refreshToken, expiresIn, isNewUser, linkedExistingAccount };
  }

  private async generateTokens(
    userId: string,
    email: string,
    username: string
  ): Promise<AuthTokens> {
    const { sessions } = await import('@watchagent/database');

    const accessToken = this.app.jwt.sign({ id: userId, email, username });
    const refreshToken = this.app.jwt.sign(
      { id: userId, email, username },
      { key: env.jwt.refreshSecret, expiresIn: env.jwt.refreshExpiry }
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await db.insert(sessions).values({ userId, refreshToken, deviceInfo: {}, expiresAt });

    return { accessToken, refreshToken, expiresIn: 900 };
  }

  private async generateUsername(email: string): Promise<string> {
    const base = email
      .split('@')[0]
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .slice(0, 46);

    let username = base;
    let existing = await db.query.users.findFirst({ where: eq(users.username, username) });

    while (existing) {
      const suffix = crypto.randomInt(1000, 9999).toString();
      username = `${base}_${suffix}`;
      existing = await db.query.users.findFirst({ where: eq(users.username, username) });
    }

    return username;
  }

  private async downloadAvatar(url: string, userId: string): Promise<string | undefined> {
    try {
      const res = await fetch(url);
      if (!res.ok) return undefined;
      const buffer = Buffer.from(await res.arrayBuffer());
      const key = `avatars/google/${userId}.jpg`;

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: env.avatarS3Bucket,
          Key: key,
          Body: buffer,
          ContentType: 'image/jpeg',
        })
      );

      return `https://${env.avatarS3Bucket}.s3.${env.email.sesRegion}.amazonaws.com/${key}`;
    } catch {
      return undefined; // Avatar upload is non-critical
    }
  }
}
