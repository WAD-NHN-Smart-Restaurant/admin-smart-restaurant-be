import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetRestaurantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // First priority: restaurant_id from authenticated user's metadata
    if (user?.restaurantId) {
      return user.restaurantId;
    }

    // Second priority: restaurant_id from request headers
    const headerRestaurantId = request.headers['x-restaurant-id'];
    if (headerRestaurantId) {
      return headerRestaurantId;
    }
  },
);
