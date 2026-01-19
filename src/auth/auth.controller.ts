import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseGuards,
  Headers,
  UnauthorizedException,
  BadRequestException,
  Res,
  Req,
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
  CustomerSignUpDto,
} from './auth.service';
import { SupabaseJwtAuthGuard } from './guards/supabase-jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { GetRestaurantId } from './decorators/get-restaurant-id.decorator';
import { UpdateEmailDto } from './dto/update-email.dto';
import { UpdatePhoneDto } from './dto/update-phone.dto';
import { createClient } from '@supabase/supabase-js';
import { UpdatePasswordDto_1 } from './dto/update-password';

const isProduction = process.env.NODE_ENV === 'production';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}
  /**
   * Register a new user
   * POST /auth/register
   */
  @UseGuards(SupabaseJwtAuthGuard, AdminGuard)
  @Post('admin/register-staff')
  @ApiOperation({
    summary: 'Register a new staff member (waiter or kitchen_staff)',
  })
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
          example: 'waiter',
          enum: ['waiter', 'kitchen_staff'],
        },
      },
      required: ['email', 'password', 'name'],
    },
  })
  async register(
    @Body() dto: SignUpDto,
    @Res({ passthrough: true }) res: Response,
    @GetRestaurantId() restaurantId: string,
  ) {
    if (!dto.role || !['waiter', 'kitchen_staff'].includes(dto.role)) {
      throw new BadRequestException(
        'Admins can only create accounts for waiter or kitchen_staff roles',
      );
    }

    console.log('restaurant id:', restaurantId);
    const result = await this.authService.signUp(restaurantId, dto);
    //const result = await this.authService.signUp('c6fc043d-0b6f-4bf0-bb73-a8fc93b28106',dto);

    // Set tokens in HttpOnly secure cookies if session exists
    if (result.tokens) {
      res.cookie('access_token', result.tokens.accessToken, {
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 60 * 60 * 1000, // 1 hour
        path: '/',
      });

      res.cookie('refresh_token', result.tokens.refreshToken, {
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });
    }

    return result.data;
  }

  /**
   * Register a new customer
   * POST /auth/register
   */
  @Post('register')
  @ApiOperation({ summary: 'Register a new customer' })
  @ApiResponse({ status: 201, description: 'Customer successfully registered' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'customer@example.com' },
        password: { type: 'string', example: 'password123' },
        name: { type: 'string', example: 'John Doe' },
      },
      required: ['email', 'password', 'name'],
    },
  })
  async registerCustomer(
    @Body() dto: CustomerSignUpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Force role to 'customer' internally
    const customerDto: SignUpDto = { ...dto, role: 'customer' };
    const result = await this.authService.signUp(null, customerDto);

    // Set tokens in HttpOnly secure cookies if session exists
    if (result.tokens) {
      res.cookie('access_token', result.tokens.accessToken, {
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 60 * 60 * 1000, // 1 hour
        path: '/',
      });

      res.cookie('refresh_token', result.tokens.refreshToken, {
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });
    }

    // Return only user data, not tokens
    return result.data;
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
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 60 * 60 * 1000, // 1 hour
        path: '/',
      });

      res.cookie('refresh_token', result.tokens.refreshToken, {
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });
    }

    // Return only user data, not tokens
    return result.data;
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
  async refresh() {
    return this.authService.refreshToken();
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
  // @Post('confirm')
  // @ApiOperation({ summary: 'Confirm email with OTP token' })
  // @ApiResponse({ status: 200, description: 'Email confirmed successfully' })
  // @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  // @ApiBody({
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       tokenHash: { type: 'string', example: 'your-token-hash' },
  //       type: {
  //         type: 'string',
  //         example: 'email',
  //         enum: ['email', 'signup', 'magiclink'],
  //       },
  //     },
  //     required: ['tokenHash', 'type'],
  //   },
  // })
  // async confirmEmail(
  //   @Body() dto: ConfirmEmailDto,
  //   @Res({ passthrough: true }) res: Response,
  // ) {
  //   const result = await this.authService.confirmEmail(dto);

  //   // Set tokens in HttpOnly secure cookies if session exists
  //   if (result.tokens) {
  //     res.cookie('access_token', result.tokens.accessToken, {
  //       httpOnly: true,
  //       secure: process.env.NODE_ENV === 'production',
  //       sameSite: 'none',
  //       maxAge: 60 * 60 * 1000, // 1 hour
  //       path: '/',
  //     });

  //     res.cookie('refresh_token', result.tokens.refreshToken, {
  //       httpOnly: true,
  //       secure: process.env.NODE_ENV === 'production',
  //       sameSite: 'none',
  //       maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  //       path: '/',
  //     });
  //   }

  //   return result.data;
  // }

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
  @ApiBody({type: UpdatePasswordDto_1})
  async updatePassword(
    @Body() dto: Omit<UpdatePasswordDto_1, 'accessToken'>,
    @Headers('authorization') authHeader: string,
  ) {
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    if (process.env.SUPABASE_URL === undefined || process.env.SUPABASE_PUBLISHABLE_KEY === undefined) {
      throw new Error('Supabase environment variables are not set');
    }
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_PUBLISHABLE_KEY,
    );
    //return this.authService.updatePassword({ ...dto, accessToken: token });
    const { data, error } = await supabase.auth.setSession({
          access_token: token,
          refresh_token: dto.refreshToken,
        });

    return supabase.auth.updateUser({ password: dto.newPassword });
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

  /**
   * Update user email
   * PUT /auth/update-email
   */
  @Put('update-email')
  @UseGuards(SupabaseJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update user email',
    description:
      'Updates the authenticated user\'s email address. A confirmation email will be sent to the new email address.',
  })
  @ApiResponse({
    status: 200,
    description: 'Email update initiated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBody({ type: UpdateEmailDto })
  async updateEmail(@Body() dto: UpdateEmailDto) {
    return this.authService.updateEmail(dto.email);
  }

  /**
   * Update user phone number
   * PUT /auth/update-phone
   */
  @Put('update-phone')
  @UseGuards(SupabaseJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update user phone number',
    description:
      'Updates the authenticated user\'s phone number. A verification code will be sent to the new phone number.',
  })
  @ApiResponse({
    status: 200,
    description: 'Phone number update initiated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBody({ type: UpdatePhoneDto })
  async updatePhoneNumber(@Body() dto: UpdatePhoneDto) {
    return this.authService.updatePhoneNumber(dto.phone);
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
}
