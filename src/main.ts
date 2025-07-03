import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.use(helmet({
    contentSecurityPolicy: false,
  }));

  app.use(cookieParser());

  app.enableCors({
    origin: configService.get('CORS_ORIGIN')?.split(',') || ['http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      whitelist: true,
      forbidNonWhitelisted: true,
      disableErrorMessages: configService.get('NODE_ENV') === 'production',
    }),
  );

  app.setGlobalPrefix('api/v1');

  if (configService.get('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Telemedicine Platform SSO API')
      .setDescription('Comprehensive Single Sign-On API for telemedicine platform with support for multiple identity providers')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addServer(`http://localhost:${configService.get('PORT', 3001)}`, 'Development')
      .addServer('https://api.telemedicine.com', 'Production')
      .addTag('SSO Authentication', 'Single Sign-On authentication endpoints')
      .addTag('User Management', 'User profile and session management')
      .addTag('Security', 'Security monitoring and management')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
      customfavIcon: '/favicon.ico',
      customSiteTitle: 'Telemedicine SSO API Documentation',
    });

    logger.log(`Swagger documentation available at: http://localhost:${configService.get('PORT', 3001)}/api/docs`);
  }

  app.getHttpAdapter().get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'telemedicine-sso',
      version: '1.0.0',
    });
  });

  const port = configService.get('PORT', 3000);
  await app.listen(port);


}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Failed to start application', error);
  process.exit(1);
});
