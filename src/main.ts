
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import * as bodyParser from 'body-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuración CRÍTICA para Stripe Webhook: raw body
 /*  app.enableCors({
  origin: 'http://localhost:8080',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}); */
const allowedOrigins = new Set([
  'http://localhost:8080',
  'http://localhost:3000',
]);

app.enableCors({
  origin: (origin, callback) => {
    // Allow non-browser requests (no origin)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    return callback(new Error('CORS not allowed'), false);
  },
  credentials: true,
});
  app.use(
    '/payments/stripe/webhook',
    bodyParser.raw({ type: 'application/json' }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
