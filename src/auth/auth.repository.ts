import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../utils/const';
import { Database } from '../supabase/supabase.types';
import { mapSqlError } from '../utils/map-sql-error.util';
import { UUID } from 'crypto';

export interface SignUpCredentials {
  email: string;
  password: string;
  name: string;
  role?: string;
  restaurantId?: UUID;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface ResetPasswordCredentials {
  email: string;
}

export interface UpdatePasswordCredentials {
  newPassword: string;
}

@Injectable()
export class AuthRepository {
  constructor(@Inject(SUPABASE) private supabase: SupabaseClient<Database>) {}

  /**
   * Sign up a new user with email and password
   */
  async signUp(credentials: SignUpCredentials) {
    const {
      email,
      password,
      name,
      role = 'customer',
      restaurantId,
    } = credentials;

    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
          restaurant_id: restaurantId,
        },
        //TODO: Replace with actual frontend URL
        emailRedirectTo: `${process.env.FRONTEND_URL}/auth/callback`,
      },
    });

    if (error) throw mapSqlError(error);
    return data;
  }

  /**
   * Sign in with email and password (PKCE flow)
   */
  async signInWithPassword(credentials: SignInCredentials) {
    const { email, password } = credentials;

    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw mapSqlError(error);
    return data;
  }

  /**
   * Sign out the current user
   */
  async signOut() {
    const { data, error } = await this.supabase.auth.getSession();
    if (error) throw mapSqlError(error);

    const accessToken = data.session?.access_token;

    if (accessToken) {
      const { error: signOutError } = await this.supabase.auth.admin.signOut(
        accessToken,
        'global',
      );

      if (signOutError) throw signOutError;
    }
  }

  /**
   * Get the current user from access token
   */
  async getUser(accessToken: string) {
    const { data, error } = await this.supabase.auth.getUser(accessToken);
    if (error) throw mapSqlError(error);
    return data.user;
  }

  /**
   * Get user by ID (admin only)
   */
  async getUserById(userId: string) {
    const { data, error } = await this.supabase.auth.admin.getUserById(userId);
    if (error) throw mapSqlError(error);
    return data.user;
  }

  /**
   * Refresh session with refresh token
   */
  async refreshSession(refreshToken: string) {
    const { data, error } = await this.supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });
    if (error) throw mapSqlError(error);
    return data;
  }

  /**
   * Verify OTP for email confirmation
   */
  async verifyOtp(tokenHash: string, type: 'email' | 'signup' | 'magiclink') {
    const { data, error } = await this.supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (error) throw mapSqlError(error);
    return data;
  }

  /**
   * Send password reset email
   */
  async resetPasswordForEmail(credentials: ResetPasswordCredentials) {
    const { email } = credentials;

    const { data, error } = await this.supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${process.env.FRONTEND_URL}/auth/reset-password`,
      },
    );

    if (error) throw mapSqlError(error);
    return data;
  }

  /**
   * Update password for authenticated user
   */
  async updatePassword(credentials: UpdatePasswordCredentials) {
    const { newPassword } = credentials;

    const { data, error } = await this.supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw mapSqlError(error);
    return data;
  }

  /**
   * Update user metadata
   */
  async updateUserMetadata(userId: string, metadata: Record<string, any>) {
    const { data, error } = await this.supabase.auth.admin.updateUserById(
      userId,
      {
        user_metadata: metadata,
      },
    );

    if (error) throw mapSqlError(error);
    return data.user;
  }

  /**
   * Resend email confirmation
   */
  async resendEmailConfirmation(email: string) {
    const { data, error } = await this.supabase.auth.resend({
      type: 'signup',
      email,
    });

    if (error) throw mapSqlError(error);
    return data;
  }
}
