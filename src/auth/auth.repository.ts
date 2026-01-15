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
  role?: Database['public']['Enums']['user_role'];
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
  async signUp(restaurantId: string | null, credentials: SignUpCredentials) {
    const { email, password, name, role = 'customer' } = credentials;

    // Validate that staff roles require restaurantId
    const staffRoles = ['waiter', 'kitchen_staff'];
    console.log('Restaurant ID in signUp:', restaurantId);
    if (staffRoles.includes(role) && !restaurantId) {
      throw new Error('restaurantId is required for staff roles');
    }

    const frontendUrl =
      role === 'customer'
        ? process.env.GUEST_CUSTOMER_FRONTEND_URL
        : process.env.ADMIN_FRONTEND_URL;

    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
        },
        //TODO: Replace with actual frontend URL
        emailRedirectTo: `${frontendUrl}/callback`,
      },
    });

    if (error) throw mapSqlError(error);

    if (data.user) {
      const { error: profileError } = await this.supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          full_name: name,
          role,
          restaurant_id: restaurantId,
        });

      if (profileError) throw mapSqlError(profileError);
    }
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
  async refreshSession() {
    const { data, error } = await this.supabase.auth.refreshSession();
    if (error) throw mapSqlError(error);
    return data;
  }

  /**
   * Send password reset email
   */
  async resetPasswordForEmail(credentials: ResetPasswordCredentials) {
    const { email } = credentials;

    let role: Database['public']['Enums']['user_role'] = 'customer';
    let authUser: any = null;

    // Try to find user by email with pagination
    let page = 1;
    const perPage = 1000;
    let foundUser = false;

    while (!foundUser) {
      const { data: authData, error: listError } =
        await this.supabase.auth.admin.listUsers({
          page,
          perPage,
        });

      console.log(`Auth data retrieved for reset password (page ${page}):`, {
        userCount: authData?.users?.length || 0,
        total: authData?.users?.length || 0,
      });

      if (listError) {
        console.error('Error listing users:', listError);
        break;
      }

      if (!authData?.users || authData.users.length === 0) {
        console.log('No more users to check');
        break;
      }

      authUser = authData.users.find((user: any) => user.email === email);

      if (authUser) {
        console.log('Auth user found for email:', email);
        foundUser = true;
        break;
      }

      // If we got fewer results than perPage, we've reached the end
      if (authData.users.length < perPage) {
        console.log('Reached end of user list without finding user');
        break;
      }

      page++;
    }

    if (authUser) {
      // Try to get role from profiles table
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('role')
        .eq('id', authUser.id)
        .single();

      console.log('Profile data for user:', profile);

      if (profile && profile.role) {
        role = profile.role;
        console.log('Role found in profiles table:', profile.role);
      } else if (authUser.user_metadata?.role) {
        // Fallback to user metadata
        role = authUser.user_metadata
          .role as Database['public']['Enums']['user_role'];
        console.log('Role found in user metadata:', role);
      } else {
        console.log('No role found, defaulting to customer');
      }
    } else {
      console.log('User not found in auth system, defaulting to customer role');
    }

    const frontendUrl =
      role === 'customer'
        ? process.env.GUEST_CUSTOMER_FRONTEND_URL
        : process.env.ADMIN_FRONTEND_URL;

    console.log('Role determined for reset email:', role);
    console.log('Frontend URL for reset email:', frontendUrl);

    const { data, error } = await this.supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${frontendUrl}/reset-password`,
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
