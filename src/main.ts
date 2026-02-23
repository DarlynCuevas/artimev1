import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import * as bodyParser from 'body-parser';
import * as path from 'path';
import Module = require('module');

// Vercel runtime may not include tsconfig.json, so we map '@/src/*' at runtime.
const originalResolveFilename = (Module as any)._resolveFilename;
(Module as any)._resolveFilename = function (
  request: string,
  parent: unknown,
  isMain: boolean,
  options: unknown,
) {
  if (typeof request === 'string' && request.startsWith('@/src/')) {
    const mappedRequest = path.join(__dirname, request.slice('@/src/'.length));
    return originalResolveFilename.call(this, mappedRequest, parent, isMain, options);
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

async function bootstrap() {
  const { AppModule } = require('./app.module');
  const app = await NestFactory.create(AppModule);

  // Configuración CRÍTICA para Stripe Webhook: raw body
 /*  app.enableCors({
  origin: 'http://localhost:8080',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}); */
  // CORS:
  // - Defaults to local-only (original dev setup).
  // - In Vercel/prod, configure `CORS_ORIGINS` (comma-separated) and/or `FRONTEND_URL`.
  //   Example: CORS_ORIGINS=https://artime-web.vercel.app
  const allowedOrigins = new Set<string>(['http://localhost:8080', 'http://localhost:3000']);
  const allowAllOrigins = (process.env.CORS_ORIGINS ?? '').trim() === '*';

  const normalizeOrigin = (value?: string) => {
    const trimmed = value?.trim();
    if (!trimmed) return null;

    // Common mistake in env vars: wrap value in quotes.
    const unquoted = trimmed.replace(/^['"]|['"]$/g, '');

    try {
      return new URL(unquoted).origin;
    } catch {
      // If it's not a valid URL, ignore it (safer than allowing arbitrary strings).
      return null;
    }
  };

  const addOrigin = (value?: string) => {
    const normalized = normalizeOrigin(value);
    if (!normalized) return;
    allowedOrigins.add(normalized);
  };

  for (const origin of (process.env.CORS_ORIGINS ?? '').split(',')) addOrigin(origin);
  addOrigin(process.env.FRONTEND_URL);

  // Vercel sets VERCEL_URL without protocol.
  if (process.env.VERCEL_URL) addOrigin(`https://${process.env.VERCEL_URL}`);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow non-browser requests (no origin)
      if (!origin) return callback(null, true);

      if (allowAllOrigins) return callback(null, true);

      const normalized = normalizeOrigin(origin) ?? origin;
      if (allowedOrigins.has(normalized)) return callback(null, true);
      // Allow Vercel frontends/previews explicitly (temporary-safe for deployment testing).
      try {
        const hostname = new URL(normalized).hostname;
        if (hostname.endsWith('.vercel.app')) return callback(null, true);
      } catch {
        // ignore parse failures
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
