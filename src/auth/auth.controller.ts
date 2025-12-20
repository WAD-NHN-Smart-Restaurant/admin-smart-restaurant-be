import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Headers,
  UnauthorizedException,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './decorators/current-user.decorator';
import { AuthService } from './auth.service';
import type {
  SignUpDto,
  SignInDto,
  RefreshTokenDto,
  ConfirmEmailDto,
  ResetPasswordDto,
  UpdatePasswordDto,
} from './auth.service';
import { SupabaseJwtAuthGuard } from './guards/supabase-jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}
  /**
   * Register a new user
   * POST /auth/register
   */
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: 'password123' },
        name: { type: 'string', example: 'John Doe' },
        role: {
          type: 'string',
          example: 'customer',
          enum: ['customer', 'staff', 'admin'],
        },
      },
      required: ['email', 'password', 'name'],
    },
  })
  async register(
    @Body() dto: SignUpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.signUp(dto);

    // Set tokens in HttpOnly secure cookies if session exists
    if (result.tokens) {
      res.cookie('access_token', result.tokens.accessToken, {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
        maxAge: 60 * 60 * 1000, // 1 hour
        path: '/',
      });

      res.cookie('refresh_token', result.tokens.refreshToken, {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });
    }

    // Return only user data, not tokens
    return {
      success: result.success,
      message: result.message,
      data: result.data,
    };
  }
  /**
   * Login with email and password
   * POST /auth/login
   */
  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: 'password123' },
      },
      required: ['email', 'password'],
    },
  })
  async login(
    @Body() dto: SignInDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.signIn(dto);

    // Set tokens in HttpOnly secure cookies
    if (result.tokens) {
      res.cookie('access_token', result.tokens.accessToken, {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
        maxAge: 60 * 60 * 1000, // 1 hour
        path: '/',
      });

      res.cookie('refresh_token', result.tokens.refreshToken, {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });
    }

    // Return only user data, not tokens
    return {
      success: result.success,
      message: result.message,
      data: result.data,
    };
  }
  /**
   * Logout current user
   * POST /auth/logout
   */
  @Post('logout')
  @UseGuards(SupabaseJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout current user' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@Res({ passthrough: true }) res: Response) {
    const result = await this.authService.signOut();

    // Clear cookies
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });

    return result;
  }

  /**
   * Refresh access token
   * POST /auth/refresh
   */
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: { type: 'string', example: 'your-refresh-token' },
      },
      required: ['refreshToken'],
    },
  })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  /**
   * Get current user profile
   * GET /auth/me
   */
  @Get('me')
  @UseGuards(SupabaseJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('authorization') authHeader: string,
  ) {
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }
    return this.authService.getCurrentUser(token);
  }
  /**
   * Confirm email with OTP
   * POST /auth/confirm
   */
  @Post('confirm')
  @ApiOperation({ summary: 'Confirm email with OTP token' })
  @ApiResponse({ status: 200, description: 'Email confirmed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tokenHash: { type: 'string', example: 'your-token-hash' },
        type: {
          type: 'string',
          example: 'email',
          enum: ['email', 'signup', 'magiclink'],
        },
      },
      required: ['tokenHash', 'type'],
    },
  })
  async confirmEmail(
    @Body() dto: ConfirmEmailDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.confirmEmail(dto);

    // Set tokens in HttpOnly secure cookies if session exists
    if (result.tokens) {
      res.cookie('access_token', result.tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
        maxAge: 60 * 60 * 1000, // 1 hour
        path: '/',
      });

      res.cookie('refresh_token', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });
    }

    // Return only user data, not tokens
    return {
      success: result.success,
      message: result.message,
      data: result.data,
    };
  }

  /**
   * Send password reset email
   * POST /auth/reset-password
   */
  @Post('reset-password')
  @ApiOperation({ summary: 'Send password reset email' })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
      },
      required: ['email'],
    },
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  /**
   * Update password
   * POST /auth/update-password
   */
  @Post('update-password')
  @UseGuards(SupabaseJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update password' })
  @ApiResponse({ status: 200, description: 'Password updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        newPassword: { type: 'string', example: 'newPassword123' },
      },
      required: ['newPassword'],
    },
  })
  async updatePassword(
    @Body() dto: Omit<UpdatePasswordDto, 'accessToken'>,
    @Headers('authorization') authHeader: string,
  ) {
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }
    return this.authService.updatePassword({ ...dto, accessToken: token });
  }

  /**
   * Resend confirmation email
   * POST /auth/resend-confirmation
   */ @Post('resend-confirmation')
  @ApiOperation({ summary: 'Resend confirmation email' })
  @ApiResponse({ status: 200, description: 'Confirmation email sent' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
      },
      required: ['email'],
    },
  })
  async resendConfirmation(@Body('email') email: string) {
    return this.authService.resendConfirmation(email);
  }

  // Public endpoint - no authentication required
  @Get('public')
  @ApiOperation({ summary: 'Get public data (no auth required)' })
  @ApiResponse({ status: 200, description: 'Public data retrieved' })
  getPublicData() {
    return {
      message: 'This is public data, no authentication required',
    };
  }

  // Protected endpoint - requires valid JWT (using new guard)
  @Get('profile')
  @UseGuards(SupabaseJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get profile (protected endpoint)' })
  @ApiResponse({ status: 200, description: 'Profile retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfileLegacy(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'This is your profile',
      user,
    };
  }

  // Admin-only endpoint - requires valid JWT + admin role (using new guard)
  @Get('admin')
  @UseGuards(SupabaseJwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get admin data (admin only)' })
  @ApiResponse({ status: 200, description: 'Admin data retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  getAdminData(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'This is admin-only data',
      user,
    };
  }

  // Multiple roles allowed (using new guard)
  @Get('staff')
  @UseGuards(SupabaseJwtAuthGuard, RolesGuard)
  @Roles('admin', 'staff')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get staff data (admin or staff only)' })
  @ApiResponse({ status: 200, description: 'Staff data retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  getStaffData(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'This is staff data (admin or staff role)',
      user,
    };
  }
}
