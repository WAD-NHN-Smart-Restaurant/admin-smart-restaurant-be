import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  transformKeysToCamelCase,
  transformKeysToSnakeCase,
} from './transform.util';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

@Injectable()
export class RequestInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();

    // Skip transformation for guest order endpoints (already in camelCase from frontend)
    const isGuestOrderEndpoint = request.url?.includes('/orders/guest');

    if (
      !isGuestOrderEndpoint &&
      request.body &&
      typeof request.body === 'object'
    ) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      request.body = transformKeysToSnakeCase(request.body);
    }
    return next.handle();
  }
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data: T) => ({
        success: true,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: transformKeysToCamelCase(data),
      })),
    );
  }
}
