import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CreateModifierGroupDto,
  UpdateModifierGroupDto,
  CreateModifierOptionDto,
  UpdateModifierOptionDto,
} from './dto/modifier.dto';
import { ModifierGroupRepository } from './modifier-group.repository';

@Injectable()
export class ModifierGroupService {
  constructor(
    private readonly modifierGroupRepository: ModifierGroupRepository,
  ) {}

  // --- Modifier Groups & Options ---
  async createModifierGroup(
    restaurantId: string,
    createDto: CreateModifierGroupDto,
  ) {
    return await this.modifierGroupRepository.createModifierGroup(
      restaurantId,
      createDto,
    );
  }

  async getModifierGroups(restaurantId: string) {
    return await this.modifierGroupRepository.findModifierGroupsByRestaurant(
      restaurantId,
    );
  }

  async updateModifierGroup(
    id: string,
    restaurantId: string,
    updateDto: UpdateModifierGroupDto,
  ) {
    const group = await this.modifierGroupRepository.findModifierGroupById(
      id,
      restaurantId,
    );
    if (!group) throw new NotFoundException('Modifier group not found');

    return await this.modifierGroupRepository.updateModifierGroup(
      id,
      restaurantId,
      updateDto,
    );
  }

  private async validateModifierGroupBelongsToRestaurant(
    groupId: string,
    restaurantId: string,
  ) {
    return await this.modifierGroupRepository.validateModifierGroupBelongsToRestaurant(
      groupId,
      restaurantId,
    );
  }

  async createModifierOption(
    groupId: string,
    restaurantId: string,
    createDto: CreateModifierOptionDto,
  ) {
    // Phải kiểm tra groupId có thuộc restaurantId không trước khi insert option
    await this.validateModifierGroupBelongsToRestaurant(groupId, restaurantId);

    return await this.modifierGroupRepository.createModifierOption(
      groupId,
      createDto,
    );
  }

  async updateModifierOption(
    optionId: string,
    restaurantId: string,
    updateDto: UpdateModifierOptionDto,
  ) {
    // Validate quyền sở hữu option (thông qua bảng modifier_groups)
    const isValid =
      await this.modifierGroupRepository.validateOptionBelongsToRestaurant(
        optionId,
        restaurantId,
      );
    if (!isValid)
      throw new NotFoundException('Modifier option not found or access denied');

    return await this.modifierGroupRepository.updateModifierOption(
      optionId,
      updateDto,
    );
  }
}
