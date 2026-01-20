import {
  Controller,
  Get,
  Put,
  Delete,
  Post,
  Body,
  Param,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProfilesService } from './profiles.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { SupabaseJwtAuthGuard } from '../auth/guards/supabase-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Profiles')
@ApiBearerAuth('JWT-auth')
@Controller('profiles')
@UseGuards(SupabaseJwtAuthGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get(':id')
  @ApiOperation({
    summary: 'Get user profile',
    description:
      'Retrieves profile information for a specific user. Requires authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
    type: ProfileResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 404,
    description: 'Profile not found',
  })
  async getProfile(@Param('id') id: string) {
    return this.profilesService.getProfile(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update user profile',
    description:
      'Updates profile information. Users can only update their own profile.',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: ProfileResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only update own profile',
  })
  async updateProfile(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateDto: UpdateProfileDto,
  ) {
    return this.profilesService.updateProfile(id, user.id, updateDto);
  }

  @Post(':id/avatar')
  @ApiOperation({
    summary: 'Upload user avatar',
    description:
      'Uploads or updates avatar image for user profile. Users can only update their own avatar. Replaces existing avatar if present.',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Avatar image file',
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'Avatar image file (jpg, jpeg, png, webp)',
        },
      },
      required: ['avatar'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Avatar uploaded successfully',
    type: ProfileResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid file or missing file',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only update own avatar',
  })
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return callback(
            new BadRequestException(
              'Only image files (jpg, jpeg, png, webp) are allowed!',
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async uploadAvatar(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.profilesService.uploadAvatar(id, user.id, file);
  }

  @Delete(':id/avatar')
  @ApiOperation({
    summary: 'Delete user avatar',
    description:
      'Removes avatar image from user profile. Users can only delete their own avatar.',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Avatar deleted successfully',
    type: ProfileResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only delete own avatar',
  })
  async deleteAvatar(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.profilesService.deleteAvatar(id, user.id);
  }

  @Get('restaurant/:restaurantId/role/:role')
  @ApiOperation({
    summary: 'Get users by role',
    description:
      'Retrieves all users in a restaurant with a specific role. Requires authentication.',
  })
  @ApiParam({
    name: 'restaurantId',
    description: 'Restaurant ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'role',
    description: 'User role',
    enum: ['waiter', 'kitchen_staff', 'admin', 'super_admin'],
  })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async getUsersByRole(
    @Param('restaurantId') restaurantId: string,
    @Param('role') role: string,
  ) {
    return this.profilesService.getUsersByRole(restaurantId, role);
  }
}
