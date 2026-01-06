import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateModifierGroupDto } from './dto/create-modifier-group.dto';
import { UpdateModifierGroupDto } from './dto/update-modifier-group.dto';
import { ModifierStatus } from './dto/modifier.enums';
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
    const groupData = {
      ...createDto,
      status: createDto.status || ModifierStatus.ACTIVE,
    };

    return await this.modifierGroupRepository.createModifierGroup(
      restaurantId,
      groupData,
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

  async softDeleteModifierGroup(id: string, restaurantId: string) {
    const group = await this.modifierGroupRepository.findModifierGroupById(
      id,
      restaurantId,
    );
    if (!group) throw new NotFoundException('Modifier group not found');

    return await this.modifierGroupRepository.softDeleteModifierGroup(
      id,
      restaurantId,
    );
  }
}
