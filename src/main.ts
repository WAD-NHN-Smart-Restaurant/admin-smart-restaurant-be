import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import {
  ResponseInterceptor,
  RequestInterceptor,
} from './common/response.interceptor';
import { GlobalExceptionFilter } from './common/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable global request and response interceptors
  app.useGlobalInterceptors(
    new RequestInterceptor(),
    new ResponseInterceptor(),
  );

  // Enable global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Enable CORS for frontend
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
    ],
    credentials: true,
    // preflightContinue: false,
    // optionsSuccessStatus: 204,
  });

  app.setGlobalPrefix('api', {
    exclude: ['/health', '/'],
  });

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Smart Restaurant API')
    .setDescription('API documentation for Smart Restaurant Management System')
    .setVersion('1.0')
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Tables', 'Table management endpoints')
    .addTag('Menu Items - Admin', 'Admin menu item management endpoints')
    .addTag('Menu Items - Guest', 'Guest menu item access endpoints')
    .addTag(
      'Menu Categories - Admin',
      'Admin menu category management endpoints',
    )
    .addTag(
      'Modifier Groups - Admin',
      'Admin modifier group management endpoints',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Swagger documentation available at: ${await app.getUrl()}/api`);
}
bootstrap();
