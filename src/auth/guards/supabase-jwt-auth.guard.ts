import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { SupabaseClient } from '@supabase/supabase-js';
import { Inject } from '@nestjs/common';
import { SUPABASE } from '../../utils/const';
import { Database } from '../../supabase/supabase.types';

/**
 * Custom JWT Auth Guard using asymmetric verification with Supabase JWKS
 * Based on: https://supabase.com/blog/jwt-signing-keys
 *
 * This guard:
 * 1. Extracts JWT from Authorization header
 * 2. Verifies JWT using public keys from Supabase JWKS endpoint
 * 3. Validates user exists in Supabase
 * 4. Attaches user data to request object
 */
@Injectable()
export class SupabaseJwtAuthGuard implements CanActivate {
  private supabaseJwtIssuer: string;
  private supabaseJwtKeys: ReturnType<typeof createRemoteJWKSet>;

  constructor(
    private configService: ConfigService,
    @Inject(SUPABASE) private supabase: SupabaseClient<Database>,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');

    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL is not defined in environment variables');
    }

    this.supabaseJwtIssuer = `${supabaseUrl}/auth/v1`;

    // Create remote JWK Set for asymmetric JWT verification
    this.supabaseJwtKeys = createRemoteJWKSet(
      new URL(`${this.supabaseJwtIssuer}/.well-known/jwks.json`),
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      // Verify JWT using public keys from JWKS endpoint
      const { payload } = await jwtVerify(token, this.supabaseJwtKeys, {
        issuer: this.supabaseJwtIssuer,
      });

      // Validate payload structure
      if (!payload.sub || !payload.email) {
        throw new UnauthorizedException('Invalid token payload');
      }

      // Optional: Verify user still exists in Supabase
      const { data, error } = await this.supabase.auth.getClaims();
      if (error) {
        throw new UnauthorizedException('User not found');
      }

      // Extract role and restaurant_id from user metadata or JWT payload
      const role = (payload.user_metadata as any)?.role ?? null;
      const restaurantId =
        (payload.user_metadata as any)?.restaurant_id ?? null;

      // Attach user to request
      request.user = {
        id: payload.sub,
        email: payload.email,
        role: role,
        restaurantId: restaurantId,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(request: any): string | null {
    const authHeader = request.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }
}
