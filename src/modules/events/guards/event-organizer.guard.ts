import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class EventOrganizerGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const event = request.event; // inyectado por middleware o interceptor

    if (!event) {
      throw new ForbiddenException('Event not found');
    }

    if (event.ownerId !== user.id) {
      throw new ForbiddenException(
        'Only the event organizer can perform this action'
      );
    }

    return true;
  }
}
