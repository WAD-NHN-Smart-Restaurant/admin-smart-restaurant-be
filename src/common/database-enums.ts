// Database enum types for attributes with CHECK constraints
// These replace magic strings in repository layer

export type MenuCategoryStatus = 'active' | 'inactive';

export type MenuItemStatus = 'available' | 'unavailable' | 'sold_out';

export type ModifierGroupSelectionType = 'single' | 'multiple';

export type ModifierGroupStatus = 'active' | 'inactive';

export type ModifierOptionStatus = 'active' | 'inactive';

// Range validation types (not enums but CHECK constraints)
export type MenuItemPrice = number; // CHECK (price > 0)
export type MenuItemPrepTime = number; // CHECK (prep_time_minutes >= 0 AND prep_time_minutes <= 240)
export type ModifierOptionPriceAdjustment = number; // CHECK (price_adjustment >= 0)
export type OrderItemQuantity = number; // CHECK (quantity > 0)
export type TableCapacity = number; // CHECK (capacity > 0 AND capacity <= 20)

// Type guards for validation
export const isMenuCategoryStatus = (
  value: string,
): value is MenuCategoryStatus => ['active', 'inactive'].includes(value);

export const isMenuItemStatus = (value: string): value is MenuItemStatus =>
  ['available', 'unavailable', 'sold_out'].includes(value);

export const isModifierGroupSelectionType = (
  value: string,
): value is ModifierGroupSelectionType =>
  ['single', 'multiple'].includes(value);

export const isModifierGroupStatus = (
  value: string,
): value is ModifierGroupStatus => ['active', 'inactive'].includes(value);

export const isModifierOptionStatus = (
  value: string,
): value is ModifierOptionStatus => ['active', 'inactive'].includes(value);

// Range validation functions
export const isValidMenuItemPrice = (price: number): boolean => price > 0;
export const isValidMenuItemPrepTime = (minutes: number): boolean =>
  minutes >= 0 && minutes <= 240;
export const isValidModifierOptionPriceAdjustment = (
  adjustment: number,
): boolean => adjustment >= 0;
export const isValidOrderItemQuantity = (quantity: number): boolean =>
  quantity > 0;
export const isValidTableCapacity = (capacity: number): boolean =>
  capacity > 0 && capacity <= 20;
