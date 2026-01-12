
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import * as bodyParser from 'body-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuración CRÍTICA para Stripe Webhook: raw body
  app.enableCors({
  origin: 'http://localhost:8080',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
});
  app.use(
    '/payments/stripe/webhook',
    bodyParser.raw({ type: 'application/json' }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
