import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ProfilesRepository } from './profiles.repository';
import { StorageService } from '../storage/storage.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);

  constructor(
    private readonly profilesRepository: ProfilesRepository,
    private readonly storageService: StorageService,
  ) {}

  async getProfile(userId: string) {
    return await this.profilesRepository.findProfileById(userId);
  }

  async createProfileIfNotExists(userData: {
    id: string;
    full_name?: string;
    role?:
      | 'customer'
      | 'admin'
      | 'waiter'
      | 'kitchen_staff'
      | 'super_admin'
      | 'guest';
    restaurant_id?: string | null;
    avatar_url?: string | null;
  }) {
    try {
      // Check if profile already exists
      const exists = await this.profilesRepository.profileExists(userData.id);

      if (exists) {
        // Return existing profile
        return await this.profilesRepository.findProfileById(userData.id);
      }

      // Create new profile
      return await this.profilesRepository.createProfile(userData);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create profile: ${errorMessage}`);
      throw error;
    }
  }

  async updateProfile(
    userId: string,
    requestUserId: string,
    updateDto: UpdateProfileDto,
  ) {
    // Ensure user can only update their own profile
    if (userId !== requestUserId) {
      throw new ForbiddenException('You can only update your own profile');
    }

    try {
      return await this.profilesRepository.updateProfile(userId, updateDto);
    } catch (error) {
      this.logger.error(`Failed to update profile: ${error.message}`);
      throw new BadRequestException(
        `Failed to update profile: ${error.message}`,
      );
    }
  }

  async uploadAvatar(
    userId: string,
    requestUserId: string,
    file: Express.Multer.File,
  ) {
    // Ensure user can only upload avatar for their own profile
    if (userId !== requestUserId) {
      throw new ForbiddenException('You can only update your own avatar');
    }

    try {
      // Get current profile to check role and existing avatar
      const profile = await this.profilesRepository.findProfileById(userId);

      // Delete old avatar if exists
      const oldStorageKey =
        await this.profilesRepository.getAvatarStorageKey(userId);
      if (oldStorageKey) {
        try {
          await this.storageService.deleteFile(oldStorageKey);
        } catch (error) {
          this.logger.warn(
            `Failed to delete old avatar: ${error.message}, continuing with upload`,
          );
        }
      }

      // Determine folder based on user role
      const folder = `avatars/${profile.role}s/${userId}`;

      // Upload new avatar to R2
      const { url, key } = await this.storageService.uploadFile(file, folder);

      // Update profile with new avatar
      return await this.profilesRepository.updateProfile(userId, {
        avatar_url: url,
        storage_key: key,
      });
    } catch (error) {
      this.logger.error(`Failed to upload avatar: ${error.message}`);
      throw new BadRequestException(
        `Failed to upload avatar: ${error.message}`,
      );
    }
  }

  async deleteAvatar(userId: string, requestUserId: string) {
    // Ensure user can only delete their own avatar
    if (userId !== requestUserId) {
      throw new ForbiddenException('You can only delete your own avatar');
    }

    try {
      // Get storage key
      const storageKey =
        await this.profilesRepository.getAvatarStorageKey(userId);

      if (storageKey) {
        // Delete from R2
        await this.storageService.deleteFile(storageKey);
      }

      // Remove avatar references from profile
      return await this.profilesRepository.updateProfile(userId, {
        avatar_url: null,
        storage_key: null,
      });
    } catch (error) {
      this.logger.error(`Failed to delete avatar: ${error.message}`);
      throw new BadRequestException(
        `Failed to delete avatar: ${error.message}`,
      );
    }
  }

  async updatePhoneNumber(
    userId: string,
    requestUserId: string,
    phoneNumber: string,
  ) {
    // Ensure user can only update their own phone number
    if (userId !== requestUserId) {
      throw new ForbiddenException('You can only update your own phone number');
    }

    try {
      return await this.profilesRepository.updateProfile(userId, {
        phone_number: phoneNumber,
      });
    } catch (error) {
      this.logger.error(`Failed to update phone number: ${error.message}`);
      throw new BadRequestException(
        `Failed to update phone number: ${error.message}`,
      );
    }
  }

  async getUsersByRole(restaurantId: string, role: string) {
    try {
      return await this.profilesRepository.getUsersByRole(restaurantId, role);
    } catch (error) {
      this.logger.error(`Failed to get users by role: ${error.message}`);
      throw new BadRequestException(
        `Failed to get users by role: ${error.message}`,
      );
    }
  }
}
