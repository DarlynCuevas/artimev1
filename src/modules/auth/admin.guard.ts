import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const isAdmin = Boolean(req?.user?.isAdmin);
    if (!isAdmin) {
      throw new ForbiddenException('ADMIN_ONLY');
    }
    return true;
  }
}

