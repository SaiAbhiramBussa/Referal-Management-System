import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Global prefix for all routes
    app.setGlobalPrefix('api');

    // Enable CORS
    app.enableCors({
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        credentials: true,
    });

    // Global validation pipe
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

    // Swagger configuration
    const config = new DocumentBuilder()
        .setTitle('Referral Reward Ledger API')
        .setDescription(
            'API for managing referral rewards, immutable ledger entries, and rule-based flow engine',
        )
        .setVersion('1.0')
        .addTag('rewards', 'Reward lifecycle management')
        .addTag('ledger', 'Immutable ledger operations')
        .addTag('rules', 'Rule engine and evaluation')
        .addTag('users', 'User management')
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    const port = process.env.PORT || 3001;
    await app.listen(port);

    console.log(`🚀 Application is running on: http://localhost:${port}/api`);
    console.log(`📚 Swagger docs available at: http://localhost:${port}/api/docs`);
}

bootstrap();
