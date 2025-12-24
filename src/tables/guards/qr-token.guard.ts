import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { TablesService } from '../tables.service';

/**
 * Guard to verify QR tokens for table access
 *
 * This guard:
 * 1. Extracts QR token from query parameters
 * 2. Verifies the token using TablesService.verifyQrToken()
 * 3. Attaches decoded token data to request object
 * 4. Allows access if token is valid
 */
@Injectable()
export class QrTokenGuard implements CanActivate {
  constructor(private readonly tablesService: TablesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromQuery(request);

    if (!token) {
      throw new UnauthorizedException('QR token is required');
    }

    try {
      // Verify the QR token using the existing service method
      const decoded = this.tablesService.verifyQrToken(token);

      // Attach decoded token data to request for use in controllers
      request.qrToken = {
        ...decoded,
        token: token,
      };

      return true;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new UnauthorizedException(error.message);
      }
      throw new UnauthorizedException('Invalid QR token');
    }
  }

  private extractTokenFromQuery(request: any): string | null {
    return request.query?.token || null;
  }
}
