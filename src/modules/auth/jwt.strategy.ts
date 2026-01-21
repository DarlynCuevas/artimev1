import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as jwksRsa from 'jwks-rsa';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri:
          'https://lqimbxjicvdddaoxgjmm.supabase.co/auth/v1/.well-known/jwks.json',
      }),

      algorithms: ['ES256'],
      issuer: 'https://lqimbxjicvdddaoxgjmm.supabase.co/auth/v1',
      audience: 'authenticated',
    });
  }

  async validate(payload: any) {
    return {
      sub: payload.sub,
      role: payload.role,
      email: payload.email,
    };
  }
}
