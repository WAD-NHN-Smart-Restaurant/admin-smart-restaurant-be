import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';

@Injectable()
export class AdminGuard extends RolesGuard {
  canActivate(context: ExecutionContext): boolean {
    // For admin routes, we require the 'admin' role
    const requiredRoles = ['admin'];
    const reflector = (this as any).reflector;

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      return false;
    }

    const hasRole = requiredRoles.some((role) => user.role === role);

    return hasRole;
  }
}
