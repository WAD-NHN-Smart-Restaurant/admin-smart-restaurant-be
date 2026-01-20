import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { TablesService } from '../tables.service';

interface QrTokenPayload {
  tableId: string;
  restaurantId: string;
  tableNumber: number;
  createdAt: string;
}

interface RequestWithQrToken extends Request {
  qrToken?: QrTokenPayload & { token: string };
}

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

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithQrToken>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('QR token is required');
    }

    try {
      // Verify the QR token using the existing service method
      const decoded = this.tablesService.verifyQrToken(token) as QrTokenPayload;

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

  private extractToken(request: Request): string | null {
    // Try to get token from header first (for API calls)
    const headerToken = request.headers['x-guest-token'];
    if (headerToken && typeof headerToken === 'string') {
      return headerToken;
    }

    // Fallback to query parameter (for QR code scans)
    const queryToken = request.query.token;
    return typeof queryToken === 'string' ? queryToken : null;
  }
}
