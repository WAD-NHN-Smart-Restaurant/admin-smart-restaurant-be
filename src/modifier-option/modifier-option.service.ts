import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateModifierOptionDto } from './dto/create-modifier-option.dto';
import { UpdateModifierOptionDto } from './dto/update-modifier-option.dto';
import { ModifierOptionRepository } from './modifier-option.repository';

@Injectable()
export class ModifierOptionService {
  constructor(
    private readonly modifierOptionRepository: ModifierOptionRepository,
  ) {}

  async createModifierOption(
    groupId: string,
    restaurantId: string,
    createDto: CreateModifierOptionDto,
  ) {
    // Validate group belongs to restaurant (this might need to be done via group service)
    // For now, assume it's handled elsewhere or add validation if needed
    return await this.modifierOptionRepository.createModifierOption(
      groupId,
      createDto,
    );
  }

  async updateModifierOption(
    optionId: string,
    restaurantId: string,
    updateDto: UpdateModifierOptionDto,
  ) {
    // Validate ownership of option through group
    const isValid =
      await this.modifierOptionRepository.validateOptionBelongsToRestaurant(
        optionId,
        restaurantId,
      );
    if (!isValid)
      throw new NotFoundException('Modifier option not found or access denied');

    return await this.modifierOptionRepository.updateModifierOption(
      optionId,
      updateDto,
    );
  }

  async softDeleteModifierOption(optionId: string, restaurantId: string) {
    // Validate ownership of option through group
    const isValid =
      await this.modifierOptionRepository.validateOptionBelongsToRestaurant(
        optionId,
        restaurantId,
      );
    if (!isValid)
      throw new NotFoundException('Modifier option not found or access denied');

    return await this.modifierOptionRepository.softDeleteModifierOption(
      optionId,
      restaurantId,
    );
  }
}
