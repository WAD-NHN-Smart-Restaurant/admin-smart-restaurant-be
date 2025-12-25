import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthRepository } from './auth.repository';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface SignUpDto {
  email: string;
  password: string;
  name: string;
  role?: string;
  restaurantId?: string;
}

export interface SignInDto {
  email: string;
  password: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface ConfirmEmailDto {
  tokenHash: string;
  type: 'email' | 'signup' | 'magiclink';
}

export interface ResetPasswordDto {
  email: string;
}

export interface UpdatePasswordDto {
  newPassword: string;
  accessToken: string;
}

@Injectable()
export class AuthService {
  private supabaseJwtIssuer: string;
  private supabaseJwtKeys: ReturnType<typeof createRemoteJWKSet>;

  constructor(
    private authRepository: AuthRepository,
    private configService: ConfigService,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL is not defined in environment variables');
    }

    this.supabaseJwtIssuer = `${supabaseUrl}/auth/v1`;

    this.supabaseJwtKeys = createRemoteJWKSet(
      new URL(`${this.supabaseJwtIssuer}/.well-known/jwks.json`),
    );
  }

  /**
   * Verify Supabase JWT token using asymmetric public key cryptography
   * Based on https://supabase.com/blog/jwt-signing-keys
   *
   * This approach uses:
   * - Private key (on Supabase Auth server) to sign JWTs
   * - Public key (from JWKS endpoint) to verify JWTs
   *
   * Benefits:
   * - Secure: Private key never leaves Supabase
   * - Scalable: Can verify tokens anywhere without Auth server
   * - Key rotation: Automatically handled via JWKS endpoint
   */
  async verifySupabaseJWT(token: string) {
    try {
      const { payload } = await jwtVerify(token, this.supabaseJwtKeys, {
        issuer: this.supabaseJwtIssuer,
      });

      return payload;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  } /**
   * Register a new user
   * Returns user data with accessToken and tokens separately (tokens for HttpOnly cookies)
   */
  async signUp(dto: SignUpDto) {
    try {
      const result = await this.authRepository.signUp(dto);

      // Check if email confirmation is required
      const emailConfirmationRequired = !result.user?.email_confirmed_at;

      return {
        success: true,
        message: emailConfirmationRequired
          ? 'Registration successful. Please check your email to confirm your account.'
          : 'Registration successful',
        data: {
          user: {
            id: result.user?.id,
            email: result.user?.email,
            name: result.user?.user_metadata?.name,
            role: result.user?.user_metadata?.role || 'customer',
            restaurantId: result.user?.user_metadata?.restaurant_id,
            emailConfirmed: !emailConfirmationRequired,
          },
          accessToken: result.session?.access_token || null,
        },
        // Return tokens separately so controller can set as HttpOnly cookies
        tokens: result.session
          ? {
              accessToken: result.session.access_token,
              refreshToken: result.session.refresh_token,
              expiresIn: result.session.expires_in,
            }
          : null,
      };
    } catch (error: any) {
      if (error.message?.includes('already registered')) {
        throw new ConflictException('Email already registered');
      }
      throw new BadRequestException(error.message || 'Registration failed');
    }
  } /**
   * Sign in with email and password
   * Returns user data with accessToken and tokens separately (tokens for HttpOnly cookies)
   */
  async signIn(dto: SignInDto) {
    try {
      const result = await this.authRepository.signInWithPassword(dto);

      if (!result.session) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Verify the JWT token
      await this.verifySupabaseJWT(result.session.access_token);

      return {
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            name: result.user.user_metadata?.name,
            role: result.user.user_metadata?.role || 'customer',
            avatar: result.user.user_metadata?.avatar,
            createdAt: result.user.created_at,
            updatedAt: result.user.updated_at,
          },
          accessToken: result.session.access_token,
        },
        // Return tokens separately so controller can set as HttpOnly cookies
        tokens: {
          accessToken: result.session.access_token,
          refreshToken: result.session.refresh_token,
          expiresIn: result.session.expires_in || 3600,
        },
      };
    } catch (error: any) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid email or password');
    }
  }

  /**
   * Sign out user
   */
  async signOut() {
    try {
      await this.authRepository.signOut();
      return {
        success: true,
        message: 'Logout successful',
      };
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Logout failed');
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(dto: RefreshTokenDto) {
    try {
      const result = await this.authRepository.refreshSession(dto.refreshToken);

      if (!result.session) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return {
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: result.session.access_token,
          refreshToken: result.session.refresh_token,
          expiresIn: result.session.expires_in || 3600,
        },
      };
    } catch (error: any) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(accessToken: string) {
    try {
      // Verify JWT first
      await this.verifySupabaseJWT(accessToken);

      const user = await this.authRepository.getUser(accessToken);

      return {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name,
          role: user.user_metadata?.role || 'customer',
          avatar: user.user_metadata?.avatar,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        },
      };
    } catch (error: any) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  } /**
   * Confirm email with OTP token
   */
  async confirmEmail(dto: ConfirmEmailDto) {
    try {
      const result = await this.authRepository.verifyOtp(
        dto.tokenHash,
        dto.type,
      );

      return {
        success: true,
        message: 'Email confirmed successfully',
        data: {
          user: {
            id: result.user?.id,
            email: result.user?.email,
            name: result.user?.user_metadata?.name,
            role: result.user?.user_metadata?.role || 'customer',
          },
          accessToken: result.session?.access_token || null,
        },
        // Return tokens separately so controller can set as HttpOnly cookies
        tokens: result.session
          ? {
              accessToken: result.session.access_token,
              refreshToken: result.session.refresh_token,
              expiresIn: result.session.expires_in,
            }
          : null,
      };
    } catch (error: any) {
      throw new BadRequestException(
        error.message || 'Email confirmation failed',
      );
    }
  }

  /**
   * Send password reset email
   */
  async resetPassword(dto: ResetPasswordDto) {
    try {
      await this.authRepository.resetPasswordForEmail(dto);

      return {
        success: true,
        message: 'Password reset email sent successfully',
      };
    } catch (error: any) {
      throw new BadRequestException(
        error.message || 'Failed to send password reset email',
      );
    }
  }

  /**
   * Update password
   */
  async updatePassword(dto: UpdatePasswordDto) {
    try {
      // Verify JWT first
      await this.verifySupabaseJWT(dto.accessToken);

      await this.authRepository.updatePassword({
        newPassword: dto.newPassword,
      });

      return {
        success: true,
        message: 'Password updated successfully',
      };
    } catch (error: any) {
      throw new BadRequestException(
        error.message || 'Failed to update password',
      );
    }
  }

  /**
   * Resend confirmation email
   */
  async resendConfirmation(email: string) {
    try {
      await this.authRepository.resendEmailConfirmation(email);

      return {
        success: true,
        message: 'Confirmation email sent successfully',
      };
    } catch (error: any) {
      throw new BadRequestException(
        error.message || 'Failed to resend confirmation email',
      );
    }
  }
}
