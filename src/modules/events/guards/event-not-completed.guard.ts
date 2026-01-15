import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class EventNotCompletedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const event = request.event;

    if (!event) {
      throw new ForbiddenException('Event not found');
    }

    if (event.status === 'COMPLETED') {
      throw new ForbiddenException(
        'Completed events cannot be modified'
      );
    }

    return true;
  }
}
